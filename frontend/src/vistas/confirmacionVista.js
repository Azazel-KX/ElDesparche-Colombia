/* ==========================================================================
   vistas/confirmacionVista.js
   Comprobante de la reserva.
   ========================================================================== */

import { escapar, textoPesos } from "../lib/formato.js";
import { pintarQrReal } from "./qrVista.js";

export function pintarConfirmacion(reserva) {
  var datos = [
    ["Código de reserva", reserva.codigo],
    ["Evento", reserva.titulo],
    ["Fecha del evento", reserva.fechaEvento],
    ["Teatro", (reserva.teatro || reserva.lugar) + " - " + reserva.ciudad],
    ["Titular", reserva.titular],
    ["Tickets", reserva.tickets],
    ["Total", reserva.total === 0 ? "Gratis" : textoPesos(reserva.total)],
    ["Fecha de reserva", reserva.fechaReserva]
  ];

  var html = "";
  for (var j = 0; j < datos.length; j++) {
    html = html + "<div><dt>" + escapar(datos[j][0]) + "</dt><dd>" + escapar(datos[j][1]) + "</dd></div>";
  }

  document.getElementById("detalles").innerHTML = html;
  document.getElementById("codigo").textContent = reserva.codigo;

  /* El QR solo sirve cuando un administrador aprobó la reserva y el pago */
  if (reserva.estado === "Confirmada") {
    pintarQrReal(document.getElementById("qr"), reserva.codigo, reserva.idEvento);
  } else {
    /* La reserva quedó registrada y un administrador la aprueba (reserva y pago) */
    document.title = "Reserva registrada - El Desparche";
    document.querySelector(".titulo-exito").textContent = "Tu reserva quedó registrada";
    document.querySelector(".subtitulo-exito").textContent =
      "Apartamos tus entradas. La reserva se confirma cuando un administrador apruebe la reserva y el pago.";

    var qr = document.getElementById("qr");
    var aviso = document.createElement("p");
    aviso.className = "qr-pendiente";
    aviso.innerHTML = "<strong>Por aprobar.</strong> Tu QR aparecerá aquí y en \"Mis reservas\" " +
      "en cuanto un administrador apruebe tu reserva y el pago.";
    qr.parentNode.replaceChild(aviso, qr);
    document.querySelector(".caja-qr .texto-pequeno-claro").textContent = "Código de tu reserva";
  }
}

/* Cuando no se pudo leer la reserva */
export function mostrarErrorDeConfirmacion(mensaje) {
  document.getElementById("detalles").innerHTML =
    '<p class="mensaje error" role="alert"><strong>Error:</strong> ' + escapar(mensaje) + '</p>';
}
