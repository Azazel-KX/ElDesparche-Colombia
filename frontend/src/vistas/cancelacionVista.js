/* ==========================================================================
   vistas/cancelacionVista.js
   Campos para pedir la causa de una cancelación.
   ========================================================================== */

import { CAUSAS_CANCELACION, CAUSAS_CLIENTE } from "../modelos/cancelacionModelo.js";

/* Campos de causa y detalle; "id" distingue los de cada formulario.
   tipo: "reserva", "evento" o "cliente" (la reserva vista por el cliente) */
export function camposCancelacion(tipo, id) {
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
export function datosCancelacion(id) {
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
