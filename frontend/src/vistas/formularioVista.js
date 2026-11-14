/* ==========================================================================
   vistas/formularioVista.js
   Formularios de los paneles: cómo se dibujan los campos, cómo se leen y cómo se muestran los errores.
   ========================================================================== */

import { escapar } from "../lib/formato.js";

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
export function htmlFormulario(idForm, campos, valores, textoGuardar) {
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
export function leerFormulario(campos) {
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
export function mostrarErroresFormulario(idForm, campos, errores) {
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
