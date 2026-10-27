/* ==========================================================================
   vistas/qrVista.js
   Código QR de la entrada.
   ========================================================================== */

import { escapar } from "../lib/formato.js";
import { contenidoQr } from "../modelos/reservaModelo.js";

/* Dibuja el QR real (SVG) dentro de un elemento */
export function pintarQrReal(elemento, codigo, idEvento) {
  elemento.classList.add("qr-real");
  elemento.innerHTML = "";

  return import("@zxing/browser").then(function (zxing) {
    var svg = new zxing.BrowserQRCodeSvgWriter().write(contenidoQr(codigo, idEvento), 240, 240);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Código QR de la reserva " + codigo);
    svg.setAttribute("viewBox", "0 0 240 240");
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    elemento.appendChild(svg);
  }).catch(function () {
    elemento.innerHTML = '<p class="qr-error">No se pudo dibujar el QR. Usa el código ' + escapar(codigo) + ' en la entrada.</p>';
  });
}
