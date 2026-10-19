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
   - POST   /api/admin/agentes           registra un agente (USUARIO del representante + AGENTE), con "contrasena"
   - PUT    /api/admin/agentes/:nit      modifica sus datos (el NIT y el documento no cambian)
   - DELETE /api/admin/agentes/:nit      lo elimina; responde 409 si tiene eventos (EVENTO.id_agente es RESTRICT)
   - GET   /api/admin/eventos            -> { eventos: [ igual que EVENTOS de script.js, con "agente" ] }
   - POST   /api/admin/eventos           registra un evento (EVENTO + UBICACION) para un agente
   - PUT    /api/admin/eventos/:id       modifica sus datos (el estado se cambia aparte)
   - DELETE /api/admin/eventos/:id       lo elimina (sus reservas se borran en cascada)
   - PATCH /api/admin/eventos/:id/estado    cuerpo { estado, observaciones }
     (al cancelar, "observaciones" lleva la causa con el formato de notaCancelacion() en script.js)
   - GET   /api/admin/clientes           -> { clientes: [ igual que CLIENTES_DEMO ] }
   - PATCH /api/admin/clientes/:documento/estado   cuerpo { estado: "Activa" | "Bloqueada" }
   - POST   /api/admin/clientes              registra un cliente (USUARIO + CLIENTE), con "contrasena"
   - PUT    /api/admin/clientes/:documento   modifica sus datos (el documento no cambia)
   - DELETE /api/admin/clientes/:documento   lo elimina (sus reservas se borran en cascada)
   - GET    /api/admin/administradores        -> { administradores: [ igual que ADMINISTRADORES_DEMO ] }
   - POST   /api/admin/administradores        registra uno (USUARIO + ADMIN), con "contrasena"
   - PUT    /api/admin/administradores/:documento   modifica sus datos (el documento no cambia)
   - DELETE /api/admin/administradores/:documento   lo elimina (el API no deja borrar la cuenta propia ni al último)
   - GET   /api/admin/reservas           -> { reservas: [ igual que reservasLocales() ] }
     "pago" guarda la transacción de Wompi: { id, metodo, estado, montoCentavos, moneda },
     con metodo y estado tal como los envía Wompi (CARD, NEQUI, PSE, BANCOLOMBIA_TRANSFER /
     APPROVED, PENDING, DECLINED, VOIDED, ERROR). El backend los actualiza con el webhook
     de Wompi (evento transaction.updated); la referencia de la transacción es el código.
   - POST   /api/admin/reservas           registra una reserva para un cliente (sin pago en Wompi)
   - PUT    /api/admin/reservas/:codigo   modifica entradas, estado u observaciones
   - DELETE /api/admin/reservas/:codigo   la elimina; 409 si tiene un PAGO (PAGO.id_reserva es RESTRICT)
   - GET    /api/admin/ubicaciones        -> { paises: [{ id, nombre }], departamentos: [{ id, nombre, idPais }],
                                             ciudades: [{ id, nombre, idDepartamento }] }
   - POST / PUT / DELETE /api/admin/paises[/:id], /api/admin/departamentos[/:id], /api/admin/ciudades[/:id]
     cuerpo { nombre } (y idPais o idDepartamento al registrar). DELETE responde 409 si el país tiene
     departamentos, el departamento tiene ciudades o la ciudad la usan personas o ubicaciones (RESTRICT).
   - PATCH /api/admin/reservas/:codigo/estado      cuerpo { estado: "Cancelada", observaciones }
     ("observaciones" lleva la causa, igual que en los eventos)
   - GET   /api/admin/reportes?anio=2026  -> reportesLocal(): totales, promedios, ingresos por
     agente / cliente / mes, reservas por evento y mes, eventos por agente y ciudad, eventos por
     ubicación, reservas (historial y canceladas) y eventos cancelados. La causa de una
     cancelación va en "observaciones" de RESERVA o EVENTO.
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
  clientes: 18430
};

/* Agentes (AGENTE en la base de datos). "ventas" son las entradas vendidas
   en cada uno de los últimos 6 meses; "eventos", los id de EVENTOS. */
var AGENTES_DEMO = [
  { nit: "901234567-1", tipoDoc: "CC", documento: "52874136", nombres: "Camila", apellidos: "Restrepo", direccion: "Calle 93 # 13-45 oficina 302",
    nombre: "Tarima Producciones", razon: "Tarima Producciones S.A.S.", correo: "contacto@tarima.example",
    telefono: "3104567890", ciudad: "Bogotá", registro: "2024-02-12", comision: 8, experiencia: 9, estado: "Activo",
    eventos: [1, 3], entradas: 9840, ingresos: 525700000, ventas: [720, 810, 905, 870, 1010, 1180],
    descripcion: "Productora de festivales y conciertos de gran formato en Bogotá." },
  { nit: "900876543-2", tipoDoc: "CC", documento: "71654320", nombres: "Jorge Iván", apellidos: "Arango Ruiz", direccion: "Carrera 43A # 1-50",
    nombre: "Sonido Andino", razon: "Sonido Andino Ltda.", correo: "hola@sonidoandino.example",
    telefono: "3157894561", ciudad: "Medellín", registro: "2024-05-03", comision: 7.5, experiencia: 6, estado: "Activo",
    eventos: [2, 8], entradas: 7210, ingresos: 408900000, ventas: [540, 600, 650, 620, 710, 760],
    descripcion: "Giras de artistas nacionales en arenas y coliseos del país." },
  { nit: "901112233-4", tipoDoc: "CC", documento: "66987123", nombres: "Paola Andrea", apellidos: "Cifuentes", direccion: "Avenida 4N # 10-22",
    nombre: "Rumba Viva Eventos", razon: "Rumba Viva Eventos S.A.S.", correo: "eventos@rumbaviva.example",
    telefono: "3001239876", ciudad: "Cali", registro: "2024-08-21", comision: 7, experiencia: 5, estado: "Activo",
    eventos: [4, 5], entradas: 5980, ingresos: 311500000, ventas: [430, 480, 520, 500, 560, 610],
    descripcion: "Salsa, espectáculos de circo y eventos familiares en el Valle del Cauca." },
  { nit: "900445566-7", tipoDoc: "CC", documento: "72198456", nombres: "Ricardo", apellidos: "De la Hoz Pérez", direccion: "Calle 72 # 54-35",
    nombre: "Telón Abierto", razon: "Fundación Telón Abierto", correo: "taquilla@telonabierto.example",
    telefono: "3012345678", ciudad: "Barranquilla", registro: "2025-01-15", comision: 6, experiencia: 12, estado: "Activo",
    eventos: [6], entradas: 3120, ingresos: 175200000, ventas: [220, 250, 240, 270, 290, 310],
    descripcion: "Compañía de teatro con obras de autores latinoamericanos." },
  { nit: "901998877-0", tipoDoc: "CC", documento: "1130654987", nombres: "Yesenia", apellidos: "Mosquera Valencia", direccion: "Calle 15 # 100-40",
    nombre: "Pacífico Live", razon: "Pacífico Live S.A.S.", correo: "info@pacificolive.example",
    telefono: "3168889900", ciudad: "Cali", registro: "2025-03-30", comision: 7, experiencia: 3, estado: "Activo",
    eventos: [9], entradas: 2650, ingresos: 136300000, ventas: [180, 200, 230, 210, 260, 290],
    descripcion: "Música del Pacífico y nuevos artistas urbanos." },
  { nit: "900332211-5", tipoDoc: "CC", documento: "8765432", nombres: "Álvaro", apellidos: "Barrios Fontalvo", direccion: "Carrera 51B # 80-58",
    nombre: "Caribe Fest", razon: "Caribe Fest Producciones S.A.S.", correo: "contacto@caribefest.example",
    telefono: "3045556677", ciudad: "Barranquilla", registro: "2024-11-09", comision: 8, experiencia: 4, estado: "Suspendido",
    eventos: [10], entradas: 1430, ingresos: 88400000, ventas: [210, 190, 160, 90, 0, 0],
    descripcion: "Festivales de música caribeña. Suspendido por reclamos de reembolso pendientes." },
  { nit: "901556677-8", tipoDoc: "CC", documento: "1020456789", nombres: "Kevin Andrés", apellidos: "Rojas", direccion: "Calle 63 # 9-20",
    nombre: "Escena Urbana", razon: "Escena Urbana Colectivo S.A.S.", correo: "escena@urbana.example",
    telefono: "3201112233", ciudad: "Bogotá", registro: "2025-06-18", comision: 6.5, experiencia: 2, estado: "Activo",
    eventos: [11], entradas: 1210, ingresos: 64800000, ventas: [60, 90, 120, 150, 170, 210],
    descripcion: "Batallas de rap, grafiti y cultura hip hop." },
  { nit: "901667788-9", tipoDoc: "CE", documento: "564321", nombres: "Martín", apellidos: "Quiroga Sosa", direccion: "Calle 5 # 66-18",
    nombre: "Gira Andina", razon: "Gira Andina S.A.S.", correo: "reservas@giraandina.example",
    telefono: "3117778899", ciudad: "Cali", registro: "2025-07-02", comision: 6, experiencia: 3, estado: "Activo",
    eventos: [7, 12], entradas: 980, ingresos: 52100000, ventas: [50, 70, 90, 110, 130, 160],
    descripcion: "Conciertos acústicos y ferias gastronómicas." },
  { nit: "901778899-3", tipoDoc: "CC", documento: "1098765432", nombres: "Laura Daniela", apellidos: "Prada Rueda", direccion: "Carrera 27 # 36-14",
    nombre: "Montaña Sonora", razon: "Montaña Sonora S.A.S.", correo: "hola@montanasonora.example",
    telefono: "3189990011", ciudad: "Bucaramanga", registro: "2026-09-28", comision: 7, experiencia: 1, estado: "Pendiente",
    eventos: [], entradas: 0, ingresos: 0, ventas: [0, 0, 0, 0, 0, 0],
    descripcion: "Festivales de rock en Santander. Espera la revisión de sus documentos." },
  { nit: "901889900-6", tipoDoc: "CC", documento: "43567890", nombres: "Beatriz Elena", apellidos: "Gaviria", direccion: "Carrera 70 # 44-23",
    nombre: "Luna Llena Teatro", razon: "Corporación Luna Llena", correo: "lunallena@teatro.example",
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
    { cuando: "Hace 42 min", texto: "Se aprobó un evento de Sonido Andino." },
    { cuando: "Hace 1 h", texto: "Se canceló una reserva de 2 entradas para " + D.eventos[1].titulo + "." },
    { cuando: "Hace 3 h", texto: "Se registró el agente Pacífico Live." }
  ];

  return {
    indicadores: {
      eventosActivos: activos,
      reservas: totalReservas,
      ingresos: totalIngresos,
      agentes: agentesLocales().filter(function (a) { return a.estado === "Activo"; }).length,
      clientes: DEMO.clientes,
      eventosPorRevisar: leerSolicitudesEventos().filter(function (s) { return s.estado === "En revisión"; }).length
    },
    meses: meses,
    estados: Object.keys(COLOR_ESTADO).map(function (estado) {
      return { estado: estado, total: conteo[estado] || 0 };
    }),
    categorias: DEMO.categorias.map(function (c) {
      return { categoria: c[0], ingresos: Math.round(totalIngresos * c[1] / sumaCategorias) };
    }),
    agentes: agentesLocales().filter(function (a) { return a.estado === "Activo"; })
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
    { titulo: "Eventos por revisar", valor: ind.eventosPorRevisar, formato: numero.format, alerta: true }
  ];

  pintarTarjetas(tarjetas);
}

/* Tarjetas de indicadores: { titulo, valor, formato, completo?, cambio?, alerta? }.
   "idLista" sirve para las páginas con más de un grupo de tarjetas. */
function pintarTarjetas(tarjetas, idLista) {
  var lista = document.getElementById(idLista || "admin-indicadores");

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
  var nombre = serieActual === "ingresos" ? "Ingresos" : (datos.nombreCantidad || "Reservas");

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


/* ===== FORMULARIOS DE REGISTRO Y EDICIÓN (CRUD) =====
   Los usan Clientes, Agentes, Administradores, Eventos y Ubicaciones.
   campos: [{ id, etiqueta, tipo, opciones?, opcional?, ayuda?, max?, min?, soloLectura?, par?, decimal? }]
   tipo: text, email, tel, date, number, password, select, checkbox, textarea,
   file (una imagen), "titulo" para separar el formulario en partes (solo muestra
   un subtítulo) y "html" para un bloque propio (por ejemplo, el mapa).
   Dos campos seguidos con "par: true" van lado a lado en pantallas anchas. */

function htmlCampo(c, valor) {
  if (c.tipo === "titulo") {
    return '<h3 class="form-seccion">' + c.etiqueta + '</h3>';
  }
  if (c.tipo === "html") {
    return c.html;
  }
  var id = "f-" + c.id;
  var ayuda = c.ayuda ? '<p class="agente-ayuda" id="' + id + '-ayuda">' + c.ayuda + '</p>' : "";
  var describe = c.ayuda ? ' aria-describedby="' + id + '-ayuda"' : "";
  var bloqueado = c.soloLectura ? " disabled" : "";
  var requerido = c.opcional || c.tipo === "checkbox" ? "" : " required";
  var texto = valor === undefined || valor === null ? "" : String(valor);

  if (c.tipo === "checkbox") {
    return '<div class="campo campo-casilla">' +
      '<label><input type="checkbox" id="' + id + '"' + (valor ? " checked" : "") + bloqueado + describe + ' /> ' + c.etiqueta + '</label>' +
      ayuda + '</div>';
  }

  var etiqueta = '<label for="' + id + '">' + c.etiqueta +
    (c.opcional ? ' <span class="opcional">(opcional)</span>' : '') + '</label>';
  var control;

  if (c.tipo === "select") {
    control = '<select id="' + id + '"' + requerido + bloqueado + describe + '>' +
      '<option value="">Elige una opción</option>' +
      c.opciones.map(function (o) {
        var valorOpcion = Array.isArray(o) ? o[0] : o;
        var textoOpcion = Array.isArray(o) ? o[1] : o;
        return '<option value="' + escapar(valorOpcion) + '"' + (String(valorOpcion) === texto ? " selected" : "") + '>' +
          escapar(textoOpcion) + '</option>';
      }).join("") +
    '</select>';
  } else if (c.tipo === "file") {
    control = '<input type="file" id="' + id + '" accept="image/*"' + bloqueado + describe + ' />';
  } else if (c.tipo === "textarea") {
    control = '<textarea id="' + id + '" rows="3"' + (c.max ? ' maxlength="' + c.max + '"' : '') + requerido + bloqueado + describe + '>' +
      escapar(texto) + '</textarea>';
  } else {
    control = '<input type="' + c.tipo + '" id="' + id + '" value="' + escapar(texto) + '"' +
      (c.max && c.tipo !== "number" ? ' maxlength="' + c.max + '"' : '') +
      (c.tipo === "number" && c.min !== undefined ? ' min="' + c.min + '"' : '') +
      (c.tipo === "number" && c.max !== undefined ? ' max="' + c.max + '"' : '') +
      (c.tipo === "number" && c.paso ? ' step="' + c.paso + '"' : '') +
      (c.decimal ? ' inputmode="decimal"' : '') +
      (c.tipo === "password" ? ' autocomplete="new-password"' : ' autocomplete="off"') +
      requerido + bloqueado + describe + ' />';
  }
  return '<div class="campo">' + etiqueta + control + ayuda + '</div>';
}

/* El formulario completo, con el mensaje de error arriba y los botones abajo */
function htmlFormulario(idForm, campos, valores, textoGuardar) {
  var html = "";
  for (var i = 0; i < campos.length; i++) {
    var c = campos[i];
    if (c.par && campos[i + 1] && campos[i + 1].par) {
      html += '<div class="agente-campos-dobles">' + htmlCampo(c, valores[c.id]) +
        htmlCampo(campos[i + 1], valores[campos[i + 1].id]) + '</div>';
      i++;
    } else {
      html += htmlCampo(c, valores[c.id]);
    }
  }
  return '<form class="form-admin" id="' + idForm + '" novalidate>' +
    '<p class="mensaje error" id="' + idForm + '-error" role="alert"></p>' +
    html +
    '<div class="detalle-botones">' +
      '<button type="submit" class="admin-boton">' + textoGuardar + '</button>' +
      '<button type="button" class="admin-boton-sec" data-accion="cancelar-formulario">Cancelar</button>' +
    '</div>' +
  '</form>';
}

/* { id: valor } con los textos sin espacios de sobra */
function leerFormulario(campos) {
  var valores = {};
  campos.forEach(function (c) {
    if (c.tipo === "titulo" || c.tipo === "html") return;
    var control = document.getElementById("f-" + c.id);
    if (c.tipo === "file") {
      valores[c.id] = control.files[0] || null;
      return;
    }
    valores[c.id] = c.tipo === "checkbox" ? control.checked : control.value.replace(/\s+/g, " ").trim();
  });
  return valores;
}

/* Marca los campos con error y lleva el foco al primero. Devuelve true si hay errores. */
function mostrarErroresFormulario(idForm, campos, errores) {
  var primero = null;
  campos.forEach(function (c) {
    if (c.tipo === "titulo" || c.tipo === "html") return;
    var control = document.getElementById("f-" + c.id);
    if (errores[c.id]) {
      control.setAttribute("aria-invalid", "true");
      if (!primero) primero = c;
    } else {
      control.removeAttribute("aria-invalid");
    }
  });

  var caja = document.getElementById(idForm + "-error");
  if (!primero) {
    caja.textContent = "";
    return false;
  }
  var cuantos = Object.keys(errores).length;
  caja.innerHTML = "<strong>Error:</strong> " + escapar(errores[primero.id]) +
    (cuantos > 1 ? " (y " + (cuantos - 1) + (cuantos === 2 ? " campo más por revisar)" : " campos más por revisar)") : "");
  document.getElementById("f-" + primero.id).focus();
  return true;
}

/* Reglas de la base de datos (USUARIO): documento, correo, teléfono */
var TIPOS_DOCUMENTO = [
  ["CC", "Cédula de ciudadanía"],
  ["CE", "Cédula de extranjería"],
  ["PPT", "Permiso por protección temporal"],
  ["PAS", "Pasaporte"]
];

var FORMATO_DOCUMENTO = {
  CC: [/^[0-9]{6,10}$/, "La cédula de ciudadanía lleva de 6 a 10 números."],
  CE: [/^[0-9]{4,10}$/, "La cédula de extranjería lleva de 4 a 10 números."],
  PPT: [/^[0-9]{5,10}$/, "El permiso por protección temporal lleva de 5 a 10 números."],
  PAS: [/^[A-Z0-9]{5,15}$/, "El pasaporte lleva de 5 a 15 letras o números."]
};

function documentoNormalizado(texto) {
  return String(texto).toUpperCase().replace(/[\s.\-]/g, "");
}

/* Errores de los datos comunes de una persona (tabla USUARIO) */
function validarPersona(v, errores) {
  if (!v.tipoDoc) errores.tipoDoc = "Elige el tipo de documento.";
  var doc = documentoNormalizado(v.documento);
  if (!doc) {
    errores.documento = "Escribe el número de documento.";
  } else if (v.tipoDoc && FORMATO_DOCUMENTO[v.tipoDoc] && !FORMATO_DOCUMENTO[v.tipoDoc][0].test(doc)) {
    errores.documento = FORMATO_DOCUMENTO[v.tipoDoc][1];
  }
  if (!v.nombres) errores.nombres = "Escribe los nombres.";
  if (!v.apellidos) errores.apellidos = "Escribe los apellidos.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.correo)) errores.correo = "Escribe un correo válido, por ejemplo nombre@correo.com.";
  if (v.telefono && !/^(3[0-9]{9}|60[0-9]{8})$/.test(v.telefono.replace(/\s/g, ""))) {
    errores.telefono = "El teléfono debe ser un celular de 10 números o un fijo que empiece por 60.";
  }
  if (!v.direccion) errores.direccion = "Escribe la dirección.";
  if (!v.ciudad) errores.ciudad = "Elige la ciudad.";
  if (v.contrasena !== undefined && v.contrasena.length < 8) {
    errores.contrasena = "La contraseña debe tener al menos 8 caracteres.";
  }
  return errores;
}

/* Ciudades para las listas: [["Cali", "Cali (Valle del Cauca)"], ...] */
function obtenerCiudadesLista() {
  return D.llamarApi("/ciudades").then(function (resultado) {
    return ((resultado.datos && resultado.datos.ciudades) || [])
      .slice()
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); })
      .map(function (c) { return [c.nombre, c.nombre + " (" + c.departamento + ")"]; });
  });
}

/* Cambios hechos en este navegador (modo local) a una lista de ejemplo:
   { nuevos: [registros], cambios: { id: { campos } }, eliminados: [ids] } */
function leerDatosLocales(clave) {
  try {
    var d = JSON.parse(localStorage.getItem(clave)) || {};
    return { nuevos: d.nuevos || [], cambios: d.cambios || {}, eliminados: d.eliminados || [] };
  } catch (e) {
    return { nuevos: [], cambios: {}, eliminados: [] };
  }
}

function guardarDatosLocales(clave, datos) {
  try {
    localStorage.setItem(clave, JSON.stringify(datos));
  } catch (e) {
    throw new Error("No se pudo guardar en este navegador.");
  }
}

/* La lista de ejemplo con lo agregado, cambiado y eliminado en este navegador */
function aplicarDatosLocales(lista, clave, campoId) {
  var d = leerDatosLocales(clave);
  return lista.concat(d.nuevos)
    .filter(function (x) { return d.eliminados.indexOf(String(x[campoId])) === -1; })
    .map(function (x) { return Object.assign({}, x, d.cambios[x[campoId]] || {}); });
}

/* Registra (id = null), modifica o elimina (datos = null) en modo local */
function cambiarDatoLocal(clave, campoId, id, datos) {
  var d = leerDatosLocales(clave);
  if (datos === null) {
    var eraNuevo = d.nuevos.some(function (x) { return String(x[campoId]) === String(id); });
    d.nuevos = d.nuevos.filter(function (x) { return String(x[campoId]) !== String(id); });
    if (!eraNuevo && d.eliminados.indexOf(String(id)) === -1) d.eliminados.push(String(id));
    delete d.cambios[id];
  } else if (id === null) {
    d.nuevos.push(datos);
  } else {
    var nuevo = d.nuevos.filter(function (x) { return String(x[campoId]) === String(id); })[0];
    if (nuevo) Object.assign(nuevo, datos);
    else d.cambios[id] = Object.assign(d.cambios[id] || {}, datos);
  }
  guardarDatosLocales(clave, d);
}

/* POST (registrar), PUT (modificar) o DELETE (eliminar) contra el API */
function enviarCrud(ruta, metodo, datos, error) {
  return D.llamarApi(ruta, {
    method: metodo,
    headers: Object.assign({ "Content-Type": "application/json" }, cabeceraToken()),
    body: datos ? JSON.stringify(datos) : undefined
  }).then(function (resultado) {
    if (resultado.estado !== 200 && resultado.estado !== 201 && resultado.estado !== 204) {
      throw new Error((resultado.datos && resultado.datos.error) || error);
    }
    return resultado.datos;
  });
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

/* Cambios que cada agente hizo a su perfil en agente-perfil.html (modo local) */
function leerPerfilesAgentes() {
  try {
    return JSON.parse(localStorage.getItem("perfilesAgentes")) || {};
  } catch (e) {
    return {};
  }
}

/* Logo del agente o, si no tiene, la inicial de su nombre */
function avatarAgente(a, grande) {
  if (a.logo) {
    return '<img class="agente-inicial agente-logo' + (grande ? " agente-inicial-grande" : "") + '" src="' +
      escapar(a.logo) + '" alt="" />';
  }
  return '<span class="agente-inicial' + (grande ? " agente-inicial-grande" : "") + '" aria-hidden="true">' +
    escapar(a.nombre.charAt(0)) + '</span>';
}

/* Agentes de ejemplo con lo que se registró, modificó o eliminó en este navegador */
function agentesLocales() {
  return aplicarDatosLocales(AGENTES_DEMO, "datosAgentes", "nit");
}

function obtenerAgentes() {
  if (!D.usarApi) {
    var cambios = leerCambiosLocales();
    var perfiles = leerPerfilesAgentes();
    return Promise.resolve(agentesLocales().map(function (a) {
      var copia = Object.assign({}, a, perfiles[a.nit] || {});
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

/* nit = null para registrar uno nuevo */
function guardarAgente(datos, nit) {
  if (!D.usarApi) {
    var copia = Object.assign({}, datos);
    delete copia.contrasena;   /* la contraseña nunca se guarda en el navegador */
    cambiarDatoLocal("datosAgentes", "nit", nit, copia);

    /* Lo que edita el admin manda sobre lo que el agente había cambiado en su perfil */
    if (nit !== null) {
      try {
        var perfiles = leerPerfilesAgentes();
        if (perfiles[nit]) {
          Object.keys(copia).forEach(function (campo) { delete perfiles[nit][campo]; });
          localStorage.setItem("perfilesAgentes", JSON.stringify(perfiles));
        }
      } catch (e) {}
    }
    return Promise.resolve();
  }
  return nit === null
    ? enviarCrud("/admin/agentes", "POST", datos, "No se pudo registrar el agente.")
    : enviarCrud("/admin/agentes/" + encodeURIComponent(nit), "PUT", datos, "No se pudieron guardar los cambios.");
}

function eliminarAgente(nit) {
  if (!D.usarApi) {
    cambiarDatoLocal("datosAgentes", "nit", nit, null);
    return Promise.resolve();
  }
  return enviarCrud("/admin/agentes/" + encodeURIComponent(nit), "DELETE", null, "No se pudo eliminar el agente.");
}

/* Eventos de un agente: los de ejemplo y los que creó y se aprobaron */
function eventosDeAgente(a) {
  return D.eventos.filter(function (e) { return esEventoDe(e, a); });
}

function camposAgente(nuevo, ciudades) {
  var campos = [
    { tipo: "titulo", etiqueta: "Empresa" },
    { id: "nit", etiqueta: "NIT", tipo: "text", max: 11, par: true, soloLectura: !nuevo,
      ayuda: nuevo ? "Nueve números, guion y dígito de verificación: 900123456-7." : "El NIT no se puede cambiar." },
    { id: "razon", etiqueta: "Razón social", tipo: "text", max: 150, par: true },
    { id: "nombre", etiqueta: "Nombre comercial", tipo: "text", max: 150, par: true,
      ayuda: "Es el nombre que ve el público." },
    { id: "experiencia", etiqueta: "Años de experiencia", tipo: "number", min: 0, par: true },
    { id: "comision", etiqueta: "Comisión (%)", tipo: "text", decimal: true, max: 6, par: true,
      ayuda: "Lo que cobra El Desparche por cada venta, de 0 a 100. Ejemplo: 6,5." },
    { id: "estado", etiqueta: "Estado", tipo: "select", opciones: ["Activo", "Pendiente", "Suspendido"], par: true, soloLectura: !nuevo,
      ayuda: nuevo ? "" : "Se cambia con los botones del detalle." },
    { id: "descripcion", etiqueta: "Descripción", tipo: "textarea", opcional: true },
    { tipo: "titulo", etiqueta: "Representante" },
    { id: "tipoDoc", etiqueta: "Tipo de documento", tipo: "select", opciones: TIPOS_DOCUMENTO, par: true, soloLectura: !nuevo },
    { id: "documento", etiqueta: "Número de documento", tipo: "text", max: 20, par: true, soloLectura: !nuevo,
      ayuda: nuevo ? "Sin puntos ni espacios." : "El documento no se puede cambiar." },
    { id: "nombres", etiqueta: "Nombres", tipo: "text", max: 80, par: true },
    { id: "apellidos", etiqueta: "Apellidos", tipo: "text", max: 80, par: true },
    { id: "correo", etiqueta: "Correo", tipo: "email", max: 100, par: true },
    { id: "telefono", etiqueta: "Teléfono", tipo: "tel", max: 10, opcional: true, par: true,
      ayuda: "Celular de 10 números o fijo que empiece por 60." },
    { id: "direccion", etiqueta: "Dirección", tipo: "text", max: 200, par: true },
    { id: "ciudad", etiqueta: "Ciudad", tipo: "select", opciones: ciudades, par: true }
  ];
  if (nuevo) {
    campos.push({ id: "contrasena", etiqueta: "Contraseña inicial", tipo: "password",
      ayuda: "Mínimo 8 caracteres. El agente podrá cambiarla después." });
  }
  return campos;
}

/* actual = el agente que se edita (null al registrar) */
function validarAgente(v, actual, agentes) {
  var errores = {};
  if (!/^[0-9]{9}-[0-9]$/.test(v.nit)) errores.nit = "El NIT debe tener el formato 900123456-7.";
  if (!v.razon) errores.razon = "Escribe la razón social.";
  if (!v.nombre) errores.nombre = "Escribe el nombre comercial.";
  if (!/^[0-9]+$/.test(String(v.experiencia))) errores.experiencia = "Los años de experiencia deben ser un número entero de 0 en adelante.";
  var comision = Number(String(v.comision).replace(",", "."));
  if (String(v.comision) === "" || isNaN(comision) || comision < 0 || comision > 100) {
    errores.comision = "La comisión debe ser un número de 0 a 100.";
  }
  if (!v.estado) errores.estado = "Elige el estado.";
  validarPersona(v, errores);

  var otros = agentes.filter(function (a) { return a !== actual; });
  var documento = documentoNormalizado(v.documento);
  if (!actual && !errores.nit && otros.some(function (a) { return a.nit === v.nit; })) {
    errores.nit = "Ya hay un agente con ese NIT.";
  }
  if (!actual && !errores.documento && otros.some(function (a) { return a.documento === documento; })) {
    errores.documento = "Ya hay un agente con ese documento.";
  }
  if (!errores.correo && otros.some(function (a) { return (a.correo || "").toLowerCase() === v.correo.toLowerCase(); })) {
    errores.correo = "Ya hay un agente con ese correo.";
  }

  /* El formulario sigue el orden de la pantalla: primero la empresa, luego el representante */
  var ordenados = {};
  ["nit", "razon", "nombre", "experiencia", "comision", "estado", "descripcion", "tipoDoc", "documento",
    "nombres", "apellidos", "correo", "telefono", "direccion", "ciudad", "contrasena"].forEach(function (k) {
    if (errores[k]) ordenados[k] = errores[k];
  });
  return ordenados;
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
            avatarAgente(a, false) +
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
    var estado;
    if (a.estado === "Pendiente") {
      estado = '<button type="button" class="admin-boton" data-accion="Activo">Aprobar agente</button>';
    } else if (a.estado === "Suspendido") {
      estado = '<button type="button" class="admin-boton" data-accion="Activo">Reactivar agente</button>';
    } else {
      estado = '<button type="button" class="admin-boton-sec" data-accion="confirmar">Suspender agente</button>';
    }
    return '<button type="button" class="admin-boton-sec" data-accion="editar">Editar datos</button>' + estado +
      '<button type="button" class="admin-boton admin-boton-peligro" data-accion="eliminar">Eliminar agente</button>';
  }

  /* ----- Registrar y editar ----- */
  var ciudades = [];
  var modo = null;   /* "nuevo" o "editar" mientras se ve el formulario */

  function valoresAgente(a) {
    var v = {};
    ["nit", "razon", "nombre", "experiencia", "comision", "estado", "descripcion", "tipoDoc", "documento",
      "nombres", "apellidos", "correo", "telefono", "direccion", "ciudad"].forEach(function (k) { v[k] = a[k]; });
    v.comision = String(a.comision).replace(".", ",");
    return v;
  }

  function mostrarFormulario(a) {
    modo = a ? "editar" : "nuevo";
    var lista = ciudades.slice();
    if (a && a.ciudad && !lista.some(function (x) { return x[0] === a.ciudad; })) lista.push([a.ciudad, a.ciudad]);

    contenido.innerHTML =
      '<div class="detalle-cabecera"><div>' +
        '<h2 id="detalle-nombre" tabindex="-1">' + (a ? "Editar " + escapar(a.nombre) : "Registrar agente") + '</h2>' +
        '<p>' + (a ? "Cambia los datos que necesites y guarda." : "Crea la cuenta de una empresa que organiza eventos.") + '</p>' +
      '</div></div>' +
      htmlFormulario("form-agente", camposAgente(!a, lista),
        a ? valoresAgente(a) : { tipoDoc: "CC", estado: "Activo", experiencia: 0, comision: 7 },
        a ? "Guardar cambios" : "Registrar agente");
    document.getElementById("detalle-nombre").focus();
  }

  contenido.addEventListener("submit", function (evento) {
    if (evento.target.id !== "form-agente") return;
    evento.preventDefault();

    var nuevo = modo === "nuevo";
    var campos = camposAgente(nuevo, ciudades);
    var v = leerFormulario(campos);
    if (!nuevo) {
      ["nit", "tipoDoc", "documento", "estado"].forEach(function (k) { v[k] = abierto[k]; });
    }
    if (mostrarErroresFormulario("form-agente", campos, validarAgente(v, nuevo ? null : abierto, agentes))) return;

    var datos = {
      nit: v.nit, razon: v.razon, nombre: v.nombre, experiencia: Number(v.experiencia),
      comision: Number(String(v.comision).replace(",", ".")), descripcion: v.descripcion,
      tipoDoc: v.tipoDoc, documento: documentoNormalizado(v.documento), nombres: v.nombres, apellidos: v.apellidos,
      correo: v.correo.toLowerCase(), telefono: v.telefono.replace(/\s/g, ""), direccion: v.direccion, ciudad: v.ciudad
    };
    if (nuevo) {
      Object.assign(datos, {
        estado: v.estado, registro: new Date().toISOString().slice(0, 10),
        eventos: [], entradas: 0, ingresos: 0, ventas: [0, 0, 0, 0, 0, 0]
      });
    }

    var botones = evento.target.querySelectorAll("button");
    botones.forEach(function (b) { b.disabled = true; });

    guardarAgente(nuevo ? Object.assign({ contrasena: v.contrasena }, datos) : datos, nuevo ? null : abierto.nit)
      .then(function () {
        var agente;
        if (nuevo) {
          agente = datos;
          agentes.push(agente);
        } else {
          agente = Object.assign(abierto, datos);
        }
        abierto = agente;
        modo = null;
        var mensaje = nuevo ? "Se registró a " + agente.nombre + "." : "Se guardaron los cambios de " + agente.nombre + ".";
        aviso.textContent = mensaje;
        pintarResumen();
        pintarTabla();
        pintarDetalle(agente, mensaje);
        document.getElementById("detalle-nombre").focus();
      })
      .catch(function (error) {
        document.getElementById("form-agente-error").innerHTML = "<strong>Error:</strong> " + escapar(error.message);
        botones.forEach(function (b) { b.disabled = false; });
      });
  });

  document.getElementById("nuevo-agente").onclick = function () {
    abierto = null;
    mostrarFormulario(null);
    dialogo.showModal();
    document.getElementById("detalle-nombre").focus();
  };

  function confirmarEliminacion(a) {
    var acciones = document.getElementById("detalle-acciones");
    var suyos = eventosDeAgente(a).length;
    if (suyos) {
      /* EVENTO.id_agente es RESTRICT: un agente con eventos no se puede borrar */
      acciones.innerHTML =
        '<div class="detalle-confirmar">' +
          '<p id="texto-confirmar"><strong>No se puede eliminar a ' + escapar(a.nombre) + '.</strong> ' +
          'Tiene ' + suyos + (suyos === 1 ? ' evento registrado' : ' eventos registrados') +
          '. Primero elimina sus eventos en Gestión de eventos, o suspéndelo para que no publique más.</p>' +
          '<div class="detalle-botones">' +
            '<button type="button" class="admin-boton-sec" data-accion="cancelar">Entendido</button>' +
          '</div>' +
        '</div>';
      acciones.querySelector('[data-accion="cancelar"]').focus();
      return;
    }
    acciones.innerHTML =
      '<div class="detalle-confirmar">' +
        '<p id="texto-confirmar"><strong>¿Eliminar a ' + escapar(a.nombre) + '?</strong> ' +
        'Se borrará la cuenta de la empresa y de su representante. Esto no se puede deshacer.</p>' +
        '<div class="detalle-botones">' +
          '<button type="button" class="admin-boton admin-boton-peligro" data-accion="si-eliminar" aria-describedby="texto-confirmar">Sí, eliminar</button>' +
          '<button type="button" class="admin-boton-sec" data-accion="cancelar">Cancelar</button>' +
        '</div>' +
      '</div>';
    acciones.querySelector('[data-accion="si-eliminar"]').focus();
  }

  function pintarDetalle(a, mensaje) {
    var eventos = a.eventos.map(function (id) {
      return D.eventos.filter(function (e) { return e.id === id; })[0];
    }).filter(Boolean);

    contenido.innerHTML =
      '<div class="detalle-cabecera">' +
        avatarAgente(a, true) +
        '<div>' +
          '<h2 id="detalle-nombre" tabindex="-1">' + escapar(a.nombre) + '</h2>' +
          '<p>' + escapar(a.razon) + '</p>' +
          etiquetaAgente(a.estado) +
        '</div>' +
      '</div>' +
      '<p class="detalle-aviso" id="detalle-aviso" role="status">' + (mensaje || "") + '</p>' +
      (a.descripcion ? '<p class="detalle-descripcion">' + escapar(a.descripcion) + '</p>' : '') +
      '<dl class="detalle-datos">' +
        '<div><dt>NIT</dt><dd>' + escapar(a.nit) + '</dd></div>' +
        (a.nombres
          ? '<div><dt>Representante</dt><dd>' + escapar(a.nombres + " " + a.apellidos) +
              '<br /><span class="texto-gris">' + escapar(a.tipoDoc + " " + a.documento) + '</span></dd></div>'
          : '') +
        (a.direccion ? '<div><dt>Dirección</dt><dd>' + escapar(a.direccion) + '</dd></div>' : '') +
        '<div><dt>Ciudad</dt><dd>' + escapar(a.ciudad) + '</dd></div>' +
        '<div><dt>Correo</dt><dd><a href="mailto:' + escapar(a.correo) + '">' + escapar(a.correo) + '</a></dd></div>' +
        '<div><dt>Teléfono</dt><dd>' + (a.telefono ? escapar(a.telefono) : 'Sin teléfono') + '</dd></div>' +
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
    if (!boton) return;

    var accion = boton.getAttribute("data-accion");
    if (accion === "cancelar-formulario") {
      if (modo === "nuevo") {
        dialogo.close();
      } else {
        modo = null;
        pintarDetalle(abierto);
        document.getElementById("detalle-nombre").focus();
      }
      return;
    }
    if (!abierto) return;

    if (accion === "editar") {
      mostrarFormulario(abierto);
    } else if (accion === "eliminar") {
      confirmarEliminacion(abierto);
    } else if (accion === "si-eliminar") {
      var agente = abierto;
      var acciones = document.getElementById("detalle-acciones");
      acciones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
      eliminarAgente(agente.nit).then(function () {
        agentes = agentes.filter(function (a) { return a !== agente; });
        aviso.textContent = "Se eliminó a " + agente.nombre + ".";
        abierto = null;
        dialogo.close();
        pintarResumen();
        pintarTabla();
        aviso.setAttribute("tabindex", "-1");
        setTimeout(function () { aviso.focus(); }, 0);
      }).catch(function (error) {
        document.getElementById("detalle-aviso").innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
        acciones.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
      });
    } else if (accion === "confirmar") {
      confirmarSuspension(abierto);
    } else if (accion === "cancelar") {
      document.getElementById("detalle-acciones").innerHTML = botonesAccion(abierto);
      document.querySelector('#detalle-acciones button').focus();
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
    if (modo === "nuevo") {
      modo = null;
      /* después de que el navegador devuelve el foco por su cuenta */
      setTimeout(function () { document.getElementById("nuevo-agente").focus(); }, 0);
      return;
    }
    modo = null;
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

  obtenerCiudadesLista().then(function (lista) { ciudades = lista; }).catch(function () {});

  obtenerAgentes().then(function (lista) {
    agentes = lista;

    var ciudadesFiltro = agentes.map(function (a) { return a.ciudad; })
      .filter(function (c, i, todas) { return todas.indexOf(c) === i; })
      .sort(function (a, b) { return a.localeCompare(b, "es"); });
    ciudadesFiltro.forEach(function (ciudad) {
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

/* ----- Mapa para marcar el punto del evento (Leaflet + OpenStreetMap) ----- */

/* Centro de cada ciudad de la lista, para empezar el mapa cerca */
var CENTRO_CIUDAD = {
  "Medellín": [6.2442, -75.5812],
  "Bogotá": [4.711, -74.0721],
  "Cali": [3.4516, -76.532],
  "Tuluá": [4.0847, -76.1954],
  "Guatavita": [4.9346, -73.8331],
  "Barranquilla": [10.9685, -74.7813],
  "Bucaramanga": [7.1254, -73.1198],
  "Ciudad de México": [19.4326, -99.1332],
  "Guadalajara": [20.6597, -103.3496],
  "Buenos Aires": [-34.6037, -58.3816]
};
var CENTRO_COLOMBIA = [4.5709, -74.2973];

/* Leaflet se descarga solo la primera vez que se abre el formulario */
function crearMapaEvento(campos, partes) {
  var L = null;
  var mapa = null;
  var marcador = null;
  var cargando = null;

  function mostrarEstado(texto) {
    partes.estado.textContent = texto;
  }

  function ponerPunto(lat, lon, centrar) {
    if (!mapa || isNaN(lat) || isNaN(lon)) return;
    var punto = [lat, lon];

    if (!marcador) {
      marcador = L.marker(punto, {
        draggable: true,
        keyboard: true,
        title: "Ubicación del evento",
        alt: "Ubicación del evento",
        icon: L.divIcon({ className: "agente-pin", iconSize: [28, 34], iconAnchor: [14, 32] })
      }).addTo(mapa);

      marcador.on("dragend", function () {
        var p = marcador.getLatLng();
        escribirCoordenadas(p.lat, p.lng);
        mostrarEstado("Moviste el marcador.");
      });
    } else {
      marcador.setLatLng(punto);
    }

    escribirCoordenadas(lat, lon);
    if (centrar) mapa.setView(punto, Math.max(mapa.getZoom(), 15));
  }

  function escribirCoordenadas(lat, lon) {
    campos.lat.value = lat.toFixed(6);
    campos.lon.value = lon.toFixed(6);
    campos.lat.removeAttribute("aria-invalid");
    campos.lon.removeAttribute("aria-invalid");
  }

  function quitarPunto() {
    if (marcador) {
      marcador.remove();
      marcador = null;
    }
    campos.lat.value = "";
    campos.lon.value = "";
    mostrarEstado("");
  }

  function centrarEnCiudad(ciudad) {
    if (!mapa) return;
    var centro = CENTRO_CIUDAD[ciudad];
    mapa.setView(centro || CENTRO_COLOMBIA, centro ? 12 : 5);
  }

  function preparar() {
    if (cargando) {
      return cargando.then(function () { mapa.invalidateSize(); });
    }

    cargando = Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]).then(function (modulos) {
      L = modulos[0].default || modulos[0];
      mapa = L.map(partes.caja, { scrollWheelZoom: false }).setView(CENTRO_COLOMBIA, 5);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(mapa);

      mapa.on("click", function (e) {
        ponerPunto(e.latlng.lat, e.latlng.lng, false);
        mostrarEstado("Marcaste el punto en el mapa.");
      });
    }).catch(function () {
      mostrarEstado("No se pudo cargar el mapa. Escribe la latitud y la longitud a mano.");
    });

    return cargando.then(function () { if (mapa) mapa.invalidateSize(); });
  }

  /* Coordenadas escritas a mano */
  function desdeCampos() {
    var lat = parseFloat(campos.lat.value);
    var lon = parseFloat(campos.lon.value);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      ponerPunto(lat, lon, true);
    }
  }
  campos.lat.addEventListener("change", desdeCampos);
  campos.lon.addEventListener("change", desdeCampos);

  campos.ciudad.addEventListener("change", function () {
    if (!marcador) centrarEnCiudad(campos.ciudad.value);
  });

  /* Busca la dirección escrita con Nominatim (el buscador de OpenStreetMap) */
  partes.buscar.addEventListener("click", function () {
    var direccion = campos.direccion.value.trim();
    var opcion = campos.ciudad.selectedOptions[0];
    if (!direccion || !campos.ciudad.value) {
      mostrarEstado("Escribe primero la ciudad y la dirección.");
      return;
    }

    var consulta = [direccion, campos.ciudad.value, opcion ? opcion.getAttribute("data-departamento") : ""]
      .filter(Boolean).join(", ");
    partes.buscar.disabled = true;
    mostrarEstado("Buscando la dirección…");

    preparar().then(function () {
      return fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=es&q=" +
        encodeURIComponent(consulta));
    }).then(function (respuesta) {
      return respuesta.json();
    }).then(function (resultados) {
      if (!resultados.length) {
        mostrarEstado("No encontramos esa dirección. Marca el punto tocando el mapa.");
        return;
      }
      ponerPunto(Number(resultados[0].lat), Number(resultados[0].lon), true);
      mostrarEstado("Encontramos la dirección. Revisa que el marcador quede en el sitio correcto.");
    }).catch(function () {
      mostrarEstado("No se pudo buscar la dirección. Marca el punto tocando el mapa.");
    }).then(function () {
      partes.buscar.disabled = false;
    });
  });

  return { preparar: preparar, ponerPunto: ponerPunto, quitarPunto: quitarPunto, centrarEnCiudad: centrarEnCiudad };
}

/* Reduce la imagen a "maximo" px de ancho (1000 si no se indica), en JPEG,
   para que quepa en el navegador y pese poco cuando se suba al servidor */
function reducirImagen(archivo, maximo) {
  return new Promise(function (resolver, rechazar) {
    var lector = new FileReader();
    lector.onerror = function () { rechazar(new Error("No se pudo leer la imagen.")); };
    lector.onload = function () {
      var imagen = new Image();
      imagen.onerror = function () { rechazar(new Error("El archivo no es una imagen válida.")); };
      imagen.onload = function () {
        var escala = Math.min(1, (maximo || 1000) / imagen.width);
        var lienzo = document.createElement("canvas");
        lienzo.width = Math.round(imagen.width * escala);
        lienzo.height = Math.round(imagen.height * escala);
        lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
        resolver(lienzo.toDataURL("image/jpeg", 0.8));
      };
      imagen.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

/* ===== REGISTRAR, MODIFICAR Y ELIMINAR EVENTOS ===== */

var CATEGORIAS_EVENTO = [
  ["musica", "Música"], ["teatro", "Teatro"], ["danza", "Danza"], ["circo", "Circo"], ["comedia", "Comedia"]
];
var PLANES_EVENTO = [
  ["parchesote", "Parchesote (festivales y conciertos)"],
  ["parche", "Parche (teatro, comedia y cultura)"],
  ["parchesito", "Parchesito (familiar, gastronómico o gratis)"]
];

/* ¿El evento es de este agente? Manda el NIT guardado en el evento; los de
   ejemplo que no lo tienen se reconocen por la lista de eventos del agente. */
function esEventoDe(evento, agente) {
  return evento.nitAgente ? evento.nitAgente === agente.nit : agente.eventos.indexOf(evento.id) !== -1;
}

function nitDelEvento(evento) {
  if (evento.nitAgente) return evento.nitAgente;
  var agente = agentesLocales().filter(function (a) { return esEventoDe(evento, a); })[0];
  return agente ? agente.nit : "";
}

/* Número para un evento nuevo (desde 1001, para no chocar con los de ejemplo).
   Cuenta también los eliminados, para que un número borrado no se vuelva a usar. */
function siguienteIdEvento() {
  var usados = D.eventos.map(function (e) { return Number(e.id) || 0; })
    .concat(leerDatosLocales("datosEventos").eliminados.map(Number), [1000]);
  return Math.max.apply(null, usados) + 1;
}

function camposEvento(nuevo, ciudades, agentes) {
  var campos = [
    { tipo: "titulo", etiqueta: "Evento" },
    { id: "titulo", etiqueta: "Nombre del evento", tipo: "text", max: 150 },
    { id: "descripcion", etiqueta: "Descripción", tipo: "textarea", ayuda: "Mínimo 30 caracteres." },
    { id: "categoria", etiqueta: "Categoría", tipo: "select", opciones: CATEGORIAS_EVENTO, par: true },
    { id: "parche", etiqueta: "Tipo de plan", tipo: "select", opciones: PLANES_EVENTO, par: true },
    { id: "nitAgente", etiqueta: "Agente que lo organiza", tipo: "select", opciones: agentes, par: true },
    { id: "estado", etiqueta: "Estado", tipo: "select", opciones: ["Programado", "En Boletería"], par: true, soloLectura: !nuevo,
      ayuda: nuevo ? "" : "Se cambia abajo, en el detalle del evento." },
    { tipo: "titulo", etiqueta: "Fecha, teatro y ubicación" },
    { id: "inicio", etiqueta: "Empieza", tipo: "datetime-local", par: true },
    { id: "fin", etiqueta: "Termina", tipo: "datetime-local", par: true },
    { id: "teatro", etiqueta: "Teatro", tipo: "text", max: 150, par: true,
      ayuda: "Donde se hace el evento. Ejemplo: Teatro Municipal o Parque Simón Bolívar." },
    { id: "ciudad", etiqueta: "Ciudad", tipo: "select", opciones: ciudades, par: true },
    { id: "direccion", etiqueta: "Dirección", tipo: "text", max: 200, ayuda: "Ejemplo: Calle 26 # 25-50." },
    { tipo: "html", html:
      '<fieldset class="agente-mapa-campo">' +
        '<legend>Ubicación en el mapa</legend>' +
        '<p class="agente-ayuda" id="ayuda-mapa-admin">Toca el mapa para marcar el punto exacto o arrastra el marcador. ' +
          'También puedes buscar la dirección o escribir las coordenadas.</p>' +
        '<div class="agente-mapa-barra">' +
          '<button type="button" class="admin-boton-sec" id="buscar-direccion-admin">Buscar la dirección en el mapa</button>' +
          '<p class="agente-ayuda" id="estado-mapa-admin" role="status"></p>' +
        '</div>' +
        '<div class="agente-mapa" id="mapa-evento-admin" role="region" aria-label="Mapa para marcar la ubicación del evento" ' +
          'aria-describedby="ayuda-mapa-admin"></div>' +
      '</fieldset>' },
    { id: "lat", etiqueta: "Latitud", tipo: "text", decimal: true, max: 12, par: true },
    { id: "lon", etiqueta: "Longitud", tipo: "text", decimal: true, max: 12, par: true },
    { tipo: "titulo", etiqueta: "Entradas" },
    { id: "capacidad", etiqueta: "Capacidad (personas)", tipo: "number", min: 1, par: true },
    { id: "precio", etiqueta: "Precio por entrada (pesos)", tipo: "number", min: 0, par: true, ayuda: "0 si es gratis." },
    { id: "edad", etiqueta: "Edad mínima", tipo: "number", min: 0, par: true, ayuda: "0 si es para todo público." },
    { id: "imagen", etiqueta: nuevo ? "Imagen" : "Cambiar la imagen", tipo: "file", opcional: true, par: true,
      ayuda: nuevo ? "Si no subes una, se usa una imagen genérica." : "Si no eliges otra, se queda la actual." },
    { id: "observaciones", etiqueta: "Observaciones", tipo: "textarea", opcional: true }
  ];
  return campos;
}

/* actual = el evento que se edita (null al registrar) */
function validarEvento(v, actual) {
  var errores = {};
  if (!v.titulo) errores.titulo = "Escribe el nombre del evento.";
  if (v.descripcion.length < 30) errores.descripcion = "La descripción debe tener al menos 30 caracteres.";
  if (!v.categoria) errores.categoria = "Elige la categoría.";
  if (!v.parche) errores.parche = "Elige el tipo de plan.";
  if (!v.nitAgente) errores.nitAgente = "Elige el agente que organiza el evento.";
  if (!v.estado) errores.estado = "Elige el estado.";
  if (!v.inicio) errores.inicio = "Escribe cuándo empieza.";
  if (!v.fin) errores.fin = "Escribe cuándo termina.";
  else if (v.inicio && v.fin <= v.inicio) errores.fin = "El evento debe terminar después de empezar.";
  if (!v.ciudad) errores.ciudad = "Elige la ciudad.";
  if (!v.teatro) errores.teatro = "Escribe el nombre del teatro o del sitio del evento.";
  if (!v.direccion) errores.direccion = "Escribe la dirección.";

  /* Mismos límites que UBICACION en la base de datos (dentro de Colombia) */
  var lat = Number(String(v.lat).replace(",", "."));
  var lon = Number(String(v.lon).replace(",", "."));
  if (v.lat === "" || isNaN(lat) || lat < -4.3 || lat > 13.6) {
    errores.lat = "Marca el punto en el mapa o escribe una latitud de Colombia (entre -4,3 y 13,6).";
  }
  if (v.lon === "" || isNaN(lon) || lon < -82 || lon > -66.8) {
    errores.lon = "Marca el punto en el mapa o escribe una longitud de Colombia (entre -82 y -66,8).";
  }

  if (!/^[0-9]+$/.test(String(v.capacidad)) || Number(v.capacidad) < 1) {
    errores.capacidad = "La capacidad debe ser un número entero mayor que 0.";
  } else if (actual && Number(v.capacidad) < actual.vendidas) {
    errores.capacidad = "Ya se vendieron " + numero.format(actual.vendidas) + " entradas: la capacidad no puede ser menor.";
  }
  if (!/^[0-9]+$/.test(String(v.precio))) errores.precio = "El precio debe ser un número entero de 0 en adelante, sin puntos.";
  if (!/^[0-9]+$/.test(String(v.edad)) || Number(v.edad) > 21) errores.edad = "La edad mínima debe ser un número entre 0 y 21.";
  if (v.imagen && !/^image\//.test(v.imagen.type)) errores.imagen = "El archivo debe ser una imagen.";
  return errores;
}

/* El evento con la forma de EVENTOS (script.js) a partir del formulario */
function eventoDesdeFormulario(v, id, imagen, anterior) {
  var evento = D.eventoDeSolicitud({
    idEvento: id, nombre: v.titulo, ciudad: v.ciudad, teatro: v.teatro, direccion: v.direccion, inicio: v.inicio, fin: v.fin,
    precio: v.precio, capacidad: v.capacidad, observaciones: v.observaciones, edad: v.edad,
    descripcion: v.descripcion, imagen: imagen, lat: String(v.lat).replace(",", "."), lon: String(v.lon).replace(",", "."),
    plan: v.parche, agente: nombreAgente(v.nitAgente), nit: v.nitAgente
  });
  evento.categoria = v.categoria;
  evento.inicio = v.inicio;
  evento.fin = v.fin;
  evento.edad = Number(v.edad);
  evento.estado = anterior ? anterior.estado : v.estado;
  /* Las entradas ya vendidas se descuentan de la nueva capacidad */
  evento.disponibles = anterior ? Math.max(Number(v.capacidad) - anterior.vendidas, 0) : Number(v.capacidad);
  return evento;
}

/* id = null para registrar uno nuevo */
function guardarEvento(evento, id) {
  if (!D.usarApi) {
    cambiarDatoLocal("datosEventos", "id", id, evento);
    return Promise.resolve();
  }
  return id === null
    ? enviarCrud("/admin/eventos", "POST", evento, "No se pudo registrar el evento.")
    : enviarCrud("/admin/eventos/" + encodeURIComponent(id), "PUT", evento, "No se pudieron guardar los cambios.");
}

function eliminarEvento(id) {
  if (!D.usarApi) {
    cambiarDatoLocal("datosEventos", "id", id, null);
    return Promise.resolve();
  }
  return enviarCrud("/admin/eventos/" + encodeURIComponent(id), "DELETE", null, "No se pudo eliminar el evento.");
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
  var agente = agentesLocales().filter(function (a) { return esEventoDe(evento, a); })[0];

  return Object.assign({}, evento, {
    capacidadTotal: capacidad,
    vendidas: vendidas,
    ocupacion: capacidad ? Math.round(vendidas / capacidad * 100) : 0,
    ingresos: vendidas * evento.precio,
    agente: agente ? nombreAgente(agente.nit) : (evento.agente || "Sin agente")
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

/* "observaciones" solo cambia al cancelar (lleva la causa) */
function cambiarEstadoEvento(id, estado, observaciones) {
  if (!D.usarApi) {
    try {
      var estados = leerEstadosEventos();
      estados[id] = observaciones === undefined ? estado : { estado: estado, observaciones: observaciones };
      localStorage.setItem("estadoEventos", JSON.stringify(estados));
    } catch (e) {}
    return Promise.resolve();
  }

  return D.llamarApi("/admin/eventos/" + encodeURIComponent(id) + "/estado", {
    method: "PATCH",
    headers: Object.assign({ "Content-Type": "application/json" }, cabeceraToken()),
    body: JSON.stringify(observaciones === undefined ? { estado: estado } : { estado: estado, observaciones: observaciones })
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

/* ===== EVENTOS POR REVISAR =====
   Los crea un agente en agente-eventos.html y quedan "En revisión".
   - GET   /api/admin/eventos/solicitudes       -> { solicitudes: [ en revisión ] }
   - PATCH /api/admin/eventos/solicitudes/:id   cuerpo { estado: "Aprobado" | "Rechazado", motivo }
     Al aprobar, el backend crea la fila de EVENTO como "Programado". */

var NOMBRE_CATEGORIA_EVENTO = { musica: "Música", teatro: "Teatro", danza: "Danza", circo: "Circo", comedia: "Comedia" };
var NOMBRE_PLAN = { parchesote: "Parchesote", parche: "Parche", parchesito: "Parchesito" };

function leerSolicitudesEventos() {
  try {
    return JSON.parse(localStorage.getItem("eventosAgente")) || [];
  } catch (e) {
    return [];
  }
}

function nombreAgente(nit) {
  var perfil = leerPerfilesAgentes()[nit];
  if (perfil && perfil.nombre) return perfil.nombre;
  var agente = agentesLocales().filter(function (a) { return a.nit === nit; })[0];
  return agente ? agente.nombre : "Agente " + nit;
}

function obtenerSolicitudesEventos() {
  if (!D.usarApi) {
    return Promise.resolve(leerSolicitudesEventos()
      .filter(function (s) { return s.estado === "En revisión"; })
      .map(function (s) { return Object.assign({ agente: nombreAgente(s.nit) }, s); }));
  }

  return D.llamarApi("/admin/eventos/solicitudes", { headers: cabeceraToken() }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudieron cargar los eventos por revisar.");
    }
    return resultado.datos.solicitudes;
  });
}

function resolverSolicitudEvento(id, estado, motivo) {
  if (!D.usarApi) {
    var lista = leerSolicitudesEventos();
    var solicitud = lista.filter(function (s) { return s.id === id; })[0];
    if (!solicitud) {
      return Promise.reject(new Error("Esta solicitud ya no existe: quizá el agente la retiró."));
    }
    if (estado === "Aprobado" && !tieneUbicacion(solicitud)) {
      return Promise.reject(new Error("No se puede aprobar un evento sin ubicación en el mapa."));
    }

    solicitud.estado = estado;
    solicitud.motivo = motivo || "";
    solicitud.revisado = new Date().toISOString();

    if (estado === "Aprobado") {
      solicitud.idEvento = siguienteIdEvento();
      solicitud.agente = nombreAgente(solicitud.nit);
    }

    try {
      localStorage.setItem("eventosAgente", JSON.stringify(lista));
    } catch (e) {
      return Promise.reject(new Error("No se pudo guardar la decisión en este navegador."));
    }

    if (estado === "Aprobado") {
      D.eventos.push(D.eventoDeSolicitud(solicitud));
    }
    return Promise.resolve(solicitud);
  }

  return D.llamarApi("/admin/eventos/solicitudes/" + encodeURIComponent(id), {
    method: "PATCH",
    headers: Object.assign({ "Content-Type": "application/json" }, cabeceraToken()),
    body: JSON.stringify({ estado: estado, motivo: motivo || null })
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo guardar la decisión.");
    }
    return resultado.datos;
  });
}

/* "2027-02-14T20:00" -> "14 de febrero de 2027, 8:00 p. m." */
function fechaSolicitud(valor) {
  var fecha = new Date(valor);
  if (isNaN(fecha)) return String(valor);
  return fecha.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) + ", " +
    fecha.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

/* Todo evento debe tener su punto en el mapa para poder publicarse */
function tieneUbicacion(s) {
  return s.lat !== undefined && s.lat !== "" && s.lat !== null && !isNaN(Number(s.lat)) &&
    s.lon !== undefined && s.lon !== "" && s.lon !== null && !isNaN(Number(s.lon));
}

/* Mapa de solo lectura con el punto que marcó el agente */
function mapaSolicitud(s) {
  if (!tieneUbicacion(s)) {
    return '<p class="revision-sin-ubicacion"><strong>Falta la ubicación.</strong> ' +
      'Este evento no se puede aprobar hasta que el agente marque el punto en el mapa. ' +
      'Recházalo para que lo corrija.</p>';
  }
  var lat = Number(s.lat);
  var lon = Number(s.lon);
  var caja = [lon - 0.01, lat - 0.006, lon + 0.01, lat + 0.006].map(function (n) { return n.toFixed(6); }).join(",");
  return '<iframe class="revision-mapa" title="Mapa de la ubicación de ' + escapar(s.nombre) + '" ' +
      'src="https://www.openstreetmap.org/export/embed.html?bbox=' + caja + '&amp;layer=mapnik&amp;marker=' + lat + ',' + lon + '"></iframe>' +
    '<p><a class="detalle-enlace" href="https://www.openstreetmap.org/?mlat=' + lat + '&amp;mlon=' + lon + '#map=17/' + lat + '/' + lon + '" ' +
      'target="_blank" rel="noreferrer">Abrir en OpenStreetMap<span class="oculto"> (se abre en otra pestaña)</span></a></p>';
}

/* Fecha corta para "Enviado el": "15 oct 2026, 9:24 a. m." */
function fechaEnvio(valor) {
  var fecha = new Date(valor);
  if (isNaN(fecha)) return String(valor);
  var meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return fecha.getDate() + " " + meses[fecha.getMonth()] + " " + fecha.getFullYear() + ", " +
    fecha.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
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
  var modo = null;   /* "nuevo" o "editar" mientras se ve el formulario */
  var ciudades = [];
  var agentesLista = [];

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
        normalizar(e.titulo + " " + e.teatro + " " + e.ciudad + " " + e.agente).indexOf(texto) !== -1;
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
            '<span class="agente-nit">' + escapar(e.teatro) + ', ' + escapar(e.ciudad) + '</span></span>' +
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
        D.camposCancelacion("evento", "motivo") +
        '<p class="ayuda-motivo">Se guarda en las observaciones del evento y se les mostrará a las personas que tenían reservas.</p>' +
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
          '<p>' + escapar(e.teatro) + ', ' + escapar(e.ciudad) + '</p>' +
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
      '<p class="detalle-descripcion texto-con-saltos">' + escapar(e.observaciones) + '</p>' +
      '<p><a class="detalle-enlace" href="evento.html?id=' + e.id + '">Ver la página pública del evento</a></p>' +
      '<div class="detalle-acciones" id="acciones-evento">' + botonesEvento() + '</div>' +
      '<div class="detalle-acciones">' + formularioEstado(e) + '</div>';

    animarAlVer(document.getElementById("detalle-ocupacion"));
  }

  function botonesEvento() {
    return '<button type="button" class="admin-boton-sec" data-accion="editar">Editar evento</button>' +
      '<button type="button" class="admin-boton admin-boton-peligro" data-accion="eliminar">Eliminar evento</button>';
  }

  /* ----- Registrar y editar ----- */

  function valoresEvento(e) {
    return {
      titulo: e.titulo, descripcion: e.descripcion, categoria: e.categoria || "", parche: D.parcheDe(e),
      nitAgente: nitDelEvento(e), estado: e.estado,
      inicio: e.inicio || D.fechaTextoAIso(e.fechaInicio), fin: e.fin || D.fechaTextoAIso(e.fechaFin),
      ciudad: e.ciudad, teatro: e.teatro, direccion: e.direccion || "",
      lat: e.lat !== undefined ? String(e.lat).replace(".", ",") : "", lon: e.lon !== undefined ? String(e.lon).replace(".", ",") : "",
      capacidad: e.capacidadTotal, precio: e.precio, edad: e.edad || 0,
      observaciones: e.observaciones === "Sin observaciones." ? "" : e.observaciones
    };
  }

  function mostrarFormulario(e) {
    modo = e ? "editar" : "nuevo";
    var listaCiudades = ciudades.slice();
    if (e && e.ciudad && !listaCiudades.some(function (x) { return x[0] === e.ciudad; })) {
      listaCiudades.push([e.ciudad, e.ciudad]);
    }

    contenido.innerHTML =
      '<div class="detalle-cabecera"><div>' +
        '<h2 id="detalle-nombre" tabindex="-1">' + (e ? "Editar " + escapar(e.titulo) : "Registrar evento") + '</h2>' +
        '<p>' + (e ? "Cambia los datos que necesites y guarda." : "Publica un evento a nombre de un agente.") + '</p>' +
      '</div></div>' +
      htmlFormulario("form-evento", camposEvento(!e, listaCiudades, agentesLista),
        e ? valoresEvento(e) : { estado: "Programado", precio: 0, edad: 0 },
        e ? "Guardar cambios" : "Registrar evento");

    /* El mapa del formulario (el mismo del agente) */
    var mapa = crearMapaEvento({
      lat: document.getElementById("f-lat"), lon: document.getElementById("f-lon"),
      ciudad: document.getElementById("f-ciudad"), direccion: document.getElementById("f-direccion")
    }, {
      caja: document.getElementById("mapa-evento-admin"),
      estado: document.getElementById("estado-mapa-admin"),
      buscar: document.getElementById("buscar-direccion-admin")
    });
    mapa.preparar().then(function () {
      var lat = parseFloat(String(document.getElementById("f-lat").value).replace(",", "."));
      var lon = parseFloat(String(document.getElementById("f-lon").value).replace(",", "."));
      if (!isNaN(lat) && !isNaN(lon)) mapa.ponerPunto(lat, lon, true);
      else if (e) mapa.centrarEnCiudad(e.ciudad);
    });

    document.getElementById("detalle-nombre").focus();
  }

  contenido.addEventListener("submit", function (evento) {
    if (evento.target.id !== "form-evento") return;
    evento.preventDefault();

    var nuevo = modo === "nuevo";
    var campos = camposEvento(nuevo, ciudades, agentesLista);
    var v = leerFormulario(campos);
    if (!nuevo) v.estado = abierto.estado;
    if (mostrarErroresFormulario("form-evento", campos, validarEvento(v, nuevo ? null : abierto))) return;

    var botones = evento.target.querySelectorAll("button");
    botones.forEach(function (b) { b.disabled = true; });

    var id = nuevo ? siguienteIdEvento() : abierto.id;

    (v.imagen ? reducirImagen(v.imagen, 1000) : Promise.resolve(nuevo ? "" : abierto.imagen))
      .then(function (imagen) {
        var datos = eventoDesdeFormulario(v, id, imagen, nuevo ? null : abierto);
        return guardarEvento(datos, nuevo ? null : abierto.id).then(function () { return datos; });
      })
      .then(function (datos) {
        /* La lista pública (D.eventos) y la de esta página se actualizan juntas */
        var original = D.eventos.filter(function (x) { return x.id === datos.id; })[0];
        if (original) Object.assign(original, datos);
        else D.eventos.push(datos);

        var completo = completarEvento(original || datos);
        if (nuevo) eventos.push(completo);
        else Object.assign(abierto, completo);
        abierto = nuevo ? completo : abierto;
        modo = null;

        var mensaje = nuevo ? "Se registró " + datos.titulo + "." : "Se guardaron los cambios de " + datos.titulo + ".";
        aviso.textContent = mensaje;
        pintarResumen();
        pintarTabla();
        pintarDetalle(abierto, mensaje);
        document.getElementById("detalle-nombre").focus();
      })
      .catch(function (error) {
        document.getElementById("form-evento-error").innerHTML = "<strong>Error:</strong> " + escapar(error.message);
        botones.forEach(function (b) { b.disabled = false; });
      });
  });

  document.getElementById("nuevo-evento").onclick = function () {
    abierto = null;
    revisando = null;
    mostrarFormulario(null);
    dialogo.showModal();
    document.getElementById("detalle-nombre").focus();
  };

  function confirmarEliminacion(e) {
    var acciones = document.getElementById("acciones-evento");
    obtenerReservasAdmin().catch(function () { return []; }).then(function (reservas) {
      var suyas = reservas.filter(function (r) { return r.eventoId === e.id; }).length;
      acciones.innerHTML =
        '<div class="detalle-confirmar">' +
          '<p id="texto-confirmar"><strong>¿Eliminar ' + escapar(e.titulo) + '?</strong> ' +
          'Desaparece de la página' + (suyas ? ' y se borran sus ' + suyas + (suyas === 1 ? ' reserva' : ' reservas') : '') +
          '. Esto no se puede deshacer. Si solo no se va a hacer, mejor cancélalo.</p>' +
          '<div class="detalle-botones">' +
            '<button type="button" class="admin-boton admin-boton-peligro" data-accion="si-eliminar" aria-describedby="texto-confirmar">Sí, eliminar</button>' +
            '<button type="button" class="admin-boton-sec" data-accion="no-eliminar">Volver</button>' +
          '</div>' +
        '</div>';
      acciones.querySelector('[data-accion="si-eliminar"]').focus();
    });
  }

  /* "cancelacion" = { causa, detalle } cuando el nuevo estado es Cancelado */
  function guardarEstado(e, estado, cancelacion) {
    var botones = document.getElementById("botones-estado");
    botones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });

    var observaciones = cancelacion
      ? D.agregarNota(e.observaciones, D.notaCancelacion("evento", "el administrador", cancelacion.causa, cancelacion.detalle))
      : undefined;

    cambiarEstadoEvento(e.id, estado, observaciones).then(function () {
      e.estado = estado;
      var original = D.eventos.filter(function (x) { return x.id === e.id; })[0];
      if (original) original.estado = estado;
      if (observaciones !== undefined) {
        e.observaciones = observaciones;
        if (original) original.observaciones = observaciones;
      }

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

  var cancelacionPendiente = null;

  contenido.addEventListener("submit", function (evento) {
    if (evento.target.id !== "form-estado") return;
    evento.preventDefault();
    if (!abierto) return;

    var lista = document.getElementById("nuevo-estado");
    var elegido = lista.value;
    var error = document.getElementById("error-estado");
    error.textContent = "";

    if (elegido === abierto.estado) {
      error.innerHTML = "<strong>Error:</strong> Elige un estado distinto al actual.";
      lista.focus();
      return;
    }

    if (elegido !== "Cancelado") {
      guardarEstado(abierto, elegido);
      return;
    }

    cancelacionPendiente = D.datosCancelacion("motivo");
    if (cancelacionPendiente.error) {
      error.innerHTML = "<strong>Error:</strong> " + cancelacionPendiente.error;
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
    if (!boton) return;
    var accion = boton.getAttribute("data-accion");

    if (accion === "cancelar-formulario") {
      if (modo === "nuevo") {
        dialogo.close();
      } else {
        modo = null;
        pintarDetalle(abierto);
        document.getElementById("detalle-nombre").focus();
      }
      return;
    }
    if (!abierto) return;

    if (accion === "editar") {
      mostrarFormulario(abierto);
    } else if (accion === "eliminar") {
      confirmarEliminacion(abierto);
    } else if (accion === "no-eliminar") {
      document.getElementById("acciones-evento").innerHTML = botonesEvento();
      document.querySelector('#acciones-evento [data-accion="eliminar"]').focus();
    } else if (accion === "si-eliminar") {
      var borrado = abierto;
      var acciones = document.getElementById("acciones-evento");
      acciones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
      eliminarEvento(borrado.id).then(function () {
        eventos = eventos.filter(function (x) { return x !== borrado; });
        D.eventos.splice(D.eventos.findIndex(function (x) { return x.id === borrado.id; }), 1);
        aviso.textContent = "Se eliminó " + borrado.titulo + ".";
        abierto = null;
        dialogo.close();
        pintarResumen();
        pintarTabla();
        aviso.setAttribute("tabindex", "-1");
        setTimeout(function () { aviso.focus(); }, 0);
      }).catch(function (error) {
        document.getElementById("detalle-aviso").innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
        acciones.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
      });
    } else if (accion === "si-cancelar") {
      guardarEstado(abierto, "Cancelado", cancelacionPendiente);
    } else if (accion === "volver") {
      document.getElementById("botones-estado").innerHTML =
        '<button type="submit" class="admin-boton admin-boton-peligro">Cancelar el evento</button>';
      document.querySelector("#botones-estado button").focus();
    }
  });

  cuerpo.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-id]");
    if (!boton) return;

    abierto = eventos.filter(function (e) { return String(e.id) === boton.getAttribute("data-id"); })[0];
    revisando = null;
    modo = null;
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
    if (modo === "nuevo") {
      modo = null;
      /* después de que el navegador devuelve el foco por su cuenta */
      setTimeout(function () { document.getElementById("nuevo-evento").focus(); }, 0);
      return;
    }
    modo = null;
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

  /* ----- Eventos por revisar ----- */

  var listaRevision = document.getElementById("lista-por-revisar");
  var conteoRevision = document.getElementById("conteo-por-revisar");
  var solicitudes = [];
  var revisando = null;

  function pintarPorRevisar() {
    conteoRevision.textContent = solicitudes.length === 0
      ? "No hay eventos esperando revisión."
      : (solicitudes.length === 1 ? "1 evento espera" : solicitudes.length + " eventos esperan") +
        " tu aprobación antes de publicarse.";

    listaRevision.innerHTML = solicitudes.map(function (s) {
      return '<li class="agente-evento revision-item">' +
        '<img src="' + escapar(s.imagen || "img/evento-sin-foto.svg") + '" alt="">' +
        '<div class="agente-evento-texto">' +
          '<h3>' + escapar(s.nombre) + '</h3>' +
          '<p>' + escapar(s.agente) + '</p>' +
          '<p>' + escapar(fechaSolicitud(s.inicio)) + ' · ' + escapar(s.teatro) + ', ' + escapar(s.ciudad) + '</p>' +
          '<p class="agente-enviado">Enviado el ' + escapar(fechaEnvio(s.enviado)) + '</p>' +
        '</div>' +
        '<div class="revision-accion">' +
          '<button type="button" class="admin-boton-sec" data-revisar="' + escapar(s.id) + '">Revisar' +
            '<span class="oculto"> ' + escapar(s.nombre) + '</span></button>' +
        '</div>' +
      '</li>';
    }).join("");

    animarAlVer(listaRevision);
  }

  function botonesRevision() {
    var rechazar = '<button type="button" class="admin-boton-sec agente-retirar" data-revision="mostrar-rechazo">Rechazar</button>';
    if (revisando && !tieneUbicacion(revisando)) return rechazar;
    return '<button type="button" class="admin-boton" data-revision="aprobar">Aprobar y publicar</button>' + rechazar;
  }

  function pintarSolicitud(s) {
    contenido.innerHTML =
      '<div class="detalle-cabecera">' +
        '<img class="evento-miniatura evento-miniatura-grande" src="' + escapar(s.imagen || "img/evento-sin-foto.svg") + '" alt="" />' +
        '<div>' +
          '<h2 id="detalle-nombre" tabindex="-1">' + escapar(s.nombre) + '</h2>' +
          '<p>' + escapar(s.agente) + '</p>' +
          D.etiquetaEstado("En revisión", false) +
        '</div>' +
      '</div>' +
      '<p class="detalle-descripcion">' + escapar(s.descripcion) + '</p>' +
      '<dl class="detalle-datos">' +
        '<div><dt>Categoría</dt><dd>' + escapar(NOMBRE_CATEGORIA_EVENTO[s.categoria] || s.categoria) + '</dd></div>' +
        '<div><dt>Tipo de plan</dt><dd>' + escapar(NOMBRE_PLAN[s.plan] || s.plan) + '</dd></div>' +
        '<div><dt>Inicio</dt><dd>' + escapar(fechaSolicitud(s.inicio)) + '</dd></div>' +
        '<div><dt>Fin</dt><dd>' + escapar(fechaSolicitud(s.fin)) + '</dd></div>' +
        '<div><dt>Ciudad</dt><dd>' + escapar(s.ciudad) + (s.departamento ? ", " + escapar(s.departamento) : "") + '</dd></div>' +
        '<div><dt>Teatro</dt><dd>' + escapar(s.teatro) + '</dd></div>' +
        '<div><dt>Dirección</dt><dd>' + escapar(s.direccion) + '</dd></div>' +
        '<div><dt>Capacidad</dt><dd>' + numero.format(s.capacidad) + ' personas</dd></div>' +
        '<div><dt>Precio</dt><dd>' + textoPrecio(Number(s.precio)) + '</dd></div>' +
        '<div><dt>Edad mínima</dt><dd>' + (Number(s.edad) > 0 ? s.edad + " años" : "Todas las edades") + '</dd></div>' +
      '</dl>' +
      '<h3>Observaciones</h3>' +
      '<p class="detalle-descripcion">' + escapar(s.observaciones || "Sin observaciones.") + '</p>' +
      '<h3>Ubicación</h3>' + mapaSolicitud(s) +
      '<div class="detalle-acciones">' +
        '<div class="campo-motivo" id="campo-rechazo" hidden>' +
          '<label for="motivo-rechazo-evento">Motivo del rechazo</label>' +
          '<textarea id="motivo-rechazo-evento" rows="3" aria-describedby="ayuda-rechazo"></textarea>' +
          '<p class="ayuda-motivo" id="ayuda-rechazo">El agente lo verá junto a su evento para corregirlo.</p>' +
        '</div>' +
        '<p class="detalle-error" id="error-revision" role="alert"></p>' +
        '<div class="detalle-botones" id="botones-revision">' + botonesRevision() + '</div>' +
      '</div>';
  }

  function cargarPorRevisar() {
    return obtenerSolicitudesEventos().then(function (lista) {
      solicitudes = lista;
      pintarPorRevisar();
    });
  }

  function decidir(estado, motivo) {
    var botones = document.getElementById("botones-revision");
    botones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
    var nombre = revisando.nombre;

    resolverSolicitudEvento(revisando.id, estado, motivo).then(function () {
      aviso.textContent = estado === "Aprobado"
        ? "Aprobaste «" + nombre + "». Ya está publicado como Programado."
        : "Rechazaste «" + nombre + "». El agente verá el motivo para corregirlo.";
      /* La tarjeta revisada desaparece de la lista: el foco va al título */
      revisando = null;
      dialogo.close();
      return Promise.all([cargarPorRevisar(), obtenerEventosAdmin()]);
    }).then(function (datos) {
      eventos = datos[1];
      pintarResumen();
      pintarTabla();
      document.getElementById("titulo-por-revisar").focus();
    }).catch(function (error) {
      var caja = document.getElementById("error-revision");
      if (caja) {
        caja.innerHTML = "<strong>Error:</strong> " + escapar(error.message);
        botones.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
      } else {
        aviso.innerHTML = "<strong>Error:</strong> " + escapar(error.message);
      }
    });
  }

  listaRevision.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-revisar]");
    if (!boton) return;

    revisando = solicitudes.filter(function (s) { return s.id === boton.getAttribute("data-revisar"); })[0];
    if (!revisando) return;
    abierto = null;
    pintarSolicitud(revisando);
    dialogo.showModal();
    document.getElementById("detalle-nombre").focus();
  });

  contenido.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-revision]");
    if (!boton || !revisando) return;

    var accion = boton.getAttribute("data-revision");
    var botones = document.getElementById("botones-revision");
    var motivo = document.getElementById("motivo-rechazo-evento");
    var error = document.getElementById("error-revision");
    error.textContent = "";

    if (accion === "aprobar") {
      decidir("Aprobado");
    } else if (accion === "mostrar-rechazo") {
      document.getElementById("campo-rechazo").hidden = false;
      if (!tieneUbicacion(revisando) && !motivo.value) {
        motivo.value = "Falta marcar en el mapa el punto exacto donde se hace el evento.";
      }
      botones.innerHTML =
        '<button type="button" class="admin-boton admin-boton-peligro" data-revision="rechazar">Rechazar el evento</button>' +
        '<button type="button" class="admin-boton-sec" data-revision="volver">Volver</button>';
      motivo.focus();
    } else if (accion === "volver") {
      document.getElementById("campo-rechazo").hidden = true;
      motivo.removeAttribute("aria-invalid");
      botones.innerHTML = botonesRevision();
      botones.querySelector("button").focus();
    } else if (accion === "rechazar") {
      if (motivo.value.trim().length < 10) {
        error.innerHTML = "<strong>Error:</strong> Escribe el motivo del rechazo (10 caracteres como mínimo).";
        motivo.setAttribute("aria-invalid", "true");
        motivo.focus();
        return;
      }
      decidir("Rechazado", motivo.value.trim());
    }
  });

  dialogo.addEventListener("close", function () {
    if (!revisando) return;
    var id = revisando.id;
    revisando = null;
    setTimeout(function () {
      var boton = listaRevision.querySelector('button[data-revisar="' + id + '"]');
      (boton || document.getElementById("titulo-por-revisar")).focus();
    }, 0);
  });

  cargarPorRevisar().catch(function (error) {
    conteoRevision.innerHTML = "<strong>Error:</strong> " + escapar(error.message);
  });

  obtenerCiudadesLista().then(function (lista) { ciudades = lista; }).catch(function () {});
  obtenerAgentes().then(function (lista) {
    agentesLista = lista
      .slice()
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); })
      .map(function (a) { return [a.nit, a.nombre + (a.estado === "Activo" ? "" : " (" + a.estado.toLowerCase() + ")")]; });
  }).catch(function () {});

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
  { documento: "1116254789", tipoDoc: "CC", nombres: "Valentina", apellidos: "Ríos Castaño", alias: "valeri", correo: "valentina.rios@correo.example",
    telefono: "3104452211", direccion: "Calle 27 # 30-14", ciudad: "Tuluá", nacimiento: "2001-04-17", registro: "2025-02-10", puntos: 1840, publicidad: true,
    cuenta: "Activa", compras: [2, 0, 4, 2, 0, 3],
    reservas: [[1, 2, "Confirmada", "2026-09-02"], [4, 3, "Confirmada", "2026-07-21"], [2, 2, "Reservada", "2026-10-01"], [7, 2, "Cancelada", "2026-06-14"]] },
  { documento: "1006478123", tipoDoc: "CC", nombres: "Juan David", apellidos: "Ospina", alias: "juanchoo", correo: "jd.ospina@correo.example",
    telefono: "3016547890", direccion: "Carrera 66 # 9-35", ciudad: "Cali", nacimiento: "1998-11-02", registro: "2024-12-03", puntos: 2650, publicidad: false,
    cuenta: "Activa", compras: [4, 2, 0, 6, 2, 4],
    reservas: [[11, 4, "Confirmada", "2026-09-28"], [5, 2, "Confirmada", "2026-08-15"], [9, 6, "Confirmada", "2026-07-03"], [12, 4, "Reservada", "2026-10-09"]] },
  { documento: "52987654", tipoDoc: "CC", nombres: "Laura Melisa", apellidos: "Gómez", alias: "laumeli", correo: "laura.gomez@correo.example",
    telefono: "3201234567", direccion: "Calle 72 # 11-40 apto 502", ciudad: "Bogotá", nacimiento: "1994-06-25", registro: "2025-05-19", puntos: 920, publicidad: true,
    cuenta: "Activa", compras: [0, 0, 2, 0, 0, 0],
    reservas: [[3, 2, "Confirmada", "2026-07-11"]] },
  { documento: "1144098765", tipoDoc: "CC", nombres: "Santiago", apellidos: "Herrera Mejía", alias: "santi.hm", correo: "santiago.herrera@correo.example",
    telefono: "3157788990", direccion: "Carrera 43A # 18 Sur-75", ciudad: "Medellín", nacimiento: "2003-01-30", registro: "2026-01-22", puntos: 410, publicidad: true,
    cuenta: "Activa", compras: [0, 1, 0, 0, 2, 0],
    reservas: [[2, 2, "Confirmada", "2026-09-05"], [8, 1, "Reservada", "2026-06-20"]] },
  { documento: "AB123456", tipoDoc: "PAS", nombres: "Camila", apellidos: "Andrade Paz", alias: "camiap", correo: "camila.andrade@correo.example",
    telefono: "3005551234", direccion: "Calle 84 # 50-21", ciudad: "Barranquilla", nacimiento: "1990-09-12", registro: "2025-10-08", puntos: 1300, publicidad: false,
    cuenta: "Activa", compras: [0, 0, 0, 0, 0, 0],
    reservas: [] },
  { documento: "1088345612", tipoDoc: "CC", nombres: "Andrés Felipe", apellidos: "Cardona", alias: "pipecardona", correo: "andres.cardona@correo.example",
    telefono: "3112223344", direccion: "Avenida 6N # 23-50", ciudad: "Cali", nacimiento: "1987-03-08", registro: "2024-08-30", puntos: 3420, publicidad: true,
    cuenta: "Activa", compras: [6, 4, 8, 2, 4, 6],
    reservas: [[4, 4, "Confirmada", "2026-10-02"], [11, 6, "Confirmada", "2026-09-17"], [5, 8, "Confirmada", "2026-07-25"], [10, 2, "Cancelada", "2026-05-30"]] },
  { documento: "1234567890", tipoDoc: "CC", nombres: "Mariana", apellidos: "López Zapata", alias: "mari.lz", correo: "mariana.lopez@correo.example",
    telefono: "3189876543", direccion: "Calle 36 # 27-18", ciudad: "Bucaramanga", nacimiento: "2006-12-05", registro: "2026-08-14", puntos: 60, publicidad: false,
    cuenta: "Activa", compras: [0, 0, 0, 0, 0, 0],
    reservas: [] },
  { documento: "1017223344", tipoDoc: "CC", nombres: "Daniel Esteban", apellidos: "Muñoz", alias: "danimu", correo: "daniel.munoz@correo.example",
    telefono: "3046667788", direccion: "Circular 1 # 70-12", ciudad: "Medellín", nacimiento: "1996-07-19", registro: "2025-03-27", puntos: 0, publicidad: true,
    cuenta: "Bloqueada", compras: [8, 6, 0, 0, 0, 0],
    reservas: [[2, 8, "Cancelada", "2026-05-11"], [9, 6, "Cancelada", "2026-06-02"]] },
  { documento: "987654", tipoDoc: "PPT", nombres: "Gabriela", apellidos: "Pérez Rondón", alias: "gabyp", correo: "gabriela.perez@correo.example",
    telefono: "3227654321", direccion: "Carrera 7 # 45-10", ciudad: "Bogotá", nacimiento: "1999-02-14", registro: "2026-03-03", puntos: 780, publicidad: true,
    cuenta: "Activa", compras: [0, 2, 0, 1, 0, 0],
    reservas: [[1, 2, "Reservada", "2026-06-29"], [3, 1, "Confirmada", "2026-08-04"]] },
  { documento: "94321765", tipoDoc: "CC", nombres: "Carlos Alberto", apellidos: "Restrepo", alias: "caresp", correo: "carlos.restrepo@correo.example",
    telefono: "3135550099", direccion: "Carrera 25 # 25-60", ciudad: "Tuluá", nacimiento: "1975-10-21", registro: "2024-06-11", puntos: 2210, publicidad: false,
    cuenta: "Activa", compras: [2, 0, 2, 0, 4, 2],
    reservas: [[6, 2, "Confirmada", "2026-09-30"], [12, 4, "Confirmada", "2026-08-12"], [3, 2, "Confirmada", "2026-05-18"]] },
  { documento: "1110556677", tipoDoc: "CC", nombres: "Sofía", apellidos: "Marín Arango", alias: "sofimarin", correo: "sofia.marin@correo.example",
    telefono: "3009998877", direccion: "Calle 5 # 38-25", ciudad: "Cali", nacimiento: "2005-05-03", registro: "2026-09-20", puntos: 120, publicidad: true,
    cuenta: "Activa", compras: [0, 0, 0, 0, 0, 2],
    reservas: [[4, 2, "Reservada", "2026-10-11"]] },
  { documento: "80654321", tipoDoc: "CE", nombres: "Mateo", apellidos: "Fernández Ruiz", alias: "mateofr", correo: "mateo.fernandez@correo.example",
    telefono: "3174443322", direccion: "Calle 98 # 52-115", ciudad: "Barranquilla", nacimiento: "1992-08-28", registro: "2025-07-07", puntos: 0, publicidad: false,
    cuenta: "Bloqueada", compras: [0, 0, 0, 0, 0, 0],
    reservas: [] }
];

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

/* "nombre" es nombres + apellidos, como se muestra en las listas */
function conNombre(persona) {
  persona.nombre = persona.nombres !== undefined
    ? (persona.nombres + " " + persona.apellidos).trim()
    : persona.nombre;
  return persona;
}

/* Clientes de ejemplo con lo que se registró, modificó o eliminó en este navegador */
function clientesLocales() {
  return aplicarDatosLocales(CLIENTES_DEMO, "datosClientes", "documento").map(conNombre);
}

function obtenerClientes() {
  if (!D.usarApi) {
    var cambios = leerCuentasLocales();
    return Promise.resolve(clientesLocales().map(function (c) {
      if (cambios[c.documento]) c.cuenta = cambios[c.documento];
      return c;
    }));
  }

  return D.llamarApi("/admin/clientes", { headers: cabeceraToken() }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cargar la lista de clientes.");
    }
    return resultado.datos.clientes.map(conNombre);
  });
}

/* documento = null para registrar uno nuevo */
function guardarCliente(datos, documento) {
  if (!D.usarApi) {
    var copia = Object.assign({}, datos);
    delete copia.contrasena;   /* la contraseña nunca se guarda en el navegador */
    cambiarDatoLocal("datosClientes", "documento", documento, copia);
    return Promise.resolve();
  }
  return documento === null
    ? enviarCrud("/admin/clientes", "POST", datos, "No se pudo registrar el cliente.")
    : enviarCrud("/admin/clientes/" + encodeURIComponent(documento), "PUT", datos, "No se pudieron guardar los cambios.");
}

function eliminarCliente(documento) {
  if (!D.usarApi) {
    cambiarDatoLocal("datosClientes", "documento", documento, null);
    return Promise.resolve();
  }
  return enviarCrud("/admin/clientes/" + encodeURIComponent(documento), "DELETE", null, "No se pudo eliminar el cliente.");
}

function camposCliente(nuevo, ciudades) {
  var campos = [
    { id: "tipoDoc", etiqueta: "Tipo de documento", tipo: "select", opciones: TIPOS_DOCUMENTO, par: true, soloLectura: !nuevo },
    { id: "documento", etiqueta: "Número de documento", tipo: "text", max: 20, par: true, soloLectura: !nuevo,
      ayuda: nuevo ? "Sin puntos ni espacios." : "El documento no se puede cambiar." },
    { id: "nombres", etiqueta: "Nombres", tipo: "text", max: 80, par: true },
    { id: "apellidos", etiqueta: "Apellidos", tipo: "text", max: 80, par: true },
    { id: "correo", etiqueta: "Correo", tipo: "email", max: 100 },
    { id: "telefono", etiqueta: "Teléfono", tipo: "tel", max: 10, opcional: true, par: true,
      ayuda: "Celular de 10 números o fijo que empiece por 60." },
    { id: "nacimiento", etiqueta: "Fecha de nacimiento", tipo: "date", par: true },
    { id: "direccion", etiqueta: "Dirección", tipo: "text", max: 200 },
    { id: "ciudad", etiqueta: "Ciudad", tipo: "select", opciones: ciudades, par: true },
    { id: "alias", etiqueta: "Alias", tipo: "text", max: 40, opcional: true, par: true },
    { id: "puntos", etiqueta: "Puntos", tipo: "number", min: 0 },
    { id: "publicidad", etiqueta: "Quiere recibir publicidad", tipo: "checkbox" }
  ];
  if (nuevo) {
    campos.push({ id: "contrasena", etiqueta: "Contraseña inicial", tipo: "password",
      ayuda: "Mínimo 8 caracteres. El cliente podrá cambiarla después." });
  }
  return campos;
}

/* actual = el cliente que se edita (null al registrar) */
function validarCliente(v, actual, clientes) {
  var errores = validarPersona(v, {});
  var hoy = new Date().toISOString().slice(0, 10);
  var documento = documentoNormalizado(v.documento);
  var otros = clientes.filter(function (c) { return c !== actual; });

  if (!actual && otros.some(function (c) { return c.documento === documento; })) {
    errores.documento = "Ya hay un cliente con ese documento.";
  }
  if (!errores.correo && otros.some(function (c) { return c.correo.toLowerCase() === v.correo.toLowerCase(); })) {
    errores.correo = "Ya hay un cliente con ese correo.";
  }
  if (!v.nacimiento) errores.nacimiento = "Escribe la fecha de nacimiento.";
  else if (v.nacimiento > hoy) errores.nacimiento = "La fecha de nacimiento no puede ser futura.";
  if (v.alias && otros.some(function (c) { return (c.alias || "").toLowerCase() === v.alias.toLowerCase(); })) {
    errores.alias = "Ese alias ya lo usa otro cliente.";
  }
  if (!/^[0-9]+$/.test(String(v.puntos))) errores.puntos = "Los puntos deben ser un número entero de 0 en adelante.";
  return errores;
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
      { titulo: "Cuentas activas", valor: cuantos(function (c) { return c.cuenta === "Activa"; }), formato: numero.format },
      { titulo: "Clientes con reservas", valor: cuantos(function (c) { return c.reservas.length > 0; }), formato: numero.format },
      { titulo: "Cuentas bloqueadas", valor: cuantos(function (c) { return c.cuenta === "Bloqueada"; }), formato: numero.format }
    ]);
  }

  function pintarTabla() {
    var texto = normalizar(buscar.value.trim());

    var lista = clientes.filter(function (c) {
      var coincide = texto === "" ||
        normalizar(c.nombre + " " + c.documento + " " + c.correo + " " + c.alias).indexOf(texto) !== -1;
      return coincide &&
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
      cuerpo.innerHTML = '<tr role="row"><td role="cell" colspan="6" class="tabla-vacia">' +
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
        '<td role="cell" class="celda-accion">' +
          '<button type="button" class="admin-boton-sec" data-documento="' + escapar(c.documento) + '">' +
            'Ver detalle<span class="oculto"> de ' + escapar(c.nombre) + '</span>' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join("");
  }

  function botonesCuenta(c) {
    return '<button type="button" class="admin-boton-sec" data-accion="editar">Editar datos</button>' +
      (c.cuenta === "Bloqueada"
        ? '<button type="button" class="admin-boton" data-accion="Activa">Desbloquear cuenta</button>'
        : '<button type="button" class="admin-boton-sec" data-accion="confirmar">Bloquear cuenta</button>') +
      '<button type="button" class="admin-boton admin-boton-peligro" data-accion="eliminar">Eliminar cliente</button>';
  }

  /* ----- Registrar y editar ----- */
  var ciudades = [];
  var modo = null;   /* "nuevo" o "editar" mientras se ve el formulario */

  function valoresCliente(c) {
    return {
      tipoDoc: c.tipoDoc, documento: c.documento, nombres: c.nombres, apellidos: c.apellidos,
      correo: c.correo, telefono: c.telefono, nacimiento: c.nacimiento, direccion: c.direccion,
      ciudad: c.ciudad, alias: c.alias, puntos: c.puntos, publicidad: c.publicidad
    };
  }

  function mostrarFormulario(c) {
    modo = c ? "editar" : "nuevo";
    var lista = ciudades.slice();
    if (c && c.ciudad && !lista.some(function (x) { return x[0] === c.ciudad; })) lista.push([c.ciudad, c.ciudad]);

    contenido.innerHTML =
      '<div class="detalle-cabecera"><div>' +
        '<h2 id="detalle-nombre" tabindex="-1">' + (c ? "Editar a " + escapar(c.nombre) : "Registrar cliente") + '</h2>' +
        '<p>' + (c ? "Cambia los datos que necesites y guarda." : "Crea la cuenta de un cliente nuevo.") + '</p>' +
      '</div></div>' +
      htmlFormulario("form-cliente", camposCliente(!c, lista),
        c ? valoresCliente(c) : { tipoDoc: "CC", puntos: 0, publicidad: true },
        c ? "Guardar cambios" : "Registrar cliente");
    document.getElementById("detalle-nombre").focus();
  }

  contenido.addEventListener("submit", function (evento) {
    if (evento.target.id !== "form-cliente") return;
    evento.preventDefault();

    var nuevo = modo === "nuevo";
    var campos = camposCliente(nuevo, ciudades);
    var v = leerFormulario(campos);
    if (!nuevo) {
      v.tipoDoc = abierto.tipoDoc;
      v.documento = abierto.documento;
    }
    if (mostrarErroresFormulario("form-cliente", campos, validarCliente(v, nuevo ? null : abierto, clientes))) return;

    var datos = {
      tipoDoc: v.tipoDoc, documento: documentoNormalizado(v.documento), nombres: v.nombres, apellidos: v.apellidos,
      correo: v.correo.toLowerCase(), telefono: v.telefono.replace(/\s/g, ""), nacimiento: v.nacimiento,
      direccion: v.direccion, ciudad: v.ciudad, alias: v.alias, puntos: Number(v.puntos), publicidad: v.publicidad
    };
    if (nuevo) {
      Object.assign(datos, {
        registro: new Date().toISOString().slice(0, 10), cuenta: "Activa",
        compras: [0, 0, 0, 0, 0, 0], reservas: []
      });
    }

    var botones = evento.target.querySelectorAll("button");
    botones.forEach(function (b) { b.disabled = true; });

    guardarCliente(nuevo ? Object.assign({ contrasena: v.contrasena }, datos) : datos, nuevo ? null : abierto.documento)
      .then(function () {
        var cliente;
        if (nuevo) {
          cliente = conNombre(datos);
          clientes.push(cliente);
        } else {
          cliente = conNombre(Object.assign(abierto, datos));
        }
        abierto = cliente;
        modo = null;
        var mensaje = nuevo ? "Se registró a " + cliente.nombre + "." : "Se guardaron los cambios de " + cliente.nombre + ".";
        aviso.textContent = mensaje;
        pintarResumen();
        pintarTabla();
        pintarDetalle(cliente, mensaje);
        document.getElementById("detalle-nombre").focus();
      })
      .catch(function (error) {
        document.getElementById("form-cliente-error").innerHTML = "<strong>Error:</strong> " + escapar(error.message);
        botones.forEach(function (b) { b.disabled = false; });
      });
  });

  document.getElementById("nuevo-cliente").onclick = function () {
    abierto = null;
    mostrarFormulario(null);
    dialogo.showModal();
    document.getElementById("detalle-nombre").focus();
  };

  function pintarDetalle(c, mensaje) {
    var gastado = 0;
    var historial = c.reservas.map(function (r) {
      var evento = D.eventos.filter(function (e) { return e.id === r[0]; })[0];
      if (!evento) return "";
      var valor = r[1] * evento.precio + D.tarifaWompi(r[1] * evento.precio);
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
          '<p>' + (c.alias ? '@' + escapar(c.alias) : 'Sin alias') + '</p>' +
          '<span class="detalle-etiquetas">' +
            (c.cuenta === "Bloqueada"
              ? etiqueta("Cuenta bloqueada", "agente-suspendido", "Cuenta")
              : etiqueta("Cuenta activa", "agente-activo", "Cuenta")) +
          '</span>' +
        '</div>' +
      '</div>' +
      '<p class="detalle-aviso" id="detalle-aviso" role="status">' + (mensaje || "") + '</p>' +
      '<dl class="detalle-datos">' +
        '<div><dt>Documento</dt><dd>' + escapar(c.tipoDoc) + ' ' + escapar(c.documento) + '</dd></div>' +
        '<div><dt>Ciudad</dt><dd>' + escapar(c.ciudad) + '</dd></div>' +
        '<div><dt>Correo</dt><dd><a href="mailto:' + escapar(c.correo) + '">' + escapar(c.correo) + '</a></dd></div>' +
        '<div><dt>Teléfono</dt><dd>' + (c.telefono ? escapar(c.telefono) : 'Sin teléfono') + '</dd></div>' +
        '<div><dt>Dirección</dt><dd>' + escapar(c.direccion || "") + '</dd></div>' +
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
    if (!boton) return;

    var accion = boton.getAttribute("data-accion");
    var acciones = document.getElementById("detalle-acciones");

    if (accion === "cancelar-formulario") {
      if (modo === "nuevo") {
        modo = null;
        dialogo.close();
      } else {
        modo = null;
        pintarDetalle(abierto);
        document.getElementById("detalle-nombre").focus();
      }
      return;
    }
    if (!abierto) return;

    if (accion === "editar") {
      mostrarFormulario(abierto);
    } else if (accion === "eliminar") {
      var cuantas = abierto.reservas.length;
      acciones.innerHTML =
        '<div class="detalle-confirmar">' +
          '<p id="texto-confirmar"><strong>¿Eliminar a ' + escapar(abierto.nombre) + '?</strong> ' +
          'Se borrarán su cuenta' + (cuantas ? ' y sus ' + cuantas + (cuantas === 1 ? ' reserva' : ' reservas') : '') +
          '. Esto no se puede deshacer.</p>' +
          '<div class="detalle-botones">' +
            '<button type="button" class="admin-boton admin-boton-peligro" data-accion="si-eliminar" aria-describedby="texto-confirmar">Sí, eliminar</button>' +
            '<button type="button" class="admin-boton-sec" data-accion="cancelar">Cancelar</button>' +
          '</div>' +
        '</div>';
      acciones.querySelector('[data-accion="si-eliminar"]').focus();
    } else if (accion === "si-eliminar") {
      var cliente = abierto;
      acciones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
      eliminarCliente(cliente.documento).then(function () {
        clientes = clientes.filter(function (c) { return c !== cliente; });
        aviso.textContent = "Se eliminó a " + cliente.nombre + ".";
        abierto = null;
        dialogo.close();
        pintarResumen();
        pintarTabla();
        aviso.setAttribute("tabindex", "-1");
        aviso.focus();
      }).catch(function (error) {
        document.getElementById("detalle-aviso").innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
        acciones.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
      });
    } else if (accion === "confirmar") {
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
    if (modo === "nuevo") {
      modo = null;
      /* después de que el navegador devuelve el foco por su cuenta */
      setTimeout(function () { document.getElementById("nuevo-cliente").focus(); }, 0);
      return;
    }
    modo = null;
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
  filtroCuenta.onchange = pintarTabla;
  orden.onchange = pintarTabla;

  obtenerCiudadesLista().then(function (lista) { ciudades = lista; }).catch(function () {});

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

/* ===== PÁGINA: ADMINISTRADORES ===== */

/* Administradores de ejemplo (USUARIO + ADMIN). El primero es la cuenta de prueba. */
var ADMINISTRADORES_DEMO = [
  { documento: "1000000001", tipoDoc: "CC", nombres: "Sebastián", apellidos: "Jaramillo", correo: "admin@eldesparche.online",
    telefono: "3112345678", direccion: "Carrera 26 # 32-18", ciudad: "Tuluá", salario: 4500000, horario: "Completa", registro: "2024-01-15" },
  { documento: "1116789012", tipoDoc: "CC", nombres: "Natalia", apellidos: "Cárdenas Ruiz", correo: "natalia.cardenas@eldesparche.online",
    telefono: "3156789012", direccion: "Calle 28 # 24-40", ciudad: "Tuluá", salario: 3200000, horario: "Mañana", registro: "2024-06-03" },
  { documento: "1144321098", tipoDoc: "CC", nombres: "Esteban", apellidos: "Villa Orozco", correo: "esteban.villa@eldesparche.online",
    telefono: "3001239988", direccion: "Avenida Roosevelt # 38-50", ciudad: "Cali", salario: 3200000, horario: "Tarde", registro: "2025-02-20" },
  { documento: "1023456789", tipoDoc: "CC", nombres: "Diana Marcela", apellidos: "Torres", correo: "diana.torres@eldesparche.online",
    telefono: "", direccion: "Calle 53 # 21-30", ciudad: "Bogotá", salario: 2800000, horario: "Noche", registro: "2025-09-08" }
];

var HORARIOS = ["Mañana", "Tarde", "Noche", "Completa"];

function administradoresLocales() {
  return aplicarDatosLocales(ADMINISTRADORES_DEMO, "datosAdministradores", "documento").map(conNombre);
}

function obtenerAdministradores() {
  if (!D.usarApi) return Promise.resolve(administradoresLocales());

  return D.llamarApi("/admin/administradores", { headers: cabeceraToken() }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cargar la lista de administradores.");
    }
    return resultado.datos.administradores.map(conNombre);
  });
}

/* documento = null para registrar uno nuevo */
function guardarAdministrador(datos, documento) {
  if (!D.usarApi) {
    var copia = Object.assign({}, datos);
    delete copia.contrasena;   /* la contraseña nunca se guarda en el navegador */
    cambiarDatoLocal("datosAdministradores", "documento", documento, copia);
    return Promise.resolve();
  }
  return documento === null
    ? enviarCrud("/admin/administradores", "POST", datos, "No se pudo registrar el administrador.")
    : enviarCrud("/admin/administradores/" + encodeURIComponent(documento), "PUT", datos, "No se pudieron guardar los cambios.");
}

function eliminarAdministrador(documento) {
  if (!D.usarApi) {
    cambiarDatoLocal("datosAdministradores", "documento", documento, null);
    return Promise.resolve();
  }
  return enviarCrud("/admin/administradores/" + encodeURIComponent(documento), "DELETE", null,
    "No se pudo eliminar el administrador.");
}

function camposAdministrador(nuevo, ciudades) {
  var campos = [
    { tipo: "titulo", etiqueta: "Datos personales" },
    { id: "tipoDoc", etiqueta: "Tipo de documento", tipo: "select", opciones: TIPOS_DOCUMENTO, par: true, soloLectura: !nuevo },
    { id: "documento", etiqueta: "Número de documento", tipo: "text", max: 20, par: true, soloLectura: !nuevo,
      ayuda: nuevo ? "Sin puntos ni espacios." : "El documento no se puede cambiar." },
    { id: "nombres", etiqueta: "Nombres", tipo: "text", max: 80, par: true },
    { id: "apellidos", etiqueta: "Apellidos", tipo: "text", max: 80, par: true },
    { id: "correo", etiqueta: "Correo", tipo: "email", max: 100, par: true },
    { id: "telefono", etiqueta: "Teléfono", tipo: "tel", max: 10, opcional: true, par: true,
      ayuda: "Celular de 10 números o fijo que empiece por 60." },
    { id: "direccion", etiqueta: "Dirección", tipo: "text", max: 200, par: true },
    { id: "ciudad", etiqueta: "Ciudad", tipo: "select", opciones: ciudades, par: true },
    { tipo: "titulo", etiqueta: "Trabajo" },
    { id: "salario", etiqueta: "Salario mensual (pesos)", tipo: "number", min: 0, par: true,
      ayuda: "Sin puntos. Ejemplo: 3200000." },
    { id: "horario", etiqueta: "Horario", tipo: "select", opciones: HORARIOS, par: true }
  ];
  if (nuevo) {
    campos.push({ id: "contrasena", etiqueta: "Contraseña inicial", tipo: "password",
      ayuda: "Mínimo 8 caracteres. La persona podrá cambiarla después." });
  }
  return campos;
}

/* actual = el administrador que se edita (null al registrar) */
function validarAdministrador(v, actual, administradores) {
  var errores = validarPersona(v, {});
  var otros = administradores.filter(function (a) { return a !== actual; });
  var documento = documentoNormalizado(v.documento);

  if (!actual && !errores.documento && otros.some(function (a) { return a.documento === documento; })) {
    errores.documento = "Ya hay un administrador con ese documento.";
  }
  if (!errores.correo && otros.some(function (a) { return a.correo.toLowerCase() === v.correo.toLowerCase(); })) {
    errores.correo = "Ya hay un administrador con ese correo.";
  }
  if (!/^[0-9]+$/.test(String(v.salario))) errores.salario = "El salario debe ser un número entero de 0 en adelante, sin puntos.";
  if (!v.horario) errores.horario = "Elige el horario.";

  var ordenados = {};
  ["tipoDoc", "documento", "nombres", "apellidos", "correo", "telefono", "direccion", "ciudad",
    "salario", "horario", "contrasena"].forEach(function (k) { if (errores[k]) ordenados[k] = errores[k]; });
  return ordenados;
}

function paginaAdministradores() {
  var yo = entrarComoAdmin();
  if (!yo) return;

  var administradores = [];
  var ciudades = [];
  var aviso = document.getElementById("admin-aviso");
  var buscar = document.getElementById("buscar-administrador");
  var filtroHorario = document.getElementById("filtro-horario");
  var orden = document.getElementById("orden-administradores");
  var conteo = document.getElementById("conteo-administradores");
  var cuerpo = document.getElementById("cuerpo-administradores");
  var dialogo = document.getElementById("detalle-administrador");
  var contenido = document.getElementById("detalle-contenido");
  var abierto = null;
  var modo = null;   /* "nuevo" o "editar" mientras se ve el formulario */

  function esYo(a) {
    return a.correo.toLowerCase() === (yo.correo || "").toLowerCase();
  }

  function pintarResumen() {
    var nomina = administradores.reduce(function (s, a) { return s + a.salario; }, 0);
    pintarTarjetas([
      { titulo: "Administradores", valor: administradores.length, formato: numero.format },
      { titulo: "Con jornada completa", valor: administradores.filter(function (a) { return a.horario === "Completa"; }).length, formato: numero.format },
      { titulo: "Nómina mensual", valor: nomina, formato: pesosCompacto.format, completo: pesos.format },
      { titulo: "Salario promedio", valor: administradores.length ? Math.round(nomina / administradores.length) : 0,
        formato: pesosCompacto.format, completo: pesos.format }
    ]);
  }

  function pintarTabla() {
    var texto = normalizar(buscar.value.trim());
    var lista = administradores.filter(function (a) {
      return (texto === "" || normalizar(a.nombre + " " + a.documento + " " + a.correo).indexOf(texto) !== -1) &&
        (filtroHorario.value === "" || a.horario === filtroHorario.value);
    });

    lista.sort(function (a, b) {
      if (orden.value === "salario") return b.salario - a.salario;
      if (orden.value === "registro") return b.registro.localeCompare(a.registro);
      return a.nombre.localeCompare(b.nombre, "es");
    });

    conteo.textContent = lista.length === administradores.length
      ? "Mostrando los " + administradores.length + " administradores."
      : "Mostrando " + lista.length + " de " + administradores.length + " administradores.";

    if (lista.length === 0) {
      cuerpo.innerHTML = '<tr role="row"><td role="cell" colspan="5" class="tabla-vacia">' +
        'No hay administradores que coincidan con la búsqueda. Prueba con otros filtros.</td></tr>';
      return;
    }

    cuerpo.innerHTML = lista.map(function (a) {
      return '<tr role="row">' +
        '<th scope="row" role="rowheader">' +
          '<span class="agente-celda">' +
            '<span class="agente-inicial" aria-hidden="true">' + escapar(a.nombre.charAt(0)) + '</span>' +
            '<span><span class="agente-nombre">' + escapar(a.nombre) + (esYo(a) ? ' <span class="admin-tu">(tú)</span>' : '') + '</span>' +
            '<span class="agente-nit">' + escapar(a.tipoDoc + " " + a.documento) + '</span></span>' +
          '</span>' +
        '</th>' +
        '<td role="cell" data-etiqueta="Ciudad">' + escapar(a.ciudad) + '</td>' +
        '<td role="cell" data-etiqueta="Horario">' + escapar(a.horario) + '</td>' +
        '<td role="cell" data-etiqueta="Salario" class="numero">' + pesos.format(a.salario) + '</td>' +
        '<td role="cell" class="celda-accion">' +
          '<button type="button" class="admin-boton-sec" data-documento="' + escapar(a.documento) + '">' +
            'Ver detalle<span class="oculto"> de ' + escapar(a.nombre) + '</span>' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join("");
  }

  function botonesAdministrador() {
    return '<button type="button" class="admin-boton-sec" data-accion="editar">Editar datos</button>' +
      '<button type="button" class="admin-boton admin-boton-peligro" data-accion="eliminar">Eliminar administrador</button>';
  }

  function pintarDetalle(a, mensaje) {
    contenido.innerHTML =
      '<div class="detalle-cabecera">' +
        '<span class="agente-inicial agente-inicial-grande" aria-hidden="true">' + escapar(a.nombre.charAt(0)) + '</span>' +
        '<div>' +
          '<h2 id="detalle-nombre" tabindex="-1">' + escapar(a.nombre) + '</h2>' +
          '<p>Administrador' + (esYo(a) ? ' · es tu cuenta' : '') + '</p>' +
        '</div>' +
      '</div>' +
      '<p class="detalle-aviso" id="detalle-aviso" role="status">' + (mensaje || "") + '</p>' +
      '<dl class="detalle-datos">' +
        '<div><dt>Documento</dt><dd>' + escapar(a.tipoDoc + " " + a.documento) + '</dd></div>' +
        '<div><dt>Correo</dt><dd><a href="mailto:' + escapar(a.correo) + '">' + escapar(a.correo) + '</a></dd></div>' +
        '<div><dt>Teléfono</dt><dd>' + (a.telefono ? escapar(a.telefono) : 'Sin teléfono') + '</dd></div>' +
        '<div><dt>Dirección</dt><dd>' + escapar(a.direccion) + '</dd></div>' +
        '<div><dt>Ciudad</dt><dd>' + escapar(a.ciudad) + '</dd></div>' +
        '<div><dt>Horario</dt><dd>' + escapar(a.horario) + '</dd></div>' +
        '<div><dt>Salario mensual</dt><dd>' + pesos.format(a.salario) + '</dd></div>' +
        '<div><dt>Registrado el</dt><dd>' + fechaLarga(a.registro) + '</dd></div>' +
      '</dl>' +
      '<div class="detalle-acciones" id="detalle-acciones">' + botonesAdministrador() + '</div>';
  }

  function valoresAdministrador(a) {
    var v = {};
    ["tipoDoc", "documento", "nombres", "apellidos", "correo", "telefono", "direccion", "ciudad",
      "salario", "horario"].forEach(function (k) { v[k] = a[k]; });
    return v;
  }

  function mostrarFormulario(a) {
    modo = a ? "editar" : "nuevo";
    var lista = ciudades.slice();
    if (a && a.ciudad && !lista.some(function (x) { return x[0] === a.ciudad; })) lista.push([a.ciudad, a.ciudad]);

    contenido.innerHTML =
      '<div class="detalle-cabecera"><div>' +
        '<h2 id="detalle-nombre" tabindex="-1">' + (a ? "Editar a " + escapar(a.nombre) : "Registrar administrador") + '</h2>' +
        '<p>' + (a ? "Cambia los datos que necesites y guarda." : "Crea la cuenta de una persona del equipo.") + '</p>' +
      '</div></div>' +
      htmlFormulario("form-administrador", camposAdministrador(!a, lista),
        a ? valoresAdministrador(a) : { tipoDoc: "CC", horario: "Completa" },
        a ? "Guardar cambios" : "Registrar administrador");
    document.getElementById("detalle-nombre").focus();
  }

  function confirmarEliminacion(a) {
    var acciones = document.getElementById("detalle-acciones");
    var motivo = esYo(a)
      ? "No puedes eliminar tu propia cuenta mientras la estás usando. Pídele a otro administrador que lo haga."
      : (administradores.length === 1 ? "Es el único administrador: sin él nadie podría entrar al panel." : "");

    if (motivo) {
      acciones.innerHTML =
        '<div class="detalle-confirmar">' +
          '<p id="texto-confirmar"><strong>No se puede eliminar a ' + escapar(a.nombre) + '.</strong> ' + motivo + '</p>' +
          '<div class="detalle-botones">' +
            '<button type="button" class="admin-boton-sec" data-accion="cancelar">Entendido</button>' +
          '</div>' +
        '</div>';
      acciones.querySelector('[data-accion="cancelar"]').focus();
      return;
    }
    acciones.innerHTML =
      '<div class="detalle-confirmar">' +
        '<p id="texto-confirmar"><strong>¿Eliminar a ' + escapar(a.nombre) + '?</strong> ' +
        'Ya no podrá entrar al panel de administración. Esto no se puede deshacer.</p>' +
        '<div class="detalle-botones">' +
          '<button type="button" class="admin-boton admin-boton-peligro" data-accion="si-eliminar" aria-describedby="texto-confirmar">Sí, eliminar</button>' +
          '<button type="button" class="admin-boton-sec" data-accion="cancelar">Cancelar</button>' +
        '</div>' +
      '</div>';
    acciones.querySelector('[data-accion="si-eliminar"]').focus();
  }

  contenido.addEventListener("submit", function (evento) {
    if (evento.target.id !== "form-administrador") return;
    evento.preventDefault();

    var nuevo = modo === "nuevo";
    var campos = camposAdministrador(nuevo, ciudades);
    var v = leerFormulario(campos);
    if (!nuevo) {
      v.tipoDoc = abierto.tipoDoc;
      v.documento = abierto.documento;
    }
    if (mostrarErroresFormulario("form-administrador", campos,
      validarAdministrador(v, nuevo ? null : abierto, administradores))) return;

    var datos = {
      tipoDoc: v.tipoDoc, documento: documentoNormalizado(v.documento), nombres: v.nombres, apellidos: v.apellidos,
      correo: v.correo.toLowerCase(), telefono: v.telefono.replace(/\s/g, ""), direccion: v.direccion, ciudad: v.ciudad,
      salario: Number(v.salario), horario: v.horario
    };
    if (nuevo) datos.registro = new Date().toISOString().slice(0, 10);

    var botones = evento.target.querySelectorAll("button");
    botones.forEach(function (b) { b.disabled = true; });

    guardarAdministrador(nuevo ? Object.assign({ contrasena: v.contrasena }, datos) : datos, nuevo ? null : abierto.documento)
      .then(function () {
        var administrador;
        if (nuevo) {
          administrador = conNombre(datos);
          administradores.push(administrador);
        } else {
          administrador = conNombre(Object.assign(abierto, datos));
        }
        abierto = administrador;
        modo = null;
        var mensaje = nuevo ? "Se registró a " + administrador.nombre + "."
          : "Se guardaron los cambios de " + administrador.nombre + ".";
        aviso.textContent = mensaje;
        pintarResumen();
        pintarTabla();
        pintarDetalle(administrador, mensaje);
        document.getElementById("detalle-nombre").focus();
      })
      .catch(function (error) {
        document.getElementById("form-administrador-error").innerHTML = "<strong>Error:</strong> " + escapar(error.message);
        botones.forEach(function (b) { b.disabled = false; });
      });
  });

  contenido.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-accion]");
    if (!boton) return;

    var accion = boton.getAttribute("data-accion");
    if (accion === "cancelar-formulario") {
      if (modo === "nuevo") {
        dialogo.close();
      } else {
        modo = null;
        pintarDetalle(abierto);
        document.getElementById("detalle-nombre").focus();
      }
      return;
    }
    if (!abierto) return;

    if (accion === "editar") {
      mostrarFormulario(abierto);
    } else if (accion === "eliminar") {
      confirmarEliminacion(abierto);
    } else if (accion === "cancelar") {
      document.getElementById("detalle-acciones").innerHTML = botonesAdministrador();
      document.querySelector('#detalle-acciones [data-accion="eliminar"]').focus();
    } else if (accion === "si-eliminar") {
      var administrador = abierto;
      var acciones = document.getElementById("detalle-acciones");
      acciones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
      eliminarAdministrador(administrador.documento).then(function () {
        administradores = administradores.filter(function (a) { return a !== administrador; });
        aviso.textContent = "Se eliminó a " + administrador.nombre + ".";
        abierto = null;
        dialogo.close();
        pintarResumen();
        pintarTabla();
        aviso.setAttribute("tabindex", "-1");
        setTimeout(function () { aviso.focus(); }, 0);
      }).catch(function (error) {
        document.getElementById("detalle-aviso").innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
        acciones.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
      });
    }
  });

  cuerpo.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-documento]");
    if (!boton) return;

    abierto = administradores.filter(function (a) { return a.documento === boton.getAttribute("data-documento"); })[0];
    modo = null;
    pintarDetalle(abierto);
    dialogo.showModal();
    document.getElementById("detalle-nombre").focus();
  });

  document.getElementById("nuevo-administrador").onclick = function () {
    abierto = null;
    mostrarFormulario(null);
    dialogo.showModal();
    document.getElementById("detalle-nombre").focus();
  };

  document.getElementById("detalle-cerrar").onclick = function () {
    dialogo.close();
  };

  dialogo.addEventListener("click", function (evento) {
    if (evento.target === dialogo) dialogo.close();
  });

  dialogo.addEventListener("close", function () {
    if (modo === "nuevo") {
      modo = null;
      /* después de que el navegador devuelve el foco por su cuenta */
      setTimeout(function () { document.getElementById("nuevo-administrador").focus(); }, 0);
      return;
    }
    modo = null;
    if (!abierto) return;
    var documento = abierto.documento;
    abierto = null;
    setTimeout(function () {
      var boton = cuerpo.querySelector('button[data-documento="' + documento + '"]');
      if (boton) {
        boton.focus();
      } else {
        document.getElementById("titulo-lista-administradores").focus();
      }
    }, 0);
  });

  document.getElementById("filtros-administradores").addEventListener("submit", function (evento) {
    evento.preventDefault();
  });
  buscar.addEventListener("input", pintarTabla);
  filtroHorario.onchange = pintarTabla;
  orden.onchange = pintarTabla;

  obtenerCiudadesLista().then(function (lista) { ciudades = lista; }).catch(function () {});

  obtenerAdministradores().then(function (lista) {
    administradores = lista;
    if (!D.usarApi) {
      aviso.textContent = "Modo local: la base de datos está desactivada y se muestran datos de ejemplo.";
    }
    pintarResumen();
    pintarTabla();
  }).catch(function (error) {
    aviso.innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
  });
}

/* ===== PÁGINA: UBICACIONES (PAIS, DEPARTAMENTO, CIUDAD) ===== */

var NIVELES_UBICACION = {
  pais: { lista: "paises", singular: "país", plural: "países", padre: null, max: 60 },
  departamento: { lista: "departamentos", singular: "departamento", plural: "departamentos", padre: "idPais", max: 60 },
  ciudad: { lista: "ciudades", singular: "ciudad", plural: "ciudades", padre: "idDepartamento", max: 80 }
};

function obtenerUbicaciones() {
  if (!D.usarApi) return Promise.resolve(D.leerUbicaciones());

  return D.llamarApi("/admin/ubicaciones", { headers: cabeceraToken() }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudieron cargar las ubicaciones.");
    }
    return resultado.datos;
  });
}

/* Registra (id = null), renombra o elimina (nombre = null) un país, departamento o ciudad.
   En modo local, renombrar una ciudad también cambia el nombre guardado en las personas y
   los eventos que la usan (con el API eso lo hace la llave foránea id_ciudad). */
function cambiarUbicacion(nivel, id, nombre, idPadre, usos) {
  var n = NIVELES_UBICACION[nivel];
  var ruta = "/admin/" + n.lista + (id === null ? "" : "/" + encodeURIComponent(id));

  if (D.usarApi) {
    var metodo = id === null ? "POST" : (nombre === null ? "DELETE" : "PUT");
    var cuerpo = nombre === null ? null : { nombre: nombre };
    if (id === null && n.padre) cuerpo[n.padre] = idPadre;
    return enviarCrud(ruta, metodo, cuerpo, "No se pudo guardar el cambio.");
  }

  var datos = D.leerUbicaciones();
  var lista = datos[n.lista];
  if (id === null) {
    var nuevo = { id: Math.max.apply(null, lista.map(function (x) { return x.id; }).concat([0])) + 1, nombre: nombre };
    if (n.padre) nuevo[n.padre] = idPadre;
    lista.push(nuevo);
  } else if (nombre === null) {
    datos[n.lista] = lista.filter(function (x) { return x.id !== id; });
  } else {
    var actual = lista.filter(function (x) { return x.id === id; })[0];
    var anterior = actual.nombre;
    actual.nombre = nombre;
    if (nivel === "ciudad" && usos) {
      usos.clientes.forEach(function (c) { cambiarDatoLocal("datosClientes", "documento", c.documento, { ciudad: nombre }); });
      usos.agentes.forEach(function (a) { cambiarDatoLocal("datosAgentes", "nit", a.nit, { ciudad: nombre }); });
      usos.administradores.forEach(function (a) { cambiarDatoLocal("datosAdministradores", "documento", a.documento, { ciudad: nombre }); });
      usos.eventos.forEach(function (e) {
        cambiarDatoLocal("datosEventos", "id", e.id, { ciudad: nombre });
        e.ciudad = nombre;
      });
    }
    if (nivel === "departamento") {
      D.eventos.forEach(function (e) {
        if (e.departamento === anterior) {
          cambiarDatoLocal("datosEventos", "id", e.id, { departamento: nombre });
          e.departamento = nombre;
        }
      });
    }
  }
  D.guardarUbicaciones(datos);
  return Promise.resolve();
}

/* [departamento, país] de una ciudad, por su nombre */
function ubicacionDeCiudad(nombreCiudad, ubicaciones) {
  var u = ubicaciones || D.leerUbicaciones();
  var ciudad = u.ciudades.filter(function (c) { return c.nombre === nombreCiudad; })[0];
  var dep = ciudad && u.departamentos.filter(function (d) { return d.id === ciudad.idDepartamento; })[0];
  var pais = dep && u.paises.filter(function (p) { return p.id === dep.idPais; })[0];
  return dep ? [dep.nombre, pais ? pais.nombre : "Sin país"] : null;
}

function paginaUbicaciones() {
  if (!entrarComoAdmin()) return;

  var aviso = document.getElementById("admin-aviso");
  var datos = { paises: [], departamentos: [], ciudades: [] };
  var personas = { clientes: [], agentes: [], administradores: [] };
  var elegidos = { pais: null, departamento: null };
  /* Lo que se está editando o confirmando: { nivel, id, accion: "editar" | "eliminar" } */
  var enCurso = null;

  var listas = {
    pais: document.getElementById("lista-paises"),
    departamento: document.getElementById("lista-departamentos"),
    ciudad: document.getElementById("lista-ciudades")
  };

  function hijos(nivel, id) {
    if (nivel === "pais") return datos.departamentos.filter(function (d) { return d.idPais === id; });
    if (nivel === "departamento") return datos.ciudades.filter(function (c) { return c.idDepartamento === id; });
    return [];
  }

  /* Personas (USUARIO.id_ciudad) y eventos (UBICACION.id_ciudad) que usan una ciudad */
  function usosDe(ciudad) {
    var es = function (x) { return x.ciudad === ciudad.nombre; };
    return {
      clientes: personas.clientes.filter(es),
      agentes: personas.agentes.filter(es),
      administradores: personas.administradores.filter(es),
      eventos: D.eventos.filter(es)
    };
  }

  function textoUsos(u) {
    var gente = u.clientes.length + u.agentes.length + u.administradores.length;
    var partes = [];
    if (u.eventos.length) partes.push(u.eventos.length + (u.eventos.length === 1 ? " evento" : " eventos"));
    if (gente) partes.push(gente + (gente === 1 ? " persona" : " personas"));
    return partes.length ? partes.join(" · ") : "Sin uso";
  }

  function pintarResumen() {
    var conEventos = datos.ciudades.filter(function (c) { return usosDe(c).eventos.length > 0; }).length;
    pintarTarjetas([
      { titulo: "Países", valor: datos.paises.length, formato: numero.format },
      { titulo: "Departamentos", valor: datos.departamentos.length, formato: numero.format },
      { titulo: "Ciudades", valor: datos.ciudades.length, formato: numero.format },
      { titulo: "Ciudades con eventos", valor: conEventos, formato: numero.format }
    ]);
  }

  function filaEdicion(nivel, x) {
    var n = NIVELES_UBICACION[nivel];
    var id = "editar-" + nivel + "-" + x.id;
    return '<form class="ubic-editar" data-nivel="' + nivel + '" data-id="' + x.id + '" novalidate>' +
      '<label class="oculto" for="' + id + '">Nuevo nombre de ' + escapar(x.nombre) + '</label>' +
      '<input type="text" id="' + id + '" value="' + escapar(x.nombre) + '" maxlength="' + n.max + '" autocomplete="off" />' +
      '<div class="ubic-botones">' +
        '<button type="submit" class="admin-boton">Guardar</button>' +
        '<button type="button" class="admin-boton-sec" data-accion="volver">Cancelar</button>' +
      '</div>' +
      '<p class="detalle-error" id="error-' + id + '" role="alert"></p>' +
    '</form>';
  }

  function filaConfirmar(nivel, x) {
    var n = NIVELES_UBICACION[nivel];
    var bloqueo = "";
    if (nivel !== "ciudad" && hijos(nivel, x.id).length) {
      var cuantos = hijos(nivel, x.id).length;
      var hijo = nivel === "pais" ? NIVELES_UBICACION.departamento : NIVELES_UBICACION.ciudad;
      bloqueo = "Tiene " + cuantos + " " + (cuantos === 1 ? hijo.singular : hijo.plural) + ". " +
        (nivel === "pais" ? (cuantos === 1 ? "Elimínalo" : "Elimínalos") : (cuantos === 1 ? "Elimínala" : "Elimínalas")) + " primero.";
    } else if (nivel === "ciudad" && textoUsos(usosDe(x)) !== "Sin uso") {
      bloqueo = "La usan " + textoUsos(usosDe(x)) + ". Cámbialos de ciudad primero.";
    }

    if (bloqueo) {
      return '<div class="ubic-confirmar">' +
        '<p id="confirmar-' + nivel + '-' + x.id + '"><strong>No se puede eliminar ' + escapar(x.nombre) + '.</strong> ' + bloqueo + '</p>' +
        '<div class="ubic-botones"><button type="button" class="admin-boton-sec" data-accion="volver">Entendido</button></div>' +
      '</div>';
    }
    return '<div class="ubic-confirmar">' +
      '<p id="confirmar-' + nivel + '-' + x.id + '"><strong>¿Eliminar ' + (nivel === "ciudad" ? "la " : "el ") + n.singular + ' ' +
        escapar(x.nombre) + '?</strong> Esto no se puede deshacer.</p>' +
      '<div class="ubic-botones">' +
        '<button type="button" class="admin-boton admin-boton-peligro" data-accion="si-eliminar" ' +
          'aria-describedby="confirmar-' + nivel + '-' + x.id + '">Sí, eliminar</button>' +
        '<button type="button" class="admin-boton-sec" data-accion="volver">Cancelar</button>' +
      '</div>' +
    '</div>';
  }

  function fila(nivel, x) {
    if (enCurso && enCurso.nivel === nivel && enCurso.id === x.id) {
      return '<li class="ubic-item ubic-item-abierto">' +
        (enCurso.accion === "editar" ? filaEdicion(nivel, x) : filaConfirmar(nivel, x)) + '</li>';
    }

    var detalle;
    var nombre;
    if (nivel === "ciudad") {
      detalle = textoUsos(usosDe(x));
      nombre = '<span class="ubic-texto"><span class="ubic-nombre">' + escapar(x.nombre) + '</span>' +
        '<span class="ubic-conteo">' + detalle + '</span></span>';
    } else {
      var cuantos = hijos(nivel, x.id).length;
      var hijo = nivel === "pais" ? NIVELES_UBICACION.departamento : NIVELES_UBICACION.ciudad;
      detalle = cuantos + " " + (cuantos === 1 ? hijo.singular : hijo.plural);
      var activo = elegidos[nivel] === x.id;
      nombre = '<button type="button" class="ubic-elegir" data-elegir="' + nivel + '" data-id="' + x.id + '" aria-pressed="' + activo + '">' +
        '<span class="ubic-nombre">' + escapar(x.nombre) + '</span>' +
        '<span class="ubic-conteo">' + detalle + '<span class="oculto">. Ver sus ' + hijo.plural + '</span></span>' +
      '</button>';
    }
    return '<li class="ubic-item' + (elegidos[nivel] === x.id ? " ubic-item-activo" : "") + '">' + nombre +
      '<span class="ubic-acciones">' +
        '<button type="button" class="admin-boton-sec" data-accion="editar" data-nivel="' + nivel + '" data-id="' + x.id + '">' +
          'Editar<span class="oculto"> ' + escapar(x.nombre) + '</span></button>' +
        '<button type="button" class="admin-boton-sec ubic-eliminar" data-accion="eliminar" data-nivel="' + nivel + '" data-id="' + x.id + '">' +
          'Eliminar<span class="oculto"> ' + escapar(x.nombre) + '</span></button>' +
      '</span>' +
    '</li>';
  }

  function ordenar(lista) {
    return lista.slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); });
  }

  function nombreDe(nivel, id) {
    var x = datos[NIVELES_UBICACION[nivel].lista].filter(function (y) { return y.id === id; })[0];
    return x ? x.nombre : "";
  }

  function pintar() {
    listas.pais.innerHTML = ordenar(datos.paises).map(function (p) { return fila("pais", p); }).join("");

    var pais = elegidos.pais;
    document.getElementById("titulo-departamentos").textContent = pais ? "Departamentos de " + nombreDe("pais", pais) : "Departamentos";
    document.getElementById("caja-departamentos").hidden = !pais;
    document.getElementById("sin-pais").hidden = !!pais;
    listas.departamento.innerHTML = pais
      ? ordenar(hijos("pais", pais)).map(function (d) { return fila("departamento", d); }).join("") ||
        '<li class="ubic-vacio">Este país todavía no tiene departamentos.</li>'
      : "";

    var dep = elegidos.departamento;
    document.getElementById("titulo-ciudades").textContent = dep ? "Ciudades de " + nombreDe("departamento", dep) : "Ciudades";
    document.getElementById("caja-ciudades").hidden = !dep;
    document.getElementById("sin-departamento").hidden = !!dep;
    listas.ciudad.innerHTML = dep
      ? ordenar(hijos("departamento", dep)).map(function (c) { return fila("ciudad", c); }).join("") ||
        '<li class="ubic-vacio">Este departamento todavía no tiene ciudades.</li>'
      : "";
  }

  /* Nombre obligatorio y que no se repita entre hermanos (UNIQUE de la base de datos) */
  function validarNombre(nivel, nombre, idPadre, idPropio) {
    var n = NIVELES_UBICACION[nivel];
    if (!nombre) return "Escribe el nombre.";
    if (nombre.length > n.max) return "El nombre puede tener hasta " + n.max + " caracteres.";
    var hermanos = datos[n.lista].filter(function (x) {
      return x.id !== idPropio && (!n.padre || x[n.padre] === idPadre);
    });
    if (hermanos.some(function (x) { return normalizar(x.nombre) === normalizar(nombre); })) {
      return "Ya existe " + (nivel === "ciudad" ? "una ciudad" : (nivel === "pais" ? "un país" : "un departamento")) +
        " con ese nombre" + (n.padre ? " aquí." : ".");
    }
    return "";
  }

  function recargar(mensaje, foco) {
    return obtenerUbicaciones().then(function (nuevos) {
      datos = nuevos;
      enCurso = null;
      aviso.textContent = mensaje;
      pintarResumen();
      pintar();
      var destino = foco && document.querySelector(foco);
      (destino || aviso).focus();
    });
  }

  /* Agregar */
  ["pais", "departamento", "ciudad"].forEach(function (nivel) {
    var form = document.getElementById("agregar-" + nivel);
    form.addEventListener("submit", function (evento) {
      evento.preventDefault();
      var campo = document.getElementById("nuevo-" + nivel);
      var error = document.getElementById("error-nuevo-" + nivel);
      var nombre = campo.value.replace(/\s+/g, " ").trim();
      var idPadre = nivel === "departamento" ? elegidos.pais : (nivel === "ciudad" ? elegidos.departamento : null);
      var problema = validarNombre(nivel, nombre, idPadre, null);
      if (problema) {
        error.innerHTML = "<strong>Error:</strong> " + problema;
        campo.setAttribute("aria-invalid", "true");
        campo.focus();
        return;
      }
      error.textContent = "";
      campo.removeAttribute("aria-invalid");
      cambiarUbicacion(nivel, null, nombre, idPadre).then(function () {
        campo.value = "";
        return recargar("Se agregó " + nombre + ".", "#nuevo-" + nivel);
      }).catch(function (e) {
        error.innerHTML = "<strong>Error:</strong> " + escapar(e.message);
      });
    });
  });

  /* Elegir, editar y eliminar */
  document.getElementById("ubicaciones").addEventListener("click", function (evento) {
    var elegir = evento.target.closest("[data-elegir]");
    if (elegir) {
      var nivel = elegir.getAttribute("data-elegir");
      var id = Number(elegir.getAttribute("data-id"));
      elegidos[nivel] = id;
      if (nivel === "pais") elegidos.departamento = null;
      enCurso = null;
      pintar();
      /* El foco sigue en el elegido; el título de la siguiente lista ya cambió */
      document.querySelector('[data-elegir="' + nivel + '"][data-id="' + id + '"]').focus();
      aviso.textContent = "Mostrando " + (nivel === "pais" ? "los departamentos" : "las ciudades") + " de " + nombreDe(nivel, id) + ".";
      return;
    }

    var boton = evento.target.closest("button[data-accion]");
    if (!boton) return;
    var accion = boton.getAttribute("data-accion");

    if (accion === "editar" || accion === "eliminar") {
      enCurso = { nivel: boton.getAttribute("data-nivel"), id: Number(boton.getAttribute("data-id")), accion: accion };
      pintar();
      var abierto = document.querySelector(".ubic-item-abierto");
      (abierto.querySelector("input") || abierto.querySelector("button")).focus();
    } else if (accion === "volver") {
      var antes = enCurso;
      enCurso = null;
      pintar();
      var volver = document.querySelector('[data-accion="' + antes.accion + '"][data-nivel="' + antes.nivel + '"][data-id="' + antes.id + '"]');
      if (volver) volver.focus();
    } else if (accion === "si-eliminar") {
      var borrar = enCurso;
      var nombreBorrado = nombreDe(borrar.nivel, borrar.id);
      cambiarUbicacion(borrar.nivel, borrar.id, null).then(function () {
        if (elegidos[borrar.nivel] === borrar.id) {
          elegidos[borrar.nivel] = null;
          if (borrar.nivel === "pais") elegidos.departamento = null;
        }
        return recargar("Se eliminó " + nombreBorrado + ".", "#titulo-" + NIVELES_UBICACION[borrar.nivel].lista);
      }).catch(function (e) {
        aviso.innerHTML = "<strong>Error:</strong> " + escapar(e.message);
      });
    }
  });

  document.getElementById("ubicaciones").addEventListener("submit", function (evento) {
    var form = evento.target.closest(".ubic-editar");
    if (!form) return;
    evento.preventDefault();
    var nivel = form.getAttribute("data-nivel");
    var id = Number(form.getAttribute("data-id"));
    var x = datos[NIVELES_UBICACION[nivel].lista].filter(function (y) { return y.id === id; })[0];
    var campo = form.querySelector("input");
    var error = form.querySelector(".detalle-error");
    var nombre = campo.value.replace(/\s+/g, " ").trim();
    var n = NIVELES_UBICACION[nivel];
    var problema = validarNombre(nivel, nombre, n.padre ? x[n.padre] : null, id);
    if (problema) {
      error.innerHTML = "<strong>Error:</strong> " + problema;
      campo.setAttribute("aria-invalid", "true");
      campo.focus();
      return;
    }
    var anterior = x.nombre;
    cambiarUbicacion(nivel, id, nombre, null, nivel === "ciudad" ? usosDe(x) : null).then(function () {
      if (nivel === "ciudad") {
        ["clientes", "agentes", "administradores"].forEach(function (k) {
          personas[k].forEach(function (p) { if (p.ciudad === anterior) p.ciudad = nombre; });
        });
      }
      return recargar(anterior + " ahora se llama " + nombre + ".",
        '[data-accion="editar"][data-nivel="' + nivel + '"][data-id="' + id + '"]');
    }).catch(function (e) {
      error.innerHTML = "<strong>Error:</strong> " + escapar(e.message);
    });
  });

  Promise.all([
    obtenerUbicaciones(),
    obtenerClientes().catch(function () { return []; }),
    obtenerAgentes().catch(function () { return []; }),
    obtenerAdministradores().catch(function () { return []; })
  ]).then(function (r) {
    datos = r[0];
    personas = { clientes: r[1], agentes: r[2], administradores: r[3] };
    var colombia = datos.paises.filter(function (p) { return p.nombre === "Colombia"; })[0];
    elegidos.pais = colombia ? colombia.id : null;
    if (!D.usarApi) {
      aviso.textContent = "Modo local: la base de datos está desactivada y los cambios se guardan en este navegador.";
    }
    pintarResumen();
    pintar();
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

/* Las reservas de ejemplo salen del historial de los clientes de ejemplo */
function reservasLocales() {
  var lista = [];
  var metodos = Object.keys(METODOS_WOMPI);
  var n = 0;

  clientesLocales().forEach(function (c) {
    c.reservas.forEach(function (r) {
      var evento = D.eventos.filter(function (e) { return e.id === r[0]; })[0];
      if (!evento) return;
      n++;

      var fecha = r[3] + "T" + dosCifras(9 + n % 12) + ":" + dosCifras((n * 7) % 60) + ":00";
      var valor = r[1] * evento.precio + D.tarifaWompi(r[1] * evento.precio);   /* entradas × precio + tarifa de Wompi */
      /* Las canceladas de ejemplo traen su causa en las observaciones */
      var observaciones = r[2] === "Cancelada"
        ? D.notaCancelacion("reserva", ["el cliente", "el agente", "el administrador"][n % 3],
            D.CAUSAS_CANCELACION.reserva[n % 4], "")
        : "";
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
        observaciones: observaciones,
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
      observaciones: r.observaciones || "",
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
    return Promise.resolve(aplicarDatosLocales(reservasLocales(), "datosReservas", "codigo").map(function (r) {
      var cambio = cambios[r.codigo];   /* texto (antes) o { estado, observaciones } */
      if (typeof cambio === "string") r.estado = cambio;
      else if (cambio) Object.assign(r, cambio);
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

function cancelarReservaAdmin(codigo, observaciones) {
  if (!D.usarApi) {
    try {
      var cambios = leerReservasLocales();
      cambios[codigo] = { estado: "Cancelada", observaciones: observaciones };
      localStorage.setItem("estadoReservas", JSON.stringify(cambios));
    } catch (e) {}
    return Promise.resolve();
  }

  return D.llamarApi("/admin/reservas/" + encodeURIComponent(codigo) + "/estado", {
    method: "PATCH",
    headers: Object.assign({ "Content-Type": "application/json" }, cabeceraToken()),
    body: JSON.stringify({ estado: "Cancelada", observaciones: observaciones })
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cancelar la reserva.");
    }
  });
}

/* ===== REGISTRAR, MODIFICAR Y ELIMINAR RESERVAS (solo el administrador) ===== */

/* ¿La entrada sirve para entrar? Pagada en Wompi, gratis, o confirmada por un administrador
   (por ejemplo, una reserva que registró él y se pagó en taquilla) */
function entradaValida(r) {
  if (r.estado === "Cancelada") return false;
  if (r.pago) return r.pago.estado === "APPROVED";
  return r.valor === 0 || r.estado === "Confirmada";
}

/* Código para una reserva nueva: el siguiente DES-#### */
function siguienteCodigoReserva(reservas) {
  var numeros = reservas.map(function (r) {
    var m = /^DES-(\d+)$/.exec(r.codigo);
    return m ? Number(m[1]) : 0;
  });
  return "DES-" + (Math.max.apply(null, numeros.concat([1040])) + 1);
}

/* codigo = null para registrar una nueva */
function guardarReserva(datos, codigo) {
  if (!D.usarApi) {
    cambiarDatoLocal("datosReservas", "codigo", codigo, datos);
    return Promise.resolve();
  }
  return codigo === null
    ? enviarCrud("/admin/reservas", "POST", datos, "No se pudo registrar la reserva.")
    : enviarCrud("/admin/reservas/" + encodeURIComponent(codigo), "PUT", datos, "No se pudieron guardar los cambios.");
}

function eliminarReserva(codigo) {
  if (!D.usarApi) {
    cambiarDatoLocal("datosReservas", "codigo", codigo, null);
    return Promise.resolve();
  }
  return enviarCrud("/admin/reservas/" + encodeURIComponent(codigo), "DELETE", null, "No se pudo eliminar la reserva.");
}

/* r = la reserva que se edita (null al registrar). Con un pago en Wompi, el valor
   pagado y el estado ya no se cambian desde aquí. */
function camposReserva(r, clientes, eventos) {
  var conPago = !!(r && r.pago);
  var campos = [];
  if (!r) {
    campos.push(
      { id: "cliente", etiqueta: "Cliente", tipo: "select", opciones: clientes },
      { id: "evento", etiqueta: "Evento", tipo: "select", opciones: eventos }
    );
  }
  campos.push(
    { id: "entradas", etiqueta: "Número de entradas", tipo: "number", min: 1, max: 10, par: true, soloLectura: conPago,
      ayuda: conPago ? "Ya tiene un pago en Wompi por este valor: para cambiar las entradas, cancélala y registra otra."
        : "De 1 a 10 por reserva." },
    { id: "estado", etiqueta: "Estado", tipo: "select", opciones: ["Reservada", "Confirmada"], par: true, soloLectura: conPago,
      ayuda: conPago ? "Lo da el pago de Wompi." : "Confirmada: ya está pagada (por ejemplo, en taquilla) y la entrada sirve." },
    { tipo: "html", html: '<p class="reserva-total" id="reserva-total" aria-live="polite"></p>' },
    { id: "observaciones", etiqueta: "Observaciones", tipo: "textarea", opcional: true }
  );
  return campos;
}

function fechaHora(iso) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit"
  });
}

function etiquetaPago(pago, valor) {
  if (!pago) return '<span class="texto-gris">' + (valor > 0 ? "Sin pago en Wompi" : "Sin pago (gratis)") + '</span>';
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

/* config (opcional, la usa el panel del agente):
   { eventos: [ids permitidos], obtenerReservas, cancelar(codigo, observaciones), notaDevolucion, quien }
   Sin config es la página del administrador con todas las reservas. */
function paginaReservasAdmin(config) {
  if (!config && !entrarComoAdmin()) return;
  config = config || {};
  var obtener = config.obtenerReservas || obtenerReservasAdmin;
  var cancelar = config.cancelar || cancelarReservaAdmin;
  var quien = config.quien || "el administrador";   /* quién cancela, para la nota */
  var notaDevolucion = config.notaDevolucion ||
    " El pago ya fue aprobado: recuerda hacer la devolución del dinero desde el panel de comercios de Wompi.";

  var reservas = [];
  var aviso = document.getElementById("admin-aviso");
  var buscar = document.getElementById("buscar-reserva");
  var filtroPago = document.getElementById("filtro-pago");
  var filtroMetodo = document.getElementById("filtro-metodo");
  var filtroEvento = document.getElementById("filtro-evento");   /* solo en el panel del agente */
  var orden = document.getElementById("orden-reservas");
  var conteo = document.getElementById("conteo-reservas");
  var cuerpo = document.getElementById("cuerpo-reservas");
  var dialogo = document.getElementById("detalle-reserva");
  var contenido = document.getElementById("detalle-contenido");
  var abierto = null;

  /* Registrar, editar y eliminar: solo en la página del administrador */
  var conCrud = !config.eventos && !!document.getElementById("nueva-reserva");
  var modo = null;   /* "nuevo" o "editar" mientras se ve el formulario */
  var clientesCrud = [];
  var eventosCrud = [];

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
        (!filtroEvento || filtroEvento.value === "" || String(r.eventoId) === filtroEvento.value) &&
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
          '<span class="celda-pago">' + etiquetaPago(r.pago, r.valor) +
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
    if (!r.pago && r.valor === 0) return "Evento gratuito: la reserva no necesita pago.";
    if (!r.pago) {
      return r.estado === "Confirmada"
        ? "La registró un administrador y está confirmada: se pagó por fuera de Wompi (por ejemplo, en taquilla)."
        : "La registró un administrador y todavía no tiene pago. Cuando el cliente pague, cámbiala a Confirmada.";
    }
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
    var eliminar = conCrud
      ? '<button type="button" class="admin-boton admin-boton-peligro" data-accion="eliminar">Eliminar reserva</button>'
      : '';
    if (r.estado === "Cancelada") {
      return '<p class="texto-gris">Esta reserva está cancelada.</p>' + eliminar;
    }
    return (conCrud ? '<button type="button" class="admin-boton-sec" data-accion="editar">Editar reserva</button>' : '') +
      '<button type="button" class="' + (conCrud ? 'admin-boton-sec' : 'admin-boton admin-boton-peligro') + '" data-accion="confirmar">Cancelar reserva</button>' +
      eliminar;
  }

  /* ----- Registrar y editar (administrador) ----- */

  function eventoDe(id) {
    return D.eventos.filter(function (e) { return String(e.id) === String(id); })[0];
  }

  function pintarTotal() {
    var caja = document.getElementById("reserva-total");
    if (!caja) return;
    var campoEntradas = document.getElementById("f-entradas");
    var entradas = Number(campoEntradas.value);
    var precio = modo === "nuevo"
      ? (eventoDe(document.getElementById("f-evento").value) || {}).precio
      : abierto.precio;
    if (precio === undefined || !(entradas >= 1)) {
      caja.textContent = "";
      return;
    }
    var subtotal = entradas * precio;
    var tarifa = D.tarifaWompi(subtotal);
    caja.innerHTML = 'Valor total: <strong>' + textoPrecio(subtotal + tarifa) + '</strong>' +
      (tarifa ? ' <span class="texto-gris">(' + entradas + ' × ' + pesos.format(precio) + ' + tarifa de Wompi ' +
        pesos.format(tarifa) + ')</span>' : '');
  }

  function mostrarFormulario(r) {
    modo = r ? "editar" : "nuevo";
    contenido.innerHTML =
      '<div class="detalle-cabecera"><div>' +
        '<h2 id="detalle-nombre" tabindex="-1">' + (r ? "Editar la reserva " + escapar(r.codigo) : "Registrar reserva") + '</h2>' +
        '<p>' + (r ? escapar(r.cliente) + " · " + escapar(r.evento) : "Reserva entradas a nombre de un cliente.") + '</p>' +
      '</div></div>' +
      htmlFormulario("form-reserva", camposReserva(r, clientesCrud, eventosCrud),
        r ? { entradas: r.entradas, estado: r.estado, observaciones: r.observaciones }
          : { entradas: 1, estado: "Reservada" },
        r ? "Guardar cambios" : "Registrar reserva");
    pintarTotal();
    document.getElementById("detalle-nombre").focus();
  }

  contenido.addEventListener("input", function (evento) {
    if (evento.target.id === "f-entradas") pintarTotal();
  });
  contenido.addEventListener("change", function (evento) {
    if (evento.target.id === "f-evento") pintarTotal();
  });

  contenido.addEventListener("submit", function (evento) {
    if (evento.target.id !== "form-reserva") return;
    evento.preventDefault();

    var nuevo = modo === "nuevo";
    var campos = camposReserva(nuevo ? null : abierto, clientesCrud, eventosCrud);
    var v = leerFormulario(campos);
    var conPagoWompi = !nuevo && !!abierto.pago;
    if (conPagoWompi) {
      v.entradas = abierto.entradas;
      v.estado = abierto.estado;
    }

    var errores = {};
    var cliente = null;
    var ev = nuevo ? eventoDe(v.evento) : eventoDe(abierto.eventoId);
    if (nuevo) {
      cliente = clientesCrud.datos.filter(function (c) { return c.documento === v.cliente; })[0];
      if (!cliente) errores.cliente = "Elige el cliente.";
      if (!ev) errores.evento = "Elige el evento.";
    }
    if (!/^[0-9]+$/.test(String(v.entradas)) || Number(v.entradas) < 1 || Number(v.entradas) > 10) {
      errores.entradas = "El número de entradas debe ser de 1 a 10.";
    }
    if (!v.estado) errores.estado = "Elige el estado.";

    /* Edad mínima del evento, en la fecha del evento (como el trigger de la base de datos) */
    if (nuevo && cliente && ev && ev.edad > 0) {
      var inicio = ev.inicio || D.fechaTextoAIso(ev.fechaInicio);
      var edad = D.edadEn(cliente.nacimiento, inicio ? new Date(inicio) : new Date());
      if (edad < ev.edad) {
        errores.evento = cliente.nombre + " tendrá " + edad + " años y el evento es solo para mayores de " + ev.edad + ".";
      }
    }

    /* Cupo: solo cuentan las entradas que se agregan */
    if (ev && !errores.entradas) {
      var agregadas = Number(v.entradas) - (nuevo ? 0 : abierto.entradas);
      var cupos = D.cuposLibres(ev);
      if (agregadas > 0 && agregadas > cupos) {
        errores.entradas = cupos === 0 ? "El evento ya no tiene cupos."
          : (cupos === 1 ? "Solo queda 1 cupo." : "Solo quedan " + cupos + " cupos.");
      }
    }
    if (mostrarErroresFormulario("form-reserva", campos, errores)) return;

    var precio = nuevo ? ev.precio : abierto.precio;   /* se conserva el precio con que se reservó */
    var subtotal = Number(v.entradas) * precio;
    var datos = conPagoWompi
      ? { observaciones: v.observaciones }
      : { entradas: Number(v.entradas), estado: v.estado, observaciones: v.observaciones,
          valor: subtotal + D.tarifaWompi(subtotal) };
    if (nuevo) {
      var ahora = new Date();
      ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
      Object.assign(datos, {
        codigo: siguienteCodigoReserva(reservas), fecha: ahora.toISOString().slice(0, 19),
        cliente: cliente.nombre, documento: cliente.tipoDoc + " " + cliente.documento, correo: cliente.correo,
        eventoId: ev.id, evento: ev.titulo, precio: precio, pago: null
      });
    }

    var botones = evento.target.querySelectorAll("button");
    botones.forEach(function (b) { b.disabled = true; });

    guardarReserva(datos, nuevo ? null : abierto.codigo).then(function () {
      var reserva;
      if (nuevo) {
        reserva = datos;
        reservas.push(reserva);
      } else {
        reserva = Object.assign(abierto, datos);
      }
      abierto = reserva;
      modo = null;
      var mensaje = nuevo ? "Se registró la reserva " + reserva.codigo + "." : "Se guardaron los cambios de la reserva " + reserva.codigo + ".";
      aviso.textContent = mensaje;
      pintarResumen();
      pintarTabla();
      pintarDetalle(reserva, mensaje);
      document.getElementById("detalle-nombre").focus();
    }).catch(function (error) {
      document.getElementById("form-reserva-error").innerHTML = "<strong>Error:</strong> " + escapar(error.message);
      botones.forEach(function (b) { b.disabled = false; });
    });
  });

  function confirmarEliminacion(r) {
    var acciones = document.getElementById("detalle-acciones");
    if (r.pago) {
      /* PAGO.id_reserva es RESTRICT: una reserva con pago no se puede borrar */
      acciones.innerHTML =
        '<div class="detalle-confirmar">' +
          '<p id="texto-confirmar"><strong>No se puede eliminar la reserva ' + escapar(r.codigo) + '.</strong> ' +
          'Tiene un pago registrado en Wompi, que debe quedar en el historial. ' +
          (r.estado === "Cancelada" ? "Ya está cancelada." : "Si no va a usarse, cancélala.") + '</p>' +
          '<div class="detalle-botones">' +
            '<button type="button" class="admin-boton-sec" data-accion="volver">Entendido</button>' +
          '</div>' +
        '</div>';
      acciones.querySelector('[data-accion="volver"]').focus();
      return;
    }
    acciones.innerHTML =
      '<div class="detalle-confirmar">' +
        '<p id="texto-confirmar"><strong>¿Eliminar la reserva ' + escapar(r.codigo) + '?</strong> ' +
        'Desaparece del historial del cliente y de los reportes. Esto no se puede deshacer; ' +
        'si solo no se va a usar, mejor cancélala.</p>' +
        '<div class="detalle-botones">' +
          '<button type="button" class="admin-boton admin-boton-peligro" data-accion="si-eliminar" aria-describedby="texto-confirmar">Sí, eliminar</button>' +
          '<button type="button" class="admin-boton-sec" data-accion="volver">Volver</button>' +
        '</div>' +
      '</div>';
    acciones.querySelector('[data-accion="si-eliminar"]').focus();
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
        (r.valor > r.entradas * r.precio
          ? '<div><dt>Tarifa de Wompi</dt><dd>' + pesos.format(r.valor - r.entradas * r.precio) + '</dd></div>'
          : '') +
        '<div><dt>Valor total</dt><dd><strong>' + textoPrecio(r.valor) + '</strong></dd></div>' +
        (D.leerCancelacion(r.observaciones)
          ? '<div><dt>Causa de la cancelación</dt><dd>' + escapar(D.leerCancelacion(r.observaciones).causa) +
              ' <span class="texto-gris">(la canceló ' + escapar(D.leerCancelacion(r.observaciones).quien) + ')</span>' +
              (D.leerCancelacion(r.observaciones).detalle ? '<br />' + escapar(D.leerCancelacion(r.observaciones).detalle) : '') +
            '</dd></div>'
          : '') +
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

    if (!entradaValida(r)) {
      return '<p class="detalle-nota">Sin QR válido: ' +
        (r.estado === "Cancelada" ? "la reserva está cancelada."
          : (r.pago ? "el pago todavía no está aprobado." : "la reserva todavía no está pagada.")) + '</p>';
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
    if (!boton) return;

    var accion = boton.getAttribute("data-accion");
    var acciones = document.getElementById("detalle-acciones");

    if (accion === "cancelar-formulario") {
      if (modo === "nuevo") {
        dialogo.close();
      } else {
        modo = null;
        pintarDetalle(abierto);
        document.getElementById("detalle-nombre").focus();
      }
      return;
    }
    if (!abierto) return;

    if (accion === "editar") {
      mostrarFormulario(abierto);
    } else if (accion === "eliminar") {
      confirmarEliminacion(abierto);
    } else if (accion === "si-eliminar") {
      var borrada = abierto;
      acciones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
      eliminarReserva(borrada.codigo).then(function () {
        reservas = reservas.filter(function (x) { return x !== borrada; });
        aviso.textContent = "Se eliminó la reserva " + borrada.codigo + ".";
        abierto = null;
        dialogo.close();
        pintarResumen();
        pintarGraficas();
        pintarTabla();
        aviso.setAttribute("tabindex", "-1");
        setTimeout(function () { aviso.focus(); }, 0);
      }).catch(function (error) {
        document.getElementById("detalle-aviso").innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
        acciones.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
      });
    } else if (accion === "confirmar") {
      var devolucion = abierto.pago && abierto.pago.estado === "APPROVED" ? notaDevolucion : "";
      acciones.innerHTML =
        '<div class="detalle-confirmar">' +
          '<p id="texto-confirmar"><strong>¿Cancelar la reserva ' + escapar(abierto.codigo) + '?</strong> ' +
          'Las entradas volverán a quedar disponibles.' + devolucion + '</p>' +
          D.camposCancelacion("reserva", "cancelar") +
          '<p class="detalle-error" id="error-cancelar" role="alert"></p>' +
          '<div class="detalle-botones">' +
            '<button type="button" class="admin-boton admin-boton-peligro" data-accion="si-cancelar" aria-describedby="texto-confirmar">Sí, cancelar la reserva</button>' +
            '<button type="button" class="admin-boton-sec" data-accion="volver">Volver</button>' +
          '</div>' +
        '</div>';
      document.getElementById("cancelar-causa").focus();
    } else if (accion === "volver") {
      acciones.innerHTML = botonesReserva(abierto);
      acciones.querySelector("button").focus();
    } else if (accion === "si-cancelar") {
      var reserva = abierto;
      var datos = D.datosCancelacion("cancelar");
      if (datos.error) {
        document.getElementById("error-cancelar").innerHTML = "<strong>Error:</strong> " + datos.error;
        return;
      }
      var observaciones = D.agregarNota(reserva.observaciones,
        D.notaCancelacion("reserva", quien, datos.causa, datos.detalle));
      acciones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });

      cancelar(reserva.codigo, observaciones).then(function () {
        reserva.estado = "Cancelada";
        reserva.observaciones = observaciones;
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
    modo = null;
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
    if (modo === "nuevo") {
      modo = null;
      /* después de que el navegador devuelve el foco por su cuenta */
      setTimeout(function () { document.getElementById("nueva-reserva").focus(); }, 0);
      return;
    }
    modo = null;
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
  if (filtroEvento) filtroEvento.onchange = pintarTabla;

  if (conCrud) {
    document.getElementById("nueva-reserva").onclick = function () {
      abierto = null;
      mostrarFormulario(null);
      dialogo.showModal();
      document.getElementById("detalle-nombre").focus();
    };

    /* Clientes con la cuenta activa y eventos que aún se pueden reservar */
    obtenerClientes().then(function (lista) {
      var activos = lista.filter(function (c) { return c.cuenta !== "Bloqueada"; })
        .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); });
      clientesCrud = activos.map(function (c) { return [c.documento, c.nombre + " (" + c.tipoDoc + " " + c.documento + ")"]; });
      clientesCrud.datos = activos;
    }).catch(function () {});
    clientesCrud.datos = [];
    eventosCrud = D.eventos
      .filter(function (e) { return e.estado !== "Finalizado" && e.estado !== "Cancelado"; })
      .sort(function (a, b) { return a.titulo.localeCompare(b.titulo, "es"); })
      .map(function (e) { return [e.id, e.titulo + " · " + e.fechaCorta]; });
  }

  obtener().then(function (lista) {
    reservas = config.eventos
      ? lista.filter(function (r) { return config.eventos.indexOf(r.eventoId) !== -1; })
      : lista;

    if (filtroEvento) {
      var vistos = {};
      reservas.forEach(function (r) { vistos[r.eventoId] = r.evento; });
      Object.keys(vistos).sort(function (a, b) { return vistos[a].localeCompare(vistos[b]); }).forEach(function (id) {
        var opcion = document.createElement("option");
        opcion.value = id;
        opcion.textContent = vistos[id];
        filtroEvento.appendChild(opcion);
      });
    }

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

/* ===== PÁGINA: VALIDAR ENTRADAS ===== */

function leerIngresos() {
  try {
    return JSON.parse(localStorage.getItem("entradasUsadas")) || {};
  } catch (e) {
    return {};
  }
}

function registrarIngreso(reserva, revisor, ruta) {
  var ingreso = {
    fecha: new Date().toISOString(),
    eventoId: reserva.eventoId,
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

  return D.llamarApi((ruta || "/admin/entradas/") + encodeURIComponent(reserva.codigo) + "/ingreso", {
    method: "POST",
    headers: cabeceraToken()
  }).then(function (resultado) {
    if (resultado.estado !== 201) {
      throw new Error(resultado.datos.error || "No se pudo registrar el ingreso.");
    }
    return ingreso;
  });
}

/* El agente usa esta misma página (agente-validar.html) limitada a sus
   eventos: config = { usuario, eventos: [ids], obtenerReservas, rutaIngreso } */
function paginaValidar(config) {
  config = config || {};
  var admin = config.usuario || entrarComoAdmin();
  if (!admin) return;

  var permitidos = config.eventos || null;
  function esPermitido(idEvento) {
    return !permitidos || permitidos.indexOf(idEvento) !== -1;
  }

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

  D.eventos.filter(function (e) {
    return e.estado !== "Finalizado" && e.estado !== "Cancelado" && esPermitido(e.id);
  })
    .forEach(function (e) {
      var opcion = document.createElement("option");
      opcion.value = e.id;
      opcion.textContent = e.titulo;
      selectorEvento.appendChild(opcion);
    });

  /* Id del evento de un ingreso (los antiguos solo guardaban el título) */
  function eventoDeIngreso(g) {
    if (g.eventoId !== undefined) return g.eventoId;
    var evento = D.eventos.filter(function (e) { return e.titulo === g.evento; })[0];
    return evento ? evento.id : null;
  }

  function pintarIngresos() {
    var ingresos = leerIngresos();
    var codigos = Object.keys(ingresos).filter(function (c) {
      return esPermitido(eventoDeIngreso(ingresos[c]));
    }).sort(function (a, b) {
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

    /* Un agente no ve los datos de las entradas de otros organizadores */
    if (!esPermitido(reserva.eventoId)) {
      resultado("validar-no", "No es de tus eventos",
        "Esta entrada es para un evento de otro organizador, así que no puedes validarla.");
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

    if (!reserva.pago && reserva.valor > 0 && reserva.estado !== "Confirmada") {
      resultado("validar-no", "Reserva sin pagar",
        "Esta reserva todavía no está pagada. Puede entrar cuando un administrador la confirme.", reserva);
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

    registrarIngreso(reserva, admin.nombre, config.rutaIngreso).then(function () {
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

  (config.obtenerReservas || obtenerReservasAdmin)().then(function (lista) {
    reservas = lista;
    if (!D.usarApi) {
      aviso.textContent = permitidos
        ? "Modo local: se validan las reservas de ejemplo de tus eventos. Los ingresos se guardan en este navegador."
        : "Modo local: se validan las reservas de ejemplo y las hechas en este navegador. Los ingresos se guardan en este navegador.";
    }
    pintarIngresos();
  }).catch(function (error) {
    aviso.innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
  });
}

/* ===== PÁGINA: REPORTES ===== */

var ANIO_REPORTES = 2026;
var NOMBRES_MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
  "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/* Una reserva suma ingresos si no está cancelada y está pagada: en Wompi o, si la
   registró un administrador, confirmada (las gratuitas suman 0) */
function ingresoDeReserva(r) {
  return entradaValida(r) ? r.valor : 0;
}

/* Todos los reportes con la misma forma que GET /api/admin/reportes?anio=2026 */
function reportesLocal() {
  return Promise.all([obtenerClientes(), obtenerAgentes(), obtenerEventosAdmin(), obtenerReservasAdmin()])
    .then(function (datos) {
      var clientes = datos[0];
      var agentes = datos[1];
      var eventos = datos[2];
      var reservas = datos[3];

      function agenteDe(evento) {
        var a = agentes.filter(function (x) {
          return esEventoDe(evento, x);
        })[0];
        return a ? a.nombre : "Sin agente";
      }
      var eventoPorId = {};
      eventos.forEach(function (e) { eventoPorId[e.id] = e; });

      var delAnio = reservas.filter(function (r) { return Number(r.fecha.slice(0, 4)) === ANIO_REPORTES; });
      var mesDe = function (r) { return Number(r.fecha.slice(5, 7)) - 1; };

      /* Ingresos de cada agente (por las reservas de sus eventos) */
      var porAgente = {};
      agentes.forEach(function (a) { porAgente[a.nombre] = 0; });
      reservas.forEach(function (r) {
        var e = eventoPorId[r.eventoId];
        var nombre = e ? agenteDe(e) : "Sin agente";
        porAgente[nombre] = (porAgente[nombre] || 0) + ingresoDeReserva(r);
      });

      /* Ingresos de cada cliente */
      var porCliente = {};
      clientes.forEach(function (c) { porCliente[c.nombre] = 0; });
      reservas.forEach(function (r) {
        porCliente[r.cliente] = (porCliente[r.cliente] || 0) + ingresoDeReserva(r);
      });

      var total = reservas.reduce(function (s, r) { return s + ingresoDeReserva(r); }, 0);
      var cantidadClientes = Object.keys(porCliente).length;

      /* Reservas por evento y por mes del año */
      var porEventoMes = {};
      delAnio.forEach(function (r) {
        var fila = porEventoMes[r.evento] = porEventoMes[r.evento] || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        fila[mesDe(r)]++;
      });

      /* Eventos de cada agente en cada ciudad */
      var agenteCiudad = {};
      eventos.forEach(function (e) {
        var clave = agenteDe(e) + "|" + e.ciudad;
        agenteCiudad[clave] = (agenteCiudad[clave] || 0) + 1;
      });

      /* Eventos por país, departamento y ciudad */
      var ubicaciones = {};
      eventos.forEach(function (e) {
        var u = ubicacionDeCiudad(e.ciudad) || [e.departamento || "Sin departamento", "Colombia"];
        var clave = u[1] + "|" + u[0] + "|" + e.ciudad;
        (ubicaciones[clave] = ubicaciones[clave] || []).push(e.titulo);
      });

      return {
        anio: ANIO_REPORTES,
        totales: {
          clientes: clientes.length,
          agentes: agentes.length,
          administradores: administradoresLocales().length,
          reservas: reservas.length,
          eventos: eventos.length
        },
        promedios: {
          porAgente: agentes.length ? Math.round(total / agentes.length) : 0,
          porCliente: cantidadClientes ? Math.round(total / cantidadClientes) : 0
        },
        ingresosPorAgente: Object.keys(porAgente).map(function (n) { return { nombre: n, ingresos: porAgente[n] }; }),
        ingresosPorCliente: Object.keys(porCliente).map(function (n) { return { nombre: n, ingresos: porCliente[n] }; }),
        ingresosPorMes: NOMBRES_MESES.map(function (m, i) {
          return delAnio.filter(function (r) { return mesDe(r) === i; })
            .reduce(function (s, r) { return s + ingresoDeReserva(r); }, 0);
        }),
        reservasPorEventoMes: Object.keys(porEventoMes).map(function (n) { return { evento: n, meses: porEventoMes[n] }; }),
        eventosPorAgenteCiudad: Object.keys(agenteCiudad).map(function (clave) {
          var p = clave.split("|");
          return { agente: p[0], ciudad: p[1], eventos: agenteCiudad[clave] };
        }),
        eventosPorUbicacion: Object.keys(ubicaciones).map(function (clave) {
          var p = clave.split("|");
          return { pais: p[0], departamento: p[1], ciudad: p[2], eventos: ubicaciones[clave] };
        }),
        reservas: reservas.map(function (r) {
          return {
            codigo: r.codigo, fecha: r.fecha, cliente: r.cliente, documento: r.documento, evento: r.evento,
            entradas: r.entradas, valor: r.valor, estado: r.estado, observaciones: r.observaciones || ""
          };
        }),
        eventosCancelados: eventos.filter(function (e) { return e.estado === "Cancelado"; }).map(function (e) {
          return { evento: e.titulo, ciudad: e.ciudad, agente: agenteDe(e), observaciones: e.observaciones || "" };
        })
      };
    });
}

function obtenerReportes() {
  if (!D.usarApi) return reportesLocal();

  return D.llamarApi("/admin/reportes?anio=" + ANIO_REPORTES, { headers: cabeceraToken() }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudieron cargar los reportes.");
    }
    return resultado.datos;
  });
}

/* Tabla de reporte. columnas: [{ titulo, numero? }]; filas: arreglos de celdas
   ya escapadas. La primera celda de cada fila es su encabezado. */
function tablaReporte(titulo, columnas, filas, pie) {
  if (filas.length === 0) {
    return '<p class="reporte-vacio">No hay datos para este reporte.</p>';
  }
  return '<div class="reporte-marco" role="region" aria-label="' + escapar(titulo) + '" tabindex="0">' +
    '<table class="reporte-tabla">' +
      '<caption class="oculto">' + escapar(titulo) + '</caption>' +
      '<thead><tr>' + columnas.map(function (c) {
        return '<th scope="col"' + (c.numero ? ' class="numero"' : '') + '>' + c.titulo + '</th>';
      }).join("") + '</tr></thead>' +
      '<tbody>' + filas.map(function (fila) {
        return '<tr>' + fila.map(function (celda, i) {
          if (i === 0) return '<th scope="row">' + celda + '</th>';
          return '<td' + (columnas[i].numero ? ' class="numero"' : '') + '>' + celda + '</td>';
        }).join("") + '</tr>';
      }).join("") + '</tbody>' +
      (pie ? '<tfoot><tr>' + pie.map(function (celda, i) {
        return i === 0 ? '<th scope="row">' + celda + '</th>'
          : '<td' + (columnas[i].numero ? ' class="numero"' : '') + '>' + celda + '</td>';
      }).join("") + '</tr></tfoot>' : '') +
    '</table>' +
  '</div>';
}

/* Un cero se ve tenue para que resalten los meses con movimiento */
function cifra(n, formato) {
  return n === 0 ? '<span class="reporte-cero">0</span>' : (formato || numero.format)(n);
}

/* Barras horizontales con su valor: [{ nombre, valor }] */
function barrasReporte(items, formato, descripcion) {
  var maximo = Math.max.apply(null, items.map(function (i) { return i.valor; }).concat([1]));
  return '<figure class="admin-figura">' +
    '<figcaption class="oculto">' + escapar(descripcion) + '</figcaption>' +
    '<ul class="barras">' + items.map(function (item, i) {
      return '<li style="--orden:' + i + '">' +
        '<div class="barra-texto"><span>' + escapar(item.nombre) + '</span><strong>' + formato(item.valor) + '</strong></div>' +
        '<div class="barra-pista" aria-hidden="true"><span class="barra" style="--ancho:' + (item.valor / maximo * 100).toFixed(1) + '%"></span></div>' +
      '</li>';
    }).join("") + '</ul>' +
  '</figure>';
}

function paginaReportes() {
  if (!entrarComoAdmin()) return;

  var aviso = document.getElementById("admin-aviso");
  var datos = null;

  function caja(id) { return document.getElementById(id); }

  function pintarGenerales() {
    var t = datos.totales;
    pintarTarjetas([
      { titulo: "Clientes registrados", valor: t.clientes, formato: numero.format },
      { titulo: "Agentes registrados", valor: t.agentes, formato: numero.format },
      { titulo: "Administradores registrados", valor: t.administradores, formato: numero.format },
      { titulo: "Reservas registradas", valor: t.reservas, formato: numero.format },
      { titulo: "Eventos registrados", valor: t.eventos, formato: numero.format }
    ], "reporte-generales");

    pintarTarjetas([
      { titulo: "Promedio de ingresos por agente", valor: datos.promedios.porAgente, formato: pesosCompacto.format, completo: pesos.format },
      { titulo: "Promedio de ingresos por cliente", valor: datos.promedios.porCliente, formato: pesosCompacto.format, completo: pesos.format }
    ], "reporte-promedios");
  }

  function pintarComerciales() {
    var porAgente = datos.ingresosPorAgente.slice().sort(function (a, b) { return b.ingresos - a.ingresos; });
    caja("reporte-ingresos-agente").innerHTML = tablaReporte(
      "Ingresos de cada agente comparados con el promedio",
      [{ titulo: "Agente" }, { titulo: "Ingresos", numero: true }, { titulo: "Frente al promedio", numero: true }],
      porAgente.map(function (a) {
        var dif = a.ingresos - datos.promedios.porAgente;
        return [escapar(a.nombre), cifra(a.ingresos, pesos.format),
          (dif >= 0 ? "+" : "−") + pesos.format(Math.abs(dif))];
      }));

    var porCliente = datos.ingresosPorCliente.slice().sort(function (a, b) { return b.ingresos - a.ingresos; });
    caja("reporte-ingresos-cliente").innerHTML = tablaReporte(
      "Ingresos de cada cliente comparados con el promedio",
      [{ titulo: "Cliente" }, { titulo: "Ingresos", numero: true }, { titulo: "Frente al promedio", numero: true }],
      porCliente.map(function (c) {
        var dif = c.ingresos - datos.promedios.porCliente;
        return [escapar(c.nombre), cifra(c.ingresos, pesos.format),
          (dif >= 0 ? "+" : "−") + pesos.format(Math.abs(dif))];
      }));

    var totalAnio = datos.ingresosPorMes.reduce(function (s, v) { return s + v; }, 0);
    caja("reporte-ingresos-mes").innerHTML =
      '<p class="reporte-total">Total del ' + datos.anio + ': <strong>' + pesos.format(totalAnio) + '</strong></p>' +
      barrasReporte(NOMBRES_MESES.map(function (m, i) { return { nombre: m, valor: datos.ingresosPorMes[i] }; }),
        pesos.format, "Ingresos de todos los eventos en cada mes del " + datos.anio + ".");
    animarAlVer(caja("reporte-ingresos-mes").querySelector(".admin-figura"));

    var filas = datos.reservasPorEventoMes.slice().sort(function (a, b) { return a.evento.localeCompare(b.evento, "es"); });
    var totalesMes = NOMBRES_MESES.map(function (m, i) {
      return filas.reduce(function (s, f) { return s + f.meses[i]; }, 0);
    });
    caja("reporte-reservas-evento-mes").innerHTML = tablaReporte(
      "Número de reservas por evento y por mes en " + datos.anio,
      [{ titulo: "Evento" }].concat(NOMBRES_MESES.map(function (m) {
        return { titulo: '<span aria-hidden="true">' + m.slice(0, 3) + '</span><span class="oculto">' + m + '</span>', numero: true };
      })).concat([{ titulo: "Total", numero: true }]),
      filas.map(function (f) {
        return [escapar(f.evento)].concat(f.meses.map(function (n) { return cifra(n); }))
          .concat(['<strong>' + f.meses.reduce(function (s, n) { return s + n; }, 0) + '</strong>']);
      }),
      ["Total"].concat(totalesMes.map(function (n) { return cifra(n); }))
        .concat(['<strong>' + totalesMes.reduce(function (s, n) { return s + n; }, 0) + '</strong>']));

    var agentesLista = [];
    var ciudades = [];
    datos.eventosPorAgenteCiudad.forEach(function (x) {
      if (agentesLista.indexOf(x.agente) === -1) agentesLista.push(x.agente);
      if (ciudades.indexOf(x.ciudad) === -1) ciudades.push(x.ciudad);
    });
    agentesLista.sort(function (a, b) { return a.localeCompare(b, "es"); });
    ciudades.sort(function (a, b) { return a.localeCompare(b, "es"); });
    function cuantos(agente, ciudad) {
      var x = datos.eventosPorAgenteCiudad.filter(function (y) { return y.agente === agente && y.ciudad === ciudad; })[0];
      return x ? x.eventos : 0;
    }
    caja("reporte-agente-ciudad").innerHTML = tablaReporte(
      "Número de eventos creados por cada agente y por ciudad",
      [{ titulo: "Agente" }].concat(ciudades.map(function (c) { return { titulo: escapar(c), numero: true }; }))
        .concat([{ titulo: "Total", numero: true }]),
      agentesLista.map(function (a) {
        var fila = ciudades.map(function (c) { return cuantos(a, c); });
        return [escapar(a)].concat(fila.map(function (n) { return cifra(n); }))
          .concat(['<strong>' + fila.reduce(function (s, n) { return s + n; }, 0) + '</strong>']);
      }));
  }

  function pintarCobertura() {
    var filas = datos.eventosPorUbicacion.slice().sort(function (a, b) {
      return a.pais.localeCompare(b.pais, "es") || a.departamento.localeCompare(b.departamento, "es") ||
        a.ciudad.localeCompare(b.ciudad, "es");
    });
    caja("reporte-ubicacion").innerHTML = tablaReporte(
      "Listado de eventos por país, departamento y ciudad de realización",
      [{ titulo: "Ciudad" }, { titulo: "Departamento" }, { titulo: "País" }, { titulo: "Eventos", numero: true }, { titulo: "Nombres" }],
      filas.map(function (f) {
        return [escapar(f.ciudad), escapar(f.departamento), escapar(f.pais), String(f.eventos.length),
          '<ul class="reporte-nombres">' + f.eventos.map(function (n) { return '<li>' + escapar(n) + '</li>'; }).join("") + '</ul>'];
      }));
  }

  function pintarHistorial() {
    var elegido = caja("reporte-cliente").value;
    var lista = datos.reservas.filter(function (r) { return r.cliente === elegido; })
      .sort(function (a, b) { return b.fecha.localeCompare(a.fecha); });
    caja("reporte-historial").innerHTML = tablaReporte(
      "Historial de reservas de " + elegido,
      [{ titulo: "Reserva" }, { titulo: "Fecha" }, { titulo: "Evento" }, { titulo: "Entradas", numero: true },
        { titulo: "Valor", numero: true }, { titulo: "Estado" }],
      lista.map(function (r) {
        return [escapar(r.codigo), fechaHora(r.fecha), escapar(r.evento), String(r.entradas), textoPrecio(r.valor),
          etiqueta(r.estado, CLASE_RESERVA[r.estado] || "", "Estado")];
      }));
  }

  function pintarOperacion() {
    var clientes = [];
    datos.reservas.forEach(function (r) { if (clientes.indexOf(r.cliente) === -1) clientes.push(r.cliente); });
    clientes.sort(function (a, b) { return a.localeCompare(b, "es"); });
    caja("reporte-cliente").innerHTML = clientes.map(function (c) {
      var n = datos.reservas.filter(function (r) { return r.cliente === c; }).length;
      return '<option value="' + escapar(c) + '">' + escapar(c) + ' (' + n + (n === 1 ? ' reserva' : ' reservas') + ')</option>';
    }).join("");
    pintarHistorial();

    /* Reservas canceladas: la causa sale de sus observaciones */
    var canceladas = datos.reservas.filter(function (r) { return r.estado === "Cancelada"; })
      .sort(function (a, b) { return b.fecha.localeCompare(a.fecha); });
    var porCausa = {};
    canceladas.forEach(function (r) {
      var c = D.leerCancelacion(r.observaciones);
      var causa = c ? c.causa : "Sin causa registrada";
      porCausa[causa] = (porCausa[causa] || 0) + 1;
    });
    caja("reporte-causas-reservas").innerHTML = canceladas.length
      ? barrasReporte(Object.keys(porCausa).sort(function (a, b) { return porCausa[b] - porCausa[a]; })
          .map(function (c) { return { nombre: c, valor: porCausa[c] }; }),
          numero.format, "Número de reservas canceladas por cada causa.")
      : "";
    var figura = caja("reporte-causas-reservas").querySelector(".admin-figura");
    if (figura) animarAlVer(figura);

    caja("reporte-reservas-canceladas").innerHTML = tablaReporte(
      "Reservas canceladas y su causa",
      [{ titulo: "Reserva" }, { titulo: "Cliente" }, { titulo: "Evento" }, { titulo: "Causa" }, { titulo: "La canceló" }],
      canceladas.map(function (r) {
        var c = D.leerCancelacion(r.observaciones);
        return [escapar(r.codigo), escapar(r.cliente), escapar(r.evento),
          c ? escapar(c.causa) + (c.detalle ? '<span class="reporte-detalle">' + escapar(c.detalle) + '</span>' : '')
            : '<span class="texto-gris">Sin causa registrada</span>',
          c ? escapar(c.quien) : "—"];
      }));

    caja("reporte-eventos-cancelados").innerHTML = tablaReporte(
      "Eventos cancelados y su causa",
      [{ titulo: "Evento" }, { titulo: "Ciudad" }, { titulo: "Agente" }, { titulo: "Causa" }, { titulo: "Lo canceló" }],
      datos.eventosCancelados.map(function (e) {
        var c = D.leerCancelacion(e.observaciones);
        return [escapar(e.evento), escapar(e.ciudad), escapar(e.agente),
          c ? escapar(c.causa) + (c.detalle ? '<span class="reporte-detalle">' + escapar(c.detalle) + '</span>' : '')
            : '<span class="texto-gris">' + escapar(e.observaciones || "Sin causa registrada") + '</span>',
          c ? escapar(c.quien) : "—"];
      }));
  }

  caja("reporte-cliente").onchange = pintarHistorial;
  caja("form-historial").addEventListener("submit", function (evento) { evento.preventDefault(); });

  obtenerReportes().then(function (respuesta) {
    datos = respuesta;
    if (!D.usarApi) {
      aviso.textContent = "Modo local: la base de datos está desactivada y los reportes se calculan con los datos de ejemplo.";
    }
    pintarGenerales();
    pintarComerciales();
    pintarCobertura();
    pintarOperacion();
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
} else if (paginaAdmin === "admin-ubicaciones") {
  paginaUbicaciones();
} else if (paginaAdmin === "admin-administradores") {
  paginaAdministradores();
} else if (paginaAdmin === "admin-reportes") {
  paginaReportes();
} else if (paginaAdmin === "admin-validar") {
  paginaValidar();
}

/* El panel del agente (js/agente.js) reutiliza las gráficas y los datos de
   ejemplo de este archivo */
export {
  pesos, numero, escapar, animarAlVer, pintarTarjetas, pintarMeses,
  prepararSelectorSerie, pintarEstados, pintarActividad, completarEvento,
  barraOcupacion, obtenerAgentes, obtenerReservasAdmin, ultimosMeses, COLOR_ESTADO,
  paginaValidar, paginaReservasAdmin, cancelarReservaAdmin, crearMapaEvento, reducirImagen, esEventoDe
};
