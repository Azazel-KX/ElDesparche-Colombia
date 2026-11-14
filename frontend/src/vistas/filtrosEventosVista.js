/* ==========================================================================
   vistas/filtrosEventosVista.js
   Menú desplegable de filtros (eventos.html y los eventos del administrador; mismo patrón que el panel de
   accesibilidad) y las etiquetas que resumen los filtros aplicados.
   ========================================================================== */

import { escapar } from "../lib/formato.js";

/* Un botón con aria-expanded abre y cierra el panel; Escape, un clic fuera o "Listo" lo cierran, y si el foco sale
   del menú con el tabulador también se cierra. */
export var IDS_FILTROS = { boton: "abrir-filtros", panel: "panel-filtros", listo: "cerrar-filtros", chips: "filtros-chips", cantidad: "filtros-activos" };

export function prepararMenuFiltros(ids) {
  ids = ids || IDS_FILTROS;
  var boton = document.getElementById(ids.boton);
  var panel = document.getElementById(ids.panel);
  var listo = document.getElementById(ids.listo);
  if (!boton || !panel) return;

  /* Los oyentes del documento quedan de una visita anterior a la sección: solo cuentan si el menú sigue en la página */
  function abierto() { return document.contains(boton) && boton.getAttribute("aria-expanded") === "true"; }
  function dentro(elemento) { return panel.contains(elemento) || boton.contains(elemento); }

  function poner(abrir) {
    boton.setAttribute("aria-expanded", abrir ? "true" : "false");
    panel.hidden = !abrir;
  }

  boton.onclick = function () {
    poner(!abierto());
    if (abierto()) panel.querySelector("select").focus();
  };

  listo.onclick = function () {
    poner(false);
    boton.focus();
  };

  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && abierto()) {
      /* Si el foco estaba dentro del panel, vuelve al botón para no perderse (WCAG 2.4.3) */
      var estabaDentro = panel.contains(document.activeElement);
      poner(false);
      if (estabaDentro) boton.focus();
    }
  });
  document.addEventListener("click", function (evento) {
    if (abierto() && !dentro(evento.target)) poner(false);
  });
  document.addEventListener("focusin", function (evento) {
    if (abierto() && !dentro(evento.target)) poner(false);
  });
}

/* chips = [{ clave, texto }]; alQuitar(clave) se llama al pulsar una etiqueta. También pone la cantidad en el botón. */
export function pintarFiltrosActivos(chips, alQuitar, ids) {
  ids = ids || IDS_FILTROS;
  var lista = document.getElementById(ids.chips);
  var cantidad = document.getElementById(ids.cantidad);

  cantidad.hidden = chips.length === 0;
  cantidad.textContent = chips.length;
  lista.hidden = chips.length === 0;
  lista.innerHTML = chips.map(function (c) {
    return '<li><button type="button" class="filtro-chip" data-quitar="' + escapar(c.clave) + '">' +
      escapar(c.texto) +
      '<span class="oculto"> (quitar este filtro)</span>' +
      '<span class="filtro-chip-x" aria-hidden="true">&times;</span>' +
    '</button></li>';
  }).join("");

  lista.onclick = function (evento) {
    var boton = evento.target.closest("button[data-quitar]");
    if (boton) alQuitar(boton.getAttribute("data-quitar"));
  };
}
