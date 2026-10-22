/* ==========================================================================
   El Desparche - script.js
   Un solo archivo para todas las páginas.
   Al final hay un "switch" que revisa el atributo data-pagina del <body>
   y ejecuta lo que corresponde a esa página.
   ========================================================================== */


/* ==========================================================================
   1. DATOS DE LOS EVENTOS
   Para cambiar el contenido de la página solo hay que editar esta lista.
   ========================================================================== */

var EVENTOS = [
  {
    id: 1,
    categoria: "musica",
    titulo: "Festival Estéreo Picnic",
    ciudad: "Bogotá",
    teatro: "Parque La Florida",
    direccion: "Calle 80 # 119-90",
    edad: 14,
    fechaCorta: "20-23 mar 2027",
    fechaInicio: "20 de marzo de 2027 - 4:00 p. m.",
    fechaFin: "23 de marzo de 2027 - 2:00 a. m.",
    precio: 480000,
    capacidad: "85.000 personas",
    disponibles: 3842,
    observaciones: "Ingreso para mayores de 14 años. Apertura de puertas a las 2:00 p. m.",
    estado: "En Boletería",
    descripcion: "Cuatro días de música, cultura y experiencias inolvidables. Artistas nacionales e internacionales se encuentran en Bogotá para celebrar una nueva edición del festival más grande del país.",
    imagen: "img/27459.png",
    lat: 4.711,
    lon: -74.0721
  },
  {
    id: 2,
    categoria: "musica",
    titulo: "Morat - Antes de que amanezca",
    ciudad: "Medellín",
    teatro: "Movistar Arena Medellín",
    direccion: "Carrera 70 # 48-30",
    edad: 0,
    fechaCorta: "18 oct 2026",
    fechaInicio: "18 de octubre de 2026 - 8:00 p. m.",
    fechaFin: "19 de octubre de 2026 - 12:00 a. m.",
    precio: 165000,
    capacidad: "14.000 personas",
    disponibles: 1200,
    observaciones: "No se permite ingreso de menores de 12 años sin acompañante.",
    estado: "En Vivo",
    descripcion: "Morat regresa a Colombia con su tour más íntimo y personal. Una noche cargada de emoción, canciones y momentos irrepetibles.",
    imagen: "img/6554e.png",
    lat: 6.2442,
    lon: -75.5812
  },
  {
    id: 3,
    categoria: "musica",
    titulo: "Jazz al Parque",
    ciudad: "Bogotá",
    teatro: "Parque El Country",
    direccion: "Carrera 15 # 127-10",
    edad: 0,
    fechaCorta: "7-8 nov 2026",
    fechaInicio: "7 de noviembre de 2026 - 2:00 p. m.",
    fechaFin: "8 de noviembre de 2026 - 10:00 p. m.",
    precio: 0,
    capacidad: "30.000 personas",
    disponibles: 30000,
    observaciones: "Evento gratuito. Aforo limitado.",
    estado: "Programado",
    descripcion: "El festival de jazz más importante de Bogotá vuelve al parque para deleitar a los amantes de la música con lo mejor del género.",
    imagen: "img/d7016.png",
    lat: 4.6604,
    lon: -74.0579
  },
  {
    id: 4,
    categoria: "circo",
    titulo: "Circo del Sol - KOOZA",
    ciudad: "Cali",
    teatro: "Centro de Eventos Valle Pacífico",
    direccion: "Calle 36 Norte # 6A-65",
    edad: 0,
    fechaCorta: "14 dic 2026",
    fechaInicio: "14 de diciembre de 2026 - 7:00 p. m.",
    fechaFin: "14 de diciembre de 2026 - 10:00 p. m.",
    precio: 210000,
    capacidad: "5.000 personas",
    disponibles: 820,
    observaciones: "Espectáculo apto para todas las edades.",
    estado: "En Boletería",
    descripcion: "El Circo del Sol trae a Colombia KOOZA, un show de acrobacias, humor y magia que conquista todos los sentidos.",
    imagen: "img/12935.png",
    lat: 3.4516,
    lon: -76.532
  },
  {
    id: 5,
    categoria: "danza",
    titulo: "Festival Mundial de Salsa",
    ciudad: "Cali",
    teatro: "Cali Exposhow",
    direccion: "Carrera 100 # 5-169",
    edad: 0,
    fechaCorta: "25-28 sep 2026",
    fechaInicio: "25 de septiembre de 2026 - 4:00 p. m.",
    fechaFin: "28 de septiembre de 2026 - 4:00 a. m.",
    precio: 85000,
    capacidad: "40.000 personas",
    disponibles: 0,
    observaciones: "Evento finalizado. Gracias por su participación.",
    estado: "Finalizado",
    descripcion: "La capital mundial de la salsa celebró su tradicional festival con los mejores bailarines y orquestas del planeta.",
    imagen: "img/337fd.png",
    lat: 3.4172,
    lon: -76.5246
  },
  {
    id: 6,
    categoria: "teatro",
    titulo: "Macondo, la obra",
    ciudad: "Barranquilla",
    teatro: "Teatro Amira de la Rosa",
    direccion: "Carrera 54 # 52-258",
    edad: 0,
    fechaCorta: "2 oct 2026",
    fechaInicio: "2 de octubre de 2026 - 7:30 p. m.",
    fechaFin: "2 de octubre de 2026 - 10:00 p. m.",
    precio: 72000,
    capacidad: "1.200 personas",
    disponibles: 350,
    observaciones: "Se recomienda llegar 30 minutos antes de la función.",
    estado: "Programado",
    descripcion: "Una adaptación teatral de la obra cumbre de García Márquez. Una producción colombiana que recorre los 100 años de Macondo en escena.",
    imagen: "img/5fb48.png",
    lat: 10.9685,
    lon: -74.7813
  },
  {
    id: 7,
    categoria: "comedia",
    titulo: "Lokillo - Eso era antes",
    ciudad: "Bucaramanga",
    teatro: "Coliseo El Campin Norte",
    direccion: "Carrera 30 # 57-60",
    edad: 0,
    fechaCorta: "16 nov 2026",
    fechaInicio: "16 de noviembre de 2026 - 8:00 p. m.",
    fechaFin: "16 de noviembre de 2026 - 11:00 p. m.",
    precio: 68000,
    capacidad: "8.000 personas",
    disponibles: 0,
    observaciones: "Evento cancelado. Se realizarán devoluciones en los próximos 10 días hábiles.\n" +
      "Cancelado por el agente. Causa: Fuerza mayor o clima. Detalle: el artista se enfermó y no puede viajar.",
    estado: "Cancelado",
    descripcion: "La gira Eso era antes de Lokillo fue cancelada por causas de fuerza mayor. Contacta al punto de venta para tu reembolso.",
    imagen: "img/67c1c.png",
    lat: 7.1254,
    lon: -73.1198
  },
  {
    id: 8,
    categoria: "musica",
    titulo: "Ritvales 2026",
    ciudad: "Medellín",
    teatro: "Parque Norte",
    direccion: "Carrera 53 # 76-115",
    edad: 0,
    fechaCorta: "1-2 nov 2026",
    fechaInicio: "1 de noviembre de 2026 - 5:00 p. m.",
    fechaFin: "2 de noviembre de 2026 - 3:00 a. m.",
    precio: 295000,
    capacidad: "20.000 personas",
    disponibles: 7200,
    observaciones: "Menores de 16 años deben ir acompañados de un adulto.",
    estado: "Programado",
    descripcion: "El festival de experiencias alternativas más esperado del año vuelve a Medellín con una propuesta que une música, arte y tecnología.",
    imagen: "img/7d702.png",
    lat: 6.2602,
    lon: -75.5701
  },
  {
    id: 9,
    categoria: "musica",
    titulo: "Zona Estéreo Urbano 2026",
    ciudad: "Medellín",
    teatro: "Estadio Atanasio Girardot",
    direccion: "Carrera 74 # 48-10",
    edad: 18,
    fechaCorta: "8 oct 2026",
    fechaInicio: "8 de octubre de 2026 - 6:00 p. m.",
    fechaFin: "9 de octubre de 2026 - 1:00 a. m.",
    precio: 120000,
    capacidad: "45.000 personas",
    disponibles: 12000,
    observaciones: "Solo para mayores de 18 años. Evento con consumo mínimo en zonas VIP.",
    estado: "En Boletería",
    descripcion: "Una noche de electrónica, rap y pop urbano en el corazón de Medellín. El festival que unifica todos los géneros urbanos en una sola tarima.",
    imagen: "img/33202.png",
    lat: 6.2567,
    lon: -75.59
  },
  {
    id: 10,
    categoria: "musica",
    titulo: "Batallas Épicas de Rap",
    ciudad: "Bogotá",
    teatro: "Teatro Jorge Eliécer Gaitán",
    direccion: "Carrera 7 # 22-47",
    edad: 0,
    fechaCorta: "12 oct 2026",
    fechaInicio: "12 de octubre de 2026 - 5:00 p. m.",
    fechaFin: "12 de octubre de 2026 - 11:00 p. m.",
    precio: 45000,
    capacidad: "3.500 personas",
    disponibles: 900,
    observaciones: "Evento abierto a todos los públicos. Menores deben ir con adulto.",
    estado: "Programado",
    descripcion: "Las mejores batallas de rap freestyle de Colombia se dan cita en Bogotá. Competencia oficial con clasificación nacional.",
    imagen: "img/1c2e7.png",
    lat: 4.6122,
    lon: -74.0739
  },
  {
    id: 11,
    categoria: "danza",
    titulo: "Cali Salsa Festival",
    ciudad: "Cali",
    teatro: "Parque de la Música",
    direccion: "Calle 1 Oeste # 4-50",
    edad: 0,
    fechaCorta: "19 oct 2026",
    fechaInicio: "19 de octubre de 2026 - 3:00 p. m.",
    fechaFin: "20 de octubre de 2026 - 2:00 a. m.",
    precio: 95000,
    capacidad: "25.000 personas",
    disponibles: 5600,
    observaciones: "Espectáculo de salsa caleña con artistas internacionales.",
    estado: "Programado",
    descripcion: "El ritmo de Cali al máximo. Un festival que reúne las mejores orquestas y bailarines de salsa de todo el mundo en la sucursal del cielo.",
    imagen: "img/94bcf.png",
    lat: 3.4333,
    lon: -76.5417
  },
  {
    id: 12,
    categoria: "musica",
    titulo: "Concierto Acústico Campestre",
    ciudad: "Guatavita",
    teatro: "Hacienda La Fragua",
    direccion: "Vía Guatavita - Sesquilé km 3",
    edad: 0,
    fechaCorta: "2 nov 2026",
    fechaInicio: "2 de noviembre de 2026 - 11:00 a. m.",
    fechaFin: "2 de noviembre de 2026 - 7:00 p. m.",
    precio: 55000,
    capacidad: "2.000 personas",
    disponibles: 420,
    observaciones: "Evento al aire libre. Se recomienda ropa cómoda y protector solar.",
    estado: "Programado",
    descripcion: "Una jornada de música acústica y naturaleza en los alrededores del embalse del Tominé. Un descanso del ruido de la ciudad.",
    imagen: "img/1cbb3.png",
    lat: 4.934,
    lon: -73.832
  }
];

/* Departamentos y ciudades para los filtros de la portada */
/* Ids de los eventos que salen en el carrusel de la portada, en este
   orden. Cambiar el orden aqui cambia el orden del carrusel.
   scripts/generar-json.cjs lee esta misma lista. */
var DESTACADOS = [1, 4, 8, 9, 2, 11, 3, 6, 10, 12];

/* Tipos de plan (las categorías del pie de página) y el de cada evento */
var TIPOS_PARCHE = {
  parchesote: { nombre: "Parchesotes", texto: "Festivales y conciertos" },
  parche: { nombre: "Parches", texto: "Teatro, comedia y cultura" },
  parchesito: { nombre: "Parchesitos", texto: "Familiares, gastronómicos y gratis" }
};

/* El tipo de plan guardado en el evento manda; los de ejemplo usan esta lista */
function parcheDe(evento) {
  return evento.parche || PARCHE_DE_EVENTO[evento.id] || "";
}

var PARCHE_DE_EVENTO = {
  1: "parchesote", 2: "parchesote", 3: "parchesito", 4: "parchesito",
  5: "parchesote", 6: "parche", 7: "parche", 8: "parchesote",
  9: "parchesote", 10: "parche", 11: "parchesote", 12: "parchesito"
};

var DEPARTAMENTOS = {
  "Colombia": ["Antioquia", "Atlántico", "Cundinamarca", "Valle del Cauca", "Santander"],
  "México": ["CDMX", "Jalisco"],
  "Argentina": ["Buenos Aires"]
};

var CIUDADES = {
  "Antioquia": ["Medellín"],
  "Atlántico": ["Barranquilla"],
  "Cundinamarca": ["Bogotá", "Guatavita"],
  "Valle del Cauca": ["Cali", "Tuluá"],
  "Santander": ["Bucaramanga"],
  "CDMX": ["Ciudad de México"],
  "Jalisco": ["Guadalajara"],
  "Buenos Aires": ["Buenos Aires"]
};


/* Países, departamentos y ciudades con su id, como PAIS, DEPARTAMENTO y CIUDAD.
   Salen de DEPARTAMENTOS y CIUDADES; si el administrador los cambió en la página
   Ubicaciones, se guardan en este navegador y toda la web usa esa versión. */
function leerUbicaciones() {
  try {
    var guardadas = JSON.parse(localStorage.getItem("ubicaciones"));
    if (guardadas && guardadas.paises) return guardadas;
  } catch (e) {}

  var datos = { paises: [], departamentos: [], ciudades: [] };
  Object.keys(DEPARTAMENTOS).forEach(function (pais) {
    var idPais = datos.paises.length + 1;
    datos.paises.push({ id: idPais, nombre: pais });
    DEPARTAMENTOS[pais].forEach(function (departamento) {
      var idDepartamento = datos.departamentos.length + 1;
      datos.departamentos.push({ id: idDepartamento, nombre: departamento, idPais: idPais });
      (CIUDADES[departamento] || []).forEach(function (ciudad) {
        datos.ciudades.push({ id: datos.ciudades.length + 1, nombre: ciudad, idDepartamento: idDepartamento });
      });
    });
  });
  return datos;
}

function guardarUbicaciones(datos) {
  localStorage.setItem("ubicaciones", JSON.stringify(datos));
  usarUbicaciones(datos);
}

/* Rehace DEPARTAMENTOS y CIUDADES (los que usan los filtros de la portada) */
function usarUbicaciones(datos) {
  Object.keys(DEPARTAMENTOS).forEach(function (k) { delete DEPARTAMENTOS[k]; });
  Object.keys(CIUDADES).forEach(function (k) { delete CIUDADES[k]; });
  datos.paises.forEach(function (pais) {
    DEPARTAMENTOS[pais.nombre] = datos.departamentos
      .filter(function (d) { return d.idPais === pais.id; })
      .map(function (d) {
        CIUDADES[d.nombre] = datos.ciudades
          .filter(function (c) { return c.idDepartamento === d.id; })
          .map(function (c) { return c.nombre; });
        return d.nombre;
      });
  });
}

try {
  if (localStorage.getItem("ubicaciones")) usarUbicaciones(leerUbicaciones());
} catch (e) {}


/* ==========================================================================
   2. FUNCIONES DE APOYO
   ========================================================================== */

/* Tarifa de Wompi por cada pago en Colombia: 2,65 % + $700, más IVA (19 %).
   Se cobra una vez por pago (no por entrada) y los eventos gratis no la pagan.
   valor_total de la reserva = entradas × precio + esta tarifa. */
function tarifaWompi(subtotal) {
  if (subtotal <= 0) return 0;
  /* En enteros (diezmilésimas de peso) para redondear igual que fn_tarifa_wompi de la base de datos */
  return Math.floor(((subtotal * 265 + 7000000) * 119 + 500000) / 1000000);
}

/* Cupos que le quedan a un evento: los disponibles menos lo reservado en este
   navegador (sin contar las canceladas). Con el API, el backend da el número real. */
function cuposLibres(evento) {
  if (USAR_API) return Math.max(evento.disponibles, 0);

  var reservadas = obtenerReservas()
    .filter(function (r) { return r.idEvento === evento.id && r.estado !== "Cancelada"; })
    .reduce(function (suma, r) { return suma + Number(r.tickets || 0); }, 0);

  /* Más las que registró un administrador desde su panel (sin las canceladas) */
  try {
    var canceladas = JSON.parse(localStorage.getItem("estadoReservas")) || {};
    ((JSON.parse(localStorage.getItem("datosReservas")) || {}).nuevos || [])
      .filter(function (r) {
        var cambio = canceladas[r.codigo];
        var estado = cambio ? (typeof cambio === "string" ? cambio : cambio.estado) : r.estado;
        return r.eventoId === evento.id && estado !== "Cancelada";
      })
      .forEach(function (r) { reservadas += Number(r.entradas || 0); });
  } catch (e) {}

  return Math.max(evento.disponibles - reservadas, 0);
}

/* "20 de marzo de 2027 - 4:00 p. m." -> "2027-03-20T16:00" (fechas de los eventos de ejemplo) */
var MESES_TEXTO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function fechaTextoAIso(texto) {
  var limpio = String(texto || "").replace(/[\u00a0\u202f]/g, " ").toLowerCase();
  var m = /(\d{1,2}) de ([a-záéíóú]+) de (\d{4})\s*-\s*(\d{1,2}):(\d{2})\s*([ap])\.?\s*m/.exec(limpio);
  if (!m) return "";
  var mes = MESES_TEXTO.indexOf(m[2]) + 1;
  if (!mes) return "";
  var dos = function (n) { return (n < 10 ? "0" : "") + n; };
  var hora = Number(m[4]) % 12 + (m[6] === "p" ? 12 : 0);
  return m[3] + "-" + dos(mes) + "-" + dos(Number(m[1])) + "T" + dos(hora) + ":" + m[5];
}

/* Años cumplidos en una fecha (la del evento), como age() en la base de datos */
function edadEn(nacimiento, fecha) {
  var n = String(nacimiento).split("-").map(Number);
  var f = fecha instanceof Date ? fecha : new Date(fecha);
  var anios = f.getFullYear() - n[0];
  if (f.getMonth() + 1 < n[1] || (f.getMonth() + 1 === n[1] && f.getDate() < n[2])) anios--;
  return anios;
}

/* Convierte un número a pesos: 165000 -> "$165.000 COP" */
function pesos(numero) {
  return "$" + numero.toLocaleString("es-CO") + " COP";
}

/* Devuelve el texto del precio, o "Entrada libre" si es gratis */
function textoPrecio(evento) {
  if (evento.precio === 0) {
    return "Entrada libre";
  }
  return pesos(evento.precio);
}

/* Dice si un evento se puede reservar */
function sePuedeReservar(evento) {
  return evento.estado !== "Finalizado" && evento.estado !== "Cancelado";
}

/* Convierte el estado en una clase de CSS: "En Boletería" -> "estado-boleteria" */
function claseEstado(estado) {
  if (estado === "Programado") return "estado-programado";
  if (estado === "En Boletería") return "estado-boleteria";
  if (estado === "En Vivo") return "estado-vivo";
  if (estado === "Finalizado") return "estado-finalizado";
  if (estado === "En revisión") return "estado-revision";
  if (estado === "Rechazado") return "estado-rechazado";
  return "estado-cancelado";
}

/* Devuelve el HTML completo de la etiqueta de estado.

   ACCESIBILIDAD (WCAG 1.4.1 - el color no es el único medio): la señal
   que distingue un estado de otro es SU PROPIO TEXTO ("Cancelado",
   "Finalizado"...), que se lee igual aunque no se perciba el color.
   Como refuerzo, cada estado tiene además un fondo distinto y el de
   "Cancelado" lleva el borde punteado, porque es el que más se parece
   al de "Finalizado".

   El texto "Estado del evento:" está oculto a la vista pero sí se lee:
   da contexto al escuchar la tarjeta. */
function etiquetaEstado(estado, grande) {
  var clases = "estado " + claseEstado(estado);
  if (grande) {
    clases = clases + " estado-grande";
  }
  return '<span class="' + clases + '">' +
           '<span class="oculto">Estado del evento: </span>' + esc(estado) +
         '</span>';
}

/* Lee un parámetro de la dirección: evento.html?id=3 -> "3" */
function parametro(nombre) {
  var direccion = new URLSearchParams(window.location.search);
  return direccion.get(nombre);
}

/* Busca un evento por su id: un número en los de ejemplo, un código "EVT-2026-0001" con el API */
function buscarEvento(id) {
  for (var i = 0; i < EVENTOS.length; i++) {
    if (String(EVENTOS[i].id) === String(id)) {
      return EVENTOS[i];
    }
  }
  return null;
}

/* Genera un código de reserva: "A1B2C3D4" */
function generarCodigo() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

/* Fecha de hoy: "28 de septiembre de 2026" */
function fechaDeHoy() {
  return new Date().toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}


/* ==========================================================================
   2.b TEXTO SEGURO
   Todo dato que viene del usuario o de la base de datos (nombres, títulos,
   direcciones...) debe pasar por esc() antes de armarse dentro de un
   innerHTML. Sin esto, un nombre como <img src=x onerror=...> ejecutaría
   código en la página de quien lo vea (XSS).
   Cuando solo se muestra texto, es más simple usar textContent.
   ========================================================================== */

function esc(valor) {
  if (valor === undefined || valor === null) {
    return "";
  }
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


/* ==========================================================================
   3. USUARIO Y RESERVAS (se guardan en el navegador con localStorage)
   ========================================================================== */

function obtenerUsuario() {
  var guardado = localStorage.getItem("usuario");
  if (guardado) {
    return JSON.parse(guardado);
  }
  return null;
}

function guardarUsuario(usuario) {
  localStorage.setItem("usuario", JSON.stringify(usuario));
}

function borrarUsuario() {
  localStorage.removeItem("usuario");
}

function obtenerReservas() {
  var guardadas = localStorage.getItem("reservas");
  if (guardadas) {
    return JSON.parse(guardadas);
  }
  return [];
}

function guardarReservas(reservas) {
  localStorage.setItem("reservas", JSON.stringify(reservas));
}

/* ===== RESERVAS DEL CLIENTE EN EL API =====
   Con USAR_API las reservas viven en la base de datos, no en este navegador:
     GET   /api/reservas/mias                -> { reservas }
     POST  /api/reservas                     cuerpo { idEvento, entradas, observaciones } -> 201 { reserva }
     PATCH /api/reservas/:codigo/cancelar    cuerpo { causa, detalle }
   Se pasan a la misma forma que las de obtenerReservas(), así la confirmación y
   "Mis reservas" las pintan igual. Lo que la reserva no trae del evento (teatro,
   ciudad, fecha) sale del catálogo. */
function cabeceraSesion(usuario) {
  return { "Content-Type": "application/json", Authorization: "Bearer " + usuario.token };
}

/* Convierte la respuesta del API en { estado, datos } o lanza un error que se
   puede mostrar tal cual. Si la sesión venció (401), se cierra en este navegador. */
function revisarRespuesta(resultado, esperado, textoError) {
  if (resultado.estado === esperado) return resultado.datos;
  if (resultado.estado === 401) {
    borrarUsuario();
    throw new Error("Tu sesión venció. Vuelve a iniciar sesión.");
  }
  throw new Error(resultado.datos.error || textoError);
}

function reservaDesdeApi(r) {
  var evento = buscarEvento(r.eventoId) || {};
  return {
    codigo: r.codigo,
    idEvento: r.eventoId,
    titulo: r.evento,
    teatro: evento.teatro || "",
    ciudad: evento.ciudad || "",
    fechaEvento: evento.fechaInicio || "",
    titular: r.cliente,
    tickets: r.entradas,
    total: r.valor,
    fechaReserva: new Date(r.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" }),
    estado: r.estado,
    usada: r.usada,
    observaciones: r.observaciones,
    pago: r.pago
  };
}

function reservasDelApi(usuario) {
  return llamarApi("/reservas/mias", { headers: cabeceraSesion(usuario) }).then(function (resultado) {
    return revisarRespuesta(resultado, 200, "No se pudieron cargar tus reservas.").reservas.map(reservaDesdeApi);
  });
}

/* Una reserva de un evento de pago que todavía no tiene un pago aprobado: no lleva QR.
   Sin Wompi, queda "Reservada" hasta que un administrador confirme el pago. */
function esperaPago(reserva) {
  if (reserva.pago) return reserva.pago.estado === "PENDING";
  return reserva.estado === "Reservada" && reserva.total > 0;
}

/* ===== CAUSAS DE CANCELACIÓN =====
   La causa se guarda como texto en "observaciones" de la reserva o del
   evento (las dos tablas ya tienen ese campo), siempre con este formato
   para que los reportes la puedan leer:
   "Cancelada por el cliente. Causa: No puede asistir. Detalle: ..." */
var CAUSAS_CANCELACION = {
  reserva: ["No puede asistir", "Error en el evento o en la cantidad", "Pago no realizado a tiempo",
            "Cambio de fecha del evento", "Otra causa"],
  evento: ["Baja venta de entradas", "Fuerza mayor o clima", "Problemas técnicos o logísticos",
           "Cambio de fecha del evento", "Otra causa"]
};

/* Lo que ve el cliente al cancelar: frases en primera persona que se guardan
   con la misma causa de los paneles, para que el reporte las agrupe juntas.
   "Pago no realizado a tiempo" no está porque esa la pone el agente o el admin. */
var CAUSAS_CLIENTE = [
  ["Ya no puedo asistir", "No puede asistir"],
  ["Me equivoqué de evento o de cantidad", "Error en el evento o en la cantidad"],
  ["Cambió la fecha del evento", "Cambio de fecha del evento"],
  ["Otro motivo", "Otra causa"]
];

/* La frase del cliente para una causa guardada (o la causa tal cual) */
function causaParaCliente(causa) {
  var par = CAUSAS_CLIENTE.filter(function (c) { return c[1] === causa; })[0];
  return par ? par[0] : causa;
}

function notaCancelacion(tipo, quien, causa, detalle) {
  var nota = (tipo === "evento" ? "Cancelado" : "Cancelada") + " por " + quien + ". Causa: " + causa + ".";
  return detalle ? nota + " Detalle: " + detalle : nota;
}

/* La nota va en una línea nueva, después de lo que ya tuviera */
function agregarNota(observaciones, nota) {
  return observaciones ? observaciones + "\n" + nota : nota;
}

/* { quien, causa, detalle } de unas observaciones, o null si no hay nota */
function leerCancelacion(observaciones) {
  var m = /Cancelad[oa] por ([^.\n]+)\. Causa: ([^.\n]+)\.(?: Detalle: ([^\n]*))?/.exec(observaciones || "");
  return m ? { quien: m[1], causa: m[2], detalle: m[3] || "" } : null;
}

/* Campos de causa y detalle; "id" distingue los de cada formulario.
   tipo: "reserva", "evento" o "cliente" (la reserva vista por el cliente) */
function camposCancelacion(tipo, id) {
  var opciones = tipo === "cliente"
    ? CAUSAS_CLIENTE
    : CAUSAS_CANCELACION[tipo].map(function (c) { return [c, c]; });
  var otra = tipo === "cliente" ? "Otro motivo" : "Otra causa";

  return '<div class="campo campo-cancelacion">' +
      '<label for="' + id + '-causa">Causa de la cancelación</label>' +
      '<select id="' + id + '-causa">' +
        '<option value="">Elige una causa</option>' +
        opciones.map(function (o) { return '<option value="' + o[1] + '">' + o[0] + '</option>'; }).join("") +
      '</select>' +
    '</div>' +
    '<div class="campo campo-cancelacion">' +
      '<label for="' + id + '-detalle">Detalle <span class="opcional">(obligatorio si eliges «' + otra + '»)</span></label>' +
      '<textarea id="' + id + '-detalle" rows="2" maxlength="300"></textarea>' +
    '</div>';
}

/* Valida los campos: { causa, detalle } o { error } con el foco en el campo */
function datosCancelacion(id) {
  var causa = document.getElementById(id + "-causa");
  var detalle = document.getElementById(id + "-detalle");
  causa.removeAttribute("aria-invalid");
  detalle.removeAttribute("aria-invalid");

  if (!causa.value) {
    causa.setAttribute("aria-invalid", "true");
    causa.focus();
    return { error: "Elige la causa de la cancelación." };
  }

  var texto = detalle.value.replace(/\s+/g, " ").trim();
  if (causa.value === "Otra causa" && !texto) {
    detalle.setAttribute("aria-invalid", "true");
    detalle.focus();
    return { error: "Escribe el detalle de la causa." };
  }
  return { causa: causa.value, detalle: texto };
}

/* ==========================================================================
   3.b CONTROL DE TAMAÑO DEL TEXTO
   Los botones A- y A+ cambian la variable CSS --escala-texto, por la que
   se multiplican TODOS los font-size de la hoja de estilos.

   ¿Por qué no se descuadra la página? Porque las medias consultas
   (@media) miden el ANCHO DE LA PANTALLA, no la letra: las columnas de
   la rejilla siguen siendo 1, 2, 3 o 4 igual que antes. Y las cajas que
   tenían una altura fija (botones, buscador, listas) pasaron a
   min-height, así que crecen hacia abajo en vez de recortar el texto.
   ========================================================================== */

/* Los cinco tamaños disponibles. 1 es el normal. */
var ESCALAS = [0.9, 1, 1.15, 1.3, 1.5];

function obtenerEscala() {
  try {
    var guardada = Number(localStorage.getItem("escalaTexto"));
    if (ESCALAS.indexOf(guardada) !== -1) {
      return guardada;
    }
  } catch (e) {
    /* Modo privado o almacenamiento bloqueado: se usa el tamaño normal */
  }
  return 1;
}

function guardarEscala(escala) {
  try {
    localStorage.setItem("escalaTexto", String(escala));
  } catch (e) {
    /* Si no se puede guardar, el cambio igual funciona en esta página */
  }
}

/* Aplica un tamaño y actualiza lo que ve y lo que escucha el usuario */
function aplicarEscala(escala, avisar) {
  document.documentElement.style.setProperty("--escala-texto", String(escala));

  var porcentaje = Math.round(escala * 100) + "%";

  var valor = document.getElementById("texto-valor");
  if (valor) {
    valor.textContent = porcentaje;
  }

  /* ESTADO: al llegar a los extremos el botón se desactiva de verdad
     (disabled), no solo se pinta más claro. Así el lector de pantalla
     lo anuncia como "no disponible" (WCAG 1.4.1). */
  var posicion = ESCALAS.indexOf(escala);
  var menos = document.getElementById("texto-menos");
  var mas = document.getElementById("texto-mas");
  var normal = document.getElementById("texto-normal");

  if (menos) menos.disabled = posicion === 0;
  if (mas) mas.disabled = posicion === ESCALAS.length - 1;
  if (normal) normal.disabled = escala === 1;

  /* Solo se anuncia cuando el cambio lo pidió el usuario, no al cargar */
  if (avisar) {
    var aviso = document.getElementById("aviso-tamano");
    if (aviso) {
      aviso.textContent = "Tamaño del texto: " + porcentaje + ".";
    }
  }
}

/* Mueve el tamaño un paso arriba o abajo dentro de la lista */
function cambiarEscala(paso) {
  var posicion = ESCALAS.indexOf(obtenerEscala()) + paso;

  if (posicion < 0) posicion = 0;
  if (posicion > ESCALAS.length - 1) posicion = ESCALAS.length - 1;

  var escala = ESCALAS[posicion];
  guardarEscala(escala);
  aplicarEscala(escala, true);
}

/* ===== BOTÓN DE ACCESIBILIDAD QUE DESPLIEGA EL PANEL =====
   Es el patrón "disclosure": un botón que abre y cierra un panel.
   Lo importante para el lector de pantalla es aria-expanded, que le dice
   si está abierto o cerrado; y el atributo hidden del panel, que cuando
   está cerrado lo saca del orden de tabulación (si no, se podría llegar
   con el teclado a botones invisibles). */
function prepararPanelAccesibilidad() {
  var boton = document.getElementById("abrir-accesibilidad");
  var panel = document.getElementById("panel-accesibilidad");

  if (!boton || !panel) return;

  function abrirOcerrar(abierto) {
    boton.setAttribute("aria-expanded", abierto ? "true" : "false");
    panel.hidden = !abierto;
  }

  function cerrar(devolverFoco) {
    /* Si el foco estaba dentro del panel hay que devolverlo al botón:
       si no, al ocultarse el panel el foco se perdería y quien navega
       con teclado quedaría sin punto de referencia (WCAG 2.4.3). */
    if (devolverFoco && panel.contains(document.activeElement)) {
      boton.focus();
    }
    abrirOcerrar(false);
  }

  boton.onclick = function () {
    abrirOcerrar(boton.getAttribute("aria-expanded") !== "true");
  };

  /* La tecla Escape cierra el panel, como en cualquier menú */
  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && boton.getAttribute("aria-expanded") === "true") {
      cerrar(true);
    }
  });

  /* Al pulsar fuera del panel también se cierra */
  document.addEventListener("click", function (evento) {
    if (boton.getAttribute("aria-expanded") !== "true") return;
    if (!panel.contains(evento.target) && !boton.contains(evento.target)) {
      cerrar(false);
    }
  });

  /* Si el foco sale del panel con el tabulador, se cierra solo */
  document.addEventListener("focusin", function (evento) {
    if (boton.getAttribute("aria-expanded") !== "true") return;
    if (!panel.contains(evento.target) && !boton.contains(evento.target)) {
      abrirOcerrar(false);
    }
  });

  abrirOcerrar(false);
}

/* Enciende los botones de la cabecera */
function prepararTamanoTexto() {
  var menos = document.getElementById("texto-menos");
  var mas = document.getElementById("texto-mas");
  var normal = document.getElementById("texto-normal");

  /* Al ser <button> de verdad, ya funcionan con Enter y con la barra
     espaciadora: no hace falta añadir nada para el teclado. */
  if (menos) {
    menos.onclick = function () { cambiarEscala(-1); };
  }

  if (mas) {
    mas.onclick = function () { cambiarEscala(1); };
  }

  if (normal) {
    normal.onclick = function () {
      guardarEscala(1);
      aplicarEscala(1, true);
    };
  }

  /* false = no anunciar nada al cargar la página */
  aplicarEscala(obtenerEscala(), false);
}


/* ==========================================================================
   4. CABECERA: mostrar "Entrar" o el nombre del usuario
   ========================================================================== */

function pintarSesion() {
  var caja = document.getElementById("sesion");
  if (!caja) return;

  var usuario = obtenerUsuario();

  if (usuario) {
    /* Con sesión: inicial, nombre, tipo de cuenta y botón de salir */
    var marca = "";
    if (usuario.tipo === "agente") {
      marca = '<span class="marca-agente">Agente</span>';
      agregarEnlacePanel("agente.html", "Mi panel", "agente");
    } else if (usuario.tipo === "admin") {
      marca = '<span class="marca-agente">Administrador</span>';
      agregarEnlacePanel("admin.html", "Administración", "admin");
    }

    /* La inicial del círculo es decorativa: el nombre completo ya va al
       lado, así que se oculta al lector con aria-hidden para que no lea
       la letra suelta antes del nombre. */
    caja.innerHTML =
      '<div class="usuario">' +
        '<span class="usuario-inicial" aria-hidden="true">' +
          esc(usuario.nombre.charAt(0).toUpperCase()) +
        '</span>' +
        '<span class="usuario-nombre">' +
          '<span class="oculto">Sesión iniciada como </span>' + esc(usuario.nombre) +
        '</span>' +
        marca +
        '<button type="button" id="salir">' +
          'Cerrar sesión<span class="oculto"> de ' + esc(usuario.nombre) + '</span>' +
        '</button>' +
      '</div>';

    document.getElementById("salir").onclick = function () {
      borrarUsuario();
      window.location.href = "index.html";
    };
  } else {
    /* Sin sesión: los dos botones abren la ventana emergente */
    caja.innerHTML =
      '<button type="button" class="boton-entrar" id="abrir-entrar">Iniciar sesión</button>' +
      '<button type="button" class="boton-registro" id="abrir-registro">Registrarse</button>';

    document.getElementById("abrir-entrar").onclick = function () {
      abrirAcceso("entrar");
    };

    document.getElementById("abrir-registro").onclick = function () {
      abrirAcceso("registro");
    };
  }
}


/* Con sesión de administrador o de agente, el menú principal gana el
   enlace a su panel. "prefijo" es el comienzo del data-pagina de esas
   páginas, para marcar el enlace como actual dentro del panel. */
function agregarEnlacePanel(href, texto, prefijo) {
  var lista = document.querySelector("#menu-principal ul");
  if (!lista || lista.querySelector('a[href="' + href + '"]')) return;

  var enPanel = (document.body.getAttribute("data-pagina") || "").indexOf(prefijo) === 0;
  var elemento = document.createElement("li");
  elemento.innerHTML = '<a href="' + href + '" data-panel="' + prefijo + '"' +
    (enPanel ? ' class="activo" aria-current="page"' : '') + '>' + texto + '</a>';
  lista.appendChild(elemento);
}


/* ==========================================================================
   5. TARJETAS DE EVENTOS
   ========================================================================== */

/* Devuelve el HTML de una tarjeta.
   ESTRUCTURA SEMÁNTICA: cada tarjeta es un <li> con un <article> dentro,
   porque un evento es contenido independiente que se entiende por sí solo.
   El contenedor es una <ul>, así el lector de pantalla avisa cuántos
   eventos hay ("lista de 8 elementos").

   Antes toda la tarjeta era un <a> gigante y el lector leía de corrido
   imagen + estado + título + ciudad + precio como si fuera el nombre del
   enlace. Ahora el único enlace está en el <h3> y su nombre es solo el
   título; el resto de la tarjeta se sigue pudiendo pulsar gracias al
   ::after estirado que se define en el CSS. */
function tarjetaEvento(evento) {
  return '' +
    '<li class="tarjeta">' +
      '<article class="tarjeta-cuerpo">' +
        '<div class="tarjeta-imagen">' +
          '<img src="' + esc(evento.imagen) + '" ' +
               'alt="Imagen promocional del evento ' + esc(evento.titulo) + ' en ' + esc(evento.ciudad) + '">' +
          etiquetaEstado(evento.estado, false) +
        '</div>' +
        '<div class="tarjeta-texto">' +
          '<h3 class="tarjeta-titulo">' +
            '<a class="tarjeta-enlace" href="evento.html?id=' + encodeURIComponent(evento.id) + '">' +
              esc(evento.titulo) +
            '</a>' +
          '</h3>' +
          '<p class="tarjeta-datos">' +
            '<span class="oculto">Ciudad y fecha: </span>' +
            esc(evento.ciudad) + ' · ' + esc(evento.fechaCorta) +
          '</p>' +
          '<div class="tarjeta-pie">' +
            '<span class="tarjeta-precio">' +
              '<span class="oculto">Precio: </span>' + textoPrecio(evento) +
            '</span>' +
            /* Es puro adorno: el enlace real es el título, y repetirlo
               obligaría al lector a decir "Ver evento" en cada tarjeta. */
            '<span class="tarjeta-ver" aria-hidden="true">Ver evento →</span>' +
          '</div>' +
        '</div>' +
      '</article>' +
    '</li>';
}

/* Escribe una lista de eventos dentro de un contenedor <ul> */
function pintarTarjetas(contenedor, lista) {
  if (lista.length === 0) {
    contenedor.innerHTML =
      '<li class="sin-resultados">' +
        '<p class="texto-gris">' +
          'No se encontraron eventos con esos filtros. Prueba con otra ' +
          'búsqueda o quita alguno de los filtros.' +
        '</p>' +
      '</li>';
    return;
  }

  var html = "";
  for (var i = 0; i < lista.length; i++) {
    html = html + tarjetaEvento(lista[i]);
  }
  contenedor.innerHTML = html;
}

/* Escribe en la región role="status" cuántos eventos se encontraron.
   Como la lista se filtra sin recargar la página, sin este aviso quien
   usa lector de pantalla no se entera de que el resultado cambió
   (WCAG 4.1.3 Mensajes de estado). */
function avisarResultados(cuantos) {
  var aviso = document.getElementById("resultado-busqueda");
  if (!aviso) return;

  if (cuantos === 0) {
    aviso.textContent = "No se encontraron eventos.";
  } else if (cuantos === 1) {
    aviso.textContent = "Se encontró 1 evento.";
  } else {
    aviso.textContent = "Se encontraron " + cuantos + " eventos.";
  }
}


/* ==========================================================================
   5.b CARRUSEL DE EVENTOS PRINCIPALES (portada)
   ========================================================================== */

/* Un cartel del carrusel. Misma idea que tarjetaEvento: el unico enlace
   esta en el <h3> y se estira sobre el cartel con ::after, asi hay una
   sola parada de tabulacion por tarjeta. */
function cartelPrincipal(evento) {
  return '' +
    '<li class="cartel">' +
      '<article class="cartel-cuerpo">' +
        '<div class="cartel-imagen">' +
          '<img src="' + esc(evento.imagen) + '" ' +
               'alt="Cartel del evento ' + esc(evento.titulo) + '">' +
          '<p class="cartel-fecha">' +
            '<span class="oculto">Fechas: </span>' + esc(evento.fechaCorta) +
          '</p>' +
        '</div>' +
        '<div class="cartel-texto">' +
          '<h3 class="cartel-titulo">' +
            '<a class="cartel-enlace" href="evento.html?id=' + encodeURIComponent(evento.id) + '">' +
              esc(evento.titulo) +
            '</a>' +
          '</h3>' +
          '<p class="cartel-lugar">' +
            '<span class="oculto">Lugar: </span>' +
            esc(evento.teatro) + ' · ' + esc(evento.ciudad) +
          '</p>' +
        '</div>' +
      '</article>' +
    '</li>';
}

/* Pinta el carrusel y enciende las flechas */
function prepararCarrusel() {
  var lista = document.getElementById("principales");
  if (!lista) return;

  var html = "";
  for (var i = 0; i < DESTACADOS.length; i++) {
    var evento = buscarEvento(DESTACADOS[i]);
    if (evento) {
      html = html + cartelPrincipal(evento);
    }
  }
  lista.innerHTML = html;

  var tira = lista.parentNode;
  var atras = document.getElementById("principales-atras");
  var adelante = document.getElementById("principales-adelante");
  var pausa = document.getElementById("principales-pausa");
  var pausaTexto = document.getElementById("principales-pausa-texto");
  var marco = tira.parentNode;
  if (!atras || !adelante) return;

  /* Cuanto se mueve cada pulsacion: un cartel mas su separacion */
  function paso() {
    var cartel = lista.querySelector(".cartel");
    if (!cartel) return 240;
    var separacion = parseFloat(getComputedStyle(lista).gap) || 0;
    return cartel.getBoundingClientRect().width + separacion;
  }

  function alFinal() {
    /* Margen de 24px: el scroll-snap deja la tira unos pixeles antes del
       final, y sin esta tolerancia nunca se detectaria el extremo. */
    return tira.scrollLeft >= tira.scrollWidth - tira.clientWidth - 24;
  }

  /* El carrusel da la vuelta: al llegar al final vuelve al principio y al
     reves. Asi las flechas y el avance automatico se comportan igual y no
     hace falta desactivarlas. El bucle solo mueve el scroll; la lista del
     DOM no se duplica, asi que un lector de pantalla no lee dos veces los
     mismos eventos. */
  function irA(posicion, suave) {
    tira.scrollTo({ left: posicion, behavior: suave ? "smooth" : "auto" });
  }

  function quiereAnimacion() {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function avanzar() {
    if (alFinal()) {
      irA(0, quiereAnimacion());
    } else {
      tira.scrollBy({ left: paso(), behavior: quiereAnimacion() ? "smooth" : "auto" });
    }
  }

  function retroceder() {
    if (tira.scrollLeft <= 24) {
      irA(tira.scrollWidth, quiereAnimacion());
    } else {
      tira.scrollBy({ left: -paso(), behavior: quiereAnimacion() ? "smooth" : "auto" });
    }
  }

  /* ===== MOVIMIENTO AUTOMATICO =====
     WCAG 2.2.2 (Pausar, detener, ocultar): todo lo que se mueva solo mas
     de 5 segundos necesita una forma de pararlo. De ahi el boton. */
  var SEGUNDOS = 3000;
  var reloj = null;
  var detenidoPorElUsuario = false;

  var ratonEncima = false;

  /* El turno del reloj no avanza a ciegas: comprueba antes si el raton
     esta encima o si el foco del teclado esta dentro del carrusel. Se
     mira document.activeElement en vez de fiarse solo de los eventos
     focusin/focusout, porque asi no depende de que el navegador los
     lance: si alguien esta leyendo o a punto de pulsar un cartel, el
     carrusel no se le mueve debajo. */
  function turno() {
    if (ratonEncima) return;
    if (marco.contains(document.activeElement)) return;
    avanzar();
  }

  function arrancar() {
    /* No arranca si el usuario lo paro, ni si pidio menos animacion en su
       sistema operativo: ahi el carrusel se queda quieto desde el inicio. */
    if (reloj || detenidoPorElUsuario || !quiereAnimacion()) return;
    reloj = setInterval(turno, SEGUNDOS);
  }

  function parar() {
    if (reloj) {
      clearInterval(reloj);
      reloj = null;
    }
  }

  if (pausa) {
    /* Si el sistema pide menos animacion no hay nada que pausar */
    if (!quiereAnimacion()) {
      pausa.hidden = true;
      detenidoPorElUsuario = true;
    }

    pausa.onclick = function () {
      detenidoPorElUsuario = !detenidoPorElUsuario;
      if (detenidoPorElUsuario) {
        parar();
        pausaTexto.textContent = "Reanudar";
      } else {
        pausaTexto.textContent = "Pausar";
        arrancar();
      }
    };
  }

  marco.addEventListener("mouseenter", function () { ratonEncima = true; });
  marco.addEventListener("mouseleave", function () { ratonEncima = false; });

  /* Si la pestana deja de verse, no tiene sentido seguir moviendolo */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) parar(); else arrancar();
  });

  atras.onclick = function () { retroceder(); };
  adelante.onclick = function () { avanzar(); };

  arrancar();
}


/* ==========================================================================
   6. PÁGINA DE INICIO
   ========================================================================== */

function paginaInicio() {
  prepararCarrusel();

  var contenedor = document.getElementById("destacados");
  var busqueda = document.getElementById("busqueda");
  var pais = document.getElementById("pais");
  var departamento = document.getElementById("departamento");
  var ciudad = document.getElementById("ciudad");
  var botonesParche = document.querySelectorAll(".parche-filtro");
  var parcheElegido = "";

  /* Con el API los países salen de los eventos de la base, no de la lista fija del HTML */
  if (USAR_API) {
    pais.innerHTML = '<option value="">País: todos</option>' +
      Object.keys(DEPARTAMENTOS).sort().map(function (p) { return '<option>' + esc(p) + '</option>'; }).join("");
  }

  /* Filtra por texto, ciudad y tipo de plan, y muestra máximo 8 eventos */
  function actualizar() {
    var texto = busqueda.value.toLowerCase();
    var ciudadElegida = ciudad.value;
    var encontrados = [];

    for (var i = 0; i < EVENTOS.length; i++) {
      var evento = EVENTOS[i];
      var coincideTexto = texto === "" ||
        evento.titulo.toLowerCase().indexOf(texto) !== -1 ||
        evento.ciudad.toLowerCase().indexOf(texto) !== -1;
      var coincideCiudad = ciudadElegida === "" || evento.ciudad === ciudadElegida;
      var coincideParche = parcheElegido === "" || parcheDe(evento) === parcheElegido;

      if (coincideTexto && coincideCiudad && coincideParche) {
        encontrados.push(evento);
      }
    }

    var mostrados = encontrados.slice(0, 8);
    pintarTarjetas(contenedor, mostrados);
    avisarResultados(mostrados.length);
  }

  function llenarLista(lista, opciones, textoPorDefecto) {
    lista.innerHTML = '<option value="">' + esc(textoPorDefecto) + '</option>';
    for (var i = 0; i < opciones.length; i++) {
      lista.innerHTML = lista.innerHTML +
        '<option>' + esc(opciones[i]) + '</option>';
    }
    lista.disabled = opciones.length === 0;

    var ayuda = "ayuda-" + lista.id;
    if (document.getElementById(ayuda)) {
      if (lista.disabled) {
        lista.setAttribute("aria-describedby", ayuda);
      } else {
        lista.removeAttribute("aria-describedby");
      }
    }
  }

  /* Al elegir país se llenan los departamentos */
  pais.onchange = function () {
    var lista = DEPARTAMENTOS[pais.value] || [];
    llenarLista(departamento, lista, "Departamento: todos");
    llenarLista(ciudad, [], "Ciudad: todas");
    actualizar();
  };

  /* Al elegir departamento se llenan las ciudades */
  departamento.onchange = function () {
    var lista = CIUDADES[departamento.value] || [];
    llenarLista(ciudad, lista, "Ciudad: todas");
    actualizar();
  };

  ciudad.onchange = actualizar;
  busqueda.oninput = actualizar;

  function elegirParche(tipo) {
    parcheElegido = TIPOS_PARCHE[tipo] ? tipo : "";
    for (var b = 0; b < botonesParche.length; b++) {
      var activo = botonesParche[b].getAttribute("data-parche") === parcheElegido;
      botonesParche[b].setAttribute("aria-pressed", activo ? "true" : "false");
    }
    actualizar();
  }

  for (var p = 0; p < botonesParche.length; p++) {
    botonesParche[p].onclick = function () {
      elegirParche(this.getAttribute("data-parche"));
    };
  }

  /* Los enlaces del pie llegan con ?parche=parchesote (o parche, parchesito) */
  if (parametro("parche")) {
    elegirParche(parametro("parche"));
  }

  /* El filtrado es instantáneo, así que al pulsar Enter dentro del
     buscador no hay que recargar la página: solo se vuelve a filtrar.
     Sin esto, quien navega con teclado perdería el sitio donde iba. */
  var formulario = busqueda.form;
  if (formulario) {
    formulario.onsubmit = function (evento) {
      evento.preventDefault();
      actualizar();

      /* El filtrado ya es instantaneo, asi que "Buscar" no busca: lleva
         a los resultados, que quedan mas abajo. Se mueve el FOCO y no
         solo el scroll, porque si solo se desplazara la vista, quien
         navega con teclado seguiria con el foco en el formulario. */
      var seccion = document.getElementById("titulo-destacados");
      if (seccion) {
        seccion.setAttribute("tabindex", "-1");
        seccion.focus();
        seccion.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    };
  }

  actualizar();
}


/* ==========================================================================
   7. PÁGINA DE EVENTOS (listado con filtros)
   ========================================================================== */

function paginaEventos() {
  var contenedor = document.getElementById("lista-eventos");
  var contador = document.getElementById("contador");
  var busqueda = document.getElementById("busqueda");
  var ciudad = document.getElementById("ciudad");
  var estado = document.getElementById("estado");

  /* Con el API las ciudades salen de los eventos de la base, no de la lista fija del HTML */
  if (USAR_API) {
    var ciudades = [];
    EVENTOS.forEach(function (e) { if (ciudades.indexOf(e.ciudad) === -1) ciudades.push(e.ciudad); });
    ciudad.innerHTML = '<option>Todas</option>' +
      ciudades.sort().map(function (c) { return '<option>' + esc(c) + '</option>'; }).join("");
  }

  function actualizar() {
    var texto = busqueda.value.toLowerCase();
    var encontrados = [];

    for (var i = 0; i < EVENTOS.length; i++) {
      var evento = EVENTOS[i];
      var coincideTexto = texto === "" ||
        evento.titulo.toLowerCase().indexOf(texto) !== -1 ||
        evento.ciudad.toLowerCase().indexOf(texto) !== -1;
      var coincideCiudad = ciudad.value === "Todas" || evento.ciudad === ciudad.value;
      var coincideEstado = estado.value === "Todos" || evento.estado === estado.value;

      if (coincideTexto && coincideCiudad && coincideEstado) {
        encontrados.push(evento);
      }
    }

    if (encontrados.length === 1) {
      contador.textContent = "1 evento";
    } else {
      contador.textContent = encontrados.length + " eventos";
    }

    pintarTarjetas(contenedor, encontrados);
  }

  busqueda.oninput = actualizar;
  ciudad.onchange = actualizar;
  estado.onchange = actualizar;

  actualizar();
}


/* ==========================================================================
   8. PÁGINA DE DETALLE DEL EVENTO
   ========================================================================== */

function paginaEvento() {
  var evento = buscarEvento(parametro("id"));

  /* Si la dirección no trae un evento válido, vuelve al listado */
  if (!evento) {
    window.location.href = "eventos.html";
    return;
  }

  document.title = evento.titulo + " - El Desparche";
  document.getElementById("miga-titulo").textContent = evento.titulo;
  document.getElementById("evento-titulo").textContent = evento.titulo;
  document.getElementById("evento-descripcion").textContent = evento.descripcion;
  document.getElementById("evento-precio").textContent = textoPrecio(evento);
  document.getElementById("evento-lugar").textContent = evento.teatro + " · " + evento.ciudad;

  var imagen = document.getElementById("evento-imagen");
  imagen.src = evento.imagen;
  /* El alt describe la imagen, no repite solamente el título */
  imagen.alt = "Imagen promocional del evento " + evento.titulo + " en " + evento.ciudad;

  /* La etiqueta se reemplaza entera para que lleve también el icono
     del estado, no solo el color de fondo (WCAG 1.4.1). */
  var etiqueta = document.getElementById("evento-estado");
  etiqueta.outerHTML = etiquetaEstado(evento.estado, true)
    .replace('<span class="estado', '<span id="evento-estado" class="estado');

  /* Ficha con los datos del evento */
  var datos = [
    ["Teatro", evento.teatro],
    ["Dirección", evento.direccion || "Sin dirección"],
    ["Ciudad", evento.ciudad],
    ["Fecha y hora de inicio", evento.fechaInicio],
    ["Fin estimado", evento.fechaFin],
    ["Capacidad total", evento.capacidad],
    ["Cupo disponible", evento.disponibles.toLocaleString("es-CO") + " entradas"],
    ["Precio base", textoPrecio(evento)],
    ["Edad mínima", evento.edad > 0 ? evento.edad + " años" : "Para todo público"],
    ["Observaciones", evento.observaciones]
  ];

  var ficha = "";
  for (var i = 0; i < datos.length; i++) {
    ficha = ficha +
      "<div><dt>" + esc(datos[i][0]) + "</dt><dd>" + esc(datos[i][1]) + "</dd></div>";
  }
  document.getElementById("evento-ficha").innerHTML = ficha;

  /* Botón de reservar */
  var boton = document.getElementById("boton-reservar");
  var cupos = document.getElementById("evento-cupos");

  if (sePuedeReservar(evento)) {
    boton.href = "reservar.html?id=" + evento.id;
    cupos.textContent = evento.disponibles.toLocaleString("es-CO") + " cupos disponibles";
  } else {
    boton.className = "boton boton-ancho boton-desactivado";
    boton.href = "#";
    cupos.textContent = "Este evento no permite reservas";
    cupos.className = "aviso aviso-bloqueado";
  }

  /* Mapa de OpenStreetMap */
  var caja = (evento.lon - 0.02) + "," + (evento.lat - 0.015) + "," +
             (evento.lon + 0.02) + "," + (evento.lat + 0.015);

  document.getElementById("evento-mapa").src =
    "https://www.openstreetmap.org/export/embed.html?bbox=" + caja +
    "&layer=mapnik&marker=" + evento.lat + "," + evento.lon;

  document.getElementById("evento-mapa-enlace").href =
    "https://www.openstreetmap.org/?mlat=" + evento.lat +
    "&mlon=" + evento.lon + "&zoom=15";
}


/* ==========================================================================
   9. PÁGINA DEL FORMULARIO DE RESERVA
   ========================================================================== */

function paginaReservar() {
  var evento = buscarEvento(parametro("id"));
  var usuario = obtenerUsuario();

  if (!evento) {
    window.location.href = "eventos.html";
    return;
  }

  /* Para reservar hay que haber entrado: se abre la ventana emergente */
  if (!usuario) {
    abrirAcceso("entrar");
    return;
  }

  var tickets = 1;
  var cupos = cuposLibres(evento);
  var maximo = Math.min(10, cupos);   /* hasta 10 por reserva, sin pasar los cupos que quedan */

  function subtotal() { return evento.precio * tickets; }
  function totalAPagar() { return subtotal() + tarifaWompi(subtotal()); }

  /* Datos del evento */
  document.getElementById("miga-evento").textContent = evento.titulo;
  document.getElementById("miga-evento").href = "evento.html?id=" + evento.id;
  document.getElementById("mini-imagen").src = evento.imagen;
  document.getElementById("mini-imagen").alt = evento.titulo;
  document.getElementById("mini-titulo").textContent = evento.titulo;
  document.getElementById("mini-lugar").textContent = evento.ciudad + " · " + evento.teatro;
  document.getElementById("mini-fecha").textContent = evento.fechaInicio;
  document.getElementById("resumen-imagen").src = evento.imagen;
  document.getElementById("resumen-imagen").alt = evento.titulo;
  document.getElementById("resumen-titulo").textContent = evento.titulo;
  document.getElementById("resumen-fecha").textContent = evento.fechaInicio;

  document.getElementById("aviso-usuario").innerHTML =
    "Hola, <strong>" + esc(usuario.nombre) + "</strong>. Tu reserva se registrará a tu nombre. " +
    "Recibirás un correo con los detalles a <strong>" + esc(usuario.correo) + "</strong>.";

  /* Actualiza el resumen de precios */
  function actualizarResumen() {
    document.getElementById("tickets").textContent = tickets;

    if (evento.precio === 0) {
      document.getElementById("resumen-precio").textContent = "Gratis";
      document.getElementById("resumen-cargo").textContent = "Gratis";
      document.getElementById("resumen-total").textContent = "Gratis";
    } else {
      document.getElementById("resumen-precio").textContent = pesos(evento.precio);
      document.getElementById("resumen-cargo").textContent = pesos(tarifaWompi(subtotal()));
      document.getElementById("resumen-total").textContent = pesos(totalAPagar());
    }

    if (tickets === 1) {
      document.getElementById("resumen-cantidad").textContent = "1 ticket";
    } else {
      document.getElementById("resumen-cantidad").textContent = tickets + " tickets";
    }
  }

  /* Botones - y + */
  document.getElementById("menos").onclick = function () {
    if (tickets > 1) {
      tickets = tickets - 1;
      actualizarResumen();
    }
  };

  document.getElementById("mas").onclick = function () {
    if (tickets < maximo) {
      tickets = tickets + 1;
      actualizarResumen();
    }
  };

  actualizarResumen();

  /* Reglas de negocio: solo reservan los clientes, con la edad mínima del
     evento y mientras queden cupos (las mismas que revisa la base de datos) */
  var botonConfirmar = document.getElementById("confirmar");
  var inicioEvento = evento.inicio || fechaTextoAIso(evento.fechaInicio);
  var bloqueo = "";

  if (usuario.tipo !== "usuario") {
    bloqueo = "Solo las cuentas de cliente pueden reservar entradas.";
  } else if (cupos === 0) {
    bloqueo = "Este evento ya no tiene cupos disponibles.";
  } else if (evento.edad > 0 && !usuario.nacimiento) {
    bloqueo = "Este evento es solo para mayores de " + evento.edad + " años y en tu cuenta no está tu fecha de nacimiento. " +
      "Escríbenos a soporte@eldesparche.online para agregarla.";
  } else if (evento.edad > 0 && edadEn(usuario.nacimiento, inicioEvento ? new Date(inicioEvento) : new Date()) < evento.edad) {
    bloqueo = "Este evento es solo para mayores de " + evento.edad + " años, así que no puedes reservar entradas.";
  }

  if (bloqueo) {
    var avisoBloqueo = document.createElement("p");
    avisoBloqueo.className = "aviso-reserva";
    avisoBloqueo.id = "aviso-reserva";
    avisoBloqueo.textContent = bloqueo;
    botonConfirmar.parentNode.insertBefore(avisoBloqueo, botonConfirmar);
    botonConfirmar.disabled = true;
    botonConfirmar.setAttribute("aria-describedby", "aviso-reserva");
    document.getElementById("mas").disabled = true;
    document.getElementById("menos").disabled = true;
    return;
  }

  var errorPago = document.createElement("p");
  errorPago.className = "mensaje error";
  errorPago.id = "error-pago";
  errorPago.setAttribute("role", "alert");
  botonConfirmar.parentNode.insertBefore(errorPago, botonConfirmar);

  var textoBoton = botonConfirmar.textContent.trim();

  /* Guarda la reserva y pasa a la confirmación */
  function guardarYConfirmar(codigo, total, pago) {
    var reserva = {
      codigo: codigo,
      idEvento: evento.id,
      titulo: evento.titulo,
      teatro: evento.teatro,
      ciudad: evento.ciudad,
      fechaEvento: evento.fechaInicio,
      titular: usuario.nombre,
      correo: usuario.correo,
      documento: (usuario.tipoDocumento || "CC") + " " + usuario.id,
      tickets: tickets,
      observaciones: document.getElementById("observaciones").value,
      total: total,
      fechaReserva: fechaDeHoy(),
      fechaIso: new Date().toISOString(),
      estado: !pago || pago.estado === "APPROVED" ? "Confirmada" : "Reservada",
      pago: pago
    };

    var reservas = obtenerReservas();
    reservas.unshift(reserva);
    guardarReservas(reservas);

    localStorage.setItem("ultimaReserva", reserva.codigo);
    window.location.href = "confirmacion.html";
  }

  /* Con el API la reserva se crea en la base. El pago con Wompi todavía no está
     conectado: una reserva de un evento de pago queda "Reservada" hasta que un
     administrador confirme el pago, y una de un evento gratis queda confirmada. */
  function reservarEnApi() {
    botonConfirmar.disabled = true;
    botonConfirmar.textContent = "Registrando la reserva…";

    llamarApi("/reservas", {
      method: "POST",
      headers: cabeceraSesion(usuario),
      body: JSON.stringify({
        idEvento: evento.id,
        entradas: tickets,
        observaciones: document.getElementById("observaciones").value
      })
    }).then(function (resultado) {
      var datos = revisarRespuesta(resultado, 201, "No se pudo registrar la reserva.");
      localStorage.setItem("ultimaReserva", datos.reserva.codigo);
      window.location.href = "confirmacion.html";
    }).catch(function (error) {
      botonConfirmar.disabled = false;
      botonConfirmar.textContent = textoBoton;
      errorPago.innerHTML = "<strong>Error:</strong> " + esc(error.message);
      botonConfirmar.focus();
    });
  }

  botonConfirmar.onclick = function () {
    errorPago.textContent = "";

    if (USAR_API) {
      reservarEnApi();
      return;
    }

    /* Evento gratuito: no pasa por Wompi */
    if (evento.precio === 0) {
      guardarYConfirmar(generarCodigoReserva(), 0, null);
      return;
    }

    var total = totalAPagar();   /* entradas × precio + tarifa de Wompi */
    var datos = {
      evento: evento,
      tickets: tickets,
      total: total,
      usuario: usuario,
      observaciones: document.getElementById("observaciones").value,
      alAbrir: function () {
        botonConfirmar.disabled = false;
        botonConfirmar.textContent = textoBoton;
      }
    };

    botonConfirmar.disabled = true;
    botonConfirmar.textContent = "Abriendo el pago…";

    var pago = pasarelaSimulada(datos);   /* modo local (con el API se sale antes, en reservarEnApi) */

    pago.then(function (resultado) {
      botonConfirmar.disabled = false;
      botonConfirmar.textContent = textoBoton;

      /* Cerró la pasarela sin pagar */
      if (!resultado) {
        botonConfirmar.focus();
        return;
      }

      if (resultado.estado === "APPROVED" || resultado.estado === "PENDING") {
        guardarYConfirmar(resultado.referencia, total, {
          id: resultado.id,
          metodo: resultado.metodo,
          estado: resultado.estado,
          montoCentavos: total * 100,
          moneda: "COP"
        });
        return;
      }

      errorPago.innerHTML = "<strong>Error:</strong> " +
        (resultado.estado === "DECLINED"
          ? "Tu banco o la entidad rechazó el pago."
          : "Hubo un problema al procesar el pago.") +
        " No se hizo ningún cobro. Puedes intentarlo de nuevo, si quieres con otro medio de pago.";
      botonConfirmar.focus();
    }).catch(function (error) {
      botonConfirmar.disabled = false;
      botonConfirmar.textContent = textoBoton;
      errorPago.innerHTML = "<strong>Error:</strong> " + esc(error.message);
      botonConfirmar.focus();
    });
  };
}


/* ==========================================================================
   9.b PAGO CON WOMPI
   - HOY, con USAR_API = true, el backend de Wompi todavía no existe: la reserva se
     crea con POST /api/reservas (reservarEnApi) y el pago lo confirma un
     administrador. Cuando exista, reservarEnApi() se cambia por pagarConWompi(),
     que ya está listo:
   - Con USAR_API = true se abre el widget real de Wompi. El backend crea la
     reserva pendiente, calcula la firma de integridad (SHA-256 de
     referencia + monto en centavos + moneda + secreto de integridad, que
     nunca sale del servidor) y confirma el pago con el webhook
     transaction.updated. Lo que dice el navegador es solo informativo.
     POST /api/pagos/wompi/iniciar  cuerpo { idEvento, entradas, observaciones }
       -> 201 { referencia, montoCentavos, moneda, llavePublica, firmaIntegridad }
     GET  /api/pagos/wompi/transacciones/:id  -> { referencia, estado, metodo }
   - Con USAR_API = false se abre una pasarela simulada para poder probar.
   ========================================================================== */

var METODOS_PAGO = {
  "CARD": "Tarjeta",
  "NEQUI": "Nequi",
  "PSE": "PSE",
  "BANCOLOMBIA_TRANSFER": "Botón Bancolombia"
};

var ESTADOS_PAGO = {
  "APPROVED": "Aprobado",
  "PENDING": "Pendiente",
  "DECLINED": "Rechazado",
  "VOIDED": "Anulado",
  "ERROR": "Error"
};

/* Código de reserva, que también es la referencia del pago en Wompi */
function generarCodigoReserva() {
  return "DES-" + generarCodigo();
}

function cargarWidgetWompi() {
  if (window.WidgetCheckout) {
    return Promise.resolve();
  }
  return new Promise(function (listo, fallo) {
    var script = document.createElement("script");
    script.src = "https://checkout.wompi.co/widget.js";
    script.onload = listo;
    script.onerror = function () {
      fallo(new Error("No se pudo cargar la pasarela de Wompi. Revisa tu conexión e inténtalo de nuevo."));
    };
    document.head.appendChild(script);
  });
}

function pagarConWompi(datos) {
  return llamarApi("/pagos/wompi/iniciar", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + datos.usuario.token },
    body: JSON.stringify({ idEvento: datos.evento.id, entradas: datos.tickets, observaciones: datos.observaciones })
  }).then(function (resultado) {
    if (resultado.estado !== 201) {
      throw new Error(resultado.datos.error || "No se pudo iniciar el pago.");
    }
    var p = resultado.datos;

    return cargarWidgetWompi().then(function () {
      return new Promise(function (listo) {
        var checkout = new window.WidgetCheckout({
          currency: p.moneda,
          amountInCents: p.montoCentavos,
          reference: p.referencia,
          publicKey: p.llavePublica,
          signature: { integrity: p.firmaIntegridad },
          redirectUrl: window.location.origin + "/confirmacion.html",
          customerData: {
            email: datos.usuario.correo,
            fullName: datos.usuario.nombre,
            legalId: datos.usuario.id,
            legalIdType: datos.usuario.tipoDocumento || "CC"
          }
        });

        checkout.open(function (respuesta) {
          var t = respuesta.transaction;
          listo({ referencia: p.referencia, id: t.id, estado: t.status || "PENDING", metodo: t.paymentMethodType || "" });
        });

        if (datos.alAbrir) datos.alAbrir();
      });
    });
  });
}

/* Pasarela de prueba que imita a Wompi. No pide datos de tarjeta ni cobra nada. */
function pasarelaSimulada(datos) {
  var referencia = generarCodigoReserva();
  var dialogo = document.getElementById("pasarela-simulada");

  if (!dialogo) {
    dialogo = document.createElement("dialog");
    dialogo.className = "modal pasarela";
    dialogo.id = "pasarela-simulada";
    dialogo.setAttribute("aria-labelledby", "pasarela-titulo");
    document.body.appendChild(dialogo);
  }

  dialogo.innerHTML =
    '<div class="modal-caja">' +
      '<button type="button" class="modal-cerrar" data-pasarela="cerrar" aria-label="Cerrar el pago sin pagar">' +
        '<span aria-hidden="true">&times;</span>' +
      '</button>' +
      '<div class="pasarela-cabecera">' +
        '<p class="pasarela-marca">Pago seguro con Wompi</p>' +
        '<h2 id="pasarela-titulo" tabindex="-1">Paga tu reserva</h2>' +
        '<p class="pasarela-total">' + pesos(datos.total) + '</p>' +
      '</div>' +
      '<p class="pasarela-aviso"><strong>Pago de prueba.</strong> La base de datos está desactivada, así que este pago es simulado: ' +
        'no se cobra dinero ni se piden datos de tarjeta.</p>' +
      '<dl class="pasarela-datos">' +
        '<div><dt>Evento</dt><dd>' + datos.evento.titulo + '</dd></div>' +
        '<div><dt>Entradas</dt><dd>' + datos.tickets + '</dd></div>' +
        '<div><dt>Referencia</dt><dd>' + referencia + '</dd></div>' +
      '</dl>' +
      '<form id="pasarela-form">' +
        '<fieldset class="pasarela-grupo">' +
          '<legend>Medio de pago</legend>' +
          Object.keys(METODOS_PAGO).map(function (clave, i) {
            return '<label><input type="radio" name="pasarela-metodo" value="' + clave + '"' + (i === 0 ? " checked" : "") + ' /> ' +
              METODOS_PAGO[clave] + '</label>';
          }).join("") +
        '</fieldset>' +
        '<fieldset class="pasarela-grupo">' +
          '<legend>Resultado de la prueba</legend>' +
          '<label><input type="radio" name="pasarela-resultado" value="APPROVED" checked /> Pago aprobado</label>' +
          '<label><input type="radio" name="pasarela-resultado" value="DECLINED" /> Pago rechazado</label>' +
          '<label><input type="radio" name="pasarela-resultado" value="PENDING" /> Pago pendiente</label>' +
        '</fieldset>' +
        '<p class="pasarela-procesando" id="pasarela-procesando" role="status"></p>' +
        '<button type="submit" class="boton boton-morado boton-ancho">Pagar ' + pesos(datos.total) + '</button>' +
        '<button type="button" class="pasarela-cancelar" data-pasarela="cerrar">Cancelar y volver</button>' +
      '</form>' +
    '</div>';

  return new Promise(function (listo) {
    var terminado = false;

    function terminar(resultado) {
      if (terminado) return;
      terminado = true;
      if (dialogo.open) dialogo.close();
      listo(resultado);
    }

    dialogo.querySelectorAll('[data-pasarela="cerrar"]').forEach(function (boton) {
      boton.onclick = function () { terminar(null); };
    });
    dialogo.onclose = function () {
      if (!dialogo.open) terminar(null);
    };

    document.getElementById("pasarela-form").onsubmit = function (evento) {
      evento.preventDefault();
      var metodo = dialogo.querySelector('input[name="pasarela-metodo"]:checked').value;
      var estado = dialogo.querySelector('input[name="pasarela-resultado"]:checked').value;

      this.querySelectorAll("button, input").forEach(function (control) { control.disabled = true; });
      document.getElementById("pasarela-procesando").textContent = "Procesando el pago…";

      setTimeout(function () {
        var marca = Math.floor(Date.now() / 1000);
        terminar({
          referencia: referencia,
          id: (10000 + Math.floor(Math.random() * 89999)) + "-" + marca + "-" + (10000 + Math.floor(Math.random() * 89999)),
          estado: estado,
          metodo: metodo
        });
      }, 1200);
    };

    dialogo.showModal();
    document.getElementById("pasarela-titulo").focus();
  });
}


/* ==========================================================================
   10. CÓDIGO QR DE LA ENTRADA
   El QR guarda "ELDESPARCHE|<código de reserva>|<id del evento>|<token>".
   En modo local el token es una suma de control (detecta códigos escritos
   a mano o inventados). Con el backend, el token lo firma el servidor con
   HMAC y la validación en la puerta se hace siempre contra el servidor.
   ========================================================================== */

/* FNV-1a de 32 bits en hexadecimal */
function tokenEntrada(codigo, idEvento) {
  var texto = "eldesparche|" + codigo + "|" + idEvento;
  var hash = 0x811c9dc5;
  for (var i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return ("0000000" + hash.toString(16)).slice(-8).toUpperCase();
}

function contenidoQr(codigo, idEvento, token) {
  return "ELDESPARCHE|" + codigo + "|" + idEvento + "|" + (token || tokenEntrada(codigo, idEvento));
}

/* Lee el texto de un QR. Devuelve null si no es de El Desparche. */
function leerContenidoQr(texto) {
  var partes = String(texto).trim().split("|");
  if (partes.length !== 4 || partes[0] !== "ELDESPARCHE") return null;
  /* El id es un número en los eventos de ejemplo y un código ("EVT-2026-0001") en los de la base */
  var idEvento = /^\d+$/.test(partes[2]) ? Number(partes[2]) : partes[2];
  return { codigo: partes[1], idEvento: idEvento, token: partes[3] };
}

/* Dibuja el QR real (SVG) dentro de un elemento */
function pintarQrReal(elemento, codigo, idEvento, token) {
  elemento.classList.add("qr-real");
  elemento.innerHTML = "";

  return import("@zxing/browser").then(function (zxing) {
    var svg = new zxing.BrowserQRCodeSvgWriter().write(contenidoQr(codigo, idEvento, token), 240, 240);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Código QR de la reserva " + codigo);
    svg.setAttribute("viewBox", "0 0 240 240");
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    elemento.appendChild(svg);
  }).catch(function () {
    elemento.innerHTML = '<p class="qr-error">No se pudo dibujar el QR. Usa el código ' + codigo + ' en la entrada.</p>';
  });
}


/* ==========================================================================
   11. PÁGINA DE CONFIRMACIÓN
   ========================================================================== */

function paginaConfirmacion() {
  /* Wompi vuelve a esta página con ?id=<transacción> (por ejemplo, después de PSE).
     El estado real lo da el backend, que lo recibió por el webhook. */
  var idTransaccion = parametro("id");
  if (idTransaccion && USAR_API) {
    llamarApi("/pagos/wompi/transacciones/" + encodeURIComponent(idTransaccion)).then(function (resultado) {
      if (resultado.estado !== 200) return;
      var lista = obtenerReservas();
      lista.forEach(function (r) {
        if (r.codigo === resultado.datos.referencia && r.pago) {
          r.pago.estado = resultado.datos.estado;
          r.estado = resultado.datos.estado === "APPROVED" ? "Confirmada"
            : (resultado.datos.estado === "PENDING" ? "Reservada" : "Cancelada");
        }
      });
      guardarReservas(lista);
      localStorage.setItem("ultimaReserva", resultado.datos.referencia);
      window.location.replace("confirmacion.html");
    });
    return;
  }

  var codigo = localStorage.getItem("ultimaReserva");

  /* Con el API la reserva se lee de la base (solo las del cliente que entró) */
  if (USAR_API) {
    var usuario = obtenerUsuario();
    if (!usuario || !codigo) {
      window.location.href = "index.html";
      return;
    }
    reservasDelApi(usuario).then(function (lista) {
      var deLaBase = lista.filter(function (r) { return r.codigo === codigo; })[0];
      if (!deLaBase) {
        window.location.href = "mis-reservas.html";
        return;
      }
      pintarConfirmacion(deLaBase);
    }).catch(function (error) {
      document.getElementById("detalles").innerHTML =
        '<p class="mensaje error" role="alert"><strong>Error:</strong> ' + esc(error.message) + '</p>';
    });
    return;
  }

  var reservas = obtenerReservas();
  var reserva = null;

  for (var i = 0; i < reservas.length; i++) {
    if (reservas[i].codigo === codigo) {
      reserva = reservas[i];
    }
  }

  /* Si no hay ninguna reserva reciente, vuelve al inicio */
  if (!reserva) {
    window.location.href = "index.html";
    return;
  }

  pintarConfirmacion(reserva);
}

function pintarConfirmacion(reserva) {
  var datos = [
    ["Código de reserva", reserva.codigo],
    ["Evento", reserva.titulo],
    ["Fecha del evento", reserva.fechaEvento],
    ["Teatro", (reserva.teatro || reserva.lugar) + " - " + reserva.ciudad],
    ["Titular", reserva.titular],
    ["Tickets", reserva.tickets],
    ["Total", reserva.total === 0 ? "Gratis" : pesos(reserva.total)],
    ["Fecha de reserva", reserva.fechaReserva]
  ];

  var pago = reserva.pago;
  if (pago) {
    datos.push(["Pago", ESTADOS_PAGO[pago.estado] + (METODOS_PAGO[pago.metodo] ? " con " + METODOS_PAGO[pago.metodo] : "")]);
    datos.push(["Transacción Wompi", pago.id]);
  }

  var html = "";
  for (var j = 0; j < datos.length; j++) {
    html = html + "<div><dt>" + esc(datos[j][0]) + "</dt><dd>" + esc(datos[j][1]) + "</dd></div>";
  }

  document.getElementById("detalles").innerHTML = html;
  document.getElementById("codigo").textContent = reserva.codigo;

  /* El QR solo sirve cuando el pago está aprobado */
  if (reserva.estado === "Confirmada") {
    pintarQrReal(document.getElementById("qr"), reserva.codigo, reserva.idEvento, reserva.tokenQr);
  } else {
    /* Sin pago en Wompi: la reserva se registró y un administrador confirma el pago */
    var sinWompi = !reserva.pago;
    document.title = (sinWompi ? "Reserva registrada" : "Pago en proceso") + " - El Desparche";
    document.querySelector(".titulo-exito").textContent =
      sinWompi ? "Tu reserva quedó registrada" : "Tu pago está en proceso";
    document.querySelector(".subtitulo-exito").textContent = sinWompi
      ? "Apartamos tus entradas. La reserva se confirma cuando registremos tu pago."
      : "Guardamos tu reserva mientras Wompi confirma el pago. Te avisaremos por correo cuando esté listo.";

    var qr = document.getElementById("qr");
    var aviso = document.createElement("p");
    aviso.className = "qr-pendiente";
    aviso.innerHTML = sinWompi
      ? "<strong>Pago por confirmar.</strong> Tu QR aparecerá aquí y en \"Mis reservas\" " +
        "en cuanto se confirme el pago."
      : "<strong>Pago pendiente.</strong> Tu QR aparecerá aquí y en \"Mis reservas\" " +
        "en cuanto Wompi apruebe el pago (a veces tarda unos minutos con PSE o Nequi).";
    qr.parentNode.replaceChild(aviso, qr);
    document.querySelector(".caja-qr .texto-pequeno-claro").textContent = "Código de tu reserva";
  }
}


/* ==========================================================================
   12. PÁGINA MIS RESERVAS
   ========================================================================== */

function paginaMisReservas() {
  var usuario = obtenerUsuario();
  var contenedor = document.getElementById("contenido-reservas");

  /* Para ver las reservas hay que haber entrado: se abre la ventana emergente */
  if (!usuario) {
    abrirAcceso("entrar");
    return;
  }

  document.getElementById("saludo").innerHTML =
    "Hola, <strong>" + esc(usuario.nombre) + "</strong>. Aquí puedes ver y gestionar tus reservas.";

  /* Con el API la lista sale de la base; si no, de este navegador */
  function pintar() {
    if (!USAR_API) {
      pintarLista(obtenerReservas());
      return Promise.resolve();
    }
    contenedor.setAttribute("aria-busy", "true");
    return reservasDelApi(usuario).then(pintarLista).catch(function (error) {
      contenedor.innerHTML = '<p class="mensaje error" role="alert"><strong>Error:</strong> ' + esc(error.message) + '</p>';
    }).then(function () {
      contenedor.removeAttribute("aria-busy");
    });
  }

  function pintarLista(reservas) {
    if (reservas.length === 0) {
      contenedor.innerHTML =
        '<div class="sin-reservas">' +
          '<h2>No tienes reservas aún</h2>' +
          '<p class="texto-gris">Explora los eventos disponibles y haz tu primera reserva.</p>' +
          '<a class="boton boton-morado" href="eventos.html">Explorar eventos</a>' +
        '</div>';
      return;
    }

    var html =
      '<table class="tabla-reservas">' +
        '<thead>' +
          '<tr>' +
            '<th>Evento</th><th>Fecha</th><th>Teatro</th><th>Tickets</th>' +
            '<th>Total</th><th>Estado</th><th>Acciones</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>';

    for (var i = 0; i < reservas.length; i++) {
      var r = reservas[i];
      var acciones = "";

      if (r.estado === "Cancelada") {
        acciones = '<span class="sin-qr">QR no disponible</span>';
      } else if (r.usada) {
        /* La entrada ya se validó en la puerta: ni QR ni cancelación */
        acciones = '<span class="sin-qr">Entrada usada</span>';
      } else if (esperaPago(r)) {
        acciones =
          '<span class="sin-qr">' + (r.pago ? "Pago pendiente: el QR aparece al aprobarse" : "Pago por confirmar: el QR aparece al confirmarse") + '</span>' +
          '<button class="boton-mini boton-cancelar" data-cancelar="' + esc(r.codigo) + '">Cancelar</button>';
      } else {
        acciones =
          '<button class="boton-mini boton-qr" data-qr="' + esc(r.codigo) + '">Ver QR</button>' +
          '<button class="boton-mini boton-cancelar" data-cancelar="' + esc(r.codigo) + '">Cancelar</button>';
      }

      var claseReserva = r.estado === "Cancelada" ? "reserva-cancelada"
        : (r.estado === "Confirmada" ? "reserva-confirmada" : "reserva-reservada");

      html = html +
        '<tr>' +
          '<td data-titulo="Evento"><a href="evento.html?id=' + encodeURIComponent(r.idEvento) + '">' + esc(r.titulo) + '</a></td>' +
          '<td data-titulo="Fecha">' + esc(r.fechaEvento) + '</td>' +
          '<td data-titulo="Teatro">' + esc(r.teatro || r.lugar) + '</td>' +
          '<td data-titulo="Tickets">' + esc(r.tickets) + '</td>' +
          '<td data-titulo="Total">' + (r.total === 0 ? "Gratis" : pesos(r.total)) + '</td>' +
          '<td data-titulo="Estado"><span class="etiqueta-reserva ' + claseReserva + '">' + esc(r.usada ? "Usada" : r.estado) + '</span>' +
            (leerCancelacion(r.observaciones)
              ? '<span class="reserva-causa">Causa: ' + esc(causaParaCliente(leerCancelacion(r.observaciones).causa)) + '</span>'
              : '') +
          '</td>' +
          '<td data-titulo="Acciones">' + acciones + '</td>' +
        '</tr>';
    }

    html = html + '</tbody></table>';
    contenedor.innerHTML = html;

    /* Botón "Ver QR": lleva a la página de confirmación de esa reserva */
    var botonesQr = document.querySelectorAll("[data-qr]");
    for (var k = 0; k < botonesQr.length; k++) {
      botonesQr[k].onclick = function () {
        localStorage.setItem("ultimaReserva", this.getAttribute("data-qr"));
        window.location.href = "confirmacion.html";
      };
    }

    /* Botón "Cancelar": abre la ventana que pide la causa */
    var botonesCancelar = document.querySelectorAll("[data-cancelar]");
    for (var m = 0; m < botonesCancelar.length; m++) {
      botonesCancelar[m].onclick = function () {
        abrirCancelacion(this.getAttribute("data-cancelar"));
      };
    }
  }

  /* Ventana para cancelar una reserva con su causa */
  var ventana = document.createElement("dialog");
  ventana.className = "modal modal-cancelar";
  ventana.id = "modal-cancelar";
  ventana.setAttribute("aria-labelledby", "cancelar-titulo");
  document.body.appendChild(ventana);
  var codigoAbierto = "";
  var avisoLista = document.getElementById("aviso-reservas");

  function abrirCancelacion(codigo) {
    codigoAbierto = codigo;
    ventana.innerHTML =
      '<div class="modal-caja">' +
        '<button type="button" class="modal-cerrar" data-cerrar aria-label="Cerrar sin cancelar la reserva">' +
          '<span aria-hidden="true">×</span>' +
        '</button>' +
        '<h2 class="cancelar-titulo" id="cancelar-titulo">¿Cancelar la reserva ' + esc(codigo) + '?</h2>' +
        '<p class="texto-gris" id="cancelar-texto">Las entradas volverán a quedar disponibles. Cuéntanos por qué la cancelas.</p>' +
        '<form id="form-cancelar" novalidate>' +
          camposCancelacion("cliente", "cancelar") +
          '<p class="mensaje error" id="error-cancelar" role="alert"></p>' +
          '<div class="cancelar-botones">' +
            '<button type="submit" class="boton boton-peligro" aria-describedby="cancelar-texto">Sí, cancelar la reserva</button>' +
            '<button type="button" class="boton boton-borde" data-cerrar>Volver</button>' +
          '</div>' +
        '</form>' +
      '</div>';
    ventana.showModal();
    document.getElementById("cancelar-causa").focus();
  }

  ventana.addEventListener("click", function (evento) {
    if (evento.target === ventana || evento.target.closest("[data-cerrar]")) ventana.close();
  });

  ventana.addEventListener("close", function () {
    var boton = contenedor.querySelector('[data-cancelar="' + codigoAbierto + '"]');
    if (boton) boton.focus();
  });

  ventana.addEventListener("submit", function (evento) {
    evento.preventDefault();
    var error = document.getElementById("error-cancelar");
    var datos = datosCancelacion("cancelar");
    if (datos.error) {
      error.innerHTML = "<strong>Error:</strong> " + datos.error;
      return;
    }

    /* Con el API la cancela el servidor, que agrega la causa a las observaciones */
    if (USAR_API) {
      var botonSi = ventana.querySelector('button[type="submit"]');
      botonSi.disabled = true;
      llamarApi("/reservas/" + encodeURIComponent(codigoAbierto) + "/cancelar", {
        method: "PATCH",
        headers: cabeceraSesion(usuario),
        body: JSON.stringify({ causa: datos.causa, detalle: datos.detalle })
      }).then(function (resultado) {
        revisarRespuesta(resultado, 200, "No se pudo cancelar la reserva.");
        var cancelada = codigoAbierto;
        codigoAbierto = "";
        ventana.close();
        return pintar().then(function () {
          avisoLista.textContent = "La reserva " + cancelada + " quedó cancelada.";
          avisoLista.focus();
        });
      }).catch(function (fallo) {
        botonSi.disabled = false;
        error.innerHTML = "<strong>Error:</strong> " + esc(fallo.message);
      });
      return;
    }

    var lista = obtenerReservas();
    for (var n = 0; n < lista.length; n++) {
      if (lista[n].codigo === codigoAbierto) {
        lista[n].estado = "Cancelada";
        lista[n].observaciones = agregarNota(lista[n].observaciones,
          notaCancelacion("reserva", "el cliente", datos.causa, datos.detalle));
      }
    }
    guardarReservas(lista);

    var codigo = codigoAbierto;
    codigoAbierto = "";
    ventana.close();
    pintar();
    avisoLista.textContent = "La reserva " + codigo + " quedó cancelada.";
    avisoLista.focus();
  });

  pintar();
}


/* ==========================================================================
   13. VENTANA EMERGENTE DE ACCESO (iniciar sesión y registrarse)

   Se arma con JavaScript y se agrega a todas las páginas, así no hay que
   repetir el mismo bloque de HTML siete veces.
   Usa la etiqueta <dialog> de HTML5, que ya trae el fondo oscuro y el
   cierre con la tecla Escape.
   ========================================================================== */

/* Escribe la ventana emergente al final del <body> */
function crearModalAcceso() {
  var modal = document.createElement("dialog");
  modal.className = "modal";
  modal.id = "modal-acceso";

  /* aria-labelledby apunta al título oculto de abajo: toda ventana
     emergente necesita un nombre que el lector anuncie al abrirse.
     <dialog> + showModal() ya se encarga solo de atrapar el foco dentro
     de la ventana y de cerrarla con la tecla Escape (WCAG 2.1.2). */
  modal.setAttribute("aria-labelledby", "titulo-modal");

  modal.innerHTML = '' +
    '<div class="modal-caja">' +

      '<h2 class="oculto" id="titulo-modal">Acceso a tu cuenta de El Desparche</h2>' +

      /* Botón solo con icono: el nombre accesible lo da aria-label y la
         "×" se oculta al lector para que no lea "por" o "equis". */
      '<button type="button" class="modal-cerrar" id="cerrar-modal" ' +
              'aria-label="Cerrar la ventana de acceso">' +
        '<span aria-hidden="true">×</span>' +
      '</button>' +

      /* Logo de El Desparche (decorativo: el título ya nombra la ventana) */
      '<div class="modal-logo">' +
        '<img class="logo-texto" src="img/logo-eldesparche.svg" alt="" aria-hidden="true">' +
      '</div>' +

      /* Pestañas con el patrón ARIA de tabs: el contenedor es tablist,
         cada botón es tab con aria-selected, y cada formulario es el
         tabpanel que le corresponde. */
      '<div class="modal-pestanas" role="tablist" aria-label="Entrar o registrarse">' +
        '<button type="button" class="pestana activa" data-pestana="entrar" ' +
                'role="tab" id="pestana-entrar" aria-selected="true" ' +
                'aria-controls="form-entrar">Iniciar sesión</button>' +
        '<button type="button" class="pestana" data-pestana="registro" ' +
                'role="tab" id="pestana-registro" aria-selected="false" ' +
                'aria-controls="form-registro">Registrarse</button>' +
      '</div>' +

      /* ----- Formulario de inicio de sesión ----- */
      '<form id="form-entrar" role="tabpanel" aria-labelledby="pestana-entrar" novalidate>' +
        '<p class="modal-saludo">¡Qué bueno verte de nuevo! Entra para ver y gestionar tus reservas.</p>' +

        '<div class="campo">' +
          '<label for="correo-entrar">Correo electrónico</label>' +
          '<input type="email" id="correo-entrar" name="correo" required ' +
                 'placeholder="correo@ejemplo.com" autocomplete="email" ' +
                 'aria-describedby="error-entrar">' +
        '</div>' +

        '<div class="campo">' +
          '<label for="clave-entrar">Contraseña</label>' +
          '<input type="password" id="clave-entrar" name="clave" required ' +
                 'placeholder="Tu contraseña" ' +
                 'autocomplete="current-password" aria-describedby="error-entrar">' +
        '</div>' +

        /* role="alert" hace que el lector lea el error en cuanto aparece */
        '<p class="mensaje error" id="error-entrar" role="alert"></p>' +

        '<button type="submit" class="boton boton-morado boton-ancho">Iniciar sesión</button>' +

        /* Aquí el registro aparece como un vínculo */
        '<p class="modal-pie">¿No tienes cuenta? ' +
          '<button type="button" class="vinculo" data-pestana="registro">Regístrate</button>' +
        '</p>' +
      '</form>' +

      /* ----- Formulario de registro ----- */
      '<form id="form-registro" role="tabpanel" aria-labelledby="pestana-registro" hidden novalidate>' +
        '<p class="modal-saludo">Crea tu cuenta y empieza a despacharte.</p>' +

        /* Los dos tipos de cuenta son un grupo de radios: <fieldset> y
           <legend> los agrupan de verdad, así el lector anuncia la
           pregunta antes de cada opción ("Usuario, 1 de 2"). */
        '<fieldset class="tipos-cuenta-grupo">' +
          '<legend class="modal-subtitulo">¿Cómo quieres registrarte?</legend>' +

          /* Cada radio se nombra SOLO con "Usuario" o "Agente"
             (aria-labelledby) y la frase larga pasa a ser su descripción
             (aria-describedby). Sin esto el lector leía de un tirón
             "Usuario Reserva entradas para los eventos que te gusten"
             como si todo fuera el nombre de la opción. */
          '<div class="tipos-cuenta">' +
            '<label class="tipo-cuenta">' +
              '<input type="radio" name="tipo-cuenta" value="usuario" checked ' +
                     'aria-labelledby="tipo-usuario-nombre" ' +
                     'aria-describedby="tipo-usuario-texto">' +
              '<span class="tipo-nombre" id="tipo-usuario-nombre">Usuario</span>' +
              '<span class="tipo-texto" id="tipo-usuario-texto">' +
                'Reserva entradas para los eventos que te gusten.</span>' +
            '</label>' +

            '<label class="tipo-cuenta">' +
              '<input type="radio" name="tipo-cuenta" value="agente" ' +
                     'aria-labelledby="tipo-agente-nombre" ' +
                     'aria-describedby="tipo-agente-texto">' +
              '<span class="tipo-nombre" id="tipo-agente-nombre">Agente</span>' +
              '<span class="tipo-texto" id="tipo-agente-texto">' +
                'Publica y administra tus propios eventos.</span>' +
            '</label>' +
          '</div>' +
        '</fieldset>' +

        /* Los campos siguen la tabla USUARIO de la base de datos
           (tipo y número de documento, nombres, apellidos, correo, clave,
           ciudad y dirección). Lo propio de cada tipo de cuenta va en su
           grupo: CLIENTE pide fecha de nacimiento; AGENTE pide NIT y
           razón social. */
        '<fieldset class="grupo-campos">' +
          '<legend class="modal-subtitulo">Tus datos</legend>' +

          '<div class="campo">' +
            '<label for="tipo-id-registro">Tipo de documento</label>' +
            '<select id="tipo-id-registro" name="tipo_identificacion" required ' +
                    'aria-describedby="error-registro">' +
              '<option value="CC">Cédula de ciudadanía (CC)</option>' +
              '<option value="CE">Cédula de extranjería (CE)</option>' +
              '<option value="PAS">Pasaporte (PAS)</option>' +
              '<option value="PPT">Permiso por protección temporal (PPT)</option>' +
              '<option value="NIT">NIT</option>' +
            '</select>' +
          '</div>' +

          '<div class="campo">' +
            '<label for="numero-id-registro">Número de documento</label>' +
            '<input type="text" id="numero-id-registro" name="numero_identificacion" required ' +
                   'inputmode="numeric" maxlength="20" autocomplete="off" ' +
                   'aria-describedby="error-registro">' +
          '</div>' +

          '<div class="campo">' +
            '<label for="nombres-registro">Nombres</label>' +
            '<input type="text" id="nombres-registro" name="nombres" required ' +
                   'maxlength="60" placeholder="Tus nombres" autocomplete="given-name" ' +
                   'aria-describedby="error-registro">' +
          '</div>' +

          '<div class="campo">' +
            '<label for="apellidos-registro">Apellidos</label>' +
            '<input type="text" id="apellidos-registro" name="apellidos" required ' +
                   'maxlength="60" placeholder="Tus apellidos" autocomplete="family-name" ' +
                   'aria-describedby="error-registro">' +
          '</div>' +

          '<div class="campo">' +
            '<label for="telefono-registro">Teléfono <span class="opcional">(opcional)</span></label>' +
            '<input type="tel" id="telefono-registro" name="telefono" ' +
                   'inputmode="numeric" maxlength="10" placeholder="3001234567" ' +
                   'autocomplete="tel-national" aria-describedby="error-registro">' +
          '</div>' +
        '</fieldset>' +

        '<fieldset class="grupo-campos">' +
          '<legend class="modal-subtitulo">¿Dónde vives?</legend>' +

          '<div class="campo">' +
            '<label for="ciudad-registro">Ciudad</label>' +
            '<select id="ciudad-registro" name="id_ciudad" required ' +
                    'aria-describedby="error-registro">' +
              '<option value="">Cargando ciudades…</option>' +
            '</select>' +
          '</div>' +

          '<div class="campo">' +
            '<label for="direccion-registro">Dirección</label>' +
            '<input type="text" id="direccion-registro" name="direccion" required ' +
                   'maxlength="150" placeholder="Calle 10 # 5-20" autocomplete="street-address" ' +
                   'aria-describedby="error-registro">' +
          '</div>' +
        '</fieldset>' +

        /* Solo para cuenta de Usuario (tabla CLIENTE) */
        '<fieldset class="grupo-campos" id="campos-usuario">' +
          '<legend class="modal-subtitulo">Sobre ti</legend>' +

          '<div class="campo">' +
            '<label for="nacimiento-registro">Fecha de nacimiento</label>' +
            '<input type="date" id="nacimiento-registro" name="fecha_nacimiento" required ' +
                   'autocomplete="bday" aria-describedby="ayuda-nacimiento error-registro">' +
            '<p class="ayuda-campo" id="ayuda-nacimiento">Algunos eventos tienen edad mínima.</p>' +
          '</div>' +

          '<div class="campo">' +
            '<label for="alias-registro">Alias <span class="opcional">(opcional)</span></label>' +
            '<input type="text" id="alias-registro" name="alias" maxlength="30" ' +
                   'placeholder="Cómo te verán los demás" autocomplete="nickname" ' +
                   'aria-describedby="error-registro">' +
          '</div>' +
        '</fieldset>' +

        /* Solo para cuenta de Agente (tabla AGENTE) */
        '<fieldset class="grupo-campos" id="campos-agente" hidden disabled>' +
          '<legend class="modal-subtitulo">Datos de la empresa</legend>' +

          '<div class="campo">' +
            '<label for="nit-registro">NIT</label>' +
            '<input type="text" id="nit-registro" name="nit" required ' +
                   'maxlength="11" placeholder="900123456-7" autocomplete="off" ' +
                   'aria-describedby="ayuda-nit error-registro">' +
            '<p class="ayuda-campo" id="ayuda-nit">Nueve dígitos, guion y dígito de verificación.</p>' +
          '</div>' +

          '<div class="campo">' +
            '<label for="razon-registro">Razón social</label>' +
            '<input type="text" id="razon-registro" name="razon_social" required ' +
                   'maxlength="120" aria-describedby="error-registro">' +
          '</div>' +

          '<div class="campo">' +
            '<label for="comercial-registro">Nombre comercial</label>' +
            '<input type="text" id="comercial-registro" name="nombre_comercial" required ' +
                   'maxlength="100" aria-describedby="error-registro">' +
          '</div>' +

          '<div class="campo">' +
            '<label for="descripcion-registro">Descripción <span class="opcional">(opcional)</span></label>' +
            '<textarea id="descripcion-registro" name="descripcion" rows="3" ' +
                      'aria-describedby="error-registro"></textarea>' +
          '</div>' +
        '</fieldset>' +

        '<fieldset class="grupo-campos">' +
          '<legend class="modal-subtitulo">Tu cuenta</legend>' +

          '<div class="campo">' +
            '<label for="correo-registro">Correo electrónico</label>' +
            '<input type="email" id="correo-registro" name="correo" required ' +
                   'maxlength="100" placeholder="correo@ejemplo.com" autocomplete="email" ' +
                   'aria-describedby="error-registro">' +
          '</div>' +

          '<div class="campo">' +
            '<label for="clave-registro">Contraseña</label>' +
            '<input type="password" id="clave-registro" name="clave" required ' +
                   'minlength="8" maxlength="72" placeholder="Mínimo 8 caracteres" ' +
                   'autocomplete="new-password" aria-describedby="ayuda-clave error-registro">' +
            /* La regla se dice ANTES de equivocarse, no solo al fallar */
            '<p class="ayuda-campo" id="ayuda-clave">Debe tener 8 caracteres como mínimo.</p>' +
          '</div>' +
        '</fieldset>' +

        '<p class="mensaje error" id="error-registro" role="alert"></p>' +

        '<button type="submit" class="boton boton-morado boton-ancho">Crear cuenta</button>' +

        '<p class="modal-pie">¿Ya tienes cuenta? ' +
          '<button type="button" class="vinculo" data-pestana="entrar">Inicia sesión</button>' +
        '</p>' +
      '</form>' +

    '</div>';

  document.body.appendChild(modal);

  /* Botón de cerrar */
  document.getElementById("cerrar-modal").onclick = function () {
    modal.close();
  };

  /* Al hacer clic en el fondo oscuro también se cierra */
  modal.onclick = function (evento) {
    if (evento.target === modal) {
      modal.close();
    }
  };

  /* Todos los botones que cambian de pestaña (las pestañas y los vínculos) */
  var botones = modal.querySelectorAll("[data-pestana]");
  for (var i = 0; i < botones.length; i++) {
    botones[i].onclick = function () {
      cambiarPestana(this.getAttribute("data-pestana"));
    };
  }

  /* Al cambiar entre Usuario y Agente se muestran los campos de cada uno */
  var radiosTipo = modal.querySelectorAll('input[name="tipo-cuenta"]');
  for (var j = 0; j < radiosTipo.length; j++) {
    radiosTipo[j].onchange = mostrarCamposDelTipo;
  }
  mostrarCamposDelTipo();

  /* Nadie puede haber nacido mañana */
  document.getElementById("nacimiento-registro").max = new Date().toISOString().slice(0, 10);

  document.getElementById("form-entrar").onsubmit = entrar;
  document.getElementById("form-registro").onsubmit = registrar;
}

/* Ids de todos los campos del registro (para limpiar las marcas de error) */
var CAMPOS_REGISTRO = [
  "tipo-id-registro", "numero-id-registro", "nombres-registro", "apellidos-registro",
  "telefono-registro", "ciudad-registro", "direccion-registro", "nacimiento-registro",
  "alias-registro", "nit-registro", "razon-registro", "comercial-registro",
  "descripcion-registro", "correo-registro", "clave-registro"
];

/* Muestra los campos propios del tipo de cuenta elegido y oculta los otros.
   Un <fieldset disabled> no se valida ni se envía, y el lector de pantalla
   lo ignora; por eso se usa junto con hidden. */
function mostrarCamposDelTipo() {
  var esAgente = document.querySelector('input[name="tipo-cuenta"]:checked').value === "agente";
  var usuario = document.getElementById("campos-usuario");
  var agente = document.getElementById("campos-agente");

  usuario.hidden = esAgente;
  usuario.disabled = esAgente;
  agente.hidden = !esAgente;
  agente.disabled = !esAgente;

  /* Un agente normalmente se identifica con NIT */
  var tipoId = document.getElementById("tipo-id-registro");
  if (esAgente && tipoId.value !== "NIT") {
    tipoId.value = "NIT";
  } else if (!esAgente && tipoId.value === "NIT") {
    tipoId.value = "CC";
  }
}

/* ===== COMUNICACIÓN CON EL BACKEND =====
   La dirección del API se puede cambiar definiendo window.DESPARCHE_API_URL
   antes de cargar este archivo. */
var API_URL = window.DESPARCHE_API_URL || "http://localhost:5000/api";

/* INTERRUPTOR DE LA BASE DE DATOS
   true  = todo pasa por el API y PostgreSQL.
   false = modo local: el API y la base de datos no se usan, y las
           respuestas salen de respuestaLocal() con datos de ejemplo.
   El código del API no se toca: para volver a usarlo basta con poner true. */
var USAR_API = true;

/* Cuentas de prueba para el modo local (solo funcionan con USAR_API = false) */
var CUENTAS_PRUEBA = [
  {
    correo: "admin@eldesparche.online",
    contrasena: "Desparche2026",
    usuario: {
      numero_identificacion: "1000000001",
      nombre_completo: "Sebastián Jaramillo",
      correo: "admin@eldesparche.online",
      tipo_usuario: "ADMIN"
    }
  },
  {
    correo: "valentina@eldesparche.online",
    contrasena: "Cliente2026",
    usuario: {
      numero_identificacion: "1116254789",
      tipo_identificacion: "CC",
      nombre_completo: "Valentina Ríos Castaño",
      correo: "valentina@eldesparche.online",
      fecha_nacimiento: "2001-04-17",
      tipo_usuario: "CLIENTE"
    }
  },
  {
    correo: "juandavid@eldesparche.online",
    contrasena: "Cliente2026",
    usuario: {
      numero_identificacion: "1006478123",
      tipo_identificacion: "CC",
      nombre_completo: "Juan David Ospina",
      correo: "juandavid@eldesparche.online",
      fecha_nacimiento: "1998-11-02",
      tipo_usuario: "CLIENTE"
    }
  },
  {
    correo: "andres@eldesparche.online",
    contrasena: "Cliente2026",
    usuario: {
      numero_identificacion: "1088345612",
      tipo_identificacion: "CC",
      nombre_completo: "Andrés Felipe Cardona",
      correo: "andres@eldesparche.online",
      fecha_nacimiento: "1987-03-08",
      tipo_usuario: "CLIENTE"
    }
  },
  {
    correo: "tarima@eldesparche.online",
    contrasena: "Agente2026",
    usuario: {
      numero_identificacion: "52874136",
      tipo_identificacion: "CC",
      nombre_completo: "Camila Restrepo",
      correo: "tarima@eldesparche.online",
      nit: "901234567-1",
      tipo_usuario: "AGENTE"
    }
  }
];

/* Imita las respuestas del API cuando USAR_API está en false */
function respuestaLocal(ruta, opciones) {
  var cuerpo = opciones && opciones.body ? JSON.parse(opciones.body) : {};

  if (ruta === "/ciudades") {
    var ubicaciones = leerUbicaciones();
    var ciudades = ubicaciones.ciudades.map(function (c) {
      var departamento = ubicaciones.departamentos.filter(function (d) { return d.id === c.idDepartamento; })[0];
      return { id_ciudad: c.id, nombre: c.nombre, departamento: departamento ? departamento.nombre : "" };
    });
    return { estado: 200, datos: { ciudades: ciudades } };
  }

  if (ruta === "/auth/login") {
    for (var i = 0; i < CUENTAS_PRUEBA.length; i++) {
      if (CUENTAS_PRUEBA[i].correo === cuerpo.correo.toLowerCase()) {
        if (CUENTAS_PRUEBA[i].contrasena !== cuerpo.contrasena) {
          return { estado: 401, datos: { error: "El correo o la contraseña no son correctos." } };
        }
        return { estado: 200, datos: { usuario: CUENTAS_PRUEBA[i].usuario, token: "local" } };
      }
    }

    return {
      estado: 200,
      datos: {
        usuario: {
          numero_identificacion: "local",
          nombre_completo: cuerpo.correo.split("@")[0],
          correo: cuerpo.correo,
          tipo_usuario: "CLIENTE"
        },
        token: "local"
      }
    };
  }

  if (ruta === "/auth/register") {
    return {
      estado: 201,
      datos: {
        usuario: {
          numero_identificacion: cuerpo.numero_identificacion,
          tipo_identificacion: cuerpo.tipo_identificacion,
          nombre_completo: (cuerpo.nombre + " " + cuerpo.apellidos).trim(),
          correo: cuerpo.correo,
          fecha_nacimiento: cuerpo.fecha_nacimiento || null,
          tipo_usuario: cuerpo.tipo_cuenta
        },
        token: "local"
      }
    };
  }

  return { estado: 503, datos: { error: "La base de datos está desactivada por ahora." } };
}

/* Llama al API y devuelve { estado, datos }. Si el servidor no responde,
   rechaza la promesa con un mensaje que se puede mostrar tal cual. */
function llamarApi(ruta, opciones) {
  if (!USAR_API) {
    return Promise.resolve(respuestaLocal(ruta, opciones));
  }

  return fetch(API_URL + ruta, opciones).then(
    function (respuesta) {
      return respuesta.json().then(
        function (datos) { return { estado: respuesta.status, datos: datos }; },
        function () { return { estado: respuesta.status, datos: {} }; }
      );
    },
    function () {
      throw new Error("No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos.");
    }
  );
}

/* Llena la lista de ciudades (una sola vez) con las que hay en la base de datos */
var ciudadesCargadas = false;

function cargarCiudades() {
  if (ciudadesCargadas) {
    return;
  }

  var lista = document.getElementById("ciudad-registro");

  llamarApi("/ciudades").then(function (resultado) {
    if (resultado.estado !== 200 || !resultado.datos.ciudades) {
      throw new Error("No se pudo cargar la lista de ciudades.");
    }

    lista.innerHTML = '<option value="">Elige tu ciudad</option>';
    resultado.datos.ciudades.forEach(function (ciudad) {
      var opcion = document.createElement("option");
      opcion.value = ciudad.id_ciudad;
      opcion.textContent = ciudad.nombre + " (" + ciudad.departamento + ")";
      lista.appendChild(opcion);
    });
    ciudadesCargadas = true;
  }).catch(function (error) {
    lista.innerHTML = '<option value="">No se pudieron cargar las ciudades</option>';
    mostrarError("error-registro", error.message);
  });
}

/* Muestra la pestaña de entrar o la de registro.
   Además de la clase "activa" (que es solo el aspecto), se actualiza
   aria-selected, que es el ESTADO que anuncia el lector de pantalla. */
function cambiarPestana(cual) {
  var pestanas = document.querySelectorAll("#modal-acceso .pestana");

  for (var i = 0; i < pestanas.length; i++) {
    var elegida = pestanas[i].getAttribute("data-pestana") === cual;
    pestanas[i].classList.toggle("activa", elegida);
    pestanas[i].setAttribute("aria-selected", elegida ? "true" : "false");
  }

  document.getElementById("form-entrar").hidden = cual !== "entrar";
  document.getElementById("form-registro").hidden = cual !== "registro";

  if (cual === "registro") {
    cargarCiudades();
  }

  /* Se limpian los mensajes de error al cambiar */
  limpiarError("error-entrar", ["correo-entrar", "clave-entrar"]);
  limpiarError("error-registro", CAMPOS_REGISTRO);
}

/* ===== MENSAJES DE ERROR ACCESIBLES =====
   REGLA DE ORO (WCAG 1.4.1 y 3.3.1): el error no se transmite solo con
   el color rojo. El mensaje lleva un icono, la palabra "Error:" delante
   y el campo culpable queda marcado con aria-invalid="true". Al ir el
   contenedor con role="alert", el lector lo lee en cuanto aparece. */
function mostrarError(idMensaje, texto, idCampo) {
  var caja = document.getElementById(idMensaje);

  caja.innerHTML = '<span><strong>Error:</strong> ' + esc(texto) + '</span>';

  /* El foco va al campo que falló para poder corregirlo enseguida */
  if (idCampo) {
    var campo = document.getElementById(idCampo);
    if (campo) {
      campo.setAttribute("aria-invalid", "true");
      campo.focus();
    }
  }
}

/* Borra el mensaje y quita la marca de inválido de los campos */
function limpiarError(idMensaje, campos) {
  var caja = document.getElementById(idMensaje);
  if (caja) {
    caja.textContent = "";
  }

  for (var i = 0; i < campos.length; i++) {
    var campo = document.getElementById(campos[i]);
    if (campo) {
      campo.removeAttribute("aria-invalid");
    }
  }
}

/* Abre la ventana emergente en la pestaña que se le indique */
function abrirAcceso(cual) {
  cambiarPestana(cual || "entrar");
  document.getElementById("modal-acceso").showModal();
}

/* Guarda la sesión que devolvió el API y recarga la página.
   El API devuelve el nombre en un solo campo (nombre_completo, igual que la tabla USUARIO).
   Se mantiene el formato que ya usan las demás pantallas (nombre, correo y
   tipo "usuario" | "agente") y se agrega el token para las próximas llamadas. */
function iniciarSesionLocal(respuesta) {
  var u = respuesta.usuario;

  var tipos = { AGENTE: "agente", ADMIN: "admin" };

  guardarUsuario({
    nombre: (u.nombre_completo || "").trim(),
    correo: u.correo,
    tipo: tipos[u.tipo_usuario] || "usuario",
    rol: u.tipo_usuario,
    id: u.numero_identificacion,
    tipoDocumento: u.tipo_identificacion || "",
    nacimiento: u.fecha_nacimiento || "",
    nit: u.nit || "",
    token: respuesta.token
  });

  window.location.reload();
}

/* Envía el formulario al API. Mientras espera, el botón queda desactivado
   para que un doble clic no cree la cuenta dos veces. */
function enviarFormulario(formulario, ruta, cuerpo, idError, campos) {
  var boton = formulario.querySelector('button[type="submit"]');
  boton.disabled = true;

  llamarApi(ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo)
  }).then(function (resultado) {
    if (resultado.estado === 200 || resultado.estado === 201) {
      iniciarSesionLocal(resultado.datos);
      return;
    }

    /* Si el API dice qué campo falló, se marca ese campo */
    var detalles = resultado.datos.detalles || {};
    var clave = Object.keys(detalles)[0];
    var mensaje = (clave && typeof detalles[clave] === "string")
      ? detalles[clave]
      : (resultado.datos.error || "No se pudo completar la solicitud.");

    mostrarError(idError, mensaje, campos[clave]);
    boton.disabled = false;
  }).catch(function (error) {
    mostrarError(idError, error.message);
    boton.disabled = false;
  });
}

/* Iniciar sesión */
function entrar(evento) {
  evento.preventDefault();

  var correo = document.getElementById("correo-entrar").value.trim();
  var clave = document.getElementById("clave-entrar").value;

  limpiarError("error-entrar", ["correo-entrar", "clave-entrar"]);

  /* Los mensajes dicen QUÉ campo falta y CÓMO arreglarlo (WCAG 3.3.3) */
  if (correo === "") {
    mostrarError("error-entrar", "Escribe tu correo electrónico.", "correo-entrar");
    return;
  }

  if (clave === "") {
    mostrarError("error-entrar", "Escribe tu contraseña.", "clave-entrar");
    return;
  }

  enviarFormulario(
    evento.target,
    "/auth/login",
    { correo: correo, contrasena: clave },
    "error-entrar",
    { correo: "correo-entrar", contrasena: "clave-entrar" }
  );
}

/* Crear cuenta: los campos y las reglas siguen la base de datos */
function registrar(evento) {
  evento.preventDefault();

  limpiarError("error-registro", CAMPOS_REGISTRO);

  var valor = function (id) {
    return document.getElementById(id).value.trim();
  };
  var esAgente = document.querySelector('input[name="tipo-cuenta"]:checked').value === "agente";

  var datos = {
    tipo_cuenta: esAgente ? "AGENTE" : "CLIENTE",
    tipo_identificacion: valor("tipo-id-registro"),
    numero_identificacion: valor("numero-id-registro"),
    nombre: valor("nombres-registro"),
    apellidos: valor("apellidos-registro"),
    telefono: valor("telefono-registro"),
    id_ciudad: valor("ciudad-registro"),
    direccion: valor("direccion-registro"),
    correo: valor("correo-registro"),
    contrasena: document.getElementById("clave-registro").value
  };

  if (esAgente) {
    datos.nit = valor("nit-registro");
    datos.razon_social = valor("razon-registro");
    datos.nombre_comercial = valor("comercial-registro");
    datos.descripcion = valor("descripcion-registro");
  } else {
    datos.fecha_nacimiento = valor("nacimiento-registro");
    datos.alias = valor("alias-registro");
  }

  /* Revisión rápida en el navegador, en el orden en que aparecen los campos.
     El API repite estas reglas (y las de la base de datos), así que aquí
     solo se evita un viaje al servidor por un campo vacío. */
  var faltantes = [
    ["numero_identificacion", "Escribe tu número de documento.", "numero-id-registro"],
    ["nombre", "Escribe tus nombres.", "nombres-registro"],
    ["apellidos", "Escribe tus apellidos.", "apellidos-registro"],
    ["id_ciudad", "Elige tu ciudad.", "ciudad-registro"],
    ["direccion", "Escribe tu dirección.", "direccion-registro"]
  ];
  if (esAgente) {
    faltantes.push(["nit", "Escribe el NIT de la empresa.", "nit-registro"]);
    faltantes.push(["razon_social", "Escribe la razón social.", "razon-registro"]);
    faltantes.push(["nombre_comercial", "Escribe el nombre comercial.", "comercial-registro"]);
  } else {
    faltantes.push(["fecha_nacimiento", "Escribe tu fecha de nacimiento.", "nacimiento-registro"]);
  }
  faltantes.push(["correo", "Escribe tu correo electrónico.", "correo-registro"]);

  for (var i = 0; i < faltantes.length; i++) {
    if (datos[faltantes[i][0]] === "") {
      mostrarError("error-registro", faltantes[i][1], faltantes[i][2]);
      return;
    }
  }

  if (datos.contrasena === "") {
    mostrarError("error-registro", "Escribe una contraseña.", "clave-registro");
    return;
  }

  if (datos.contrasena.length < 8) {
    mostrarError("error-registro",
      "La contraseña debe tener 8 caracteres como mínimo.", "clave-registro");
    return;
  }

  /* Nombre de cada campo del API -> id del campo en pantalla */
  enviarFormulario(evento.target, "/auth/register", datos, "error-registro", {
    tipo_cuenta: "tipo-id-registro",
    tipo_identificacion: "tipo-id-registro",
    numero_identificacion: "numero-id-registro",
    nombre: "nombres-registro",
    apellidos: "apellidos-registro",
    telefono: "telefono-registro",
    id_ciudad: "ciudad-registro",
    direccion: "direccion-registro",
    fecha_nacimiento: "nacimiento-registro",
    alias: "alias-registro",
    nit: "nit-registro",
    razon_social: "razon-registro",
    nombre_comercial: "comercial-registro",
    correo: "correo-registro",
    contrasena: "clave-registro"
  });
}


/* ===== MENÚ LATERAL (celular y tableta) =====
   El botón «Menú» abre un panel que entra desde la derecha con los
   enlaces e iconos de línea. Es un <dialog> con showModal(): atrapa el
   foco, se cierra con Escape y deja inerte el resto de la página.
   La zona de cuenta y accesibilidad (#menu-cuenta) se MUEVE dentro del
   panel mientras está abierto y vuelve a la cabecera al cerrarlo; así
   conserva sus ids y sus eventos sin duplicar nada. */
var ICONOS_MENU = {
  inicio: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  eventos: '<path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.3 6.8 19.1l1-5.8L3.5 9.2l5.9-.8z"/>',
  reservas: '<path d="M4 7a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4z"/><path d="M14 5v12" stroke-dasharray="2 2"/>',
  nosotros: '<circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.8-.3 5 1.4 5 4.3"/>',
  admin: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'
};

function iconoMenu(nombre) {
  return '<svg class="lateral-icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    ICONOS_MENU[nombre] + '</svg>';
}

function prepararMenuMovil() {
  var cabecera = document.querySelector(".cabecera");
  var boton = document.getElementById("boton-menu");
  var cuenta = document.getElementById("menu-cuenta");
  if (!cabecera || !boton) return;

  /* Sin JavaScript la cabecera muestra todo; con él, en pantallas
     angostas se esconde y vive en el panel lateral. */
  cabecera.classList.add("cabecera-plegable");
  boton.setAttribute("aria-controls", "menu-lateral");
  boton.setAttribute("aria-haspopup", "dialog");

  var panel = document.createElement("dialog");
  panel.className = "menu-lateral";
  panel.id = "menu-lateral";
  panel.setAttribute("aria-labelledby", "menu-lateral-titulo");
  panel.innerHTML =
    '<div class="lateral-cabeza">' +
      '<h2 class="lateral-titulo" id="menu-lateral-titulo">Menú</h2>' +
      '<button type="button" class="lateral-cerrar" aria-label="Cerrar el menú">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      '</button>' +
    '</div>' +
    '<nav aria-label="Navegación principal en el menú lateral">' +
      '<ul class="lateral-lista" id="lateral-paginas"></ul>' +
    '</nav>' +
    '<section class="lateral-cuenta" aria-labelledby="lateral-cuenta-titulo">' +
      '<h3 class="lateral-subtitulo" id="lateral-cuenta-titulo">Tu cuenta</h3>' +
    '</section>';
  document.body.appendChild(panel);

  var lugarCuenta = panel.querySelector(".lateral-cuenta");
  var origenCuenta = cuenta ? cuenta.parentNode : null;
  var siguienteCuenta = cuenta ? cuenta.nextSibling : null;

  /* Los enlaces se arman al abrir: así incluye «Administración» si la
     sesión de administrador se inició después de cargar la página. */
  function pintarPaginas() {
    var actual = location.pathname.split("/").pop() || "index.html";
    var paginas = [
      { href: "index.html", texto: "Inicio", icono: "inicio" },
      { href: "eventos.html", texto: "Eventos", icono: "eventos" },
      { href: "mis-reservas.html", texto: "Mis reservas", icono: "reservas" },
      { href: "nosotros.html", texto: "Nosotros", icono: "nosotros" }
    ];
    var enlacePanel = document.querySelector("#menu-principal a[data-panel]");
    if (enlacePanel) {
      paginas.push({
        href: enlacePanel.getAttribute("href"),
        texto: enlacePanel.textContent,
        icono: "admin",
        prefijo: enlacePanel.getAttribute("data-panel")
      });
    }

    var html = "";
    for (var i = 0; i < paginas.length; i++) {
      var esActual = paginas[i].href === actual ||
        (paginas[i].prefijo && actual.indexOf(paginas[i].prefijo) === 0);
      html += '<li><a href="' + paginas[i].href + '"' +
        (esActual ? ' aria-current="page"' : '') + '>' +
        iconoMenu(paginas[i].icono) + paginas[i].texto + '</a></li>';
    }
    panel.querySelector("#lateral-paginas").innerHTML = html;
  }

  function abrir() {
    pintarPaginas();
    if (cuenta) lugarCuenta.appendChild(cuenta);
    panel.showModal();
    boton.setAttribute("aria-expanded", "true");
  }

  function cerrar() {
    if (panel.open) panel.close();
  }

  /* Al cerrar (botón, Escape o clic fuera) la cuenta vuelve a su sitio
     y el foco regresa al botón «Menú». */
  panel.addEventListener("close", function () {
    if (cuenta && origenCuenta) origenCuenta.insertBefore(cuenta, siguienteCuenta);
    boton.setAttribute("aria-expanded", "false");
    setTimeout(function () { boton.focus(); }, 0);
  });

  boton.onclick = abrir;
  panel.querySelector(".lateral-cerrar").onclick = cerrar;

  /* Clic en el fondo oscuro (fuera del panel) también cierra */
  panel.addEventListener("click", function (evento) {
    if (evento.target === panel) cerrar();
  });

  /* Al elegir un enlace el panel se cierra */
  panel.addEventListener("click", function (evento) {
    if (evento.target.closest && evento.target.closest("a")) cerrar();
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 900) cerrar();
  });
}


/* ==========================================================================
   14. ARRANQUE
   Revisa en qué página estamos y ejecuta lo que corresponde.
   ========================================================================== */

crearModalAcceso();
pintarSesion();
prepararMenuMovil();
prepararPanelAccesibilidad();
prepararTamanoTexto();

/* Convierte un evento que creó un agente (agente.html, sección Mis eventos) al formato
   de EVENTOS, para publicarlo cuando un administrador lo aprueba */
function eventoDeSolicitud(s) {
  var inicio = new Date(s.inicio);
  var fin = new Date(s.fin);
  var vecino = EVENTOS.filter(function (e) { return e.ciudad === s.ciudad; })[0];

  function fechaLarga(f) {
    return f.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) + " - " +
      f.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
  }

  return {
    id: s.idEvento,
    titulo: s.nombre,
    ciudad: s.ciudad,
    teatro: s.teatro || s.lugar,
    direccion: s.direccion || "",
    fechaCorta: inicio.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }).replace(".", ""),
    fechaInicio: fechaLarga(inicio),
    fechaFin: fechaLarga(fin),
    precio: Number(s.precio),
    capacidad: Number(s.capacidad).toLocaleString("es-CO") + " personas",
    disponibles: Number(s.capacidad),
    observaciones: s.observaciones ||
      (Number(s.edad) > 0 ? "Ingreso para mayores de " + s.edad + " años." : "Sin observaciones."),
    estado: "Programado",
    descripcion: s.descripcion,
    imagen: s.imagen || "img/evento-sin-foto.svg",
    /* El punto que marcó el agente; si no hay, la ciudad de otro evento o el centro del país */
    lat: s.lat !== undefined && s.lat !== "" ? Number(s.lat) : (vecino ? vecino.lat : 4.5709),
    lon: s.lon !== undefined && s.lon !== "" ? Number(s.lon) : (vecino ? vecino.lon : -74.2973),
    edad: Number(s.edad) || 0,
    parche: s.plan,
    categoria: s.categoria || "",
    agente: s.agente || "",
    nitAgente: s.nit,
    departamento: s.departamento || ""
  };
}

/* Eventos de ejemplo que los agentes enviaron a revisión (modo local).
   Se cargan solo si el navegador todavía no tiene la lista: después
   cuenta lo que se apruebe, rechace o retire. Los NIT son los de
   AGENTES_DEMO en admin.js; el primero es de la cuenta de prueba
   tarima@eldesparche.online. */
var SOLICITUDES_DEMO = [
  {
    id: "SOL-DEMO-1", nit: "901234567-1", nombre: "Bogotá Indie Fest",
    categoria: "musica", plan: "parchesote",
    descripcion: "Doce bandas independientes de todo el país en dos tarimas, con zona de comidas y feria de vinilos. Un día entero para descubrir la música nueva de Colombia.",
    inicio: "2027-03-06T14:00", fin: "2027-03-07T00:00",
    ciudad: "Bogotá", departamento: "Cundinamarca",
    teatro: "Parque Simón Bolívar", direccion: "Calle 63 # 59A-06",
    lat: 4.658400, lon: -74.093700,
    capacidad: 25000, precio: 220000, edad: 16,
    observaciones: "Apertura de puertas a la 1:00 p. m. No se permite el ingreso de alimentos.",
    imagen: "", estado: "En revisión", motivo: "", enviado: "2026-10-15T09:24:00"
  },
  {
    id: "SOL-DEMO-2", nit: "900876543-2", nombre: "Noche de Trova Antioqueña",
    categoria: "musica", plan: "parche",
    descripcion: "Los mejores trovadores de Antioquia se enfrentan en un duelo de coplas improvisadas, acompañados por un trío de cuerdas en vivo.",
    inicio: "2027-01-22T20:00", fin: "2027-01-22T23:30",
    ciudad: "Medellín", departamento: "Antioquia",
    teatro: "Teatro Pablo Tobón Uribe", direccion: "Carrera 40 # 51-24",
    lat: 6.246800, lon: -75.560300,
    capacidad: 850, precio: 60000, edad: 0,
    observaciones: "",
    imagen: "", estado: "En revisión", motivo: "", enviado: "2026-10-16T17:02:00"
  },
  {
    id: "SOL-DEMO-3", nit: "901112233-4", nombre: "Circo Familiar Bajo la Carpa",
    categoria: "circo", plan: "parchesito",
    descripcion: "Acróbatas, payasos y malabaristas en una función pensada para ir con niños. Al final, taller abierto de malabares para toda la familia.",
    inicio: "2026-12-19T16:00", fin: "2026-12-19T18:00",
    ciudad: "Cali", departamento: "Valle del Cauca",
    teatro: "Carpa del Parque de la Caña", direccion: "Carrera 8 # 34-00",
    lat: 3.456300, lon: -76.507500,
    capacidad: 1200, precio: 35000, edad: 0,
    observaciones: "Los menores de 2 años no pagan entrada.",
    imagen: "", estado: "En revisión", motivo: "", enviado: "2026-10-17T11:45:00"
  },
  {
    id: "SOL-DEMO-4", nit: "901556677-8", nombre: "Stand Up en el Barrio",
    categoria: "comedia", plan: "parche",
    descripcion: "Cinco comediantes nuevos de la escena bogotana prueban su material más reciente. Una noche corta, cercana y para reírse de la vida en la ciudad.",
    inicio: "2026-11-28T20:00", fin: "2026-11-28T22:00",
    ciudad: "Bogotá", departamento: "Cundinamarca",
    teatro: "Teatro Libre de Chapinero", direccion: "Calle 62 # 10-65",
    lat: 4.648000, lon: -74.064000,
    capacidad: 400, precio: 40000, edad: 18,
    observaciones: "Contenido para adultos.",
    imagen: "", estado: "En revisión", motivo: "", enviado: "2026-10-18T08:10:00"
  }
];

/* En modo local, los eventos aprobados y los cambios de estado hechos
   desde la administración se aplican a toda la web */
if (!USAR_API) {
  try {
    if (localStorage.getItem("eventosAgente") === null) {
      localStorage.setItem("eventosAgente", JSON.stringify(SOLICITUDES_DEMO));
    } else {
      /* Los ejemplos guardados antes de que existiera el mapa reciben su punto */
      var guardadas = JSON.parse(localStorage.getItem("eventosAgente")) || [];
      var cambio = false;
      guardadas.forEach(function (s) {
        /* "lugar" ahora se llama "teatro", como en la base de datos */
        if (s.lugar !== undefined && s.teatro === undefined) {
          s.teatro = s.lugar;
          delete s.lugar;
          cambio = true;
        }
        var demo = SOLICITUDES_DEMO.filter(function (d) { return d.id === s.id; })[0];
        if (demo && (s.lat === undefined || s.lat === "")) {
          s.lat = demo.lat;
          s.lon = demo.lon;
          cambio = true;
        }
      });
      if (cambio) localStorage.setItem("eventosAgente", JSON.stringify(guardadas));
    }
  } catch (e) {}

  try {
    (JSON.parse(localStorage.getItem("eventosAgente")) || [])
      .filter(function (s) { return s.estado === "Aprobado" && s.idEvento; })
      .forEach(function (s) { EVENTOS.push(eventoDeSolicitud(s)); });
  } catch (e) {}

  /* Eventos que el administrador registró, modificó o eliminó en este navegador */
  try {
    var datosEventos = JSON.parse(localStorage.getItem("datosEventos")) || {};
    var eliminados = (datosEventos.eliminados || []).map(String);
    for (var k = EVENTOS.length - 1; k >= 0; k--) {
      if (eliminados.indexOf(String(EVENTOS[k].id)) !== -1) EVENTOS.splice(k, 1);
    }
    EVENTOS.forEach(function (evento) {
      var cambio = (datosEventos.cambios || {})[evento.id];
      if (cambio) Object.assign(evento, cambio);
    });
    (datosEventos.nuevos || []).forEach(function (evento) { EVENTOS.push(evento); });
  } catch (e) {}

  /* Eventos guardados antes de que "lugar" se llamara "teatro" */
  EVENTOS.forEach(function (evento) {
    if (evento.teatro === undefined && evento.lugar !== undefined) {
      evento.teatro = evento.lugar;
      delete evento.lugar;
    }
  });

  try {
    var estadosGuardados = JSON.parse(localStorage.getItem("estadoEventos")) || {};
    EVENTOS.forEach(function (evento) {
      var guardado = estadosGuardados[evento.id];
      if (!guardado) return;
      if (typeof guardado === "string") {
        evento.estado = guardado;
      } else {
        evento.estado = guardado.estado;
        evento.observaciones = guardado.observaciones;
      }
    });
  } catch (e) {}
}

/* Lo que necesitan las páginas de administración (js/admin.js) */
window.Desparche = {
  usarApi: USAR_API,
  llamarApi: llamarApi,
  obtenerUsuario: obtenerUsuario,
  guardarUsuario: guardarUsuario,
  obtenerReservas: obtenerReservas,
  tokenEntrada: tokenEntrada,
  leerContenidoQr: leerContenidoQr,
  pintarQrReal: pintarQrReal,
  CAUSAS_CANCELACION: CAUSAS_CANCELACION,
  parcheDe: parcheDe,
  tarifaWompi: tarifaWompi,
  leerUbicaciones: leerUbicaciones,
  guardarUbicaciones: guardarUbicaciones,
  cuposLibres: cuposLibres,
  edadEn: edadEn,
  fechaTextoAIso: fechaTextoAIso,
  notaCancelacion: notaCancelacion,
  agregarNota: agregarNota,
  leerCancelacion: leerCancelacion,
  camposCancelacion: camposCancelacion,
  datosCancelacion: datosCancelacion,
  abrirAcceso: abrirAcceso,
  etiquetaEstado: etiquetaEstado,
  eventoDeSolicitud: eventoDeSolicitud,
  eventos: EVENTOS
};

/* ===== CATÁLOGO DESDE EL API =====
   Con USAR_API las páginas públicas muestran los eventos publicados de la base
   (GET /api/eventos, que nunca incluye las solicitudes en revisión) en vez de los
   de ejemplo. Se piden todas las páginas del catálogo y se reemplaza el contenido
   de EVENTOS; los paneles (admin.js y agente.js) cargan sus propios datos. */
var PAGINAS_PUBLICAS = ["inicio", "eventos", "evento", "reservar", "confirmacion", "mis-reservas"];

function cargarCatalogo() {
  var todos = [];

  function pedir(numero) {
    return llamarApi("/eventos?limite=100&pagina=" + numero).then(function (resultado) {
      var datos = revisarRespuesta(resultado, 200, "No se pudieron cargar los eventos.");
      todos = todos.concat(datos.eventos);
      return numero < datos.paginacion.paginas ? pedir(numero + 1) : todos;
    });
  }

  return pedir(1).then(usarCatalogo);
}

function usarCatalogo(eventos) {
  EVENTOS.splice(0, EVENTOS.length);
  eventos.forEach(function (evento) { EVENTOS.push(evento); });

  /* Carrusel de la portada: los próximos eventos que todavía se pueden reservar */
  DESTACADOS.splice(0, DESTACADOS.length);
  EVENTOS.filter(sePuedeReservar).slice(0, 10).forEach(function (evento) { DESTACADOS.push(evento.id); });

  /* Filtros de la portada: los países, departamentos y ciudades que tienen eventos */
  Object.keys(DEPARTAMENTOS).forEach(function (k) { delete DEPARTAMENTOS[k]; });
  Object.keys(CIUDADES).forEach(function (k) { delete CIUDADES[k]; });
  function agregar(lista, valor) {
    if (valor && lista.indexOf(valor) === -1) lista.push(valor);
  }
  EVENTOS.forEach(function (evento) {
    DEPARTAMENTOS[evento.pais] = DEPARTAMENTOS[evento.pais] || [];
    agregar(DEPARTAMENTOS[evento.pais], evento.departamento);
    CIUDADES[evento.departamento] = CIUDADES[evento.departamento] || [];
    agregar(CIUDADES[evento.departamento], evento.ciudad);
  });
  Object.keys(DEPARTAMENTOS).forEach(function (k) { DEPARTAMENTOS[k].sort(); });
  Object.keys(CIUDADES).forEach(function (k) { CIUDADES[k].sort(); });
}

/* Si el catálogo no carga, se avisa arriba de la página (las listas quedan vacías) */
function avisoCatalogo(texto) {
  var main = document.querySelector("main");
  if (!main) return;
  var aviso = document.createElement("p");
  aviso.className = "mensaje error aviso-catalogo";
  aviso.setAttribute("role", "alert");
  aviso.innerHTML = "<strong>Error:</strong> " + esc(texto);
  main.insertBefore(aviso, main.firstChild);
}

function arrancarPagina(pagina) {
  if (pagina === "inicio") {
    paginaInicio();
  } else if (pagina === "eventos") {
    paginaEventos();
  } else if (pagina === "evento") {
    paginaEvento();
  } else if (pagina === "reservar") {
    paginaReservar();
  } else if (pagina === "confirmacion") {
    paginaConfirmacion();
  } else if (pagina === "mis-reservas") {
    paginaMisReservas();
  }
}

var pagina = document.body.getAttribute("data-pagina");

if (USAR_API && PAGINAS_PUBLICAS.indexOf(pagina) !== -1) {
  cargarCatalogo().then(function () {
    arrancarPagina(pagina);
  }, function (error) {
    usarCatalogo([]);
    avisoCatalogo(error.message);
    /* Sin catálogo no hay evento que mostrar ni reservar: esas páginas se quedan con el aviso */
    if (pagina !== "evento" && pagina !== "reservar") arrancarPagina(pagina);
  });
} else {
  arrancarPagina(pagina);
}
