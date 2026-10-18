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

var PARCHE_DE_EVENTO = {
  1: "parchesote", 2: "parchesote", 3: "parchesito", 4: "parchesito",
  5: "parchesote", 6: "parche", 7: "parche", 8: "parchesote",
  9: "parchesote", 10: "parche", 11: "parchesote", 12: "parchesito"
};

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

/* Solicitudes de verificación de identidad, una por correo (modo local) */
function leerVerificaciones() {
  try {
    return JSON.parse(localStorage.getItem("verificaciones")) || {};
  } catch (e) {
    return {};
  }
}

function guardarVerificacion(correo, solicitud) {
  var todas = leerVerificaciones();
  todas[correo] = solicitud;
  localStorage.setItem("verificaciones", JSON.stringify(todas));
}

/* Las cuentas de prueba marcadas como "verificada" ya vienen aprobadas */
function verificacionDe(correo) {
  var guardada = leerVerificaciones()[correo];
  if (guardada) return guardada;

  var cuenta = CUENTAS_PRUEBA.filter(function (c) { return c.correo === correo && c.verificada; })[0];
  if (!cuenta) return null;

  return {
    estado: "Aprobada",
    tipo: "Biométrica",
    fechaSolicitud: "2026-09-01T10:00:00",
    nombre: cuenta.usuario.nombre + " " + cuenta.usuario.apellidos,
    correo: correo,
    tipoDocumento: cuenta.usuario.tipo_identificacion,
    documento: cuenta.usuario.numero_identificacion,
    nacimiento: cuenta.usuario.fecha_nacimiento
  };
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
    } else if (usuario.tipo === "admin") {
      marca = '<span class="marca-agente">Administrador</span>';
      agregarEnlaceAdmin();
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
      registrarSesionAdmin(usuario).then(function () {
        borrarUsuario();
        window.location.href = "index.html";
      });
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


/* Con sesión de administrador, el menú principal gana el enlace al panel */
function agregarEnlaceAdmin() {
  var lista = document.querySelector("#menu-principal ul");
  if (!lista || lista.querySelector('a[href="admin.html"]')) return;

  var enPanel = (document.body.getAttribute("data-pagina") || "").indexOf("admin") === 0;
  var elemento = document.createElement("li");
  elemento.innerHTML = '<a href="admin.html"' +
    (enPanel ? ' class="activo" aria-current="page"' : '') + '>Administración</a>';
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
            esc(evento.lugar) + ' · ' + esc(evento.ciudad) +
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
      var coincideParche = parcheElegido === "" || PARCHE_DE_EVENTO[evento.id] === parcheElegido;

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
  /* El alt describe la imagen, no repite solamente el título */
  imagen.alt = "Imagen promocional del evento " + evento.titulo + " en " + evento.ciudad;

  /* La etiqueta se reemplaza entera para que lleve también el icono
     del estado, no solo el color de fondo (WCAG 1.4.1). */
  var etiqueta = document.getElementById("evento-estado");
  etiqueta.outerHTML = etiquetaEstado(evento.estado, true)
    .replace('<span class="estado', '<span id="evento-estado" class="estado');

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

  actualizarResumen();

  /* Solo reservan los clientes con la identidad verificada (regla de negocio) */
  var botonConfirmar = document.getElementById("confirmar");
  var verificacion = verificacionDe(usuario.correo);
  var bloqueo = "";

  if (usuario.tipo !== "usuario") {
    bloqueo = "Solo las cuentas de cliente pueden reservar entradas.";
  } else if (!verificacion || verificacion.estado === "Rechazada") {
    bloqueo = (verificacion
      ? "Tu verificación de identidad fue rechazada" +
        (verificacion.motivo ? ": " + esc(verificacion.motivo) : "") + ". Vuelve a intentarlo para poder reservar."
      : "Para reservar entradas necesitas verificar tu identidad. Es un paso único: escaneas tu cédula y te tomas una selfie.") +
      ' <a href="verificar.html">Verificar mi identidad</a>';
  } else if (verificacion.estado === "Pendiente") {
    bloqueo = "Tu verificación de identidad está en revisión. Podrás reservar en cuanto un administrador la apruebe. " +
      '<a href="verificar.html">Ver el estado de mi verificación</a>';
  }

  if (bloqueo) {
    var avisoBloqueo = document.createElement("p");
    avisoBloqueo.className = "aviso-verificacion";
    avisoBloqueo.id = "aviso-verificacion";
    avisoBloqueo.innerHTML = bloqueo;
    botonConfirmar.parentNode.insertBefore(avisoBloqueo, botonConfirmar);
    botonConfirmar.disabled = true;
    botonConfirmar.setAttribute("aria-describedby", "aviso-verificacion");
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
      lugar: evento.lugar,
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

  botonConfirmar.onclick = function () {
    errorPago.textContent = "";

    /* Evento gratuito: no pasa por Wompi */
    if (evento.precio === 0) {
      guardarYConfirmar(generarCodigoReserva(), 0, null);
      return;
    }

    var total = (evento.precio + cargo) * tickets;
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

    var pago = USAR_API ? pagarConWompi(datos) : pasarelaSimulada(datos);

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
  return { codigo: partes[1], idEvento: Number(partes[2]), token: partes[3] };
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
    document.title = "Pago en proceso - El Desparche";
    document.querySelector(".titulo-exito").textContent = "Tu pago está en proceso";
    document.querySelector(".subtitulo-exito").textContent =
      "Guardamos tu reserva mientras Wompi confirma el pago. Te avisaremos por correo cuando esté listo.";

    var qr = document.getElementById("qr");
    var aviso = document.createElement("p");
    aviso.className = "qr-pendiente";
    aviso.innerHTML = "<strong>Pago pendiente.</strong> Tu QR aparecerá aquí y en \"Mis reservas\" " +
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
      } else if (r.pago && r.pago.estado === "PENDING") {
        acciones =
          '<span class="sin-qr">Pago pendiente: el QR aparece al aprobarse</span>' +
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
          '<td data-titulo="Lugar">' + esc(r.lugar) + '</td>' +
          '<td data-titulo="Tickets">' + esc(r.tickets) + '</td>' +
          '<td data-titulo="Total">' + (r.total === 0 ? "Gratis" : pesos(r.total)) + '</td>' +
          '<td data-titulo="Estado"><span class="etiqueta-reserva ' + claseReserva + '">' + esc(r.estado) + '</span></td>' +
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
var USAR_API = false;

/* Cuentas de prueba para el modo local (solo funcionan con USAR_API = false) */
var CUENTAS_PRUEBA = [
  {
    correo: "admin@eldesparche.online",
    contrasena: "Desparche2026",
    usuario: {
      numero_identificacion: "1000000001",
      nombre: "Sebastián",
      apellidos: "Jaramillo",
      correo: "admin@eldesparche.online",
      tipo_usuario: "ADMIN"
    }
  },
  {
    correo: "valentina@eldesparche.online",
    contrasena: "Cliente2026",
    verificada: true,
    usuario: {
      numero_identificacion: "1116254789",
      tipo_identificacion: "CC",
      nombre: "Valentina",
      apellidos: "Ríos Castaño",
      correo: "valentina@eldesparche.online",
      fecha_nacimiento: "2001-04-17",
      tipo_usuario: "CLIENTE"
    }
  },
  {
    correo: "juandavid@eldesparche.online",
    contrasena: "Cliente2026",
    verificada: true,
    usuario: {
      numero_identificacion: "1006478123",
      tipo_identificacion: "CC",
      nombre: "Juan David",
      apellidos: "Ospina",
      correo: "juandavid@eldesparche.online",
      fecha_nacimiento: "1998-11-02",
      tipo_usuario: "CLIENTE"
    }
  },
  {
    correo: "andres@eldesparche.online",
    contrasena: "Cliente2026",
    verificada: true,
    usuario: {
      numero_identificacion: "1088345612",
      tipo_identificacion: "CC",
      nombre: "Andrés Felipe",
      apellidos: "Cardona",
      correo: "andres@eldesparche.online",
      fecha_nacimiento: "1987-03-08",
      tipo_usuario: "CLIENTE"
    }
  }
];

/* Imita las respuestas del API cuando USAR_API está en false */
function respuestaLocal(ruta, opciones) {
  var cuerpo = opciones && opciones.body ? JSON.parse(opciones.body) : {};

  if (ruta === "/ciudades") {
    var ciudades = [];
    Object.keys(CIUDADES).forEach(function (departamento) {
      CIUDADES[departamento].forEach(function (nombre) {
        ciudades.push({ id_ciudad: ciudades.length + 1, nombre: nombre, departamento: departamento });
      });
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
          nombre: cuerpo.correo.split("@")[0],
          apellidos: "",
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
          nombre: cuerpo.nombre,
          apellidos: cuerpo.apellidos,
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
   Se mantiene el formato que ya usan las demás pantallas (nombre, correo y
   tipo "usuario" | "agente") y se agrega el token para las próximas llamadas. */
function iniciarSesionLocal(respuesta) {
  var u = respuesta.usuario;

  var tipos = { AGENTE: "agente", ADMIN: "admin" };

  guardarUsuario({
    nombre: (u.nombre + " " + u.apellidos).trim(),
    correo: u.correo,
    tipo: tipos[u.tipo_usuario] || "usuario",
    rol: u.tipo_usuario,
    id: u.numero_identificacion,
    tipoDocumento: u.tipo_identificacion || "",
    nacimiento: u.fecha_nacimiento || "",
    token: respuesta.token,
    inicioSesion: new Date().toISOString()
  });

  window.location.reload();
}

/* SESION_ADMIN se guarda al cerrar la sesión de un administrador.
   Con el API, el backend la registra en POST /api/auth/logout (con la IP real). */
function registrarSesionAdmin(usuario) {
  if (usuario.tipo !== "admin") return Promise.resolve();

  if (USAR_API) {
    return llamarApi("/auth/logout", {
      method: "POST",
      headers: { Authorization: "Bearer " + usuario.token }
    }).catch(function () {});
  }

  try {
    var sesiones = JSON.parse(localStorage.getItem("sesionesAdmin")) || [];
    sesiones.push({
      numero_identificacion: usuario.id,
      nombre: usuario.nombre,
      fecha_hora_conexion: usuario.inicioSesion || new Date().toISOString(),
      fecha_hora_desconexion: new Date().toISOString(),
      direccion_ip: "127.0.0.1"
    });
    localStorage.setItem("sesionesAdmin", JSON.stringify(sesiones));
  } catch (e) {}
  return Promise.resolve();
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
    if (document.querySelector('#menu-principal a[href="admin.html"]')) {
      paginas.push({ href: "admin.html", texto: "Administración", icono: "admin" });
    }

    var html = "";
    for (var i = 0; i < paginas.length; i++) {
      var esActual = paginas[i].href === actual ||
        (paginas[i].href === "admin.html" && actual.indexOf("admin") === 0);
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

/* En modo local, los cambios de estado hechos desde la administración
   se aplican a toda la web */
if (!USAR_API) {
  try {
    var estadosGuardados = JSON.parse(localStorage.getItem("estadoEventos")) || {};
    EVENTOS.forEach(function (evento) {
      if (estadosGuardados[evento.id]) evento.estado = estadosGuardados[evento.id];
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
  registrarSesionAdmin: registrarSesionAdmin,
  pintarQrReal: pintarQrReal,
  leerVerificaciones: leerVerificaciones,
  guardarVerificacion: guardarVerificacion,
  verificacionDe: verificacionDe,
  abrirAcceso: abrirAcceso,
  etiquetaEstado: etiquetaEstado,
  eventos: EVENTOS
};

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
