/* ==========================================================================
   vistas/confirmacionVista.js
   Comprobante de la reserva.
   ========================================================================== */

import { escapar, textoPesos } from "../lib/formato.js";
import { ESTADOS_PAGO, METODOS_PAGO } from "../modelos/catalogos.js";
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

  var pago = reserva.pago;
  if (pago) {
    datos.push(["Pago", ESTADOS_PAGO[pago.estado] + (METODOS_PAGO[pago.metodo] ? " con " + METODOS_PAGO[pago.metodo] : "")]);
    datos.push(["Transacción", pago.id]);
  }

  var html = "";
  for (var j = 0; j < datos.length; j++) {
    html = html + "<div><dt>" + escapar(datos[j][0]) + "</dt><dd>" + escapar(datos[j][1]) + "</dd></div>";
  }

  document.getElementById("detalles").innerHTML = html;
  document.getElementById("codigo").textContent = reserva.codigo;

  /* El QR solo sirve cuando el pago está aprobado */
  if (reserva.estado === "Confirmada") {
    pintarQrReal(document.getElementById("qr"), reserva.codigo, reserva.idEvento);
  } else {
    /* Sin pago registrado: la reserva se registró y un administrador confirma el pago */
    var sinPago = !reserva.pago;
    document.title = (sinPago ? "Reserva registrada" : "Pago en proceso") + " - El Desparche";
    document.querySelector(".titulo-exito").textContent =
      sinPago ? "Tu reserva quedó registrada" : "Tu pago está en proceso";
    document.querySelector(".subtitulo-exito").textContent = sinPago
      ? "Apartamos tus entradas. La reserva se confirma cuando registremos tu pago."
      : "Guardamos tu reserva mientras se confirma el pago. Te avisaremos por correo cuando esté listo.";

    var qr = document.getElementById("qr");
    var aviso = document.createElement("p");
    aviso.className = "qr-pendiente";
    aviso.innerHTML = sinPago
      ? "<strong>Pago por confirmar.</strong> Tu QR aparecerá aquí y en \"Mis reservas\" " +
        "en cuanto se confirme el pago."
      : "<strong>Pago pendiente.</strong> Tu QR aparecerá aquí y en \"Mis reservas\" " +
        "en cuanto se apruebe el pago (a veces tarda unos minutos con PSE o Nequi).";
    qr.parentNode.replaceChild(aviso, qr);
    document.querySelector(".caja-qr .texto-pequeno-claro").textContent = "Código de tu reserva";
  }
}

/* Cuando no se pudo leer la reserva */
export function mostrarErrorDeConfirmacion(mensaje) {
  document.getElementById("detalles").innerHTML =
    '<p class="mensaje error" role="alert"><strong>Error:</strong> ' + escapar(mensaje) + '</p>';
}
