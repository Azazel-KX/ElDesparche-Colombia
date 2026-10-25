/* ==========================================================================
   vistas/misReservasVista.js
   Mis reservas (mis-reservas.html): saludo, tabla de reservas y ventana para cancelar una.
   ========================================================================== */

import { escapar, textoPesos } from "../lib/formato.js";
import { causaParaCliente, leerCancelacion } from "../modelos/cancelacionModelo.js";
import { esperaPago } from "../modelos/reservaModelo.js";
import { camposCancelacion } from "./cancelacionVista.js";

export function pintarSaludo(usuario) {
  document.getElementById("saludo").innerHTML =
    "Hola, <strong>" + escapar(usuario.nombre) + "</strong>. Aquí puedes ver y gestionar tus reservas.";
}

/* La tabla de reservas con el estado de cada una. Los botones "Ver QR" y "Cancelar" llevan
   data-qr y data-cancelar con el código de la reserva: el controlador atiende sus clics. */
export function pintarListaReservas(contenedor, reservas) {
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
        '<button class="boton-mini boton-cancelar" data-cancelar="' + escapar(r.codigo) + '">Cancelar</button>';
    } else {
      acciones =
        '<button class="boton-mini boton-qr" data-qr="' + escapar(r.codigo) + '">Ver QR</button>' +
        '<button class="boton-mini boton-cancelar" data-cancelar="' + escapar(r.codigo) + '">Cancelar</button>';
    }

    var claseReserva = r.estado === "Cancelada" ? "reserva-cancelada"
      : (r.estado === "Confirmada" ? "reserva-confirmada" : "reserva-reservada");

    html = html +
      '<tr>' +
        '<td data-titulo="Evento"><a href="evento.html?id=' + encodeURIComponent(r.idEvento) + '">' + escapar(r.titulo) + '</a></td>' +
        '<td data-titulo="Fecha">' + escapar(r.fechaEvento) + '</td>' +
        '<td data-titulo="Teatro">' + escapar(r.teatro || r.lugar) + '</td>' +
        '<td data-titulo="Tickets">' + escapar(r.tickets) + '</td>' +
        '<td data-titulo="Total">' + (r.total === 0 ? "Gratis" : textoPesos(r.total)) + '</td>' +
        '<td data-titulo="Estado"><span class="etiqueta-reserva ' + claseReserva + '">' + escapar(r.usada ? "Usada" : r.estado) + '</span>' +
          (leerCancelacion(r.observaciones)
            ? '<span class="reserva-causa">Causa: ' + escapar(causaParaCliente(leerCancelacion(r.observaciones).causa)) + '</span>'
            : '') +
        '</td>' +
        '<td data-titulo="Acciones">' + acciones + '</td>' +
      '</tr>';
  }

  html = html + '</tbody></table>';
  contenedor.innerHTML = html;
}

/* La ventana vacía donde se pide la causa de la cancelación; se agrega al <body> */
export function crearVentanaCancelacion() {
  var ventana = document.createElement("dialog");
  ventana.className = "modal modal-cancelar";
  ventana.id = "modal-cancelar";
  ventana.setAttribute("aria-labelledby", "cancelar-titulo");
  document.body.appendChild(ventana);
  return ventana;
}

/* La ventana para cancelar una reserva con su causa */
export function abrirVentanaCancelacion(ventana, codigo) {
  ventana.innerHTML =
    '<div class="modal-caja">' +
      '<button type="button" class="modal-cerrar" data-cerrar aria-label="Cerrar sin cancelar la reserva">' +
        '<span aria-hidden="true">×</span>' +
      '</button>' +
      '<h2 class="cancelar-titulo" id="cancelar-titulo">¿Cancelar la reserva ' + escapar(codigo) + '?</h2>' +
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
