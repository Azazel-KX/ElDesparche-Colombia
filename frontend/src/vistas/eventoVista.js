/* ==========================================================================
   vistas/eventoVista.js
   Cómo se muestran los eventos al público: tarjetas, carteles y avisos.
   ========================================================================== */

import { escapar, textoPesos, urlSegura } from "../lib/formato.js";
import { sePuedeReservar, tieneUbicacion } from "../modelos/eventoModelo.js";
import { etiquetaEstado } from "./etiquetasVista.js";

/* Devuelve el texto del precio, o "Entrada libre" si es gratis */
export function textoPrecioEvento(evento) {
  if (evento.precio === 0) {
    return "Entrada libre";
  }
  return textoPesos(evento.precio);
}

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
          '<img src="' + escapar(urlSegura(evento.imagen)) + '" ' +
               'alt="Imagen promocional del evento ' + escapar(evento.titulo) + ' en ' + escapar(evento.ciudad) + '">' +
          etiquetaEstado(evento.estado, false) +
        '</div>' +
        '<div class="tarjeta-texto">' +
          '<h3 class="tarjeta-titulo">' +
            '<a class="tarjeta-enlace" href="evento.html?id=' + encodeURIComponent(evento.id) + '">' +
              escapar(evento.titulo) +
            '</a>' +
          '</h3>' +
          '<p class="tarjeta-datos">' +
            '<span class="oculto">Ciudad y fecha: </span>' +
            escapar(evento.ciudad) + ' · ' + escapar(evento.fechaCorta) +
          '</p>' +
          '<div class="tarjeta-pie">' +
            '<span class="tarjeta-precio">' +
              '<span class="oculto">Precio: </span>' + textoPrecioEvento(evento) +
            '</span>' +
            /* Es puro adorno: el enlace real es el título, y repetirlo
               obligaría al lector a decir "Ver evento" en cada tarjeta. */
            '<span class="tarjeta-ver" aria-hidden="true">Ver evento</span>' +
          '</div>' +
        '</div>' +
      '</article>' +
    '</li>';
}

/* Escribe una lista de eventos dentro de un contenedor <ul> */
export function pintarTarjetas(contenedor, lista) {
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

/* "1 evento" / "5 eventos" en el listado */
export function pintarContador(cuantos) {
  document.getElementById("contador").innerHTML =
    "<strong>" + cuantos + "</strong><span>" + (cuantos === 1 ? "evento para ti" : "eventos para ti") + "</span>";
}

/* Todo el detalle de un evento: título, ficha, estado, botón de reservar y mapa */
export function pintarDetalleEvento(evento) {
  document.title = evento.titulo + " - El Desparche";
  document.getElementById("miga-titulo").textContent = evento.titulo;
  document.getElementById("evento-titulo").textContent = evento.titulo;
  document.getElementById("evento-descripcion").textContent = evento.descripcion;
  document.getElementById("evento-precio").textContent = textoPrecioEvento(evento);
  /* El sitio en grande y debajo, en gris, dónde queda */
  var dondeQueda = [evento.direccion, evento.ciudad, evento.pais].filter(Boolean).join(", ");
  document.getElementById("evento-lugar").innerHTML =
    "<strong>" + escapar(evento.teatro) + "</strong><span>" + escapar(dondeQueda) + "</span>";

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
    ["Precio base", textoPrecioEvento(evento)],
    ["Edad mínima", evento.edad > 0 ? evento.edad + " años" : "Para todo público"],
    ["Observaciones", evento.observaciones]
  ];

  var ficha = "";
  for (var i = 0; i < datos.length; i++) {
    ficha = ficha +
      "<div><dt>" + escapar(datos[i][0]) + "</dt><dd>" + escapar(datos[i][1]) + "</dd></div>";
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

/* Escribe en la región role="status" cuántos eventos se encontraron.
   Como la lista se filtra sin recargar la página, sin este aviso quien
   usa lector de pantalla no se entera de que el resultado cambió
   (WCAG 4.1.3 Mensajes de estado). */
export function avisarResultados(cuantos) {
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
export function cartelPrincipal(evento) {
  return '' +
    '<li class="cartel">' +
      '<article class="cartel-cuerpo">' +
        '<div class="cartel-imagen">' +
          '<img src="' + escapar(urlSegura(evento.imagen)) + '" ' +
               'alt="Cartel del evento ' + escapar(evento.titulo) + '">' +
          '<p class="cartel-fecha">' +
            '<span class="oculto">Fechas: </span>' + escapar(evento.fechaCorta) +
          '</p>' +
        '</div>' +
        '<div class="cartel-texto">' +
          '<h3 class="cartel-titulo">' +
            '<a class="cartel-enlace" href="evento.html?id=' + encodeURIComponent(evento.id) + '">' +
              escapar(evento.titulo) +
            '</a>' +
          '</h3>' +
          '<p class="cartel-lugar">' +
            '<span class="oculto">Lugar: </span>' +
            escapar(evento.teatro) + ' · ' + escapar(evento.ciudad) +
          '</p>' +
        '</div>' +
      '</article>' +
    '</li>';
}

/* Si el catálogo no carga, se avisa arriba de la página (las listas quedan vacías) */
export function avisoCatalogo(texto) {
  var main = document.querySelector("main");
  if (!main) return;
  var aviso = document.createElement("p");
  aviso.className = "mensaje error aviso-catalogo";
  aviso.setAttribute("role", "alert");
  aviso.innerHTML = "<strong>Error:</strong> " + escapar(texto);
  main.insertBefore(aviso, main.firstChild);
}

/* Mapa de solo lectura con el punto que marcó el agente */
export function mapaSolicitud(s) {
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
