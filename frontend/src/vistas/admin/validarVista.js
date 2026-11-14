/* ==========================================================================
   vistas/admin/validarVista.js
   Validar entradas (admin.html?seccion=validar y agente.html?seccion=validar): resultado de cada
   entrada, lista de ingresos y lector de códigos QR con la cámara.
   ========================================================================== */

import { fechaHora } from "../../lib/fechas.js";
import { escapar } from "../../lib/formato.js";

/* Eventos de la puerta: salen de las reservas que carga el controlador */
export function llenarSelectorDeEventos(eventos) {
  var selector = document.getElementById("validar-evento");
  eventos.forEach(function (e) {
    var opcion = document.createElement("option");
    opcion.value = e.id;
    opcion.textContent = e.titulo;
    selector.appendChild(opcion);
  });
}

/* Cuántas entradas se validaron y las últimas 15 */
export function pintarIngresos(ingresos) {
  var personas = ingresos.reduce(function (s, g) { return s + (g.entradas || 0); }, 0);

  document.getElementById("conteo-ingresos").textContent = ingresos.length
    ? ingresos.length + (ingresos.length === 1 ? " entrada validada" : " entradas validadas") +
      " (" + personas + (personas === 1 ? " persona" : " personas") + ")."
    : "Todavía no se ha registrado ningún ingreso.";

  document.getElementById("lista-ingresos").innerHTML = ingresos.slice(0, 15).map(function (g, i) {
    return '<li style="--orden:' + i + '">' +
      '<span class="actividad-cuando">' + (g.fecha ? fechaHora(g.fecha) + ' · ' : '') + escapar(g.codigo) + '</span>' +
      '<span>' + escapar(g.cliente) + ' — ' + escapar(g.evento) + ' (' + g.entradas + (g.entradas === 1 ? " persona" : " personas") + ')</span>' +
    '</li>';
  }).join("");
  document.getElementById("lista-ingresos").classList.add("visible");
}

/* La tarjeta con el resultado de la validación; si la entrada es válida lleva el botón de registrar el ingreso.
   Los textos son planos: aquí se escapan. */
export function pintarResultado(clase, titulo, texto, reserva, conBotonDeIngreso) {
  document.getElementById("validar-resultado").innerHTML =
    '<div class="validar-tarjeta ' + clase + '">' +
      '<p class="validar-titulo">' + escapar(titulo) + '</p>' +
      (texto ? '<p class="validar-texto">' + escapar(texto) + '</p>' : '') +
      (reserva
        ? '<dl class="detalle-datos validar-datos">' +
            '<div><dt>Reserva</dt><dd>' + escapar(reserva.codigo) + '</dd></div>' +
            '<div><dt>Titular</dt><dd>' + escapar(reserva.cliente) + '</dd></div>' +
            '<div><dt>Documento</dt><dd>' + escapar(reserva.documento || "—") + '</dd></div>' +
            '<div><dt>Entradas</dt><dd>' + reserva.entradas + (reserva.entradas === 1 ? " persona" : " personas") + '</dd></div>' +
            '<div class="validar-dato-ancho"><dt>Evento</dt><dd>' + escapar(reserva.evento) + '</dd></div>' +
          '</dl>'
        : '') +
      (conBotonDeIngreso
        ? '<button type="button" class="admin-boton validar-registrar" data-codigo="' + escapar(reserva.codigo) + '">' +
            'Registrar ingreso (' + reserva.entradas + (reserva.entradas === 1 ? " persona" : " personas") + ')</button>'
        : '') +
    '</div>';
}

export function enfocarResultado() {
  document.getElementById("titulo-resultado").setAttribute("tabindex", "-1");
  document.getElementById("titulo-resultado").focus();
}

/* Muestra u oculta el visor de la cámara y cambia los botones de abrir y detener */
export function mostrarVisor(abierto) {
  document.getElementById("validar-visor").hidden = !abierto;
  document.getElementById("validar-detener").hidden = !abierto;
  document.getElementById("validar-abrir").hidden = abierto;
}

/* Abre la cámara y llama a alLeer(texto) cada vez que lee un QR. Devuelve una promesa con los
   controles ({ stop() }) para cerrarla. La librería se descarga solo la primera vez. */
export function abrirEscaner(alLeer) {
  var video = document.getElementById("validar-video");
  return import("@zxing/browser").then(function (zxing) {
    return new zxing.BrowserQRCodeReader().decodeFromConstraints(
      { video: { facingMode: "environment" } }, video,
      function (leido) {
        if (!leido) return;
        alLeer(leido.getText());
      });
  });
}
