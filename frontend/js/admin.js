/* ==========================================================================
   El Desparche - admin.js
   Páginas de administración. Usa lo que script.js deja en window.Desparche.

   Con USAR_API = true los datos salen del API, con la misma forma que
   los datos de ejemplo de este archivo:
   - GET   /api/admin/resumen?meses=N  -> resumenLocal()
     { indicadores, meses: [{ mes, reservas, ingresos }], estados: [{ estado, total }],
       categorias: [{ categoria, ingresos }], agentes: [{ nombre, eventos, entradas, ingresos }],
       actividad: [{ cuando, texto }] }
   - GET   /api/admin/agentes            -> { agentes: [ igual que AGENTES_DEMO ] }
   - PATCH /api/admin/agentes/:nit/estado   cuerpo { estado: "Activo" | "Suspendido" }
   - GET   /api/admin/eventos            -> { eventos: [ igual que EVENTOS de script.js, con "agente" ] }
   - PATCH /api/admin/eventos/:id/estado    cuerpo { estado, motivo }  (motivo solo al cancelar)
   - GET   /api/admin/clientes           -> { clientes: [ igual que CLIENTES_DEMO ] }
   - PATCH /api/admin/clientes/:documento/estado   cuerpo { estado: "Activa" | "Bloqueada" }
   - GET   /api/admin/reservas           -> { reservas: [ igual que reservasLocales() ] }
     "pago" guarda la transacción de Wompi: { id, metodo, estado, montoCentavos, moneda },
     con metodo y estado tal como los envía Wompi (CARD, NEQUI, PSE, BANCOLOMBIA_TRANSFER /
     APPROVED, PENDING, DECLINED, VOIDED, ERROR). El backend los actualiza con el webhook
     de Wompi (evento transaction.updated); la referencia de la transacción es el código.
   - PATCH /api/admin/reservas/:codigo/estado      cuerpo { estado: "Cancelada" }
   - GET   /api/admin/verificaciones     -> { verificaciones: [ igual que verificacionesDemo(), con "id" ] }
   - PATCH /api/admin/verificaciones/:id            cuerpo { estado: "Aprobada" | "Rechazada", motivo }
   - GET   /api/admin/sesiones           -> { administradores: [{ id, nombre, horario }],
                                              sesiones: [ filas de SESION_ADMIN ] }
   - POST  /api/auth/logout              guarda la fila de SESION_ADMIN (con la IP real) al salir un admin
   - POST  /api/admin/entradas/:codigo/ingreso      marca la entrada como usada (201). El backend
     debe comprobar el token del QR (HMAC), el estado de la reserva y del pago, y que no se usó antes.
   ========================================================================== */

var D = window.Desparche;

var reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

var pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
var numero = new Intl.NumberFormat("es-CO");
var compacto = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });
var pesosCompacto = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", notation: "compact", maximumFractionDigits: 1 });

/* Colores de las gráficas (paleta de IBM, definida en admin.css) */
var COLOR_ESTADO = {
  "Programado": "var(--grafica-azul)",
  "En Boletería": "var(--grafica-amarillo)",
  "En Vivo": "var(--grafica-magenta)",
  "Finalizado": "var(--grafica-morado)",
  "Cancelado": "var(--grafica-naranja)"
};


/* ===== DATOS DE EJEMPLO (modo local) ===== */

var DEMO = {
  reservas: [820, 940, 1010, 880, 1150, 1320, 1240, 1480, 1610, 1550, 1790, 1960],
  ingresos: [98400000, 115200000, 121300000, 104600000, 142800000, 165100000,
             151900000, 183400000, 201700000, 189300000, 224600000, 248900000],
  categorias: [
    ["Conciertos", 812],
    ["Festivales", 604],
    ["Teatro", 248],
    ["Deportes", 186],
    ["Familiar", 97]
  ],
  clientes: 18430,
  verificaciones: 37
};

/* Agentes (AGENTE en la base de datos). "ventas" son las entradas vendidas
   en cada uno de los últimos 6 meses; "eventos", los id de EVENTOS. */
var AGENTES_DEMO = [
  { nit: "901234567-1", nombre: "Tarima Producciones", razon: "Tarima Producciones S.A.S.", correo: "contacto@tarima.example",
    telefono: "3104567890", ciudad: "Bogotá", registro: "2024-02-12", comision: 8, experiencia: 9, estado: "Activo",
    eventos: [1, 3], entradas: 9840, ingresos: 525700000, ventas: [720, 810, 905, 870, 1010, 1180],
    descripcion: "Productora de festivales y conciertos de gran formato en Bogotá." },
  { nit: "900876543-2", nombre: "Sonido Andino", razon: "Sonido Andino Ltda.", correo: "hola@sonidoandino.example",
    telefono: "3157894561", ciudad: "Medellín", registro: "2024-05-03", comision: 7.5, experiencia: 6, estado: "Activo",
    eventos: [2, 8], entradas: 7210, ingresos: 408900000, ventas: [540, 600, 650, 620, 710, 760],
    descripcion: "Giras de artistas nacionales en arenas y coliseos del país." },
  { nit: "901112233-4", nombre: "Rumba Viva Eventos", razon: "Rumba Viva Eventos S.A.S.", correo: "eventos@rumbaviva.example",
    telefono: "3001239876", ciudad: "Cali", registro: "2024-08-21", comision: 7, experiencia: 5, estado: "Activo",
    eventos: [4, 5], entradas: 5980, ingresos: 311500000, ventas: [430, 480, 520, 500, 560, 610],
    descripcion: "Salsa, espectáculos de circo y eventos familiares en el Valle del Cauca." },
  { nit: "900445566-7", nombre: "Telón Abierto", razon: "Fundación Telón Abierto", correo: "taquilla@telonabierto.example",
    telefono: "3012345678", ciudad: "Barranquilla", registro: "2025-01-15", comision: 6, experiencia: 12, estado: "Activo",
    eventos: [6], entradas: 3120, ingresos: 175200000, ventas: [220, 250, 240, 270, 290, 310],
    descripcion: "Compañía de teatro con obras de autores latinoamericanos." },
  { nit: "901998877-0", nombre: "Pacífico Live", razon: "Pacífico Live S.A.S.", correo: "info@pacificolive.example",
    telefono: "3168889900", ciudad: "Cali", registro: "2025-03-30", comision: 7, experiencia: 3, estado: "Activo",
    eventos: [9], entradas: 2650, ingresos: 136300000, ventas: [180, 200, 230, 210, 260, 290],
    descripcion: "Música del Pacífico y nuevos artistas urbanos." },
  { nit: "900332211-5", nombre: "Caribe Fest", razon: "Caribe Fest Producciones S.A.S.", correo: "contacto@caribefest.example",
    telefono: "3045556677", ciudad: "Barranquilla", registro: "2024-11-09", comision: 8, experiencia: 4, estado: "Suspendido",
    eventos: [10], entradas: 1430, ingresos: 88400000, ventas: [210, 190, 160, 90, 0, 0],
    descripcion: "Festivales de música caribeña. Suspendido por reclamos de reembolso pendientes." },
  { nit: "901556677-8", nombre: "Escena Urbana", razon: "Escena Urbana Colectivo S.A.S.", correo: "escena@urbana.example",
    telefono: "3201112233", ciudad: "Bogotá", registro: "2025-06-18", comision: 6.5, experiencia: 2, estado: "Activo",
    eventos: [11], entradas: 1210, ingresos: 64800000, ventas: [60, 90, 120, 150, 170, 210],
    descripcion: "Batallas de rap, grafiti y cultura hip hop." },
  { nit: "901667788-9", nombre: "Gira Andina", razon: "Gira Andina S.A.S.", correo: "reservas@giraandina.example",
    telefono: "3117778899", ciudad: "Cali", registro: "2025-07-02", comision: 6, experiencia: 3, estado: "Activo",
    eventos: [7, 12], entradas: 980, ingresos: 52100000, ventas: [50, 70, 90, 110, 130, 160],
    descripcion: "Conciertos acústicos y ferias gastronómicas." },
  { nit: "901778899-3", nombre: "Montaña Sonora", razon: "Montaña Sonora S.A.S.", correo: "hola@montanasonora.example",
    telefono: "3189990011", ciudad: "Bucaramanga", registro: "2026-09-28", comision: 7, experiencia: 1, estado: "Pendiente",
    eventos: [], entradas: 0, ingresos: 0, ventas: [0, 0, 0, 0, 0, 0],
    descripcion: "Festivales de rock en Santander. Espera la revisión de sus documentos." },
  { nit: "901889900-6", nombre: "Luna Llena Teatro", razon: "Corporación Luna Llena", correo: "lunallena@teatro.example",
    telefono: "3023334455", ciudad: "Medellín", registro: "2026-10-06", comision: 6, experiencia: 7, estado: "Pendiente",
    eventos: [], entradas: 0, ingresos: 0, ventas: [0, 0, 0, 0, 0, 0],
    descripcion: "Teatro infantil y de títeres. Espera la revisión de sus documentos." }
];

var NOMBRE_MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function ultimosMeses(cantidad) {
  var lista = [];
  var hoy = new Date();
  for (var i = cantidad - 1; i >= 0; i--) {
    var fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    lista.push(NOMBRE_MES[fecha.getMonth()] + " " + String(fecha.getFullYear()).slice(2));
  }
  return lista;
}

function resumenLocal(cantidad) {
  var etiquetas = ultimosMeses(cantidad);
  var desde = DEMO.reservas.length - cantidad;

  var meses = etiquetas.map(function (mes, i) {
    return { mes: mes, reservas: DEMO.reservas[desde + i], ingresos: DEMO.ingresos[desde + i] };
  });

  var totalIngresos = meses.reduce(function (s, m) { return s + m.ingresos; }, 0);
  var totalReservas = meses.reduce(function (s, m) { return s + m.reservas; }, 0);
  var sumaCategorias = DEMO.categorias.reduce(function (s, c) { return s + c[1]; }, 0);

  var conteo = {};
  D.eventos.forEach(function (evento) {
    conteo[evento.estado] = (conteo[evento.estado] || 0) + 1;
  });

  var activos = D.eventos.filter(function (e) {
    return e.estado !== "Finalizado" && e.estado !== "Cancelado";
  }).length;

  var actividad = [
    { cuando: "Hace 4 min", texto: "Nueva reserva de 4 entradas para " + D.eventos[0].titulo + "." },
    { cuando: "Hace 18 min", texto: "Tarima Producciones publicó un evento nuevo." },
    { cuando: "Hace 42 min", texto: "Verificación biométrica aprobada para un cliente de Cali." },
    { cuando: "Hace 1 h", texto: "Se canceló una reserva de 2 entradas para " + D.eventos[1].titulo + "." },
    { cuando: "Hace 3 h", texto: "Se registró el agente Pacífico Live." }
  ];

  return {
    indicadores: {
      eventosActivos: activos,
      reservas: totalReservas,
      ingresos: totalIngresos,
      agentes: AGENTES_DEMO.filter(function (a) { return a.estado === "Activo"; }).length,
      clientes: DEMO.clientes,
      verificacionesPendientes: DEMO.verificaciones
    },
    meses: meses,
    estados: Object.keys(COLOR_ESTADO).map(function (estado) {
      return { estado: estado, total: conteo[estado] || 0 };
    }),
    categorias: DEMO.categorias.map(function (c) {
      return { categoria: c[0], ingresos: Math.round(totalIngresos * c[1] / sumaCategorias) };
    }),
    agentes: AGENTES_DEMO.filter(function (a) { return a.estado === "Activo"; })
      .sort(function (a, b) { return b.ingresos - a.ingresos; })
      .slice(0, 5)
      .map(function (a) {
        var parte = cantidad / 12;
        return {
          nombre: a.nombre,
          eventos: a.eventos.length,
          entradas: Math.round(a.entradas * parte),
          ingresos: Math.round(a.ingresos * parte)
        };
      }),
    actividad: actividad
  };
}

function obtenerResumen(cantidad) {
  if (!D.usarApi) {
    return Promise.resolve(resumenLocal(cantidad));
  }

  var usuario = D.obtenerUsuario();
  return D.llamarApi("/admin/resumen?meses=" + cantidad, {
    headers: { Authorization: "Bearer " + usuario.token }
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudieron cargar los datos del panel.");
    }
    return resultado.datos;
  });
}


/* ===== UTILIDADES ===== */

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

/* Añade la clase "visible" cuando la tarjeta entra en pantalla: es la que
   arranca las animaciones del CSS */
function animarAlVer(elemento) {
  if (reducirMovimiento || !("IntersectionObserver" in window)) {
    elemento.classList.add("visible");
    return;
  }

  var observador = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
      if (entrada.isIntersecting) {
        requestAnimationFrame(function () { elemento.classList.add("visible"); });
        observador.disconnect();
      }
    });
  }, { threshold: 0.25 });

  observador.observe(elemento);
}

/* Cuenta desde 0 hasta el valor final */
function contar(elemento, final, formato) {
  if (reducirMovimiento) {
    elemento.textContent = formato(final);
    return;
  }

  var inicio = null;
  var duracion = 1100;

  function paso(tiempo) {
    if (inicio === null) inicio = tiempo;
    var avance = Math.min((tiempo - inicio) / duracion, 1);
    var suave = 1 - Math.pow(1 - avance, 3);
    elemento.textContent = formato(Math.round(final * suave));
    if (avance < 1) requestAnimationFrame(paso);
  }

  requestAnimationFrame(paso);
}

function tablaDatos(titulo, columnas, filas) {
  return '<details class="admin-datos">' +
    '<summary>Ver los datos en una tabla</summary>' +
    '<table>' +
      '<caption class="oculto">' + escapar(titulo) + '</caption>' +
      '<thead><tr>' + columnas.map(function (c) { return '<th scope="col">' + c + '</th>'; }).join("") + '</tr></thead>' +
      '<tbody>' + filas.map(function (fila) {
        return '<tr><th scope="row">' + escapar(fila[0]) + '</th>' +
          fila.slice(1).map(function (v) { return '<td>' + v + '</td>'; }).join("") + '</tr>';
      }).join("") + '</tbody>' +
    '</table>' +
  '</details>';
}


/* ===== INDICADORES ===== */

function pintarIndicadores(datos) {
  var ind = datos.indicadores;
  var ultimo = datos.meses[datos.meses.length - 1];
  var anterior = datos.meses[datos.meses.length - 2];

  function variacion(clave) {
    if (!anterior || !anterior[clave]) return null;
    return Math.round((ultimo[clave] - anterior[clave]) / anterior[clave] * 100);
  }

  var tarjetas = [
    { titulo: "Eventos activos", valor: ind.eventosActivos, formato: numero.format },
    { titulo: "Reservas", valor: ind.reservas, formato: numero.format, cambio: variacion("reservas") },
    { titulo: "Ingresos", valor: ind.ingresos, formato: pesosCompacto.format, completo: pesos.format, cambio: variacion("ingresos") },
    { titulo: "Agentes", valor: ind.agentes, formato: numero.format },
    { titulo: "Clientes", valor: ind.clientes, formato: numero.format },
    { titulo: "Verificaciones pendientes", valor: ind.verificacionesPendientes, formato: numero.format, alerta: true }
  ];

  pintarTarjetas(tarjetas);
}

/* Tarjetas de indicadores: { titulo, valor, formato, completo?, cambio?, alerta? } */
function pintarTarjetas(tarjetas) {
  var lista = document.getElementById("admin-indicadores");

  lista.innerHTML = tarjetas.map(function (t, i) {
    var cambio = "";
    if (t.cambio !== undefined && t.cambio !== null) {
      var sube = t.cambio >= 0;
      cambio = '<p class="admin-cambio ' + (sube ? "sube" : "baja") + '">' +
        (sube ? "Sube " : "Baja ") + Math.abs(t.cambio) + "% frente al mes anterior</p>";
    }

    return '<li class="admin-indicador' + (t.alerta ? " admin-indicador-alerta" : "") + '" style="--orden:' + i + '">' +
      '<p class="admin-indicador-titulo">' + t.titulo + '</p>' +
      '<p class="admin-indicador-valor">' +
        '<span aria-hidden="true" data-valor="' + i + '">' + t.formato(0) + '</span>' +
        '<span class="oculto">' + (t.completo || t.formato)(t.valor) + '</span>' +
      '</p>' +
      cambio +
    '</li>';
  }).join("");

  tarjetas.forEach(function (t, i) {
    contar(lista.querySelector('[data-valor="' + i + '"]'), t.valor, t.formato);
  });

  lista.classList.remove("visible");
  animarAlVer(lista);
}


/* ===== GRÁFICA DE MESES (área con línea) ===== */

var serieActual = "reservas";

function pintarMeses(datos) {
  var caja = document.getElementById("grafica-meses");
  var ancho = Math.max(caja.clientWidth, 280);
  var alto = ancho < 600 ? 240 : 300;
  var izq = 64;
  var der = 16;
  var arriba = 20;
  var abajo = 36;

  var valores = datos.meses.map(function (m) { return m[serieActual]; });
  var maximo = Math.max.apply(null, valores) * 1.15;
  var formato = serieActual === "ingresos" ? compacto.format : numero.format;
  var nombre = serieActual === "ingresos" ? "Ingresos" : "Reservas";

  var paso = (ancho - izq - der) / (valores.length - 1);
  var saltoEtiqueta = Math.ceil(52 / paso);
  var x = function (i) { return izq + i * paso; };
  var y = function (v) { return arriba + (alto - arriba - abajo) * (1 - v / maximo); };

  var puntos = valores.map(function (v, i) { return x(i).toFixed(1) + "," + y(v).toFixed(1); });
  var linea = "M" + puntos.join(" L");
  var area = linea + " L" + x(valores.length - 1).toFixed(1) + "," + (alto - abajo) +
             " L" + izq + "," + (alto - abajo) + " Z";

  var guias = "";
  for (var g = 0; g <= 4; g++) {
    var valorGuia = maximo * g / 4;
    var yGuia = y(valorGuia).toFixed(1);
    guias += '<line class="guia" x1="' + izq + '" x2="' + (ancho - der) + '" y1="' + yGuia + '" y2="' + yGuia + '"/>' +
             '<text class="eje" x="' + (izq - 10) + '" y="' + yGuia + '" text-anchor="end" dominant-baseline="middle">' +
               (serieActual === "ingresos" ? "$" : "") + formato(Math.round(valorGuia)) + '</text>';
  }

  var marcas = datos.meses.map(function (m, i) {
    var v = valores[i];
    var texto = (serieActual === "ingresos" ? pesos.format(v) : numero.format(v));
    return '<g class="punto" style="--orden:' + i + '">' +
      '<rect class="zona" x="' + (x(i) - paso / 2).toFixed(1) + '" y="' + arriba + '" width="' + paso.toFixed(1) + '" height="' + (alto - arriba - abajo) + '"/>' +
      '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="5"/>' +
      '<text class="valor" x="' + x(i).toFixed(1) + '" y="' + (y(v) - 14).toFixed(1) + '" text-anchor="middle">' + texto + '</text>' +
      ((valores.length - 1 - i) % saltoEtiqueta === 0
        ? '<text class="eje" x="' + x(i).toFixed(1) + '" y="' + (alto - 12) + '" text-anchor="middle">' + escapar(m.mes) + '</text>'
        : '') +
    '</g>';
  }).join("");

  var primero = valores[0];
  var ultimo = valores[valores.length - 1];
  var descripcion = nombre + " por mes, de " + datos.meses[0].mes + " a " + datos.meses[datos.meses.length - 1].mes +
    ": pasa de " + formato(primero) + " a " + formato(ultimo) + ".";

  caja.innerHTML =
    '<figure class="admin-figura grafica-area">' +
      '<svg viewBox="0 0 ' + ancho + ' ' + alto + '" role="img" aria-labelledby="desc-meses">' +
        '<title id="desc-meses">' + escapar(descripcion) + '</title>' +
        '<defs><linearGradient id="relleno-area" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#5b36f2" stop-opacity="0.35"/>' +
          '<stop offset="1" stop-color="#5b36f2" stop-opacity="0"/>' +
        '</linearGradient></defs>' +
        guias +
        '<path class="area" d="' + area + '"/>' +
        '<path class="linea" d="' + linea + '" pathLength="1"/>' +
        marcas +
      '</svg>' +
    '</figure>' +
    tablaDatos(nombre + " por mes", ["Mes", nombre], datos.meses.map(function (m) {
      return [m.mes, serieActual === "ingresos" ? pesos.format(m[serieActual]) : numero.format(m[serieActual])];
    }));

  var figura = caja.querySelector(".admin-figura");
  animarAlVer(figura);
}

function prepararSelectorSerie(obtenerDatos) {
  var botones = document.querySelectorAll(".admin-selector button");
  botones.forEach(function (boton) {
    boton.onclick = function () {
      serieActual = boton.getAttribute("data-serie");
      botones.forEach(function (b) {
        b.setAttribute("aria-pressed", b === boton ? "true" : "false");
      });
      pintarMeses(obtenerDatos());
    };
  });
}


/* ===== EVENTOS POR ESTADO (anillo) ===== */

function pintarEstados(datos) {
  var caja = document.getElementById("grafica-estados");
  var total = datos.estados.reduce(function (s, e) { return s + e.total; }, 0);
  var acumulado = 0;
  var separacion = 0.8;

  var segmentos = datos.estados.filter(function (e) { return e.total > 0; }).map(function (e, i) {
    var parte = e.total / total * 100;
    var largo = Math.max(parte - separacion, 0.1);
    var segmento = '<circle class="segmento" cx="60" cy="60" r="46" pathLength="100" ' +
      'style="--largo:' + largo.toFixed(2) + ';--inicio:' + (-acumulado).toFixed(2) + ';--orden:' + i + ';stroke:' + COLOR_ESTADO[e.estado] + '"/>';
    acumulado += parte;
    return segmento;
  }).join("");

  var leyenda = datos.estados.map(function (e) {
    var porcentaje = total ? Math.round(e.total / total * 100) : 0;
    return '<li>' +
      '<span class="muestra" style="background:' + COLOR_ESTADO[e.estado] + '" aria-hidden="true"></span>' +
      '<span class="leyenda-nombre">' + escapar(e.estado) + '</span>' +
      '<span class="leyenda-valor">' + e.total + ' <span class="texto-gris">(' + porcentaje + '%)</span></span>' +
    '</li>';
  }).join("");

  caja.innerHTML =
    '<figure class="admin-figura grafica-anillo">' +
      '<div class="anillo">' +
        '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">' +
          '<circle class="fondo-anillo" cx="60" cy="60" r="46"/>' + segmentos +
        '</svg>' +
        '<p class="anillo-total"><strong>' + total + '</strong> eventos</p>' +
      '</div>' +
      '<figcaption class="oculto">Distribución de los ' + total + ' eventos según su estado.</figcaption>' +
      '<ul class="leyenda">' + leyenda + '</ul>' +
    '</figure>';

  animarAlVer(caja.querySelector(".admin-figura"));
}


/* ===== BARRAS HORIZONTALES (categorías y agentes) ===== */

function pintarCategorias(datos) {
  var caja = document.getElementById("grafica-categorias");
  var maximo = Math.max.apply(null, datos.categorias.map(function (c) { return c.ingresos; }));

  caja.innerHTML =
    '<figure class="admin-figura">' +
      '<figcaption class="oculto">Ingresos de cada categoría en el periodo elegido.</figcaption>' +
      '<ul class="barras">' + datos.categorias.map(function (c, i) {
        return '<li style="--orden:' + i + '">' +
          '<div class="barra-texto"><span>' + escapar(c.categoria) + '</span><strong>' + pesos.format(c.ingresos) + '</strong></div>' +
          '<div class="barra-pista" aria-hidden="true"><span class="barra" style="--ancho:' + (c.ingresos / maximo * 100).toFixed(1) + '%"></span></div>' +
        '</li>';
      }).join("") + '</ul>' +
    '</figure>';

  animarAlVer(caja.querySelector(".admin-figura"));
}

function pintarAgentes(datos) {
  var caja = document.getElementById("grafica-agentes");
  var maximo = Math.max.apply(null, datos.agentes.map(function (a) { return a.ingresos; }));

  caja.innerHTML =
    '<figure class="admin-figura">' +
      '<figcaption class="oculto">Agentes ordenados por ingresos en el periodo elegido.</figcaption>' +
      '<ol class="barras ranking">' + datos.agentes.map(function (a, i) {
        return '<li style="--orden:' + i + '">' +
          '<span class="ranking-puesto" aria-hidden="true">' + (i + 1) + '</span>' +
          '<div class="ranking-cuerpo">' +
            '<div class="barra-texto"><span>' + escapar(a.nombre) + '</span><strong>' + pesos.format(a.ingresos) + '</strong></div>' +
            '<div class="barra-pista" aria-hidden="true"><span class="barra" style="--ancho:' + (a.ingresos / maximo * 100).toFixed(1) + '%"></span></div>' +
            '<p class="ranking-detalle">' + a.eventos + ' eventos · ' + numero.format(a.entradas) + ' entradas vendidas</p>' +
          '</div>' +
        '</li>';
      }).join("") + '</ol>' +
    '</figure>';

  animarAlVer(caja.querySelector(".admin-figura"));
}


/* ===== ACTIVIDAD RECIENTE ===== */

function pintarActividad(datos) {
  var lista = document.getElementById("admin-actividad");
  lista.innerHTML = datos.actividad.map(function (a, i) {
    return '<li style="--orden:' + i + '">' +
      '<span class="actividad-cuando">' + escapar(a.cuando) + '</span>' +
      '<span>' + escapar(a.texto) + '</span>' +
    '</li>';
  }).join("");

  lista.classList.remove("visible");
  animarAlVer(lista);
}


/* ===== PÁGINA: PANEL ===== */

/* Muestra la página si hay sesión de administrador; si no, el aviso de acceso */
function entrarComoAdmin() {
  var usuario = D.obtenerUsuario();

  if (!usuario || usuario.tipo !== "admin") {
    document.getElementById("admin-bloqueo").hidden = false;
    document.getElementById("bloqueo-entrar").onclick = function () {
      D.abrirAcceso("entrar");
    };
    return null;
  }

  document.getElementById("admin-marco").hidden = false;
  return usuario;
}

function cabeceraToken() {
  return { Authorization: "Bearer " + D.obtenerUsuario().token };
}

function paginaPanel() {
  var usuario = entrarComoAdmin();
  if (!usuario) return;

  document.getElementById("admin-saludo").textContent =
    "Hola, " + usuario.nombre.split(" ")[0] + ". Este es el resumen de El Desparche.";

  var aviso = document.getElementById("admin-aviso");
  var selector = document.getElementById("admin-meses");
  var datosActuales = null;

  function cargar() {
    var cantidad = Number(selector.value);

    obtenerResumen(cantidad).then(function (datos) {
      datosActuales = datos;
      aviso.textContent = D.usarApi ? "" :
        "Modo local: la base de datos está desactivada y se muestran datos de ejemplo.";
      pintarIndicadores(datos);
      pintarMeses(datos);
      pintarEstados(datos);
      pintarCategorias(datos);
      pintarAgentes(datos);
      pintarActividad(datos);
    }).catch(function (error) {
      aviso.innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
    });
  }

  selector.onchange = cargar;
  prepararSelectorSerie(function () { return datosActuales; });

  var cajaMeses = document.getElementById("grafica-meses");
  var anchoAnterior = 0;
  var espera = null;
  if ("ResizeObserver" in window) {
    new ResizeObserver(function () {
      clearTimeout(espera);
      espera = setTimeout(function () {
        var ancho = cajaMeses.clientWidth;
        if (datosActuales && ancho > 0 && Math.abs(ancho - anchoAnterior) > 20) {
          anchoAnterior = ancho;
          pintarMeses(datosActuales);
        }
      }, 150);
    }).observe(cajaMeses);
  }

  cargar();
}

/* ===== PÁGINA: AGENTES ===== */

var CLASE_AGENTE = {
  "Activo": "agente-activo",
  "Pendiente": "agente-pendiente",
  "Suspendido": "agente-suspendido"
};

function etiquetaAgente(estado) {
  return '<span class="estado ' + CLASE_AGENTE[estado] + '">' +
    '<span class="oculto">Estado: </span>' + estado +
  '</span>';
}

function normalizar(texto) {
  return String(texto).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function leerCambiosLocales() {
  try {
    return JSON.parse(localStorage.getItem("estadoAgentes")) || {};
  } catch (e) {
    return {};
  }
}

function guardarCambioLocal(nit, estado) {
  try {
    var cambios = leerCambiosLocales();
    cambios[nit] = estado;
    localStorage.setItem("estadoAgentes", JSON.stringify(cambios));
  } catch (e) {}
}

function obtenerAgentes() {
  if (!D.usarApi) {
    var cambios = leerCambiosLocales();
    return Promise.resolve(AGENTES_DEMO.map(function (a) {
      var copia = Object.assign({}, a);
      if (cambios[a.nit]) copia.estado = cambios[a.nit];
      return copia;
    }));
  }

  return D.llamarApi("/admin/agentes", { headers: cabeceraToken() }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cargar la lista de agentes.");
    }
    return resultado.datos.agentes;
  });
}

function cambiarEstadoAgente(nit, estado) {
  if (!D.usarApi) {
    guardarCambioLocal(nit, estado);
    return Promise.resolve();
  }

  return D.llamarApi("/admin/agentes/" + encodeURIComponent(nit) + "/estado", {
    method: "PATCH",
    headers: Object.assign({ "Content-Type": "application/json" }, cabeceraToken()),
    body: JSON.stringify({ estado: estado })
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cambiar el estado del agente.");
    }
  });
}

function fechaLarga(iso) {
  var partes = iso.split("-");
  return new Date(partes[0], partes[1] - 1, partes[2]).toLocaleDateString("es-CO", {
    day: "numeric", month: "long", year: "numeric"
  });
}

/* Columnas con un valor por cada uno de los últimos meses */
function graficaVentas(valores, titulo) {
  var agente = { ventas: valores };
  var meses = ultimosMeses(agente.ventas.length);
  var ancho = 360;
  var alto = 170;
  var abajo = 26;
  var arriba = 22;
  var maximo = Math.max.apply(null, agente.ventas.concat([1]));
  var paso = ancho / agente.ventas.length;
  var columna = Math.min(paso * 0.55, 34);

  var barras = agente.ventas.map(function (v, i) {
    var h = (alto - arriba - abajo) * v / maximo;
    var x = paso * i + (paso - columna) / 2;
    return '<g style="--orden:' + i + '">' +
      '<rect class="columna" x="' + x.toFixed(1) + '" y="' + (alto - abajo - h).toFixed(1) + '" width="' + columna.toFixed(1) + '" height="' + Math.max(h, 0).toFixed(1) + '" rx="6"/>' +
      '<text class="valor-columna" x="' + (x + columna / 2).toFixed(1) + '" y="' + (alto - abajo - h - 6).toFixed(1) + '" text-anchor="middle">' + numero.format(v) + '</text>' +
      '<text class="eje" x="' + (x + columna / 2).toFixed(1) + '" y="' + (alto - 6) + '" text-anchor="middle">' + meses[i] + '</text>' +
    '</g>';
  }).join("");

  return '<figure class="admin-figura grafica-columnas">' +
      '<svg viewBox="0 0 ' + ancho + ' ' + alto + '" aria-hidden="true" focusable="false">' +
        '<line class="guia" x1="0" x2="' + ancho + '" y1="' + (alto - abajo) + '" y2="' + (alto - abajo) + '"/>' +
        barras +
      '</svg>' +
    '</figure>' +
    tablaDatos(titulo, ["Mes", "Entradas"], agente.ventas.map(function (v, i) {
      return [meses[i], numero.format(v)];
    }));
}

function paginaAgentes() {
  if (!entrarComoAdmin()) return;

  var agentes = [];
  var aviso = document.getElementById("admin-aviso");
  var buscar = document.getElementById("buscar-agente");
  var filtroEstado = document.getElementById("filtro-estado");
  var filtroCiudad = document.getElementById("filtro-ciudad");
  var orden = document.getElementById("orden-agentes");
  var conteo = document.getElementById("conteo-agentes");
  var cuerpo = document.getElementById("cuerpo-agentes");
  var dialogo = document.getElementById("detalle-agente");
  var contenido = document.getElementById("detalle-contenido");
  var abierto = null;

  function contar(estado) {
    return agentes.filter(function (a) { return a.estado === estado; }).length;
  }

  function pintarResumen() {
    pintarTarjetas([
      { titulo: "Agentes registrados", valor: agentes.length, formato: numero.format },
      { titulo: "Activos", valor: contar("Activo"), formato: numero.format },
      { titulo: "Pendientes de aprobación", valor: contar("Pendiente"), formato: numero.format, alerta: true },
      { titulo: "Suspendidos", valor: contar("Suspendido"), formato: numero.format }
    ]);
  }

  function pintarTabla() {
    var texto = normalizar(buscar.value.trim());

    var lista = agentes.filter(function (a) {
      var coincide = texto === "" ||
        normalizar(a.nombre + " " + a.razon + " " + a.nit + " " + a.correo).indexOf(texto) !== -1;
      return coincide &&
        (filtroEstado.value === "" || a.estado === filtroEstado.value) &&
        (filtroCiudad.value === "" || a.ciudad === filtroCiudad.value);
    });

    lista.sort(function (a, b) {
      if (orden.value === "nombre") return a.nombre.localeCompare(b.nombre, "es");
      if (orden.value === "registro") return b.registro.localeCompare(a.registro);
      if (orden.value === "entradas") return b.entradas - a.entradas;
      return b.ingresos - a.ingresos;
    });

    conteo.textContent = lista.length === agentes.length
      ? "Mostrando los " + agentes.length + " agentes."
      : "Mostrando " + lista.length + " de " + agentes.length + " agentes.";

    if (lista.length === 0) {
      cuerpo.innerHTML = '<tr role="row"><td role="cell" colspan="7" class="tabla-vacia">' +
        'No hay agentes que coincidan con la búsqueda. Prueba con otros filtros.</td></tr>';
      return;
    }

    cuerpo.innerHTML = lista.map(function (a) {
      var accion = a.estado === "Pendiente" ? "Revisar" : "Ver detalle";
      return '<tr role="row" class="' + (a.estado === "Pendiente" ? "fila-pendiente" : "") + '">' +
        '<th scope="row" role="rowheader">' +
          '<span class="agente-celda">' +
            '<span class="agente-inicial" aria-hidden="true">' + escapar(a.nombre.charAt(0)) + '</span>' +
            '<span><span class="agente-nombre">' + escapar(a.nombre) + '</span>' +
            '<span class="agente-nit">NIT ' + escapar(a.nit) + '</span></span>' +
          '</span>' +
        '</th>' +
        '<td role="cell" data-etiqueta="Ciudad">' + escapar(a.ciudad) + '</td>' +
        '<td role="cell" data-etiqueta="Eventos" class="numero">' + a.eventos.length + '</td>' +
        '<td role="cell" data-etiqueta="Entradas vendidas" class="numero">' + numero.format(a.entradas) + '</td>' +
        '<td role="cell" data-etiqueta="Ingresos" class="numero">' + pesos.format(a.ingresos) + '</td>' +
        '<td role="cell" data-etiqueta="Estado">' + etiquetaAgente(a.estado) + '</td>' +
        '<td role="cell" class="celda-accion">' +
          '<button type="button" class="admin-boton-sec" data-nit="' + escapar(a.nit) + '">' +
            accion + '<span class="oculto"> de ' + escapar(a.nombre) + '</span>' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join("");
  }

  function botonesAccion(a) {
    if (a.estado === "Pendiente") {
      return '<button type="button" class="admin-boton" data-accion="Activo">Aprobar agente</button>';
    }
    if (a.estado === "Suspendido") {
      return '<button type="button" class="admin-boton" data-accion="Activo">Reactivar agente</button>';
    }
    return '<button type="button" class="admin-boton admin-boton-peligro" data-accion="confirmar">Suspender agente</button>';
  }

  function pintarDetalle(a, mensaje) {
    var eventos = a.eventos.map(function (id) {
      return D.eventos.filter(function (e) { return e.id === id; })[0];
    }).filter(Boolean);

    contenido.innerHTML =
      '<div class="detalle-cabecera">' +
        '<span class="agente-inicial agente-inicial-grande" aria-hidden="true">' + escapar(a.nombre.charAt(0)) + '</span>' +
        '<div>' +
          '<h2 id="detalle-nombre" tabindex="-1">' + escapar(a.nombre) + '</h2>' +
          '<p>' + escapar(a.razon) + '</p>' +
          etiquetaAgente(a.estado) +
        '</div>' +
      '</div>' +
      '<p class="detalle-aviso" id="detalle-aviso" role="status">' + (mensaje || "") + '</p>' +
      '<p class="detalle-descripcion">' + escapar(a.descripcion) + '</p>' +
      '<dl class="detalle-datos">' +
        '<div><dt>NIT</dt><dd>' + escapar(a.nit) + '</dd></div>' +
        '<div><dt>Ciudad</dt><dd>' + escapar(a.ciudad) + '</dd></div>' +
        '<div><dt>Correo</dt><dd><a href="mailto:' + escapar(a.correo) + '">' + escapar(a.correo) + '</a></dd></div>' +
        '<div><dt>Teléfono</dt><dd>' + escapar(a.telefono) + '</dd></div>' +
        '<div><dt>Registrado el</dt><dd>' + fechaLarga(a.registro) + '</dd></div>' +
        '<div><dt>Experiencia</dt><dd>' + a.experiencia + (a.experiencia === 1 ? " año" : " años") + '</dd></div>' +
        '<div><dt>Comisión</dt><dd>' + String(a.comision).replace(".", ",") + ' %</dd></div>' +
        '<div><dt>Ingresos (12 meses)</dt><dd>' + pesos.format(a.ingresos) + '</dd></div>' +
      '</dl>' +
      '<h3>Entradas vendidas por mes</h3>' +
      graficaVentas(a.ventas, "Entradas vendidas por mes") +
      '<h3>Eventos publicados</h3>' +
      (eventos.length
        ? '<ul class="detalle-eventos">' + eventos.map(function (e) {
            return '<li><a href="evento.html?id=' + e.id + '">' + escapar(e.titulo) + '</a>' +
              '<span class="detalle-evento-dato">' + escapar(e.ciudad) + ' · ' + escapar(e.fechaCorta) + '</span>' +
              D.etiquetaEstado(e.estado, false) + '</li>';
          }).join("") + '</ul>'
        : '<p class="texto-gris">Todavía no tiene eventos publicados.</p>') +
      '<div class="detalle-acciones" id="detalle-acciones">' + botonesAccion(a) + '</div>';

    animarAlVer(contenido.querySelector(".grafica-columnas"));
  }

  function aplicarEstado(a, estado) {
    var acciones = document.getElementById("detalle-acciones");
    acciones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });

    var verbo = estado === "Suspendido" ? "suspendido" : (a.estado === "Pendiente" ? "aprobado" : "reactivado");

    cambiarEstadoAgente(a.nit, estado).then(function () {
      a.estado = estado;
      var mensaje = a.nombre + " quedó " + verbo + ".";
      aviso.textContent = mensaje;
      pintarResumen();
      pintarTabla();
      pintarDetalle(a, mensaje);
      document.getElementById("detalle-nombre").focus();
    }).catch(function (error) {
      document.getElementById("detalle-aviso").innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
      acciones.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
    });
  }

  function confirmarSuspension(a) {
    var acciones = document.getElementById("detalle-acciones");
    acciones.innerHTML =
      '<div class="detalle-confirmar">' +
        '<p id="texto-confirmar"><strong>¿Suspender a ' + escapar(a.nombre) + '?</strong> ' +
        'Sus eventos dejarán de mostrarse y no podrá publicar nuevos hasta que lo reactives.</p>' +
        '<div class="detalle-botones">' +
          '<button type="button" class="admin-boton admin-boton-peligro" data-accion="Suspendido" aria-describedby="texto-confirmar">Sí, suspender</button>' +
          '<button type="button" class="admin-boton-sec" data-accion="cancelar">Cancelar</button>' +
        '</div>' +
      '</div>';
    acciones.querySelector('[data-accion="Suspendido"]').focus();
  }

  contenido.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-accion]");
    if (!boton || !abierto) return;

    var accion = boton.getAttribute("data-accion");
    if (accion === "confirmar") {
      confirmarSuspension(abierto);
    } else if (accion === "cancelar") {
      document.getElementById("detalle-acciones").innerHTML = botonesAccion(abierto);
      document.querySelector('#detalle-acciones [data-accion="confirmar"]').focus();
    } else {
      aplicarEstado(abierto, accion);
    }
  });

  cuerpo.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-nit]");
    if (!boton) return;

    abierto = agentes.filter(function (a) { return a.nit === boton.getAttribute("data-nit"); })[0];
    pintarDetalle(abierto);
    dialogo.showModal();
    document.getElementById("detalle-nombre").focus();
  });

  document.getElementById("detalle-cerrar").onclick = function () {
    dialogo.close();
  };

  dialogo.addEventListener("click", function (evento) {
    if (evento.target === dialogo) dialogo.close();
  });

  dialogo.addEventListener("close", function () {
    if (!abierto) return;
    var nit = abierto.nit;
    abierto = null;
    setTimeout(function () {
      var boton = cuerpo.querySelector('button[data-nit="' + nit + '"]');
      if (boton) {
        boton.focus();
      } else {
        document.getElementById("titulo-lista-agentes").focus();
      }
    }, 0);
  });

  document.getElementById("filtros-agentes").addEventListener("submit", function (evento) {
    evento.preventDefault();
  });
  buscar.addEventListener("input", pintarTabla);
  filtroEstado.onchange = pintarTabla;
  filtroCiudad.onchange = pintarTabla;
  orden.onchange = pintarTabla;

  obtenerAgentes().then(function (lista) {
    agentes = lista;

    var ciudades = agentes.map(function (a) { return a.ciudad; })
      .filter(function (c, i, todas) { return todas.indexOf(c) === i; })
      .sort(function (a, b) { return a.localeCompare(b, "es"); });
    ciudades.forEach(function (ciudad) {
      var opcion = document.createElement("option");
      opcion.value = ciudad;
      opcion.textContent = ciudad;
      filtroCiudad.appendChild(opcion);
    });

    if (!D.usarApi) {
      aviso.textContent = "Modo local: la base de datos está desactivada y se muestran datos de ejemplo.";
    }

    pintarResumen();
    pintarTabla();
  }).catch(function (error) {
    aviso.innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
  });
}

/* ===== PÁGINA: EVENTOS ===== */

var ESTADOS_EVENTO = ["Programado", "En Boletería", "En Vivo", "Finalizado", "Cancelado"];

function capacidadNumero(evento) {
  return typeof evento.capacidad === "number"
    ? evento.capacidad
    : Number(String(evento.capacidad).replace(/\D/g, ""));
}

/* Añade los datos calculados que usa la tabla */
function completarEvento(evento) {
  var capacidad = capacidadNumero(evento);
  var vendidas = Math.max(capacidad - evento.disponibles, 0);
  var agente = AGENTES_DEMO.filter(function (a) { return a.eventos.indexOf(evento.id) !== -1; })[0];

  return Object.assign({}, evento, {
    capacidadTotal: capacidad,
    vendidas: vendidas,
    ocupacion: capacidad ? Math.round(vendidas / capacidad * 100) : 0,
    ingresos: vendidas * evento.precio,
    agente: evento.agente || (agente ? agente.nombre : "Sin agente")
  });
}

function leerEstadosEventos() {
  try {
    return JSON.parse(localStorage.getItem("estadoEventos")) || {};
  } catch (e) {
    return {};
  }
}

function obtenerEventosAdmin() {
  if (!D.usarApi) {
    return Promise.resolve(D.eventos.map(completarEvento));
  }

  return D.llamarApi("/admin/eventos", { headers: cabeceraToken() }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cargar la lista de eventos.");
    }
    return resultado.datos.eventos.map(completarEvento);
  });
}

function cambiarEstadoEvento(id, estado, motivo) {
  if (!D.usarApi) {
    try {
      var estados = leerEstadosEventos();
      estados[id] = estado;
      localStorage.setItem("estadoEventos", JSON.stringify(estados));
    } catch (e) {}
    return Promise.resolve();
  }

  return D.llamarApi("/admin/eventos/" + encodeURIComponent(id) + "/estado", {
    method: "PATCH",
    headers: Object.assign({ "Content-Type": "application/json" }, cabeceraToken()),
    body: JSON.stringify({ estado: estado, motivo: motivo || null })
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cambiar el estado del evento.");
    }
  });
}

function textoPrecio(precio) {
  return precio === 0 ? "Gratis" : pesos.format(precio);
}

function barraOcupacion(e, grande) {
  if (e.estado === "Cancelado") {
    return '<span class="ocupacion-nula">No aplica</span>';
  }
  return '<span class="ocupacion' + (grande ? " ocupacion-grande" : "") + '">' +
    '<span class="ocupacion-texto">' + e.ocupacion + ' %' +
      (grande ? '' : '<span class="oculto"> de ocupación</span>') + '</span>' +
    '<span class="barra-pista" aria-hidden="true"><span class="barra" style="--ancho:' + e.ocupacion + '%;--orden:0"></span></span>' +
  '</span>';
}

function paginaEventosAdmin() {
  if (!entrarComoAdmin()) return;

  var eventos = [];
  var aviso = document.getElementById("admin-aviso");
  var buscar = document.getElementById("buscar-evento");
  var filtroEstado = document.getElementById("filtro-estado-evento");
  var filtroCiudad = document.getElementById("filtro-ciudad-evento");
  var orden = document.getElementById("orden-eventos");
  var conteo = document.getElementById("conteo-eventos");
  var cuerpo = document.getElementById("cuerpo-eventos");
  var dialogo = document.getElementById("detalle-evento");
  var contenido = document.getElementById("detalle-contenido");
  var abierto = null;

  function pintarResumen() {
    var tarjetas = [{ titulo: "Eventos", valor: eventos.length, formato: numero.format }];
    ESTADOS_EVENTO.forEach(function (estado) {
      tarjetas.push({
        titulo: estado,
        valor: eventos.filter(function (e) { return e.estado === estado; }).length,
        formato: numero.format
      });
    });
    pintarTarjetas(tarjetas);
  }

  function pintarTabla() {
    var texto = normalizar(buscar.value.trim());

    var lista = eventos.filter(function (e) {
      var coincide = texto === "" ||
        normalizar(e.titulo + " " + e.lugar + " " + e.ciudad + " " + e.agente).indexOf(texto) !== -1;
      return coincide &&
        (filtroEstado.value === "" || e.estado === filtroEstado.value) &&
        (filtroCiudad.value === "" || e.ciudad === filtroCiudad.value);
    });

    lista.sort(function (a, b) {
      if (orden.value === "nombre") return a.titulo.localeCompare(b.titulo, "es");
      if (orden.value === "precio") return b.precio - a.precio;
      if (orden.value === "ingresos") return b.ingresos - a.ingresos;
      return b.ocupacion - a.ocupacion;
    });

    conteo.textContent = lista.length === eventos.length
      ? "Mostrando los " + eventos.length + " eventos."
      : "Mostrando " + lista.length + " de " + eventos.length + " eventos.";

    if (lista.length === 0) {
      cuerpo.innerHTML = '<tr role="row"><td role="cell" colspan="6" class="tabla-vacia">' +
        'No hay eventos que coincidan con la búsqueda. Prueba con otros filtros.</td></tr>';
      return;
    }

    cuerpo.innerHTML = lista.map(function (e) {
      return '<tr role="row">' +
        '<th scope="row" role="rowheader">' +
          '<span class="agente-celda">' +
            '<img class="evento-miniatura" src="' + escapar(e.imagen) + '" alt="" />' +
            '<span><span class="agente-nombre">' + escapar(e.titulo) + '</span>' +
            '<span class="agente-nit">' + escapar(e.lugar) + ', ' + escapar(e.ciudad) + '</span></span>' +
          '</span>' +
        '</th>' +
        '<td role="cell" data-etiqueta="Fecha">' + escapar(e.fechaCorta) + '</td>' +
        '<td role="cell" data-etiqueta="Precio" class="numero">' + textoPrecio(e.precio) + '</td>' +
        '<td role="cell" data-etiqueta="Ocupación">' + barraOcupacion(e) + '</td>' +
        '<td role="cell" data-etiqueta="Estado">' + D.etiquetaEstado(e.estado, false) + '</td>' +
        '<td role="cell" class="celda-accion">' +
          '<button type="button" class="admin-boton-sec" data-id="' + e.id + '">' +
            'Gestionar<span class="oculto"> ' + escapar(e.titulo) + '</span>' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join("");

    animarAlVer(cuerpo);
  }

  function formularioEstado(e) {
    if (e.estado === "Finalizado" || e.estado === "Cancelado") {
      return '<p class="texto-gris">Este evento está ' + e.estado.toLowerCase() +
        ', así que su estado ya no se puede cambiar.</p>';
    }

    return '<form class="form-estado" id="form-estado" novalidate>' +
      '<div class="campo-estado">' +
        '<label for="nuevo-estado">Cambiar el estado</label>' +
        '<select id="nuevo-estado">' + ESTADOS_EVENTO.map(function (estado) {
          return '<option value="' + estado + '"' + (estado === e.estado ? " selected" : "") + '>' +
            estado + (estado === e.estado ? " (actual)" : "") + '</option>';
        }).join("") + '</select>' +
      '</div>' +
      '<div class="campo-motivo" id="campo-motivo" hidden>' +
        '<label for="motivo-cancelacion">Motivo de la cancelación</label>' +
        '<textarea id="motivo-cancelacion" rows="3" aria-describedby="ayuda-motivo"></textarea>' +
        '<p class="ayuda-motivo" id="ayuda-motivo">Se les mostrará a las personas que tenían reservas.</p>' +
      '</div>' +
      '<p class="detalle-error" id="error-estado" role="alert"></p>' +
      '<div class="detalle-botones" id="botones-estado">' +
        '<button type="submit" class="admin-boton">Guardar cambio</button>' +
      '</div>' +
    '</form>';
  }

  function pintarDetalle(e, mensaje) {
    contenido.innerHTML =
      '<div class="detalle-cabecera">' +
        '<img class="evento-miniatura evento-miniatura-grande" src="' + escapar(e.imagen) + '" alt="" />' +
        '<div>' +
          '<h2 id="detalle-nombre" tabindex="-1">' + escapar(e.titulo) + '</h2>' +
          '<p>' + escapar(e.lugar) + ', ' + escapar(e.ciudad) + '</p>' +
          D.etiquetaEstado(e.estado, false) +
        '</div>' +
      '</div>' +
      '<p class="detalle-aviso" id="detalle-aviso" role="status">' + (mensaje || "") + '</p>' +
      '<p class="detalle-descripcion">' + escapar(e.descripcion) + '</p>' +
      '<dl class="detalle-datos">' +
        '<div><dt>Agente</dt><dd>' + escapar(e.agente) + '</dd></div>' +
        '<div><dt>Precio</dt><dd>' + textoPrecio(e.precio) + '</dd></div>' +
        '<div><dt>Inicio</dt><dd>' + escapar(e.fechaInicio) + '</dd></div>' +
        '<div><dt>Fin</dt><dd>' + escapar(e.fechaFin) + '</dd></div>' +
        '<div><dt>Capacidad</dt><dd>' + numero.format(e.capacidadTotal) + ' personas</dd></div>' +
        '<div><dt>Entradas vendidas</dt><dd>' + numero.format(e.vendidas) + '</dd></div>' +
        '<div><dt>Disponibles</dt><dd>' + numero.format(e.disponibles) + '</dd></div>' +
        '<div><dt>Ingresos estimados</dt><dd>' + pesos.format(e.ingresos) + '</dd></div>' +
      '</dl>' +
      '<h3>Ocupación</h3>' +
      '<div class="detalle-ocupacion" id="detalle-ocupacion">' + barraOcupacion(e, true) + '</div>' +
      '<h3>Observaciones</h3>' +
      '<p class="detalle-descripcion">' + escapar(e.observaciones) + '</p>' +
      '<p><a class="detalle-enlace" href="evento.html?id=' + e.id + '">Ver la página pública del evento</a></p>' +
      '<div class="detalle-acciones">' + formularioEstado(e) + '</div>';

    animarAlVer(document.getElementById("detalle-ocupacion"));
  }

  function guardarEstado(e, estado, motivo) {
    var botones = document.getElementById("botones-estado");
    botones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });

    cambiarEstadoEvento(e.id, estado, motivo).then(function () {
      e.estado = estado;
      var original = D.eventos.filter(function (x) { return x.id === e.id; })[0];
      if (original) original.estado = estado;

      var mensaje = "El estado de " + e.titulo + " ahora es " + estado + ".";
      aviso.textContent = mensaje;
      pintarResumen();
      pintarTabla();
      pintarDetalle(e, mensaje);
      document.getElementById("detalle-nombre").focus();
    }).catch(function (error) {
      document.getElementById("error-estado").innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
      botones.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
    });
  }

  contenido.addEventListener("change", function (evento) {
    if (evento.target.id !== "nuevo-estado") return;
    var cancelar = evento.target.value === "Cancelado";
    document.getElementById("campo-motivo").hidden = !cancelar;
    document.getElementById("error-estado").textContent = "";
    document.getElementById("botones-estado").innerHTML =
      '<button type="submit" class="admin-boton' + (cancelar ? ' admin-boton-peligro' : '') + '">' +
        (cancelar ? "Cancelar el evento" : "Guardar cambio") + '</button>';
  });

  contenido.addEventListener("submit", function (evento) {
    evento.preventDefault();
    if (!abierto) return;

    var lista = document.getElementById("nuevo-estado");
    var elegido = lista.value;
    var error = document.getElementById("error-estado");
    var motivo = document.getElementById("motivo-cancelacion");
    error.textContent = "";
    motivo.removeAttribute("aria-invalid");

    if (elegido === abierto.estado) {
      error.innerHTML = "<strong>Error:</strong> Elige un estado distinto al actual.";
      lista.focus();
      return;
    }

    if (elegido !== "Cancelado") {
      guardarEstado(abierto, elegido);
      return;
    }

    if (motivo.value.trim().length < 10) {
      error.innerHTML = "<strong>Error:</strong> Escribe el motivo de la cancelación (10 caracteres como mínimo).";
      motivo.setAttribute("aria-invalid", "true");
      motivo.focus();
      return;
    }

    document.getElementById("botones-estado").innerHTML =
      '<div class="detalle-confirmar">' +
        '<p id="texto-confirmar"><strong>¿Cancelar ' + escapar(abierto.titulo) + '?</strong> ' +
        'Las reservas del evento quedarán canceladas y este cambio no se puede deshacer.</p>' +
        '<div class="detalle-botones">' +
          '<button type="button" class="admin-boton admin-boton-peligro" data-accion="si-cancelar" aria-describedby="texto-confirmar">Sí, cancelar el evento</button>' +
          '<button type="button" class="admin-boton-sec" data-accion="volver">Volver</button>' +
        '</div>' +
      '</div>';
    contenido.querySelector('[data-accion="si-cancelar"]').focus();
  });

  contenido.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-accion]");
    if (!boton || !abierto) return;

    if (boton.getAttribute("data-accion") === "si-cancelar") {
      guardarEstado(abierto, "Cancelado", document.getElementById("motivo-cancelacion").value.trim());
    } else {
      document.getElementById("botones-estado").innerHTML =
        '<button type="submit" class="admin-boton admin-boton-peligro">Cancelar el evento</button>';
      document.querySelector("#botones-estado button").focus();
    }
  });

  cuerpo.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-id]");
    if (!boton) return;

    abierto = eventos.filter(function (e) { return String(e.id) === boton.getAttribute("data-id"); })[0];
    pintarDetalle(abierto);
    dialogo.showModal();
    document.getElementById("detalle-nombre").focus();
  });

  document.getElementById("detalle-cerrar").onclick = function () {
    dialogo.close();
  };

  dialogo.addEventListener("click", function (evento) {
    if (evento.target === dialogo) dialogo.close();
  });

  dialogo.addEventListener("close", function () {
    if (!abierto) return;
    var id = abierto.id;
    abierto = null;
    setTimeout(function () {
      var boton = cuerpo.querySelector('button[data-id="' + id + '"]');
      if (boton) {
        boton.focus();
      } else {
        document.getElementById("titulo-lista-eventos").focus();
      }
    }, 0);
  });

  document.getElementById("filtros-eventos").addEventListener("submit", function (evento) {
    evento.preventDefault();
  });
  buscar.addEventListener("input", pintarTabla);
  filtroEstado.onchange = pintarTabla;
  filtroCiudad.onchange = pintarTabla;
  orden.onchange = pintarTabla;

  obtenerEventosAdmin().then(function (lista) {
    eventos = lista;

    eventos.map(function (e) { return e.ciudad; })
      .filter(function (c, i, todas) { return todas.indexOf(c) === i; })
      .sort(function (a, b) { return a.localeCompare(b, "es"); })
      .forEach(function (ciudad) {
        var opcion = document.createElement("option");
        opcion.value = ciudad;
        opcion.textContent = ciudad;
        filtroCiudad.appendChild(opcion);
      });

    if (!D.usarApi) {
      aviso.textContent = "Modo local: la base de datos está desactivada y se muestran datos de ejemplo.";
    }

    pintarResumen();
    pintarTabla();
  }).catch(function (error) {
    aviso.innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
  });
}

/* ===== PÁGINA: CLIENTES ===== */

/* "reservas": [id del evento, entradas, estado, fecha]; "compras": entradas
   compradas en cada uno de los últimos 6 meses */
var CLIENTES_DEMO = [
  { documento: "1116254789", tipoDoc: "CC", nombre: "Valentina Ríos Castaño", alias: "valeri", correo: "valentina.rios@correo.example",
    telefono: "3104452211", ciudad: "Tuluá", nacimiento: "2001-04-17", registro: "2025-02-10", puntos: 1840, publicidad: true,
    verificacion: "Aprobada", cuenta: "Activa", compras: [2, 0, 4, 2, 0, 3],
    reservas: [[1, 2, "Confirmada", "2026-09-02"], [4, 3, "Confirmada", "2026-07-21"], [2, 2, "Reservada", "2026-10-01"], [7, 2, "Cancelada", "2026-06-14"]] },
  { documento: "1006478123", tipoDoc: "CC", nombre: "Juan David Ospina", alias: "juanchoo", correo: "jd.ospina@correo.example",
    telefono: "3016547890", ciudad: "Cali", nacimiento: "1998-11-02", registro: "2024-12-03", puntos: 2650, publicidad: false,
    verificacion: "Aprobada", cuenta: "Activa", compras: [4, 2, 0, 6, 2, 4],
    reservas: [[11, 4, "Confirmada", "2026-09-28"], [5, 2, "Confirmada", "2026-08-15"], [9, 6, "Confirmada", "2026-07-03"], [12, 4, "Reservada", "2026-10-09"]] },
  { documento: "52987654", tipoDoc: "CC", nombre: "Laura Melisa Gómez", alias: "laumeli", correo: "laura.gomez@correo.example",
    telefono: "3201234567", ciudad: "Bogotá", nacimiento: "1994-06-25", registro: "2025-05-19", puntos: 920, publicidad: true,
    verificacion: "Pendiente", cuenta: "Activa", compras: [0, 0, 2, 0, 0, 0],
    reservas: [[3, 2, "Confirmada", "2026-07-11"]] },
  { documento: "1144098765", tipoDoc: "CC", nombre: "Santiago Herrera Mejía", alias: "santi.hm", correo: "santiago.herrera@correo.example",
    telefono: "3157788990", ciudad: "Medellín", nacimiento: "2003-01-30", registro: "2026-01-22", puntos: 410, publicidad: true,
    verificacion: "Aprobada", cuenta: "Activa", compras: [0, 1, 0, 0, 2, 0],
    reservas: [[2, 2, "Confirmada", "2026-09-05"], [8, 1, "Reservada", "2026-06-20"]] },
  { documento: "AB123456", tipoDoc: "PAS", nombre: "Camila Andrade Paz", alias: "camiap", correo: "camila.andrade@correo.example",
    telefono: "3005551234", ciudad: "Barranquilla", nacimiento: "1990-09-12", registro: "2025-10-08", puntos: 1300, publicidad: false,
    verificacion: "Rechazada", cuenta: "Activa", compras: [0, 0, 0, 0, 0, 0],
    reservas: [] },
  { documento: "1088345612", tipoDoc: "CC", nombre: "Andrés Felipe Cardona", alias: "pipecardona", correo: "andres.cardona@correo.example",
    telefono: "3112223344", ciudad: "Cali", nacimiento: "1987-03-08", registro: "2024-08-30", puntos: 3420, publicidad: true,
    verificacion: "Aprobada", cuenta: "Activa", compras: [6, 4, 8, 2, 4, 6],
    reservas: [[4, 4, "Confirmada", "2026-10-02"], [11, 6, "Confirmada", "2026-09-17"], [5, 8, "Confirmada", "2026-07-25"], [10, 2, "Cancelada", "2026-05-30"]] },
  { documento: "1234567890", tipoDoc: "TI", nombre: "Mariana López Zapata", alias: "mari.lz", correo: "mariana.lopez@correo.example",
    telefono: "3189876543", ciudad: "Bucaramanga", nacimiento: "2010-12-05", registro: "2026-08-14", puntos: 60, publicidad: false,
    verificacion: "Sin solicitar", cuenta: "Activa", compras: [0, 0, 0, 0, 0, 0],
    reservas: [] },
  { documento: "1017223344", tipoDoc: "CC", nombre: "Daniel Esteban Muñoz", alias: "danimu", correo: "daniel.munoz@correo.example",
    telefono: "3046667788", ciudad: "Medellín", nacimiento: "1996-07-19", registro: "2025-03-27", puntos: 0, publicidad: true,
    verificacion: "Aprobada", cuenta: "Bloqueada", compras: [8, 6, 0, 0, 0, 0],
    reservas: [[2, 8, "Cancelada", "2026-05-11"], [9, 6, "Cancelada", "2026-06-02"]] },
  { documento: "PPT987654", tipoDoc: "PPT", nombre: "Gabriela Pérez Rondón", alias: "gabyp", correo: "gabriela.perez@correo.example",
    telefono: "3227654321", ciudad: "Bogotá", nacimiento: "1999-02-14", registro: "2026-03-03", puntos: 780, publicidad: true,
    verificacion: "Pendiente", cuenta: "Activa", compras: [0, 2, 0, 1, 0, 0],
    reservas: [[1, 2, "Reservada", "2026-06-29"], [3, 1, "Confirmada", "2026-08-04"]] },
  { documento: "94321765", tipoDoc: "CC", nombre: "Carlos Alberto Restrepo", alias: "caresp", correo: "carlos.restrepo@correo.example",
    telefono: "3135550099", ciudad: "Tuluá", nacimiento: "1975-10-21", registro: "2024-06-11", puntos: 2210, publicidad: false,
    verificacion: "Aprobada", cuenta: "Activa", compras: [2, 0, 2, 0, 4, 2],
    reservas: [[6, 2, "Confirmada", "2026-09-30"], [12, 4, "Confirmada", "2026-08-12"], [3, 2, "Confirmada", "2026-05-18"]] },
  { documento: "1110556677", tipoDoc: "CC", nombre: "Sofía Marín Arango", alias: "sofimarin", correo: "sofia.marin@correo.example",
    telefono: "3009998877", ciudad: "Cali", nacimiento: "2005-05-03", registro: "2026-09-20", puntos: 120, publicidad: true,
    verificacion: "Pendiente", cuenta: "Activa", compras: [0, 0, 0, 0, 0, 2],
    reservas: [[4, 2, "Reservada", "2026-10-11"]] },
  { documento: "80654321", tipoDoc: "CE", nombre: "Mateo Fernández Ruiz", alias: "mateofr", correo: "mateo.fernandez@correo.example",
    telefono: "3174443322", ciudad: "Barranquilla", nacimiento: "1992-08-28", registro: "2025-07-07", puntos: 0, publicidad: false,
    verificacion: "Rechazada", cuenta: "Bloqueada", compras: [0, 0, 0, 0, 0, 0],
    reservas: [] }
];

var CLASE_VERIFICACION = {
  "Aprobada": "agente-activo",
  "Pendiente": "agente-pendiente",
  "Rechazada": "estado-vivo",
  "Sin solicitar": "estado-finalizado"
};

var CLASE_RESERVA = {
  "Confirmada": "agente-activo",
  "Reservada": "agente-pendiente",
  "Cancelada": "agente-suspendido"
};

function etiqueta(texto, clase, prefijo) {
  return '<span class="estado ' + clase + '"><span class="oculto">' + prefijo + ': </span>' + escapar(texto) + '</span>';
}

function edad(nacimiento) {
  var partes = nacimiento.split("-");
  var hoy = new Date();
  var anios = hoy.getFullYear() - Number(partes[0]);
  var mes = hoy.getMonth() + 1 - Number(partes[1]);
  if (mes < 0 || (mes === 0 && hoy.getDate() < Number(partes[2]))) anios--;
  return anios;
}

function leerCuentasLocales() {
  try {
    return JSON.parse(localStorage.getItem("estadoClientes")) || {};
  } catch (e) {
    return {};
  }
}

function obtenerClientes() {
  if (!D.usarApi) {
    var cambios = leerCuentasLocales();
    var verificaciones = D.leerVerificaciones();
    return Promise.resolve(CLIENTES_DEMO.map(function (c) {
      var copia = Object.assign({}, c);
      if (cambios[c.documento]) copia.cuenta = cambios[c.documento];
      if (verificaciones[c.correo]) copia.verificacion = verificaciones[c.correo].estado;
      return copia;
    }));
  }

  return D.llamarApi("/admin/clientes", { headers: cabeceraToken() }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cargar la lista de clientes.");
    }
    return resultado.datos.clientes;
  });
}

function cambiarCuentaCliente(documento, cuenta) {
  if (!D.usarApi) {
    try {
      var cambios = leerCuentasLocales();
      cambios[documento] = cuenta;
      localStorage.setItem("estadoClientes", JSON.stringify(cambios));
    } catch (e) {}
    return Promise.resolve();
  }

  return D.llamarApi("/admin/clientes/" + encodeURIComponent(documento) + "/estado", {
    method: "PATCH",
    headers: Object.assign({ "Content-Type": "application/json" }, cabeceraToken()),
    body: JSON.stringify({ estado: cuenta })
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cambiar el estado de la cuenta.");
    }
  });
}

function paginaClientes() {
  if (!entrarComoAdmin()) return;

  var clientes = [];
  var aviso = document.getElementById("admin-aviso");
  var buscar = document.getElementById("buscar-cliente");
  var filtroVerificacion = document.getElementById("filtro-verificacion");
  var filtroCuenta = document.getElementById("filtro-cuenta");
  var orden = document.getElementById("orden-clientes");
  var conteo = document.getElementById("conteo-clientes");
  var cuerpo = document.getElementById("cuerpo-clientes");
  var dialogo = document.getElementById("detalle-cliente");
  var contenido = document.getElementById("detalle-contenido");
  var abierto = null;

  function pintarResumen() {
    var cuantos = function (prueba) { return clientes.filter(prueba).length; };
    pintarTarjetas([
      { titulo: "Clientes registrados", valor: clientes.length, formato: numero.format },
      { titulo: "Identidad verificada", valor: cuantos(function (c) { return c.verificacion === "Aprobada"; }), formato: numero.format },
      { titulo: "Verificación pendiente", valor: cuantos(function (c) { return c.verificacion === "Pendiente"; }), formato: numero.format, alerta: true },
      { titulo: "Cuentas bloqueadas", valor: cuantos(function (c) { return c.cuenta === "Bloqueada"; }), formato: numero.format }
    ]);
  }

  function pintarTabla() {
    var texto = normalizar(buscar.value.trim());

    var lista = clientes.filter(function (c) {
      var coincide = texto === "" ||
        normalizar(c.nombre + " " + c.documento + " " + c.correo + " " + c.alias).indexOf(texto) !== -1;
      return coincide &&
        (filtroVerificacion.value === "" || c.verificacion === filtroVerificacion.value) &&
        (filtroCuenta.value === "" || c.cuenta === filtroCuenta.value);
    });

    lista.sort(function (a, b) {
      if (orden.value === "nombre") return a.nombre.localeCompare(b.nombre, "es");
      if (orden.value === "reservas") return b.reservas.length - a.reservas.length;
      if (orden.value === "puntos") return b.puntos - a.puntos;
      return b.registro.localeCompare(a.registro);
    });

    conteo.textContent = lista.length === clientes.length
      ? "Mostrando los " + clientes.length + " clientes."
      : "Mostrando " + lista.length + " de " + clientes.length + " clientes.";

    if (lista.length === 0) {
      cuerpo.innerHTML = '<tr role="row"><td role="cell" colspan="7" class="tabla-vacia">' +
        'No hay clientes que coincidan con la búsqueda. Prueba con otros filtros.</td></tr>';
      return;
    }

    cuerpo.innerHTML = lista.map(function (c) {
      return '<tr role="row" class="' + (c.cuenta === "Bloqueada" ? "fila-bloqueada" : "") + '">' +
        '<th scope="row" role="rowheader">' +
          '<span class="agente-celda">' +
            '<span class="agente-inicial agente-inicial-cliente" aria-hidden="true">' + escapar(c.nombre.charAt(0)) + '</span>' +
            '<span><span class="agente-nombre">' + escapar(c.nombre) + '</span>' +
            '<span class="agente-nit">' + escapar(c.tipoDoc) + ' ' + escapar(c.documento) +
              (c.cuenta === "Bloqueada" ? ' · <strong class="texto-bloqueada">Cuenta bloqueada</strong>' : '') + '</span></span>' +
          '</span>' +
        '</th>' +
        '<td role="cell" data-etiqueta="Ciudad">' + escapar(c.ciudad) + '</td>' +
        '<td role="cell" data-etiqueta="Edad" class="numero">' + edad(c.nacimiento) + ' años</td>' +
        '<td role="cell" data-etiqueta="Reservas" class="numero">' + c.reservas.length + '</td>' +
        '<td role="cell" data-etiqueta="Puntos" class="numero">' + numero.format(c.puntos) + '</td>' +
        '<td role="cell" data-etiqueta="Verificación">' + etiqueta(c.verificacion, CLASE_VERIFICACION[c.verificacion], "Verificación") + '</td>' +
        '<td role="cell" class="celda-accion">' +
          '<button type="button" class="admin-boton-sec" data-documento="' + escapar(c.documento) + '">' +
            'Ver detalle<span class="oculto"> de ' + escapar(c.nombre) + '</span>' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join("");
  }

  function botonesCuenta(c) {
    return c.cuenta === "Bloqueada"
      ? '<button type="button" class="admin-boton" data-accion="Activa">Desbloquear cuenta</button>'
      : '<button type="button" class="admin-boton admin-boton-peligro" data-accion="confirmar">Bloquear cuenta</button>';
  }

  function pintarDetalle(c, mensaje) {
    var gastado = 0;
    var historial = c.reservas.map(function (r) {
      var evento = D.eventos.filter(function (e) { return e.id === r[0]; })[0];
      if (!evento) return "";
      var valor = r[1] * evento.precio;
      if (r[2] !== "Cancelada") gastado += valor;
      return '<li>' +
        '<a href="evento.html?id=' + evento.id + '">' + escapar(evento.titulo) + '</a>' +
        '<span class="detalle-evento-dato">' + fechaLarga(r[3]) + ' · ' + r[1] +
          (r[1] === 1 ? " entrada" : " entradas") + ' · ' + textoPrecio(valor) + '</span>' +
        etiqueta(r[2], CLASE_RESERVA[r[2]], "Reserva") +
      '</li>';
    }).join("");

    contenido.innerHTML =
      '<div class="detalle-cabecera">' +
        '<span class="agente-inicial agente-inicial-grande agente-inicial-cliente" aria-hidden="true">' + escapar(c.nombre.charAt(0)) + '</span>' +
        '<div>' +
          '<h2 id="detalle-nombre" tabindex="-1">' + escapar(c.nombre) + '</h2>' +
          '<p>@' + escapar(c.alias) + '</p>' +
          '<span class="detalle-etiquetas">' +
            etiqueta(c.verificacion, CLASE_VERIFICACION[c.verificacion], "Verificación") +
            (c.cuenta === "Bloqueada" ? etiqueta("Cuenta bloqueada", "agente-suspendido", "Cuenta") : "") +
          '</span>' +
        '</div>' +
      '</div>' +
      '<p class="detalle-aviso" id="detalle-aviso" role="status">' + (mensaje || "") + '</p>' +
      '<dl class="detalle-datos">' +
        '<div><dt>Documento</dt><dd>' + escapar(c.tipoDoc) + ' ' + escapar(c.documento) + '</dd></div>' +
        '<div><dt>Ciudad</dt><dd>' + escapar(c.ciudad) + '</dd></div>' +
        '<div><dt>Correo</dt><dd><a href="mailto:' + escapar(c.correo) + '">' + escapar(c.correo) + '</a></dd></div>' +
        '<div><dt>Teléfono</dt><dd>' + escapar(c.telefono) + '</dd></div>' +
        '<div><dt>Fecha de nacimiento</dt><dd>' + fechaLarga(c.nacimiento) + ' (' + edad(c.nacimiento) + ' años)</dd></div>' +
        '<div><dt>Registrado el</dt><dd>' + fechaLarga(c.registro) + '</dd></div>' +
        '<div><dt>Puntos</dt><dd>' + numero.format(c.puntos) + '</dd></div>' +
        '<div><dt>Recibe publicidad</dt><dd>' + (c.publicidad ? "Sí" : "No") + '</dd></div>' +
        '<div><dt>Reservas</dt><dd>' + c.reservas.length + '</dd></div>' +
        '<div><dt>Total gastado</dt><dd>' + pesos.format(gastado) + '</dd></div>' +
      '</dl>' +
      '<h3>Entradas compradas por mes</h3>' +
      graficaVentas(c.compras, "Entradas compradas por mes") +
      '<h3>Historial de reservas</h3>' +
      (historial
        ? '<ul class="detalle-eventos">' + historial + '</ul>'
        : '<p class="texto-gris">Todavía no ha hecho ninguna reserva.</p>') +
      '<div class="detalle-acciones" id="detalle-acciones">' + botonesCuenta(c) + '</div>';

    animarAlVer(contenido.querySelector(".grafica-columnas"));
  }

  function aplicarCuenta(c, cuenta) {
    var acciones = document.getElementById("detalle-acciones");
    acciones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });

    cambiarCuentaCliente(c.documento, cuenta).then(function () {
      c.cuenta = cuenta;
      var mensaje = "La cuenta de " + c.nombre + (cuenta === "Bloqueada" ? " quedó bloqueada." : " quedó desbloqueada.");
      aviso.textContent = mensaje;
      pintarResumen();
      pintarTabla();
      pintarDetalle(c, mensaje);
      document.getElementById("detalle-nombre").focus();
    }).catch(function (error) {
      document.getElementById("detalle-aviso").innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
      acciones.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
    });
  }

  contenido.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-accion]");
    if (!boton || !abierto) return;

    var accion = boton.getAttribute("data-accion");
    var acciones = document.getElementById("detalle-acciones");

    if (accion === "confirmar") {
      acciones.innerHTML =
        '<div class="detalle-confirmar">' +
          '<p id="texto-confirmar"><strong>¿Bloquear la cuenta de ' + escapar(abierto.nombre) + '?</strong> ' +
          'No podrá iniciar sesión ni hacer reservas hasta que la desbloquees.</p>' +
          '<div class="detalle-botones">' +
            '<button type="button" class="admin-boton admin-boton-peligro" data-accion="Bloqueada" aria-describedby="texto-confirmar">Sí, bloquear</button>' +
            '<button type="button" class="admin-boton-sec" data-accion="cancelar">Cancelar</button>' +
          '</div>' +
        '</div>';
      acciones.querySelector('[data-accion="Bloqueada"]').focus();
    } else if (accion === "cancelar") {
      acciones.innerHTML = botonesCuenta(abierto);
      acciones.querySelector("button").focus();
    } else {
      aplicarCuenta(abierto, accion);
    }
  });

  cuerpo.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-documento]");
    if (!boton) return;

    abierto = clientes.filter(function (c) { return c.documento === boton.getAttribute("data-documento"); })[0];
    pintarDetalle(abierto);
    dialogo.showModal();
    document.getElementById("detalle-nombre").focus();
  });

  document.getElementById("detalle-cerrar").onclick = function () {
    dialogo.close();
  };

  dialogo.addEventListener("click", function (evento) {
    if (evento.target === dialogo) dialogo.close();
  });

  dialogo.addEventListener("close", function () {
    if (!abierto) return;
    var documento = abierto.documento;
    abierto = null;
    setTimeout(function () {
      var boton = cuerpo.querySelector('button[data-documento="' + documento + '"]');
      if (boton) {
        boton.focus();
      } else {
        document.getElementById("titulo-lista-clientes").focus();
      }
    }, 0);
  });

  document.getElementById("filtros-clientes").addEventListener("submit", function (evento) {
    evento.preventDefault();
  });
  buscar.addEventListener("input", pintarTabla);
  filtroVerificacion.onchange = pintarTabla;
  filtroCuenta.onchange = pintarTabla;
  orden.onchange = pintarTabla;

  obtenerClientes().then(function (lista) {
    clientes = lista;

    if (!D.usarApi) {
      aviso.textContent = "Modo local: la base de datos está desactivada y se muestran datos de ejemplo.";
    }

    pintarResumen();
    pintarTabla();
  }).catch(function (error) {
    aviso.innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
  });
}

/* ===== PÁGINA: RESERVAS Y PAGOS (WOMPI) ===== */

var METODOS_WOMPI = {
  "CARD": "Tarjeta",
  "NEQUI": "Nequi",
  "PSE": "PSE",
  "BANCOLOMBIA_TRANSFER": "Botón Bancolombia"
};

var ESTADOS_WOMPI = {
  "APPROVED": "Aprobado",
  "PENDING": "Pendiente",
  "DECLINED": "Rechazado",
  "VOIDED": "Anulado",
  "ERROR": "Error"
};

var CLASE_PAGO = {
  "APPROVED": "agente-activo",
  "PENDING": "agente-pendiente",
  "DECLINED": "estado-vivo",
  "VOIDED": "agente-suspendido",
  "ERROR": "estado-finalizado"
};

var COLOR_PAGO = {
  "APPROVED": "var(--grafica-azul)",
  "PENDING": "var(--grafica-amarillo)",
  "DECLINED": "var(--grafica-magenta)",
  "VOIDED": "var(--grafica-naranja)",
  "ERROR": "var(--grafica-morado)"
};

function dosCifras(n) {
  return (n < 10 ? "0" : "") + n;
}

/* Las reservas de ejemplo salen del historial de CLIENTES_DEMO */
function reservasLocales() {
  var lista = [];
  var metodos = Object.keys(METODOS_WOMPI);
  var n = 0;

  CLIENTES_DEMO.forEach(function (c) {
    c.reservas.forEach(function (r) {
      var evento = D.eventos.filter(function (e) { return e.id === r[0]; })[0];
      if (!evento) return;
      n++;

      var fecha = r[3] + "T" + dosCifras(9 + n % 12) + ":" + dosCifras((n * 7) % 60) + ":00";
      var valor = r[1] * evento.precio;
      var estadoPago = r[2] === "Confirmada" ? "APPROVED"
        : r[2] === "Reservada" ? (n % 3 === 0 ? "ERROR" : "PENDING")
        : (n % 2 ? "DECLINED" : "VOIDED");

      lista.push({
        codigo: "DES-" + (1040 + n),
        fecha: fecha,
        estado: r[2],
        cliente: c.nombre,
        documento: c.tipoDoc + " " + c.documento,
        correo: c.correo,
        eventoId: evento.id,
        evento: evento.titulo,
        entradas: r[1],
        precio: evento.precio,
        valor: valor,
        pago: valor === 0 ? null : {
          id: (11482 + n * 13) + "-" + Math.floor(new Date(fecha).getTime() / 1000) + "-" + (10000 + n * 379),
          metodo: metodos[n % metodos.length],
          estado: estadoPago,
          montoCentavos: valor * 100,
          moneda: "COP"
        }
      });
    });
  });

  /* Reservas hechas desde este navegador en reservar.html */
  D.obtenerReservas().filter(function (r) { return r.fechaIso; }).forEach(function (r) {
    var evento = D.eventos.filter(function (e) { return e.id === r.idEvento; })[0];
    lista.push({
      codigo: r.codigo,
      fecha: r.fechaIso,
      estado: r.estado,
      cliente: r.titular,
      documento: r.documento || "",
      correo: r.correo || "",
      eventoId: r.idEvento,
      evento: r.titulo,
      entradas: r.tickets,
      precio: evento ? evento.precio : 0,
      valor: r.total,
      pago: r.pago || null
    });
  });

  return lista;
}

function leerReservasLocales() {
  try {
    return JSON.parse(localStorage.getItem("estadoReservas")) || {};
  } catch (e) {
    return {};
  }
}

function obtenerReservasAdmin() {
  if (!D.usarApi) {
    var cambios = leerReservasLocales();
    return Promise.resolve(reservasLocales().map(function (r) {
      if (cambios[r.codigo]) r.estado = cambios[r.codigo];
      return r;
    }));
  }

  return D.llamarApi("/admin/reservas", { headers: cabeceraToken() }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cargar la lista de reservas.");
    }
    return resultado.datos.reservas;
  });
}

function cancelarReservaAdmin(codigo) {
  if (!D.usarApi) {
    try {
      var cambios = leerReservasLocales();
      cambios[codigo] = "Cancelada";
      localStorage.setItem("estadoReservas", JSON.stringify(cambios));
    } catch (e) {}
    return Promise.resolve();
  }

  return D.llamarApi("/admin/reservas/" + encodeURIComponent(codigo) + "/estado", {
    method: "PATCH",
    headers: Object.assign({ "Content-Type": "application/json" }, cabeceraToken()),
    body: JSON.stringify({ estado: "Cancelada" })
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cancelar la reserva.");
    }
  });
}

function fechaHora(iso) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit"
  });
}

function etiquetaPago(pago) {
  if (!pago) return '<span class="texto-gris">Sin pago (gratis)</span>';
  return etiqueta(ESTADOS_WOMPI[pago.estado], CLASE_PAGO[pago.estado], "Pago");
}

/* Anillo con leyenda: [{ nombre, total, color }] */
function graficaAnillo(items, nombreTotal, descripcion) {
  var total = items.reduce(function (s, i) { return s + i.total; }, 0);
  var acumulado = 0;

  var segmentos = items.filter(function (i) { return i.total > 0; }).map(function (item, i) {
    var parte = item.total / total * 100;
    var largo = Math.max(parte - 0.8, 0.1);
    var html = '<circle class="segmento" cx="60" cy="60" r="46" pathLength="100" ' +
      'style="--largo:' + largo.toFixed(2) + ';--inicio:' + (-acumulado).toFixed(2) + ';--orden:' + i + ';stroke:' + item.color + '"/>';
    acumulado += parte;
    return html;
  }).join("");

  return '<figure class="admin-figura grafica-anillo">' +
      '<div class="anillo">' +
        '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">' +
          '<circle class="fondo-anillo" cx="60" cy="60" r="46"/>' + segmentos +
        '</svg>' +
        '<p class="anillo-total"><strong>' + total + '</strong> ' + nombreTotal + '</p>' +
      '</div>' +
      '<figcaption class="oculto">' + escapar(descripcion) + '</figcaption>' +
      '<ul class="leyenda">' + items.map(function (item) {
        var porcentaje = total ? Math.round(item.total / total * 100) : 0;
        return '<li>' +
          '<span class="muestra" style="background:' + item.color + '" aria-hidden="true"></span>' +
          '<span class="leyenda-nombre">' + escapar(item.nombre) + '</span>' +
          '<span class="leyenda-valor">' + item.total + ' <span class="texto-gris">(' + porcentaje + '%)</span></span>' +
        '</li>';
      }).join("") + '</ul>' +
    '</figure>';
}

function paginaReservasAdmin() {
  if (!entrarComoAdmin()) return;

  var reservas = [];
  var aviso = document.getElementById("admin-aviso");
  var buscar = document.getElementById("buscar-reserva");
  var filtroPago = document.getElementById("filtro-pago");
  var filtroMetodo = document.getElementById("filtro-metodo");
  var orden = document.getElementById("orden-reservas");
  var conteo = document.getElementById("conteo-reservas");
  var cuerpo = document.getElementById("cuerpo-reservas");
  var dialogo = document.getElementById("detalle-reserva");
  var contenido = document.getElementById("detalle-contenido");
  var abierto = null;

  function conPago(estado) {
    return reservas.filter(function (r) { return r.pago && r.pago.estado === estado; });
  }

  function pintarResumen() {
    var aprobados = conPago("APPROVED").reduce(function (s, r) { return s + r.valor; }, 0);
    pintarTarjetas([
      { titulo: "Reservas", valor: reservas.length, formato: numero.format },
      { titulo: "Ingresos aprobados", valor: aprobados, formato: pesosCompacto.format, completo: pesos.format },
      { titulo: "Pagos pendientes", valor: conPago("PENDING").length, formato: numero.format, alerta: true },
      { titulo: "Pagos rechazados o con error", valor: conPago("DECLINED").length + conPago("ERROR").length, formato: numero.format }
    ]);
  }

  function pintarGraficas() {
    var porMetodo = Object.keys(METODOS_WOMPI).map(function (clave) {
      return {
        nombre: METODOS_WOMPI[clave],
        valor: conPago("APPROVED").filter(function (r) { return r.pago.metodo === clave; })
          .reduce(function (s, r) { return s + r.valor; }, 0)
      };
    }).sort(function (a, b) { return b.valor - a.valor; });
    var maximo = Math.max.apply(null, porMetodo.map(function (m) { return m.valor; }).concat([1]));

    var cajaMetodos = document.getElementById("grafica-metodos");
    cajaMetodos.innerHTML =
      '<figure class="admin-figura">' +
        '<figcaption class="oculto">Dinero de los pagos aprobados según el medio de pago.</figcaption>' +
        '<ul class="barras">' + porMetodo.map(function (m, i) {
          return '<li style="--orden:' + i + '">' +
            '<div class="barra-texto"><span>' + escapar(m.nombre) + '</span><strong>' + pesos.format(m.valor) + '</strong></div>' +
            '<div class="barra-pista" aria-hidden="true"><span class="barra" style="--ancho:' + (m.valor / maximo * 100).toFixed(1) + '%"></span></div>' +
          '</li>';
        }).join("") + '</ul>' +
      '</figure>';
    animarAlVer(cajaMetodos.querySelector(".admin-figura"));

    var cajaEstados = document.getElementById("grafica-estados-pago");
    cajaEstados.innerHTML = graficaAnillo(Object.keys(ESTADOS_WOMPI).map(function (clave) {
      return { nombre: ESTADOS_WOMPI[clave], total: conPago(clave).length, color: COLOR_PAGO[clave] };
    }), "pagos", "Cantidad de pagos de Wompi en cada estado.");
    animarAlVer(cajaEstados.querySelector(".admin-figura"));
  }

  function pintarTabla() {
    var texto = normalizar(buscar.value.trim());

    var lista = reservas.filter(function (r) {
      var coincide = texto === "" ||
        normalizar(r.codigo + " " + r.cliente + " " + r.evento + " " + (r.pago ? r.pago.id : "")).indexOf(texto) !== -1;
      return coincide &&
        (filtroPago.value === "" || (r.pago && r.pago.estado === filtroPago.value)) &&
        (filtroMetodo.value === "" || (r.pago && r.pago.metodo === filtroMetodo.value));
    });

    lista.sort(function (a, b) {
      if (orden.value === "valor") return b.valor - a.valor;
      if (orden.value === "entradas") return b.entradas - a.entradas;
      return b.fecha.localeCompare(a.fecha);
    });

    conteo.textContent = lista.length === reservas.length
      ? "Mostrando las " + reservas.length + " reservas."
      : "Mostrando " + lista.length + " de " + reservas.length + " reservas.";

    if (lista.length === 0) {
      cuerpo.innerHTML = '<tr role="row"><td role="cell" colspan="7" class="tabla-vacia">' +
        'No hay reservas que coincidan con la búsqueda. Prueba con otros filtros.</td></tr>';
      return;
    }

    cuerpo.innerHTML = lista.map(function (r) {
      return '<tr role="row" class="' + (r.estado === "Cancelada" ? "fila-bloqueada" : "") + '">' +
        '<th scope="row" role="rowheader">' +
          '<span class="agente-nombre">' + escapar(r.codigo) + '</span>' +
          '<span class="agente-nit">' + escapar(r.estado) + ' · ' + fechaHora(r.fecha) + '</span>' +
        '</th>' +
        '<td role="cell" data-etiqueta="Cliente">' + escapar(r.cliente) + '</td>' +
        '<td role="cell" data-etiqueta="Evento">' + escapar(r.evento) + '</td>' +
        '<td role="cell" data-etiqueta="Entradas" class="numero">' + r.entradas + '</td>' +
        '<td role="cell" data-etiqueta="Valor" class="numero">' + textoPrecio(r.valor) + '</td>' +
        '<td role="cell" data-etiqueta="Pago">' +
          '<span class="celda-pago">' + etiquetaPago(r.pago) +
            (r.pago ? '<span class="agente-nit">' + METODOS_WOMPI[r.pago.metodo] + '</span>' : '') +
          '</span>' +
        '</td>' +
        '<td role="cell" class="celda-accion">' +
          '<button type="button" class="admin-boton-sec" data-codigo="' + escapar(r.codigo) + '">' +
            'Ver detalle<span class="oculto"> de la reserva ' + escapar(r.codigo) + '</span>' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join("");
  }

  function notaPago(r) {
    if (!r.pago) return "Evento gratuito: la reserva no necesita pago.";
    var notas = {
      "APPROVED": "Wompi confirmó el pago. La reserva quedó confirmada automáticamente.",
      "PENDING": "Wompi todavía no ha confirmado el pago (por ejemplo, un PSE o un Nequi sin terminar). La reserva se confirmará sola cuando llegue la respuesta.",
      "DECLINED": "El banco o la entidad rechazó el pago. El cliente puede intentarlo de nuevo con otro medio.",
      "VOIDED": "El pago fue anulado en Wompi y el dinero se devolvió al cliente.",
      "ERROR": "Hubo un error al procesar el pago en Wompi. El cliente puede intentarlo de nuevo."
    };
    return notas[r.pago.estado];
  }

  function botonesReserva(r) {
    if (r.estado === "Cancelada") {
      return '<p class="texto-gris">Esta reserva está cancelada.</p>';
    }
    return '<button type="button" class="admin-boton admin-boton-peligro" data-accion="confirmar">Cancelar reserva</button>';
  }

  function pintarDetalle(r, mensaje) {
    var pago = r.pago;

    contenido.innerHTML =
      '<div class="detalle-cabecera">' +
        '<div>' +
          '<h2 id="detalle-nombre" tabindex="-1">Reserva ' + escapar(r.codigo) + '</h2>' +
          '<p>' + escapar(r.evento) + '</p>' +
          '<span class="detalle-etiquetas">' +
            etiqueta(r.estado, CLASE_RESERVA[r.estado], "Reserva") +
            (pago ? etiqueta("Pago " + ESTADOS_WOMPI[pago.estado].toLowerCase(), CLASE_PAGO[pago.estado], "Wompi") : "") +
          '</span>' +
        '</div>' +
      '</div>' +
      '<p class="detalle-aviso" id="detalle-aviso" role="status">' + (mensaje || "") + '</p>' +
      '<h3>Datos de la reserva</h3>' +
      '<dl class="detalle-datos">' +
        '<div><dt>Cliente</dt><dd>' + escapar(r.cliente) + '</dd></div>' +
        '<div><dt>Documento</dt><dd>' + escapar(r.documento) + '</dd></div>' +
        '<div><dt>Correo</dt><dd><a href="mailto:' + escapar(r.correo) + '">' + escapar(r.correo) + '</a></dd></div>' +
        '<div><dt>Fecha</dt><dd>' + fechaHora(r.fecha) + '</dd></div>' +
        '<div><dt>Evento</dt><dd><a href="evento.html?id=' + r.eventoId + '">' + escapar(r.evento) + '</a></dd></div>' +
        '<div><dt>Entradas</dt><dd>' + r.entradas + ' × ' + textoPrecio(r.precio) + '</dd></div>' +
        '<div><dt>Valor total</dt><dd><strong>' + textoPrecio(r.valor) + '</strong></dd></div>' +
      '</dl>' +
      '<h3>Pago con Wompi</h3>' +
      '<p class="detalle-nota">' + notaPago(r) + '</p>' +
      (pago
        ? '<dl class="detalle-datos">' +
            '<div><dt>Estado</dt><dd>' + ESTADOS_WOMPI[pago.estado] + ' <span class="texto-gris">(' + pago.estado + ')</span></dd></div>' +
            '<div><dt>Medio de pago</dt><dd>' + METODOS_WOMPI[pago.metodo] + '</dd></div>' +
            '<div><dt>ID de la transacción</dt><dd>' + escapar(pago.id) + '</dd></div>' +
            '<div><dt>Referencia</dt><dd>' + escapar(r.codigo) + '</dd></div>' +
            '<div><dt>Monto</dt><dd>' + pesos.format(pago.montoCentavos / 100) + ' ' + pago.moneda + '</dd></div>' +
            '<div><dt>Monto enviado a Wompi</dt><dd>' + pago.montoCentavos + ' centavos</dd></div>' +
          '</dl>'
        : '') +
      '<h3>Entrada</h3>' + seccionEntrada(r) +
      '<div class="detalle-acciones" id="detalle-acciones">' + botonesReserva(r) + '</div>';

    var qr = document.getElementById("detalle-qr");
    if (qr) D.pintarQrReal(qr, r.codigo, r.eventoId);
  }

  function seccionEntrada(r) {
    var usada = leerIngresos()[r.codigo];
    var valida = r.estado !== "Cancelada" && (!r.pago || r.pago.estado === "APPROVED");

    if (!valida) {
      return '<p class="detalle-nota">Sin QR válido: ' +
        (r.estado === "Cancelada" ? "la reserva está cancelada." : "el pago todavía no está aprobado.") + '</p>';
    }

    return '<div class="detalle-entrada">' +
      '<div class="qr qr-admin" id="detalle-qr"></div>' +
      '<p class="detalle-descripcion">' +
        (usada
          ? '<strong>Ya se usó:</strong> ingresó el ' + fechaHora(usada.fecha) + (usada.revisadoPor ? ", validada por " + escapar(usada.revisadoPor) : "") + "."
          : "Todavía no se ha usado. Es el mismo QR que ve el cliente en su confirmación; se valida en \"Validar entradas\".") +
      '</p>' +
    '</div>';
  }

  contenido.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-accion]");
    if (!boton || !abierto) return;

    var accion = boton.getAttribute("data-accion");
    var acciones = document.getElementById("detalle-acciones");

    if (accion === "confirmar") {
      var devolucion = abierto.pago && abierto.pago.estado === "APPROVED"
        ? " El pago ya fue aprobado: recuerda hacer la devolución del dinero desde el panel de comercios de Wompi."
        : "";
      acciones.innerHTML =
        '<div class="detalle-confirmar">' +
          '<p id="texto-confirmar"><strong>¿Cancelar la reserva ' + escapar(abierto.codigo) + '?</strong> ' +
          'Las entradas volverán a quedar disponibles.' + devolucion + '</p>' +
          '<div class="detalle-botones">' +
            '<button type="button" class="admin-boton admin-boton-peligro" data-accion="si-cancelar" aria-describedby="texto-confirmar">Sí, cancelar la reserva</button>' +
            '<button type="button" class="admin-boton-sec" data-accion="volver">Volver</button>' +
          '</div>' +
        '</div>';
      acciones.querySelector('[data-accion="si-cancelar"]').focus();
    } else if (accion === "volver") {
      acciones.innerHTML = botonesReserva(abierto);
      acciones.querySelector("button").focus();
    } else if (accion === "si-cancelar") {
      var reserva = abierto;
      acciones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });

      cancelarReservaAdmin(reserva.codigo).then(function () {
        reserva.estado = "Cancelada";
        var mensaje = "La reserva " + reserva.codigo + " quedó cancelada.";
        aviso.textContent = mensaje;
        pintarResumen();
        pintarTabla();
        pintarDetalle(reserva, mensaje);
        document.getElementById("detalle-nombre").focus();
      }).catch(function (error) {
        document.getElementById("detalle-aviso").innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
        acciones.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
      });
    }
  });

  cuerpo.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-codigo]");
    if (!boton) return;

    abierto = reservas.filter(function (r) { return r.codigo === boton.getAttribute("data-codigo"); })[0];
    pintarDetalle(abierto);
    dialogo.showModal();
    document.getElementById("detalle-nombre").focus();
  });

  document.getElementById("detalle-cerrar").onclick = function () {
    dialogo.close();
  };

  dialogo.addEventListener("click", function (evento) {
    if (evento.target === dialogo) dialogo.close();
  });

  dialogo.addEventListener("close", function () {
    if (!abierto) return;
    var codigo = abierto.codigo;
    abierto = null;
    setTimeout(function () {
      var boton = cuerpo.querySelector('button[data-codigo="' + codigo + '"]');
      if (boton) {
        boton.focus();
      } else {
        document.getElementById("titulo-lista-reservas").focus();
      }
    }, 0);
  });

  document.getElementById("filtros-reservas").addEventListener("submit", function (evento) {
    evento.preventDefault();
  });
  buscar.addEventListener("input", pintarTabla);
  filtroPago.onchange = pintarTabla;
  filtroMetodo.onchange = pintarTabla;
  orden.onchange = pintarTabla;

  obtenerReservasAdmin().then(function (lista) {
    reservas = lista;

    if (!D.usarApi) {
      aviso.textContent = "Modo local: la base de datos está desactivada y se muestran datos de ejemplo. No se consulta a Wompi.";
    }

    pintarResumen();
    pintarGraficas();
    pintarTabla();
  }).catch(function (error) {
    aviso.innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
  });
}

/* ===== PÁGINA: VERIFICACIONES ===== */

var MOTIVOS_RECHAZO = [
  "Las fotos no se ven bien",
  "La cara de la selfie no coincide con la del documento",
  "Los datos no coinciden con el documento",
  "El documento parece alterado o no es válido",
  "La selfie no es una foto real tomada en el momento"
];

/* Imagen de ejemplo (SVG) para las solicitudes de demostración */
function fotoEjemplo(nombre, tipo) {
  var inicial = nombre.charAt(0);
  var svg = tipo === "selfie"
    ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="#eeeafe"/>' +
      '<circle cx="150" cy="120" r="62" fill="#5b36f2"/><path d="M50 300c0-70 45-110 100-110s100 40 100 110z" fill="#5b36f2"/>' +
      '<text x="150" y="140" font-family="Arial" font-size="60" font-weight="700" fill="#fff" text-anchor="middle">' + inicial + '</text>' +
      '<text x="150" y="285" font-family="Arial" font-size="18" fill="#fff" text-anchor="middle">Selfie de ejemplo</text></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300"><rect width="480" height="300" rx="18" fill="#fdf3d7"/>' +
      '<rect x="0" y="0" width="480" height="54" rx="18" fill="#130a2b"/><text x="24" y="35" font-family="Arial" font-size="20" font-weight="700" fill="#fff">REPÚBLICA DE COLOMBIA</text>' +
      '<rect x="24" y="80" width="130" height="160" rx="10" fill="#5b36f2"/>' +
      '<text x="89" y="178" font-family="Arial" font-size="60" font-weight="700" fill="#fff" text-anchor="middle">' + inicial + '</text>' +
      '<rect x="180" y="96" width="250" height="16" rx="8" fill="#c9bfa0"/><rect x="180" y="132" width="200" height="16" rx="8" fill="#c9bfa0"/>' +
      '<rect x="180" y="168" width="230" height="16" rx="8" fill="#c9bfa0"/>' +
      '<text x="240" y="280" font-family="Arial" font-size="18" fill="#6d3a45" text-anchor="middle">Documento de ejemplo</text></svg>';
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* Solicitudes de ejemplo a partir de CLIENTES_DEMO */
function verificacionesDemo() {
  return CLIENTES_DEMO.filter(function (c) { return c.verificacion !== "Sin solicitar"; }).map(function (c, i) {
    var esCedula = c.tipoDoc === "CC";
    var coincide = esCedula && i % 4 !== 2;
    var dia = String(1 + (i * 3) % 27);
    return {
      estado: c.verificacion,
      tipo: "Biométrica",
      fechaSolicitud: "2026-" + (c.verificacion === "Pendiente" ? "10" : "0" + (3 + i % 6)) + "-" + (dia.length < 2 ? "0" : "") + dia + "T1" + (i % 10) + ":2" + (i % 10) + ":00",
      nombre: c.nombre,
      correo: c.correo,
      tipoDocumento: c.tipoDoc,
      documento: c.documento,
      nacimiento: c.nacimiento,
      lectura: esCedula ? {
        metodo: "PDF417",
        numeroLeido: c.documento,
        nacimientoLeido: coincide ? c.nacimiento : c.nacimiento.slice(0, 8) + "01",
        nombreLeido: c.nombre.toUpperCase(),
        coincideNumero: true,
        coincideNacimiento: coincide,
        coincide: coincide
      } : null,
      fotoDocumento: fotoEjemplo(c.nombre, "documento"),
      selfie: fotoEjemplo(c.nombre, "selfie"),
      motivo: c.verificacion === "Rechazada" ? MOTIVOS_RECHAZO[i % MOTIVOS_RECHAZO.length] : "",
      ejemplo: true
    };
  });
}

function obtenerVerificaciones() {
  if (!D.usarApi) {
    var guardadas = D.leerVerificaciones();
    var lista = verificacionesDemo().map(function (v) {
      return guardadas[v.correo] ? Object.assign({}, v, guardadas[v.correo]) : v;
    });
    Object.keys(guardadas).forEach(function (correo) {
      if (!lista.some(function (v) { return v.correo === correo; })) lista.push(guardadas[correo]);
    });
    return Promise.resolve(lista);
  }

  return D.llamarApi("/admin/verificaciones", { headers: cabeceraToken() }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cargar la lista de verificaciones.");
    }
    return resultado.datos.verificaciones;
  });
}

function decidirVerificacion(v, estado, motivo, revisor) {
  var cambios = {
    estado: estado,
    motivo: motivo || "",
    fechaRevision: new Date().toISOString(),
    revisadoPor: revisor
  };

  if (!D.usarApi) {
    try {
      D.guardarVerificacion(v.correo, Object.assign({}, v, cambios));
    } catch (e) {
      return Promise.reject(new Error("No se pudo guardar la decisión en este navegador."));
    }
    return Promise.resolve(cambios);
  }

  return D.llamarApi("/admin/verificaciones/" + encodeURIComponent(v.id || v.correo), {
    method: "PATCH",
    headers: Object.assign({ "Content-Type": "application/json" }, cabeceraToken()),
    body: JSON.stringify({ estado: estado, motivo: motivo || null })
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo guardar la decisión.");
    }
    return cambios;
  });
}

function etiquetaLectura(v) {
  if (!v.lectura || !v.lectura.metodo) return etiqueta("Sin lectura", "estado-finalizado", "Lectura automática");
  return v.lectura.coincide
    ? etiqueta("Coincide", "agente-activo", "Lectura automática")
    : etiqueta("No coincide", "estado-vivo", "Lectura automática");
}

function paginaVerificacionesAdmin() {
  var admin = entrarComoAdmin();
  if (!admin) return;

  var solicitudes = [];
  var aviso = document.getElementById("admin-aviso");
  var buscar = document.getElementById("buscar-verificacion");
  var filtroEstado = document.getElementById("filtro-estado-verificacion");
  var filtroLectura = document.getElementById("filtro-lectura");
  var orden = document.getElementById("orden-verificaciones");
  var conteo = document.getElementById("conteo-verificaciones");
  var cuerpo = document.getElementById("cuerpo-verificaciones");
  var dialogo = document.getElementById("detalle-verificacion");
  var contenido = document.getElementById("detalle-contenido");
  var abierta = null;

  function cuantas(prueba) {
    return solicitudes.filter(prueba).length;
  }

  function pintarResumen() {
    pintarTarjetas([
      { titulo: "Pendientes de revisar", valor: cuantas(function (v) { return v.estado === "Pendiente"; }), formato: numero.format, alerta: true },
      { titulo: "Aprobadas", valor: cuantas(function (v) { return v.estado === "Aprobada"; }), formato: numero.format },
      { titulo: "Rechazadas", valor: cuantas(function (v) { return v.estado === "Rechazada"; }), formato: numero.format },
      { titulo: "Lectura automática correcta", valor: cuantas(function (v) { return v.lectura && v.lectura.coincide; }), formato: numero.format }
    ]);
  }

  function pintarTabla() {
    var texto = normalizar(buscar.value.trim());

    var lista = solicitudes.filter(function (v) {
      var coincide = texto === "" ||
        normalizar(v.nombre + " " + v.documento + " " + v.correo).indexOf(texto) !== -1;
      var lectura = !v.lectura || !v.lectura.metodo ? "sin" : (v.lectura.coincide ? "si" : "no");
      return coincide &&
        (filtroEstado.value === "" || v.estado === filtroEstado.value) &&
        (filtroLectura.value === "" || lectura === filtroLectura.value);
    });

    lista.sort(function (a, b) {
      if (orden.value === "recientes") return b.fechaSolicitud.localeCompare(a.fechaSolicitud);
      if (orden.value === "antiguas") return a.fechaSolicitud.localeCompare(b.fechaSolicitud);
      var pa = a.estado === "Pendiente" ? 0 : 1;
      var pb = b.estado === "Pendiente" ? 0 : 1;
      return pa - pb || a.fechaSolicitud.localeCompare(b.fechaSolicitud);
    });

    conteo.textContent = lista.length === solicitudes.length
      ? "Mostrando las " + solicitudes.length + " solicitudes."
      : "Mostrando " + lista.length + " de " + solicitudes.length + " solicitudes.";

    if (lista.length === 0) {
      cuerpo.innerHTML = '<tr role="row"><td role="cell" colspan="6" class="tabla-vacia">' +
        'No hay solicitudes que coincidan con la búsqueda. Prueba con otros filtros.</td></tr>';
      return;
    }

    cuerpo.innerHTML = lista.map(function (v) {
      var pendiente = v.estado === "Pendiente";
      return '<tr role="row" class="' + (pendiente ? "fila-pendiente" : "") + '">' +
        '<th scope="row" role="rowheader">' +
          '<span class="agente-celda">' +
            '<img class="verif-miniatura" src="' + escapar(v.selfie) + '" alt="" />' +
            '<span><span class="agente-nombre">' + escapar(v.nombre) + '</span>' +
            '<span class="agente-nit">' + escapar(v.correo) + '</span></span>' +
          '</span>' +
        '</th>' +
        '<td role="cell" data-etiqueta="Documento">' + escapar(v.tipoDocumento) + ' ' + escapar(v.documento) + '</td>' +
        '<td role="cell" data-etiqueta="Enviada">' + fechaHora(v.fechaSolicitud) + '</td>' +
        '<td role="cell" data-etiqueta="Lectura automática">' + etiquetaLectura(v) + '</td>' +
        '<td role="cell" data-etiqueta="Estado">' + etiqueta(v.estado, CLASE_VERIFICACION[v.estado], "Estado") + '</td>' +
        '<td role="cell" class="celda-accion">' +
          '<button type="button" class="admin-boton-sec" data-correo="' + escapar(v.correo) + '">' +
            (pendiente ? "Revisar" : "Ver") + '<span class="oculto"> la solicitud de ' + escapar(v.nombre) + '</span>' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join("");
  }

  function filaLectura(nombre, cuenta, leido, ok) {
    var resultado = leido === undefined
      ? '<span class="texto-gris">Sin lectura</span>'
      : (ok ? etiqueta("Coincide", "agente-activo", nombre) : etiqueta("No coincide", "estado-vivo", nombre));
    return '<tr><th scope="row">' + nombre + '</th><td>' + escapar(cuenta) + '</td>' +
      '<td>' + (leido ? escapar(leido) : '<span class="texto-gris">—</span>') + '</td><td>' + resultado + '</td></tr>';
  }

  function formularioDecision() {
    return '<form class="form-revision" id="form-revision" novalidate>' +
      '<fieldset class="revision-lista">' +
        '<legend>Antes de aprobar, comprueba que:</legend>' +
        '<label><input type="checkbox" name="chequeo" /> La selfie y la foto del documento son de la misma persona.</label>' +
        '<label><input type="checkbox" name="chequeo" /> El documento se ve completo, legible y no parece alterado.</label>' +
        '<label><input type="checkbox" name="chequeo" /> La selfie es una foto real, no una foto de una pantalla o de otra foto.</label>' +
      '</fieldset>' +
      '<p class="detalle-error" id="error-revision" role="alert"></p>' +
      '<div class="detalle-botones" id="botones-revision">' +
        '<button type="submit" class="admin-boton">Aprobar identidad</button>' +
        '<button type="button" class="admin-boton admin-boton-peligro" data-accion="rechazar">Rechazar</button>' +
      '</div>' +
    '</form>';
  }

  function pintarDetalle(v, mensaje) {
    var l = v.lectura || {};
    var hayLectura = !!l.metodo;

    contenido.innerHTML =
      '<div class="detalle-cabecera">' +
        '<img class="verif-miniatura verif-miniatura-grande" src="' + escapar(v.selfie) + '" alt="" />' +
        '<div>' +
          '<h2 id="detalle-nombre" tabindex="-1">' + escapar(v.nombre) + '</h2>' +
          '<p>' + escapar(v.tipoDocumento) + ' ' + escapar(v.documento) + ' · ' + escapar(v.correo) + '</p>' +
          '<span class="detalle-etiquetas">' +
            etiqueta(v.estado, CLASE_VERIFICACION[v.estado], "Estado") + etiquetaLectura(v) +
          '</span>' +
        '</div>' +
      '</div>' +
      '<p class="detalle-aviso" id="detalle-aviso" role="status">' + (mensaje || "") + '</p>' +
      (v.ejemplo ? '<p class="detalle-nota">Solicitud de ejemplo: las imágenes son dibujos de demostración.</p>' : '') +

      '<h3>1. Lectura automática de la cédula</h3>' +
      (hayLectura
        ? '<p class="detalle-descripcion">Leída del código ' + (l.metodo === "QR" ? "QR de la cédula digital" : "de barras PDF417 de la cédula") +
            (l.nombreLeido ? '. Nombre leído: <strong>' + escapar(l.nombreLeido) + '</strong>' : '') + '.</p>' +
          '<div class="tabla-lectura-marco" role="region" aria-label="Comparación de datos" tabindex="0">' +
          '<table class="tabla-lectura">' +
            '<caption class="oculto">Datos de la cuenta comparados con los leídos en la cédula</caption>' +
            '<thead><tr><th scope="col">Dato</th><th scope="col">En la cuenta</th><th scope="col">Leído en la cédula</th><th scope="col">Resultado</th></tr></thead>' +
            '<tbody>' +
              filaLectura("Número de documento", v.documento, l.numeroLeido, l.coincideNumero) +
              filaLectura("Fecha de nacimiento", fechaLarga(v.nacimiento), l.nacimientoLeido ? fechaLarga(l.nacimientoLeido) : "", l.coincideNacimiento) +
            '</tbody>' +
          '</table>' +
          '</div>'
        : '<p class="detalle-nota">No hay lectura automática' +
            (v.tipoDocumento === "CC" ? ": el cliente no escaneó el código de su cédula." : ": este tipo de documento no tiene código para leer.") +
            ' Compara a mano el número (' + escapar(v.documento) + ') y la fecha de nacimiento (' + fechaLarga(v.nacimiento) + ') con la foto del documento.</p>') +

      '<h3>2. Compara la cara</h3>' +
      '<div class="revision-fotos">' +
        '<figure><img src="' + escapar(v.fotoDocumento) + '" alt="Frente del documento de ' + escapar(v.nombre) + '" /><figcaption>Frente del documento</figcaption></figure>' +
        '<figure><img src="' + escapar(v.selfie) + '" alt="Selfie de ' + escapar(v.nombre) + '" /><figcaption>Selfie</figcaption></figure>' +
      '</div>' +

      '<h3>3. Decisión</h3>' +
      '<div class="detalle-acciones" id="detalle-acciones">' +
        (v.estado === "Pendiente"
          ? formularioDecision()
          : '<p class="detalle-descripcion">' +
              (v.estado === "Aprobada" ? "Identidad aprobada" : "Solicitud rechazada") +
              (v.fechaRevision ? " el " + fechaHora(v.fechaRevision) : "") +
              (v.revisadoPor ? " por " + escapar(v.revisadoPor) : "") + "." +
              (v.motivo ? " Motivo: " + escapar(v.motivo) + "." : "") +
              (v.estado === "Rechazada" ? " El cliente puede enviar una nueva solicitud desde su cuenta." : "") +
            '</p>') +
      '</div>';
  }

  function guardarDecision(v, estado, motivo) {
    var botones = document.getElementById("botones-revision");
    botones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });

    decidirVerificacion(v, estado, motivo, admin.nombre).then(function (cambios) {
      Object.assign(v, cambios);
      var mensaje = estado === "Aprobada"
        ? "Identidad de " + v.nombre + " aprobada. Ya puede reservar entradas."
        : "Solicitud de " + v.nombre + " rechazada. El cliente verá el motivo y podrá intentarlo de nuevo.";
      aviso.textContent = mensaje;
      pintarResumen();
      pintarTabla();
      pintarDetalle(v, mensaje);
      document.getElementById("detalle-nombre").focus();
    }).catch(function (error) {
      document.getElementById("error-revision").innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
      botones.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
    });
  }

  function mostrarRechazo() {
    document.getElementById("botones-revision").innerHTML =
      '<div class="detalle-confirmar revision-rechazo">' +
        '<label for="motivo-rechazo">Motivo del rechazo</label>' +
        '<select id="motivo-rechazo">' +
          '<option value="">Elige un motivo</option>' +
          MOTIVOS_RECHAZO.map(function (m) { return '<option>' + m + '</option>'; }).join("") +
        '</select>' +
        '<p class="texto-gris">El cliente verá este motivo al entrar en "Verificar mi identidad".</p>' +
        '<div class="detalle-botones">' +
          '<button type="button" class="admin-boton admin-boton-peligro" data-accion="si-rechazar">Rechazar la solicitud</button>' +
          '<button type="button" class="admin-boton-sec" data-accion="volver">Volver</button>' +
        '</div>' +
      '</div>';
    document.getElementById("motivo-rechazo").focus();
  }

  contenido.addEventListener("submit", function (evento) {
    evento.preventDefault();
    if (!abierta) return;

    var chequeos = contenido.querySelectorAll('input[name="chequeo"]');
    var faltan = Array.prototype.filter.call(chequeos, function (c) { return !c.checked; });
    if (faltan.length) {
      document.getElementById("error-revision").innerHTML =
        "<strong>Error:</strong> Marca las tres comprobaciones antes de aprobar. Si alguna no se cumple, rechaza la solicitud.";
      faltan[0].focus();
      return;
    }
    guardarDecision(abierta, "Aprobada");
  });

  contenido.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-accion]");
    if (!boton || !abierta) return;

    var accion = boton.getAttribute("data-accion");
    if (accion === "rechazar") {
      document.getElementById("error-revision").textContent = "";
      mostrarRechazo();
    } else if (accion === "volver") {
      document.getElementById("botones-revision").innerHTML =
        '<button type="submit" class="admin-boton">Aprobar identidad</button>' +
        '<button type="button" class="admin-boton admin-boton-peligro" data-accion="rechazar">Rechazar</button>';
      document.querySelector('#botones-revision [data-accion="rechazar"]').focus();
    } else if (accion === "si-rechazar") {
      var motivo = document.getElementById("motivo-rechazo");
      if (!motivo.value) {
        document.getElementById("error-revision").innerHTML = "<strong>Error:</strong> Elige el motivo del rechazo.";
        motivo.setAttribute("aria-invalid", "true");
        motivo.focus();
        return;
      }
      guardarDecision(abierta, "Rechazada", motivo.value);
    }
  });

  cuerpo.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-correo]");
    if (!boton) return;

    abierta = solicitudes.filter(function (v) { return v.correo === boton.getAttribute("data-correo"); })[0];
    pintarDetalle(abierta);
    dialogo.showModal();
    document.getElementById("detalle-nombre").focus();
  });

  document.getElementById("detalle-cerrar").onclick = function () {
    dialogo.close();
  };

  dialogo.addEventListener("click", function (evento) {
    if (evento.target === dialogo) dialogo.close();
  });

  dialogo.addEventListener("close", function () {
    if (!abierta) return;
    var correo = abierta.correo;
    abierta = null;
    setTimeout(function () {
      var boton = cuerpo.querySelector('button[data-correo="' + correo + '"]');
      if (boton) {
        boton.focus();
      } else {
        document.getElementById("titulo-lista-verificaciones").focus();
      }
    }, 0);
  });

  document.getElementById("filtros-verificaciones").addEventListener("submit", function (evento) {
    evento.preventDefault();
  });
  buscar.addEventListener("input", pintarTabla);
  filtroEstado.onchange = pintarTabla;
  filtroLectura.onchange = pintarTabla;
  orden.onchange = pintarTabla;

  obtenerVerificaciones().then(function (lista) {
    solicitudes = lista;

    if (!D.usarApi) {
      aviso.textContent = "Modo local: la base de datos está desactivada. Se muestran solicitudes de ejemplo junto con las que envíen los clientes desde este navegador.";
    }

    pintarResumen();
    pintarTabla();
  }).catch(function (error) {
    aviso.innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
  });
}

/* ===== PÁGINA: VALIDAR ENTRADAS ===== */

function leerIngresos() {
  try {
    return JSON.parse(localStorage.getItem("entradasUsadas")) || {};
  } catch (e) {
    return {};
  }
}

function registrarIngreso(reserva, revisor) {
  var ingreso = {
    fecha: new Date().toISOString(),
    evento: reserva.evento,
    cliente: reserva.cliente,
    entradas: reserva.entradas,
    revisadoPor: revisor
  };

  if (!D.usarApi) {
    var ingresos = leerIngresos();
    ingresos[reserva.codigo] = ingreso;
    localStorage.setItem("entradasUsadas", JSON.stringify(ingresos));
    return Promise.resolve(ingreso);
  }

  return D.llamarApi("/admin/entradas/" + encodeURIComponent(reserva.codigo) + "/ingreso", {
    method: "POST",
    headers: cabeceraToken()
  }).then(function (resultado) {
    if (resultado.estado !== 201) {
      throw new Error(resultado.datos.error || "No se pudo registrar el ingreso.");
    }
    return ingreso;
  });
}

function paginaValidar() {
  var admin = entrarComoAdmin();
  if (!admin) return;

  var reservas = [];
  var aviso = document.getElementById("admin-aviso");
  var selectorEvento = document.getElementById("validar-evento");
  var visor = document.getElementById("validar-visor");
  var video = document.getElementById("validar-video");
  var botonAbrir = document.getElementById("validar-abrir");
  var botonDetener = document.getElementById("validar-detener");
  var caja = document.getElementById("validar-resultado");
  var controles = null;
  var ultimoLeido = "";
  var ultimaVez = 0;

  D.eventos.filter(function (e) { return e.estado !== "Finalizado" && e.estado !== "Cancelado"; })
    .forEach(function (e) {
      var opcion = document.createElement("option");
      opcion.value = e.id;
      opcion.textContent = e.titulo;
      selectorEvento.appendChild(opcion);
    });

  function pintarIngresos() {
    var ingresos = leerIngresos();
    var codigos = Object.keys(ingresos).sort(function (a, b) {
      return ingresos[b].fecha.localeCompare(ingresos[a].fecha);
    });
    var personas = codigos.reduce(function (s, c) { return s + (ingresos[c].entradas || 0); }, 0);

    document.getElementById("conteo-ingresos").textContent = codigos.length
      ? codigos.length + (codigos.length === 1 ? " entrada validada" : " entradas validadas") +
        " (" + personas + (personas === 1 ? " persona" : " personas") + ")."
      : "Todavía no se ha registrado ningún ingreso.";

    document.getElementById("lista-ingresos").innerHTML = codigos.slice(0, 15).map(function (c, i) {
      var g = ingresos[c];
      return '<li style="--orden:' + i + '">' +
        '<span class="actividad-cuando">' + fechaHora(g.fecha) + ' · ' + escapar(c) + '</span>' +
        '<span>' + escapar(g.cliente) + ' — ' + escapar(g.evento) + ' (' + g.entradas + (g.entradas === 1 ? " persona" : " personas") + ')</span>' +
      '</li>';
    }).join("");
    document.getElementById("lista-ingresos").classList.add("visible");
  }

  function resultado(clase, titulo, texto, reserva, extra) {
    caja.innerHTML =
      '<div class="validar-tarjeta ' + clase + '">' +
        '<p class="validar-titulo">' + titulo + '</p>' +
        (texto ? '<p class="validar-texto">' + texto + '</p>' : '') +
        (reserva
          ? '<dl class="detalle-datos validar-datos">' +
              '<div><dt>Reserva</dt><dd>' + escapar(reserva.codigo) + '</dd></div>' +
              '<div><dt>Titular</dt><dd>' + escapar(reserva.cliente) + '</dd></div>' +
              '<div><dt>Documento</dt><dd>' + escapar(reserva.documento || "—") + '</dd></div>' +
              '<div><dt>Entradas</dt><dd>' + reserva.entradas + (reserva.entradas === 1 ? " persona" : " personas") + '</dd></div>' +
              '<div class="validar-dato-ancho"><dt>Evento</dt><dd>' + escapar(reserva.evento) + '</dd></div>' +
            '</dl>'
          : '') +
        (extra || '') +
      '</div>';
  }

  function validar(texto) {
    var datos = D.leerContenidoQr(texto);
    var codigo = datos ? datos.codigo : texto.trim().toUpperCase();

    if (!codigo) return;

    if (datos && datos.token !== D.tokenEntrada(datos.codigo, datos.idEvento)) {
      resultado("validar-no", "QR no válido",
        "El código fue alterado o no lo generó El Desparche. No dejes entrar con este QR.");
      return;
    }

    var reserva = reservas.filter(function (r) { return r.codigo === codigo; })[0];
    if (!reserva) {
      resultado("validar-no", "Entrada no encontrada",
        "No existe ninguna reserva con el código " + escapar(codigo) + ". Revisa que esté bien escrito.");
      return;
    }

    var eventoPuerta = Number(selectorEvento.value);
    if (eventoPuerta && reserva.eventoId !== eventoPuerta) {
      resultado("validar-no", "Es de otro evento",
        "Esta entrada es para otro evento, no para el que estás validando en esta puerta.", reserva);
      return;
    }

    if (reserva.estado === "Cancelada") {
      resultado("validar-no", "Reserva cancelada", "Esta reserva fue cancelada y la entrada ya no vale.", reserva);
      return;
    }

    if (reserva.pago && reserva.pago.estado !== "APPROVED") {
      resultado("validar-no", "Pago sin aprobar",
        "El pago de esta reserva está " + ESTADOS_WOMPI[reserva.pago.estado].toLowerCase() +
        " en Wompi. No puede entrar hasta que se apruebe.", reserva);
      return;
    }

    var usada = leerIngresos()[codigo];
    if (usada) {
      resultado("validar-usada", "Esta entrada ya se usó",
        "Ingresó el " + fechaHora(usada.fecha) + (usada.revisadoPor ? ", validada por " + escapar(usada.revisadoPor) : "") +
        ". Si la persona insiste, revisa su documento.", reserva);
      return;
    }

    resultado("validar-si", "Entrada válida",
      "Comprueba que el documento de la persona coincide con el del titular y registra el ingreso.", reserva,
      '<button type="button" class="admin-boton validar-registrar" data-codigo="' + escapar(codigo) + '">' +
        'Registrar ingreso (' + reserva.entradas + (reserva.entradas === 1 ? " persona" : " personas") + ')</button>');
  }

  caja.addEventListener("click", function (evento) {
    var boton = evento.target.closest(".validar-registrar");
    if (!boton) return;

    var reserva = reservas.filter(function (r) { return r.codigo === boton.getAttribute("data-codigo"); })[0];
    boton.disabled = true;

    registrarIngreso(reserva, admin.nombre).then(function () {
      resultado("validar-si", "Ingreso registrado",
        "Bienvenidos. La entrada quedó marcada como usada y no servirá otra vez.", reserva);
      pintarIngresos();
      document.getElementById("titulo-resultado").setAttribute("tabindex", "-1");
      document.getElementById("titulo-resultado").focus();
    }).catch(function (error) {
      boton.disabled = false;
      resultado("validar-no", "Error", escapar(error.message), reserva);
    });
  });

  function detener() {
    if (controles) {
      controles.stop();
      controles = null;
    }
    visor.hidden = true;
    botonDetener.hidden = true;
    botonAbrir.hidden = false;
  }

  botonAbrir.onclick = function () {
    visor.hidden = false;
    botonAbrir.hidden = true;
    botonDetener.hidden = false;

    import("@zxing/browser").then(function (zxing) {
      return new zxing.BrowserQRCodeReader().decodeFromConstraints(
        { video: { facingMode: "environment" } }, video,
        function (leido) {
          if (!leido) return;
          var texto = leido.getText();
          /* El mismo QR delante de la cámara no se vuelve a validar enseguida */
          if (texto === ultimoLeido && Date.now() - ultimaVez < 4000) return;
          ultimoLeido = texto;
          ultimaVez = Date.now();
          validar(texto);
        });
    }).then(function (c) {
      controles = c;
      botonDetener.focus();
    }).catch(function () {
      detener();
      resultado("validar-no", "No se pudo abrir la cámara",
        "Revisa que diste permiso para usar la cámara, o escribe el código de la reserva a mano.");
    });
  };

  botonDetener.onclick = function () {
    detener();
    botonAbrir.focus();
  };

  document.getElementById("validar-manual").addEventListener("submit", function (evento) {
    evento.preventDefault();
    var campo = document.getElementById("validar-codigo");
    if (!campo.value.trim()) {
      resultado("validar-no", "Falta el código", "Escribe el código de la reserva, por ejemplo DES-1052.");
      campo.focus();
      return;
    }
    validar(campo.value);
    campo.select();
  });

  window.addEventListener("pagehide", detener);

  obtenerReservasAdmin().then(function (lista) {
    reservas = lista;
    if (!D.usarApi) {
      aviso.textContent = "Modo local: se validan las reservas de ejemplo y las hechas en este navegador. Los ingresos se guardan en este navegador.";
    }
    pintarIngresos();
  }).catch(function (error) {
    aviso.innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
  });
}

/* ===== PÁGINA: SESIONES DE ADMINISTRADORES (SESION_ADMIN) ===== */

/* horario = jornada_t de la tabla ADMIN */
var ADMINS_DEMO = [
  { id: "1000000001", nombre: "Sebastián Jaramillo", horario: "Completa", ip: "190.24.10.5" },
  { id: "1000000005", nombre: "Laura Peña Ríos", horario: "Mañana", ip: "181.49.72.18" },
  { id: "1000000006", nombre: "Diego Torres Mejía", horario: "Noche", ip: "186.31.5.240" }
];

/* Horas de cada jornada: [inicio, fin) */
var JORNADAS = {
  "Mañana": [6, 12],
  "Tarde": [12, 18],
  "Noche": [18, 24],
  "Completa": [6, 22]
};

function sesionesDemo() {
  var lista = [];
  var hoy = new Date();

  for (var dia = 34; dia >= 1; dia--) {
    ADMINS_DEMO.forEach(function (a, n) {
      var r = (dia * 7 + n * 13) % 10;
      if (r < 3) return;

      var jornada = JORNADAS[a.horario];
      var hora = jornada[0] + (r % Math.max(jornada[1] - jornada[0] - 2, 1));
      if ((dia + n) % 9 === 0) hora = n === 2 ? 4 : 23;

      var inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - dia, hora, (dia * 11 + n * 17) % 60);
      var fin = new Date(inicio.getTime() + (20 + (dia * 37 + n * 23) % 160) * 60000);

      lista.push({
        numero_identificacion: a.id,
        fecha_hora_conexion: inicio.toISOString(),
        fecha_hora_desconexion: fin.toISOString(),
        direccion_ip: dia % 11 === 0 && n === 1 ? "201.245.3.77" : a.ip
      });
    });
  }
  return lista;
}

/* Une las de ejemplo con las sesiones reales cerradas en este navegador y
   numera cada una por administrador, como hace el trigger de la base */
function obtenerSesiones() {
  if (D.usarApi) {
    return D.llamarApi("/admin/sesiones", { headers: cabeceraToken() }).then(function (resultado) {
      if (resultado.estado !== 200) {
        throw new Error(resultado.datos.error || "No se pudo cargar el registro de sesiones.");
      }
      return resultado.datos;
    });
  }

  var locales = [];
  try {
    locales = JSON.parse(localStorage.getItem("sesionesAdmin")) || [];
  } catch (e) {}

  var sesiones = sesionesDemo().concat(locales.map(function (s) {
    return {
      numero_identificacion: s.numero_identificacion,
      fecha_hora_conexion: s.fecha_hora_conexion,
      fecha_hora_desconexion: s.fecha_hora_desconexion,
      direccion_ip: s.direccion_ip,
      local: true
    };
  }));

  sesiones.sort(function (x, y) { return x.fecha_hora_conexion.localeCompare(y.fecha_hora_conexion); });
  var contador = {};
  sesiones.forEach(function (s) {
    contador[s.numero_identificacion] = (contador[s.numero_identificacion] || 0) + 1;
    s.numero_sesion = contador[s.numero_identificacion];
  });

  return Promise.resolve({
    administradores: ADMINS_DEMO.map(function (a) { return { id: a.id, nombre: a.nombre, horario: a.horario }; }),
    sesiones: sesiones
  });
}

function minutosEntre(desde, hasta) {
  return Math.max(Math.round((new Date(hasta) - new Date(desde)) / 60000), 0);
}

function textoDuracion(minutos) {
  var h = Math.floor(minutos / 60);
  var m = minutos % 60;
  if (h === 0) return m + " min";
  return h + " h" + (m ? " " + m + " min" : "");
}

function enHorario(fecha, horario) {
  var jornada = JORNADAS[horario];
  if (!jornada) return true;
  var hora = new Date(fecha).getHours();
  return hora >= jornada[0] && hora < jornada[1];
}

function paginaSesiones() {
  var admin = entrarComoAdmin();
  if (!admin) return;

  var datos = { administradores: [], sesiones: [] };
  var aviso = document.getElementById("admin-aviso");
  var buscar = document.getElementById("buscar-sesion");
  var filtroAdmin = document.getElementById("filtro-admin");
  var filtroPeriodo = document.getElementById("filtro-periodo");
  var filtroHorario = document.getElementById("filtro-horario");
  var conteo = document.getElementById("conteo-sesiones");
  var cuerpo = document.getElementById("cuerpo-sesiones");

  /* ----- Sesión actual ----- */
  function pintarSesionActual() {
    var texto = document.getElementById("sesion-actual-texto");
    if (!admin.inicioSesion) {
      texto.textContent = "No sabemos a qué hora entraste, porque iniciaste sesión antes de que existiera este registro. " +
        "Cierra sesión y vuelve a entrar para que se mida.";
      return;
    }
    texto.innerHTML = "Entraste el <strong>" + fechaHora(admin.inicioSesion) + "</strong> y llevas " +
      "<strong>" + textoDuracion(minutosEntre(admin.inicioSesion, new Date().toISOString())) + "</strong> conectado.";
  }
  pintarSesionActual();
  setInterval(pintarSesionActual, 30000);

  function adminDe(id) {
    return datos.administradores.filter(function (a) { return a.id === id; })[0] ||
      { id: id, nombre: "Administrador " + id, horario: "" };
  }

  /* Sesiones del periodo con los datos calculados */
  function delPeriodo() {
    var dias = Number(filtroPeriodo.value);
    var limite = dias ? Date.now() - dias * 86400000 : 0;

    return datos.sesiones.filter(function (s) {
      return new Date(s.fecha_hora_conexion).getTime() >= limite;
    }).map(function (s) {
      var a = adminDe(s.numero_identificacion);
      return Object.assign({}, s, {
        nombre: a.nombre,
        horario: a.horario,
        minutos: minutosEntre(s.fecha_hora_conexion, s.fecha_hora_desconexion),
        dentro: enHorario(s.fecha_hora_conexion, a.horario)
      });
    });
  }

  function pintarResumen(lista) {
    var total = lista.reduce(function (s, x) { return s + x.minutos; }, 0);
    pintarTarjetas([
      { titulo: "Sesiones", valor: lista.length, formato: numero.format },
      { titulo: "Tiempo total en pantalla", valor: total, formato: textoDuracion },
      { titulo: "Duración promedio", valor: lista.length ? Math.round(total / lista.length) : 0, formato: textoDuracion },
      { titulo: "Fuera de horario", valor: lista.filter(function (x) { return !x.dentro; }).length, formato: numero.format, alerta: true }
    ]);
  }

  function pintarGraficas(lista) {
    var porAdmin = datos.administradores.map(function (a) {
      var suyas = lista.filter(function (x) { return x.numero_identificacion === a.id; });
      return {
        nombre: a.nombre,
        horario: a.horario,
        sesiones: suyas.length,
        minutos: suyas.reduce(function (s, x) { return s + x.minutos; }, 0)
      };
    }).sort(function (x, y) { return y.minutos - x.minutos; });
    var maximo = Math.max.apply(null, porAdmin.map(function (a) { return a.minutos; }).concat([1]));

    var cajaAdmin = document.getElementById("grafica-tiempo-admin");
    cajaAdmin.innerHTML =
      '<figure class="admin-figura">' +
        '<figcaption class="oculto">Tiempo total en pantalla de cada administrador en el periodo elegido.</figcaption>' +
        '<ul class="barras">' + porAdmin.map(function (a, i) {
          return '<li style="--orden:' + i + '">' +
            '<div class="barra-texto"><span>' + escapar(a.nombre) + ' <span class="texto-gris">(' + escapar(a.horario) + ')</span></span>' +
            '<strong>' + textoDuracion(a.minutos) + '</strong></div>' +
            '<div class="barra-pista" aria-hidden="true"><span class="barra" style="--ancho:' + (a.minutos / maximo * 100).toFixed(1) + '%"></span></div>' +
            '<p class="ranking-detalle">' + a.sesiones + (a.sesiones === 1 ? " sesión" : " sesiones") + '</p>' +
          '</li>';
        }).join("") + '</ul>' +
      '</figure>';
    animarAlVer(cajaAdmin.querySelector(".admin-figura"));

    /* Columnas: conexiones por hora del día */
    var horas = [];
    for (var h = 0; h < 24; h++) horas.push(0);
    lista.forEach(function (x) { horas[new Date(x.fecha_hora_conexion).getHours()]++; });

    var ancho = 480;
    var alto = 190;
    var abajo = 26;
    var arriba = 20;
    var paso = ancho / 24;
    var columna = paso * 0.62;
    var tope = Math.max.apply(null, horas.concat([1]));

    var barras = horas.map(function (v, i) {
      var altoBarra = (alto - arriba - abajo) * v / tope;
      var x = paso * i + (paso - columna) / 2;
      return '<g style="--orden:' + Math.floor(i / 2) + '">' +
        '<rect class="columna" x="' + x.toFixed(1) + '" y="' + (alto - abajo - altoBarra).toFixed(1) + '" width="' + columna.toFixed(1) +
          '" height="' + altoBarra.toFixed(1) + '" rx="3"/>' +
        (v ? '<text class="valor-columna" x="' + (x + columna / 2).toFixed(1) + '" y="' + (alto - abajo - altoBarra - 5).toFixed(1) +
          '" text-anchor="middle">' + v + '</text>' : '') +
        (i % 3 === 0 ? '<text class="eje" x="' + (x + columna / 2).toFixed(1) + '" y="' + (alto - 6) + '" text-anchor="middle">' + i + 'h</text>' : '') +
      '</g>';
    }).join("");

    var cajaHoras = document.getElementById("grafica-horas");
    cajaHoras.innerHTML =
      '<figure class="admin-figura grafica-columnas">' +
        '<svg viewBox="0 0 ' + ancho + ' ' + alto + '" aria-hidden="true" focusable="false">' +
          '<line class="guia" x1="0" x2="' + ancho + '" y1="' + (alto - abajo) + '" y2="' + (alto - abajo) + '"/>' + barras +
        '</svg>' +
      '</figure>' +
      tablaDatos("Conexiones por hora del día", ["Hora", "Conexiones"],
        horas.map(function (v, i) { return [i + ":00", String(v)]; }).filter(function (f) { return f[1] !== "0"; }));
    animarAlVer(cajaHoras.querySelector(".admin-figura"));
  }

  function filtrar(lista) {
    var texto = normalizar(buscar.value.trim());
    return lista.filter(function (x) {
      var coincide = texto === "" ||
        normalizar(x.nombre + " " + x.numero_identificacion + " " + x.direccion_ip).indexOf(texto) !== -1;
      return coincide &&
        (filtroAdmin.value === "" || x.numero_identificacion === filtroAdmin.value) &&
        (filtroHorario.value === "" || (filtroHorario.value === "dentro") === x.dentro);
    }).sort(function (a, b) { return b.fecha_hora_conexion.localeCompare(a.fecha_hora_conexion); });
  }

  function pintarTabla(lista) {
    var visibles = filtrar(lista);

    conteo.textContent = visibles.length === lista.length
      ? "Mostrando las " + lista.length + " sesiones del periodo."
      : "Mostrando " + visibles.length + " de " + lista.length + " sesiones del periodo.";

    if (visibles.length === 0) {
      cuerpo.innerHTML = '<tr role="row"><td role="cell" colspan="7" class="tabla-vacia">' +
        'No hay sesiones que coincidan con la búsqueda. Prueba con otros filtros.</td></tr>';
      return;
    }

    cuerpo.innerHTML = visibles.map(function (x) {
      return '<tr role="row" class="' + (x.dentro ? "" : "fila-pendiente") + '">' +
        '<th scope="row" role="rowheader">' +
          '<span class="agente-nombre">' + escapar(x.nombre) + (x.local ? ' <span class="texto-gris">(este navegador)</span>' : '') + '</span>' +
          '<span class="agente-nit">CC ' + escapar(x.numero_identificacion) + ' · Jornada ' + escapar(x.horario || "—") + '</span>' +
        '</th>' +
        '<td role="cell" data-etiqueta="N° de sesión" class="numero">' + x.numero_sesion + '</td>' +
        '<td role="cell" data-etiqueta="Conexión">' + fechaHora(x.fecha_hora_conexion) + '</td>' +
        '<td role="cell" data-etiqueta="Desconexión">' + fechaHora(x.fecha_hora_desconexion) + '</td>' +
        '<td role="cell" data-etiqueta="Tiempo en pantalla" class="numero">' + textoDuracion(x.minutos) + '</td>' +
        '<td role="cell" data-etiqueta="Dirección IP">' + escapar(x.direccion_ip) + '</td>' +
        '<td role="cell" data-etiqueta="Horario">' +
          (x.dentro ? etiqueta("En horario", "agente-activo", "Horario") : etiqueta("Fuera de horario", "agente-pendiente", "Horario")) +
        '</td>' +
      '</tr>';
    }).join("");
  }

  function pintarTodo() {
    var lista = delPeriodo();
    pintarResumen(lista);
    pintarGraficas(lista);
    pintarTabla(lista);
  }

  /* CSV con punto y coma y BOM, para que Excel en español abra bien las tildes */
  document.getElementById("descargar-sesiones").onclick = function () {
    var filas = filtrar(delPeriodo());
    var celda = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };
    var lineas = [["Administrador", "Documento", "N° de sesión", "Conexión", "Desconexión", "Minutos en pantalla", "Dirección IP", "Jornada", "Horario"].map(celda).join(";")]
      .concat(filas.map(function (x) {
        return [x.nombre, x.numero_identificacion, x.numero_sesion, fechaHora(x.fecha_hora_conexion), fechaHora(x.fecha_hora_desconexion),
          x.minutos, x.direccion_ip, x.horario, x.dentro ? "En horario" : "Fuera de horario"].map(celda).join(";");
      }));
    var archivo = new Blob(["﻿" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = "sesiones-administradores.csv";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(function () { URL.revokeObjectURL(enlace.href); }, 1000);
    aviso.textContent = "Se descargó el CSV con " + filas.length + (filas.length === 1 ? " sesión." : " sesiones.");
  };

  document.getElementById("filtros-sesiones").addEventListener("submit", function (evento) {
    evento.preventDefault();
  });
  buscar.addEventListener("input", function () { pintarTabla(delPeriodo()); });
  filtroAdmin.onchange = function () { pintarTabla(delPeriodo()); };
  filtroHorario.onchange = function () { pintarTabla(delPeriodo()); };
  filtroPeriodo.onchange = pintarTodo;

  obtenerSesiones().then(function (respuesta) {
    datos = respuesta;

    datos.administradores.forEach(function (a) {
      var opcion = document.createElement("option");
      opcion.value = a.id;
      opcion.textContent = a.nombre;
      filtroAdmin.appendChild(opcion);
    });

    if (!D.usarApi) {
      aviso.textContent = "Modo local: se muestran sesiones de ejemplo y las que cierres en este navegador (con IP 127.0.0.1, porque el navegador no puede ver la IP real).";
    }
    pintarTodo();
  }).catch(function (error) {
    aviso.innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
  });
}

var paginaAdmin = document.body.getAttribute("data-pagina");

if (paginaAdmin === "admin") {
  paginaPanel();
} else if (paginaAdmin === "admin-agentes") {
  paginaAgentes();
} else if (paginaAdmin === "admin-eventos") {
  paginaEventosAdmin();
} else if (paginaAdmin === "admin-clientes") {
  paginaClientes();
} else if (paginaAdmin === "admin-reservas") {
  paginaReservasAdmin();
} else if (paginaAdmin === "admin-verificaciones") {
  paginaVerificacionesAdmin();
} else if (paginaAdmin === "admin-validar") {
  paginaValidar();
} else if (paginaAdmin === "admin-sesiones") {
  paginaSesiones();
}
