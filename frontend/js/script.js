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
var DESTACADOS = [1, 4, 8, 9, 2, 11];

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
           '<span class="oculto">Estado del evento: </span>' + estado +
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
    }

    /* La inicial del círculo es decorativa: el nombre completo ya va al
       lado, así que se oculta al lector con aria-hidden para que no lea
       la letra suelta antes del nombre. */
    caja.innerHTML =
      '<div class="usuario">' +
        '<span class="usuario-inicial" aria-hidden="true">' +
          usuario.nombre.charAt(0).toUpperCase() +
        '</span>' +
        '<span class="usuario-nombre">' +
          '<span class="oculto">Sesión iniciada como </span>' + usuario.nombre +
        '</span>' +
        marca +
        '<button type="button" id="salir">' +
          'Cerrar sesión<span class="oculto"> de ' + usuario.nombre + '</span>' +
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
          '<img src="' + evento.imagen + '" ' +
               'alt="Imagen promocional del evento ' + evento.titulo + ' en ' + evento.ciudad + '">' +
          etiquetaEstado(evento.estado, false) +
        '</div>' +
        '<div class="tarjeta-texto">' +
          '<h3 class="tarjeta-titulo">' +
            '<a class="tarjeta-enlace" href="evento.html?id=' + evento.id + '">' +
              evento.titulo +
            '</a>' +
          '</h3>' +
          '<p class="tarjeta-datos">' +
            '<span class="oculto">Ciudad y fecha: </span>' +
            evento.ciudad + ' · ' + evento.fechaCorta +
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
          '<img src="' + evento.imagen + '" ' +
               'alt="Cartel del evento ' + evento.titulo + '">' +
          '<p class="cartel-fecha">' +
            '<span class="oculto">Fechas: </span>' + evento.fechaCorta +
          '</p>' +
        '</div>' +
        '<div class="cartel-texto">' +
          '<h3 class="cartel-titulo">' +
            '<a class="cartel-enlace" href="evento.html?id=' + evento.id + '">' +
              evento.titulo +
            '</a>' +
          '</h3>' +
          '<p class="cartel-lugar">' +
            '<span class="oculto">Lugar: </span>' +
            evento.lugar + ' · ' + evento.ciudad +
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
  var SEGUNDOS = 4500;
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

    var mostrados = encontrados.slice(0, 8);
    pintarTarjetas(contenedor, mostrados);
    avisarResultados(mostrados.length);
  }

  /* Llena una lista desplegable con opciones.
     Si no hay opciones la lista queda desactivada (disabled): así el
     lector de pantalla la anuncia como "no disponible" y el estado no
     depende solo de que se vea más clarita (WCAG 1.4.1). */
  function llenarLista(lista, opciones, textoPorDefecto) {
    lista.innerHTML = '<option value="">' + textoPorDefecto + '</option>';
    for (var i = 0; i < opciones.length; i++) {
      lista.innerHTML = lista.innerHTML +
        '<option>' + opciones[i] + '</option>';
    }
    lista.disabled = opciones.length === 0;
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
        '<img class="logo-icono" src="img/14603.png" alt="" aria-hidden="true">' +
        '<img class="logo-texto" src="img/b48ef.png" alt="" aria-hidden="true">' +
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
           grupo: CLIENTE pide fecha de nacimiento; EMPRESA pide NIT y
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

        /* Solo para cuenta de Agente (tabla EMPRESA) */
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

/* Llama al API y devuelve { estado, datos }. Si el servidor no responde,
   rechaza la promesa con un mensaje que se puede mostrar tal cual. */
function llamarApi(ruta, opciones) {
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

  caja.innerHTML = '<span><strong>Error:</strong> ' + texto + '</span>';

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

  guardarUsuario({
    nombre: u.nombres + " " + u.apellidos,
    correo: u.correo,
    tipo: u.tipo_usuario === "EMPRESA" ? "agente" : "usuario",
    rol: u.tipo_usuario,
    id: u.numero_identificacion,
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
    tipo_cuenta: esAgente ? "EMPRESA" : "CLIENTE",
    tipo_identificacion: valor("tipo-id-registro"),
    numero_identificacion: valor("numero-id-registro"),
    nombres: valor("nombres-registro"),
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
    ["nombres", "Escribe tus nombres.", "nombres-registro"],
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
    nombres: "nombres-registro",
    apellidos: "apellidos-registro",
    telefono: "telefono-registro",
    id_ciudad: "ciudad-registro",
    direccion: "direccion-registro",
    coordenadas: "direccion-registro",
    fecha_nacimiento: "nacimiento-registro",
    alias: "alias-registro",
    nit: "nit-registro",
    razon_social: "razon-registro",
    nombre_comercial: "comercial-registro",
    correo: "correo-registro",
    contrasena: "clave-registro"
  });
}


/* ==========================================================================
   14. ARRANQUE
   Revisa en qué página estamos y ejecuta lo que corresponde.
   ========================================================================== */

crearModalAcceso();
pintarSesion();
prepararPanelAccesibilidad();
prepararTamanoTexto();

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
