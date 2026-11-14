/* ==========================================================================
   vistas/reservarVista.js
   Formulario de reserva (reservar.html): datos del evento, resumen de precios y avisos.
   ========================================================================== */

import { escapar, textoPesos } from "../lib/formato.js";

/* Datos del evento y de quien reserva */
export function pintarEventoEnReserva(evento, usuario) {
  document.getElementById("miga-evento").textContent = evento.titulo;
  document.getElementById("miga-evento").href = "evento.html?id=" + evento.id;
  document.getElementById("mini-imagen").src = evento.imagen;
  document.getElementById("mini-imagen").alt = evento.titulo;
  document.getElementById("mini-titulo").textContent = evento.titulo;
  document.getElementById("mini-lugar").textContent = evento.ciudad + " · " + evento.teatro;
  document.getElementById("mini-fecha").textContent = evento.fechaInicio;
  document.getElementById("resumen-imagen").src = evento.imagen;
  document.getElementById("resumen-imagen").alt = evento.titulo;
  document.getElementById("resumen-titulo").textContent = evento.titulo;
  document.getElementById("resumen-fecha").textContent = evento.fechaInicio;

  document.getElementById("aviso-usuario").innerHTML =
    "Hola, <strong>" + escapar(usuario.nombre) + "</strong>. Tu reserva se registrará a tu nombre. " +
    "Recibirás un correo con los detalles a <strong>" + escapar(usuario.correo) + "</strong>.";
}

/* Resumen de precios: precio unitario, cantidad y total */
export function pintarResumenReserva(datos) {
  document.getElementById("tickets").textContent = datos.tickets;

  if (datos.gratis) {
    document.getElementById("resumen-precio").textContent = "Gratis";
    document.getElementById("resumen-total").textContent = "Gratis";
  } else {
    document.getElementById("resumen-precio").textContent = textoPesos(datos.precio);
    document.getElementById("resumen-total").textContent = textoPesos(datos.total);
  }

  if (datos.tickets === 1) {
    document.getElementById("resumen-cantidad").textContent = "1 ticket";
  } else {
    document.getElementById("resumen-cantidad").textContent = datos.tickets + " tickets";
  }
}

/* Cuando no se puede reservar: el motivo se escribe antes del botón y todo queda desactivado */
export function bloquearReserva(motivo) {
  var boton = document.getElementById("confirmar");
  var aviso = document.createElement("p");
  aviso.className = "aviso-reserva";
  aviso.id = "aviso-reserva";
  aviso.textContent = motivo;
  boton.parentNode.insertBefore(aviso, boton);
  boton.disabled = true;
  boton.setAttribute("aria-describedby", "aviso-reserva");
  document.getElementById("mas").disabled = true;
  document.getElementById("menos").disabled = true;
}

/* Crea el lugar donde se escriben los errores al reservar y lo devuelve */
export function crearAvisoDeError() {
  var boton = document.getElementById("confirmar");
  var error = document.createElement("p");
  error.className = "mensaje error";
  error.id = "error-pago";
  error.setAttribute("role", "alert");
  boton.parentNode.insertBefore(error, boton);
  return error;
}

export function mostrarErrorDeReserva(caja, mensaje) {
  caja.innerHTML = "<strong>Error:</strong> " + escapar(mensaje);
}
