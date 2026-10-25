/* ==========================================================================
   controladores/eventosControlador.js
   Listado de eventos con filtros (eventos.html) y detalle de un evento (evento.html).
   ========================================================================== */

import { parametro } from "../lib/dom.js";
import { buscarEvento, ciudadesDelCatalogo, filtrarEventosListado } from "../modelos/eventoModelo.js";
import { llenarCiudadesFiltro, pintarContador, pintarDetalleEvento, pintarTarjetas } from "../vistas/eventoVista.js";

export function paginaEventos() {
  var contenedor = document.getElementById("lista-eventos");
  var busqueda = document.getElementById("busqueda");
  var ciudad = document.getElementById("ciudad");
  var estado = document.getElementById("estado");

  llenarCiudadesFiltro(ciudadesDelCatalogo());

  function actualizar() {
    var encontrados = filtrarEventosListado(busqueda.value, ciudad.value, estado.value);
    pintarContador(encontrados.length);
    pintarTarjetas(contenedor, encontrados);
  }

  busqueda.oninput = actualizar;
  ciudad.onchange = actualizar;
  estado.onchange = actualizar;

  /* Enter en el buscador solo vuelve a filtrar: no recarga la página */
  document.getElementById("filtros-eventos").onsubmit = function (evento) {
    evento.preventDefault();
    actualizar();
  };

  actualizar();
}

export function paginaEvento() {
  var evento = buscarEvento(parametro("id"));

  /* Si la dirección no trae un evento válido, vuelve al listado */
  if (!evento) {
    window.location.href = "eventos.html";
    return;
  }

  pintarDetalleEvento(evento);
}
