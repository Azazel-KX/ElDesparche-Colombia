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
    titulo: "Festival Estéreo Picnic",
    ciudad: "Bogotá",
    lugar: "Parque La Florida",
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
    titulo: "Morat - Antes de que amanezca",
    ciudad: "Medellín",
    lugar: "Movistar Arena Medellín",
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
    titulo: "Jazz al Parque",
    ciudad: "Bogotá",
    lugar: "Parque El Country",
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
    titulo: "Circo del Sol - KOOZA",
    ciudad: "Cali",
    lugar: "Centro de Eventos Valle Pacífico",
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
    titulo: "Festival Mundial de Salsa",
    ciudad: "Cali",
    lugar: "Cali Exposhow",
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
    titulo: "Macondo, la obra",
    ciudad: "Barranquilla",
    lugar: "Teatro Amira de la Rosa",
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
    titulo: "Lokillo - Eso era antes",
    ciudad: "Bucaramanga",
    lugar: "Coliseo El Campin Norte",
    fechaCorta: "16 nov 2026",
    fechaInicio: "16 de noviembre de 2026 - 8:00 p. m.",
    fechaFin: "16 de noviembre de 2026 - 11:00 p. m.",
    precio: 68000,
    capacidad: "8.000 personas",
    disponibles: 0,
    observaciones: "Evento cancelado. Se realizarán devoluciones en los próximos 10 días hábiles.",
    estado: "Cancelado",
    descripcion: "La gira Eso era antes de Lokillo fue cancelada por causas de fuerza mayor. Contacta al punto de venta para tu reembolso.",
    imagen: "img/67c1c.png",
    lat: 7.1254,
    lon: -73.1198
  },
  {
    id: 8,
    titulo: "Ritvales 2026",
    ciudad: "Medellín",
    lugar: "Parque Norte",
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
    titulo: "Zona Estéreo Urbano 2026",
    ciudad: "Medellín",
    lugar: "Estadio Atanasio Girardot",
    fechaCorta: "8 oct 2026",
    fechaInicio: "8 de octubre de 2026 - 6:00 p. m.",
    fechaFin: "9 de octubre de 2026 - 1:00 a. m.",
    precio: 120000,
    capacidad: "45.000 personas",
    disponibles: 12000,
    observaciones: "Evento con consumo mínimo en zonas VIP.",
    estado: "En Boletería",
    descripcion: "Una noche de electrónica, rap y pop urbano en el corazón de Medellín. El festival que unifica todos los géneros urbanos en una sola tarima.",
    imagen: "img/33202.png",
    lat: 6.2567,
    lon: -75.59
  },
  {
    id: 10,
    titulo: "Batallas Épicas de Rap",
    ciudad: "Bogotá",
    lugar: "Teatro Jorge Eliécer Gaitán",
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
    titulo: "Cali Salsa Festival",
    ciudad: "Cali",
    lugar: "Parque de la Música",
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
    titulo: "Concierto Acústico Campestre",
    ciudad: "Guatavita Reservoirs",
    lugar: "Hacienda La Fragua",
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
var DEPARTAMENTOS = {
  "Colombia": ["Antioquia", "Cundinamarca", "Valle del Cauca", "Santander"],
  "México": ["CDMX", "Jalisco"],
  "Argentina": ["Buenos Aires"]
};

var CIUDADES = {
  "Antioquia": ["Medellín"],
  "Cundinamarca": ["Bogotá"],
  "Valle del Cauca": ["Cali"],
  "Santander": ["Bucaramanga"],
  "CDMX": ["Ciudad de México"],
  "Jalisco": ["Guadalajara"],
  "Buenos Aires": ["Buenos Aires"]
};


/* ==========================================================================
   2. FUNCIONES DE APOYO
   ========================================================================== */

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
  return "estado-cancelado";
}

/* Lee un parámetro de la dirección: evento.html?id=3 -> "3" */
function parametro(nombre) {
  var direccion = new URLSearchParams(window.location.search);
  return direccion.get(nombre);
}

/* Busca un evento por su id */
function buscarEvento(id) {
  for (var i = 0; i < EVENTOS.length; i++) {
    if (EVENTOS[i].id === Number(id)) {
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
    }

    caja.innerHTML =
      '<div class="usuario">' +
        '<span class="usuario-inicial">' + usuario.nombre.charAt(0).toUpperCase() + '</span>' +
        '<span class="usuario-nombre">' + usuario.nombre + '</span>' +
        marca +
        '<button type="button" id="salir">Cerrar sesión</button>' +
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


/* ==========================================================================
   5. TARJETAS DE EVENTOS
   ========================================================================== */

/* Devuelve el HTML de una tarjeta */
function tarjetaEvento(evento) {
  return '' +
    '<a class="tarjeta" href="evento.html?id=' + evento.id + '">' +
      '<div class="tarjeta-imagen">' +
        '<img src="' + evento.imagen + '" alt="' + evento.titulo + '">' +
        '<span class="estado ' + claseEstado(evento.estado) + '">' + evento.estado + '</span>' +
      '</div>' +
      '<div class="tarjeta-texto">' +
        '<h3>' + evento.titulo + '</h3>' +
        '<p class="tarjeta-datos">' + evento.ciudad + ' · ' + evento.fechaCorta + '</p>' +
        '<div class="tarjeta-pie">' +
          '<span class="tarjeta-precio">' + textoPrecio(evento) + '</span>' +
          '<span class="tarjeta-ver">Ver evento →</span>' +
        '</div>' +
      '</div>' +
    '</a>';
}

/* Escribe una lista de eventos dentro de un contenedor */
function pintarTarjetas(contenedor, lista) {
  if (lista.length === 0) {
    contenedor.innerHTML = '<p class="texto-gris">No se encontraron eventos.</p>';
    return;
  }

  var html = "";
  for (var i = 0; i < lista.length; i++) {
    html = html + tarjetaEvento(lista[i]);
  }
  contenedor.innerHTML = html;
}


/* ==========================================================================
   6. PÁGINA DE INICIO
   ========================================================================== */

function paginaInicio() {
  var contenedor = document.getElementById("destacados");
  var busqueda = document.getElementById("busqueda");
  var pais = document.getElementById("pais");
  var departamento = document.getElementById("departamento");
  var ciudad = document.getElementById("ciudad");

  /* Filtra por texto y por ciudad, y muestra máximo 8 eventos */
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

      if (coincideTexto && coincideCiudad) {
        encontrados.push(evento);
      }
    }

    pintarTarjetas(contenedor, encontrados.slice(0, 8));
  }

  /* Llena una lista desplegable con opciones */
  function llenarLista(lista, opciones, textoPorDefecto) {
    lista.innerHTML = '<option value="">' + textoPorDefecto + '</option>';
    for (var i = 0; i < opciones.length; i++) {
      lista.innerHTML = lista.innerHTML +
        '<option>' + opciones[i] + '</option>';
    }
  }

  /* Al elegir país se llenan los departamentos */
  pais.onchange = function () {
    var lista = DEPARTAMENTOS[pais.value] || [];
    llenarLista(departamento, lista, "Todos");
    llenarLista(ciudad, [], "Todas");
    actualizar();
  };

  /* Al elegir departamento se llenan las ciudades */
  departamento.onchange = function () {
    var lista = CIUDADES[departamento.value] || [];
    llenarLista(ciudad, lista, "Todas");
    actualizar();
  };

  ciudad.onchange = actualizar;
  busqueda.oninput = actualizar;

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
  document.getElementById("evento-lugar").textContent = evento.lugar + " · " + evento.ciudad;

  var imagen = document.getElementById("evento-imagen");
  imagen.src = evento.imagen;
  imagen.alt = evento.titulo;

  var etiqueta = document.getElementById("evento-estado");
  etiqueta.textContent = evento.estado;
  etiqueta.className = "estado estado-grande " + claseEstado(evento.estado);

  /* Ficha con los datos del evento */
  var datos = [
    ["Teatro / lugar", evento.lugar],
    ["Ciudad", evento.ciudad],
    ["Fecha y hora de inicio", evento.fechaInicio],
    ["Fin estimado", evento.fechaFin],
    ["Capacidad total", evento.capacidad],
    ["Cupo disponible", evento.disponibles.toLocaleString("es-CO") + " entradas"],
    ["Precio base", textoPrecio(evento)],
    ["Observaciones", evento.observaciones]
  ];

  var ficha = "";
  for (var i = 0; i < datos.length; i++) {
    ficha = ficha +
      "<div><dt>" + datos[i][0] + "</dt><dd>" + datos[i][1] + "</dd></div>";
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
  var cargo = Math.round(evento.precio * 0.1);  /* 10% de cargo por servicio */

  /* Datos del evento */
  document.getElementById("miga-evento").textContent = evento.titulo;
  document.getElementById("miga-evento").href = "evento.html?id=" + evento.id;
  document.getElementById("mini-imagen").src = evento.imagen;
  document.getElementById("mini-imagen").alt = evento.titulo;
  document.getElementById("mini-titulo").textContent = evento.titulo;
  document.getElementById("mini-lugar").textContent = evento.ciudad + " · " + evento.lugar;
  document.getElementById("mini-fecha").textContent = evento.fechaInicio;
  document.getElementById("resumen-imagen").src = evento.imagen;
  document.getElementById("resumen-imagen").alt = evento.titulo;
  document.getElementById("resumen-titulo").textContent = evento.titulo;
  document.getElementById("resumen-fecha").textContent = evento.fechaInicio;

  document.getElementById("aviso-usuario").innerHTML =
    "Hola, <strong>" + usuario.nombre + "</strong>. Tu reserva se registrará a tu nombre. " +
    "Recibirás un correo con los detalles a <strong>" + usuario.correo + "</strong>.";

  /* Actualiza el resumen de precios */
  function actualizarResumen() {
    document.getElementById("tickets").textContent = tickets;

    if (evento.precio === 0) {
      document.getElementById("resumen-precio").textContent = "Gratis";
      document.getElementById("resumen-cargo").textContent = "Gratis";
      document.getElementById("resumen-total").textContent = "Gratis";
    } else {
      document.getElementById("resumen-precio").textContent = pesos(evento.precio);
      document.getElementById("resumen-cargo").textContent = pesos(cargo * tickets);
      document.getElementById("resumen-total").textContent = pesos((evento.precio + cargo) * tickets);
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
    if (tickets < 10) {
      tickets = tickets + 1;
      actualizarResumen();
    }
  };

  /* Guardar la reserva y pasar a la confirmación */
  document.getElementById("confirmar").onclick = function () {
    var total = 0;
    if (evento.precio > 0) {
      total = (evento.precio + cargo) * tickets;
    }

    var reserva = {
      codigo: generarCodigo(),
      idEvento: evento.id,
      titulo: evento.titulo,
      lugar: evento.lugar,
      ciudad: evento.ciudad,
      fechaEvento: evento.fechaInicio,
      titular: usuario.nombre,
      tickets: tickets,
      observaciones: document.getElementById("observaciones").value,
      total: total,
      fechaReserva: fechaDeHoy(),
      estado: "Reservada"
    };

    var reservas = obtenerReservas();
    reservas.unshift(reserva);
    guardarReservas(reservas);

    /* Se guarda el código para mostrarlo en la página de confirmación */
    localStorage.setItem("ultimaReserva", reserva.codigo);
    window.location.href = "confirmacion.html";
  };

  actualizarResumen();
}


/* ==========================================================================
   10. CÓDIGO QR
   Es un dibujo de adorno: una rejilla de 21x21 cuadritos con un patrón fijo.
   ========================================================================== */

var CUADROS_NEGROS = [
  "0,0","1,0","2,0","3,0","4,0","5,0","6,0",
  "0,1","6,1","0,2","2,2","3,2","4,2","6,2",
  "0,3","2,3","3,3","4,3","6,3","0,4","2,4","3,4","4,4","6,4",
  "0,5","6,5","0,6","1,6","2,6","3,6","4,6","5,6","6,6",
  "14,0","15,0","16,0","17,0","18,0","19,0","20,0",
  "14,1","20,1","14,2","16,2","17,2","18,2","20,2",
  "14,3","16,3","17,3","18,3","20,3","14,4","16,4","17,4","18,4","20,4",
  "14,5","20,5","14,6","15,6","16,6","17,6","18,6","19,6","20,6",
  "0,14","1,14","2,14","3,14","4,14","5,14","6,14",
  "0,15","6,15","0,16","2,16","3,16","4,16","6,16",
  "0,17","2,17","3,17","4,17","6,17","0,18","2,18","3,18","4,18","6,18",
  "0,19","6,19","0,20","1,20","2,20","3,20","4,20","5,20","6,20",
  "8,6","10,6","12,6","6,8","6,10","6,12",
  "14,8","16,8","18,8","20,8","8,14","8,16","8,18","8,20",
  "8,8","9,8","11,8","13,8","8,9","10,9","12,9","9,10","11,10","13,10",
  "8,11","10,11","12,11","9,12","11,12","13,12","8,13","10,13","12,13",
  "16,10","18,10","20,10","17,11","19,11","16,12","18,12","20,12",
  "15,13","17,13","19,13","16,14","18,14","15,15","17,15","19,15",
  "10,15","12,15","14,15","11,16","13,16","10,17","12,17","14,17",
  "11,18","13,18","15,18","10,19","12,19","14,19","11,20","13,20"
];

/* Dibuja el QR dentro de un elemento */
function pintarQr(elemento) {
  var html = "";

  for (var fila = 0; fila < 21; fila++) {
    for (var columna = 0; columna < 21; columna++) {
      if (CUADROS_NEGROS.indexOf(columna + "," + fila) !== -1) {
        html = html + '<span class="negro"></span>';
      } else {
        html = html + '<span></span>';
      }
    }
  }

  elemento.innerHTML = html;
}


/* ==========================================================================
   11. PÁGINA DE CONFIRMACIÓN
   ========================================================================== */

function paginaConfirmacion() {
  var codigo = localStorage.getItem("ultimaReserva");
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

  var datos = [
    ["Código de reserva", reserva.codigo],
    ["Evento", reserva.titulo],
    ["Fecha del evento", reserva.fechaEvento],
    ["Lugar", reserva.lugar + " - " + reserva.ciudad],
    ["Titular", reserva.titular],
    ["Tickets", reserva.tickets],
    ["Total pagado", reserva.total === 0 ? "Gratis" : pesos(reserva.total)],
    ["Fecha de reserva", reserva.fechaReserva]
  ];

  var html = "";
  for (var j = 0; j < datos.length; j++) {
    html = html + "<div><dt>" + datos[j][0] + "</dt><dd>" + datos[j][1] + "</dd></div>";
  }

  document.getElementById("detalles").innerHTML = html;
  document.getElementById("codigo").textContent = reserva.codigo;
  pintarQr(document.getElementById("qr"));
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
    "Hola, <strong>" + usuario.nombre + "</strong>. Aquí puedes ver y gestionar tus reservas.";

  function pintar() {
    var reservas = obtenerReservas();

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
            '<th>Evento</th><th>Fecha</th><th>Lugar</th><th>Tickets</th>' +
            '<th>Total</th><th>Estado</th><th>Acciones</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>';

    for (var i = 0; i < reservas.length; i++) {
      var r = reservas[i];
      var acciones = "";

      if (r.estado === "Cancelada") {
        acciones = '<span class="sin-qr">QR no disponible</span>';
      } else {
        acciones =
          '<button class="boton-mini boton-qr" data-qr="' + r.codigo + '">Ver QR</button>' +
          '<button class="boton-mini boton-cancelar" data-cancelar="' + r.codigo + '">Cancelar</button>';
      }

      var claseReserva = r.estado === "Cancelada" ? "reserva-cancelada" : "reserva-reservada";

      html = html +
        '<tr>' +
          '<td data-titulo="Evento"><a href="evento.html?id=' + r.idEvento + '">' + r.titulo + '</a></td>' +
          '<td data-titulo="Fecha">' + r.fechaEvento + '</td>' +
          '<td data-titulo="Lugar">' + r.lugar + '</td>' +
          '<td data-titulo="Tickets">' + r.tickets + '</td>' +
          '<td data-titulo="Total">' + (r.total === 0 ? "Gratis" : pesos(r.total)) + '</td>' +
          '<td data-titulo="Estado"><span class="etiqueta-reserva ' + claseReserva + '">' + r.estado + '</span></td>' +
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

    /* Botón "Cancelar": marca la reserva como cancelada */
    var botonesCancelar = document.querySelectorAll("[data-cancelar]");
    for (var m = 0; m < botonesCancelar.length; m++) {
      botonesCancelar[m].onclick = function () {
        var codigo = this.getAttribute("data-cancelar");

        if (!confirm("¿Seguro que quieres cancelar la reserva " + codigo + "?")) {
          return;
        }

        var lista = obtenerReservas();
        for (var n = 0; n < lista.length; n++) {
          if (lista[n].codigo === codigo) {
            lista[n].estado = "Cancelada";
          }
        }

        guardarReservas(lista);
        pintar();
      };
    }
  }

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

  modal.innerHTML = '' +
    '<div class="modal-caja">' +

      '<button type="button" class="modal-cerrar" id="cerrar-modal" aria-label="Cerrar">×</button>' +

      /* Logo de El Desparche */
      '<div class="modal-logo">' +
        '<img class="logo-icono" src="img/14603.png" alt="">' +
        '<img class="logo-texto" src="img/b48ef.png" alt="El Desparche">' +
      '</div>' +

      /* Pestañas */
      '<div class="modal-pestanas">' +
        '<button type="button" class="pestana activa" data-pestana="entrar">Iniciar sesión</button>' +
        '<button type="button" class="pestana" data-pestana="registro">Registrarse</button>' +
      '</div>' +

      /* ----- Formulario de inicio de sesión ----- */
      '<form id="form-entrar">' +
        '<p class="modal-saludo">¡Qué bueno verte de nuevo! Entra para ver y gestionar tus reservas.</p>' +

        '<div class="campo">' +
          '<label for="correo-entrar">Correo electrónico</label>' +
          '<input type="email" id="correo-entrar" placeholder="correo@ejemplo.com" autocomplete="email">' +
        '</div>' +

        '<div class="campo">' +
          '<label for="clave-entrar">Contraseña</label>' +
          '<input type="password" id="clave-entrar" placeholder="Mínimo 6 caracteres" autocomplete="current-password">' +
        '</div>' +

        '<p class="error" id="error-entrar"></p>' +

        '<button type="submit" class="boton boton-morado boton-ancho">Iniciar sesión</button>' +

        /* Aquí el registro aparece como un vínculo */
        '<p class="modal-pie">¿No tienes cuenta? ' +
          '<button type="button" class="vinculo" data-pestana="registro">Regístrate</button>' +
        '</p>' +
      '</form>' +

      /* ----- Formulario de registro ----- */
      '<form id="form-registro" hidden>' +
        '<p class="modal-saludo">Crea tu cuenta y empieza a despacharte.</p>' +

        /* Dos tipos de cuenta */
        '<p class="modal-subtitulo">¿Cómo quieres registrarte?</p>' +

        '<div class="tipos-cuenta">' +
          '<label class="tipo-cuenta">' +
            '<input type="radio" name="tipo-cuenta" value="usuario" checked>' +
            '<span class="tipo-icono" aria-hidden="true">🎟️</span>' +
            '<span class="tipo-nombre">Usuario</span>' +
            '<span class="tipo-texto">Reserva entradas para los eventos que te gusten.</span>' +
          '</label>' +

          '<label class="tipo-cuenta">' +
            '<input type="radio" name="tipo-cuenta" value="agente">' +
            '<span class="tipo-icono" aria-hidden="true">🎤</span>' +
            '<span class="tipo-nombre">Agente</span>' +
            '<span class="tipo-texto">Publica y administra tus propios eventos.</span>' +
          '</label>' +
        '</div>' +

        '<div class="campo">' +
          '<label for="nombre-registro">Nombre completo</label>' +
          '<input type="text" id="nombre-registro" placeholder="Tu nombre" autocomplete="name">' +
        '</div>' +

        '<div class="campo">' +
          '<label for="correo-registro">Correo electrónico</label>' +
          '<input type="email" id="correo-registro" placeholder="correo@ejemplo.com" autocomplete="email">' +
        '</div>' +

        '<div class="campo">' +
          '<label for="clave-registro">Contraseña</label>' +
          '<input type="password" id="clave-registro" placeholder="Mínimo 6 caracteres" autocomplete="new-password">' +
        '</div>' +

        '<p class="error" id="error-registro"></p>' +

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

  document.getElementById("form-entrar").onsubmit = entrar;
  document.getElementById("form-registro").onsubmit = registrar;
}

/* Muestra la pestaña de entrar o la de registro */
function cambiarPestana(cual) {
  var pestanas = document.querySelectorAll("#modal-acceso .pestana");

  for (var i = 0; i < pestanas.length; i++) {
    if (pestanas[i].getAttribute("data-pestana") === cual) {
      pestanas[i].classList.add("activa");
    } else {
      pestanas[i].classList.remove("activa");
    }
  }

  document.getElementById("form-entrar").hidden = cual !== "entrar";
  document.getElementById("form-registro").hidden = cual !== "registro";

  /* Se limpian los mensajes de error al cambiar */
  document.getElementById("error-entrar").textContent = "";
  document.getElementById("error-registro").textContent = "";
}

/* Abre la ventana emergente en la pestaña que se le indique */
function abrirAcceso(cual) {
  cambiarPestana(cual || "entrar");
  document.getElementById("modal-acceso").showModal();
}

/* Iniciar sesión */
function entrar(evento) {
  evento.preventDefault();

  var correo = document.getElementById("correo-entrar").value.trim();
  var clave = document.getElementById("clave-entrar").value;
  var error = document.getElementById("error-entrar");

  if (correo === "" || clave === "") {
    error.textContent = "Completa todos los campos.";
    return;
  }

  if (clave.length < 6) {
    error.textContent = "La contraseña debe tener mínimo 6 caracteres.";
    return;
  }

  /* El nombre se saca de la parte del correo anterior a la arroba */
  guardarUsuario({
    nombre: correo.split("@")[0],
    correo: correo,
    tipo: "usuario"
  });

  window.location.reload();
}

/* Crear cuenta */
function registrar(evento) {
  evento.preventDefault();

  var nombre = document.getElementById("nombre-registro").value.trim();
  var correo = document.getElementById("correo-registro").value.trim();
  var clave = document.getElementById("clave-registro").value;
  var error = document.getElementById("error-registro");
  var tipo = document.querySelector('input[name="tipo-cuenta"]:checked').value;

  if (nombre === "" || correo === "" || clave === "") {
    error.textContent = "Completa todos los campos.";
    return;
  }

  if (clave.length < 6) {
    error.textContent = "La contraseña debe tener mínimo 6 caracteres.";
    return;
  }

  guardarUsuario({ nombre: nombre, correo: correo, tipo: tipo });

  window.location.reload();
}


/* ==========================================================================
   14. ARRANQUE
   Revisa en qué página estamos y ejecuta lo que corresponde.
   ========================================================================== */

crearModalAcceso();
pintarSesion();

var pagina = document.body.getAttribute("data-pagina");

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
