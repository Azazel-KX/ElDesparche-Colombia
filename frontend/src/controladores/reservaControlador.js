/* ==========================================================================
   controladores/reservaControlador.js
   Lo que hace el cliente con sus reservas: reservar (reservar.html), ver el comprobante
   (confirmacion.html) y ver o cancelar las suyas (mis-reservas.html).

   El pago todavía no está conectado: una reserva de un evento de pago queda "Reservada" hasta que un
   administrador confirme el pago, y una de un evento gratis queda confirmada.
   ========================================================================== */

import { parametro } from "../lib/dom.js";
import { escapar } from "../lib/formato.js";
import { buscarEvento, cuposLibres } from "../modelos/eventoModelo.js";
import {
  cancelarReservaCliente, crearReserva, guardarUltimaReserva, leerUltimaReserva, motivoBloqueoReserva,
  reservasDelApi
} from "../modelos/reservaModelo.js";
import { obtenerUsuario } from "../modelos/sesionModelo.js";
import { abrirAcceso } from "../vistas/accesoVista.js";
import { datosCancelacion } from "../vistas/cancelacionVista.js";
import { mostrarErrorDeConfirmacion, pintarConfirmacion } from "../vistas/confirmacionVista.js";
import {
  abrirVentanaCancelacion, crearVentanaCancelacion, pintarListaReservas, pintarSaludo
} from "../vistas/misReservasVista.js";
import {
  bloquearReserva, crearAvisoDeError, mostrarErrorDeReserva, pintarEventoEnReserva, pintarResumenReserva
} from "../vistas/reservarVista.js";

/* ===== Reservar ===== */

export function paginaReservar() {
  var evento = buscarEvento(parametro("id"));
  var usuario = obtenerUsuario();

  if (!evento) {
    window.location.href = "eventos.html";
    return;
  }

  /* El botón "Confirmar" envía este formulario: hasta que se arme la reserva, Enter no debe recargar la página */
  document.getElementById("form-reserva").onsubmit = function (e) { e.preventDefault(); };

  /* Para reservar hay que haber entrado: se abre la ventana emergente */
  if (!usuario) {
    abrirAcceso("entrar");
    return;
  }

  var tickets = 1;
  var maximo = Math.min(10, cuposLibres(evento));   /* hasta 10 por reserva, sin pasar los cupos que quedan */

  function subtotal() { return evento.precio * tickets; }

  pintarEventoEnReserva(evento, usuario);

  /* Actualiza el resumen de precios */
  function actualizarResumen() {
    pintarResumenReserva({
      tickets: tickets,
      gratis: evento.precio === 0,
      precio: evento.precio,
      total: subtotal()
    });
  }

  /* Botones - y + */
  document.getElementById("menos").onclick = function () {
    if (tickets > 1) {
      tickets = tickets - 1;
      actualizarResumen();
    }
  };

  document.getElementById("mas").onclick = function () {
    if (tickets < maximo) {
      tickets = tickets + 1;
      actualizarResumen();
    }
  };

  actualizarResumen();

  /* Reglas de negocio: las mismas que revisa la base de datos */
  var botonConfirmar = document.getElementById("confirmar");
  var bloqueo = motivoBloqueoReserva(usuario, evento);

  if (bloqueo) {
    bloquearReserva(bloqueo);
    document.getElementById("form-reserva").onsubmit = function (e) { e.preventDefault(); };
    return;
  }

  var errorPago = crearAvisoDeError();
  var textoBoton = botonConfirmar.textContent.trim();

  function reservar() {
    botonConfirmar.disabled = true;
    botonConfirmar.textContent = "Registrando la reserva…";

    crearReserva(evento.id, tickets, document.getElementById("observaciones").value).then(function () {
      window.location.href = "confirmacion.html";
    }).catch(function (error) {
      botonConfirmar.disabled = false;
      botonConfirmar.textContent = textoBoton;
      mostrarErrorDeReserva(errorPago, error.message);
      botonConfirmar.focus();
    });
  }

  /* Enter dentro del formulario o el botón "Confirmar" (unido con form="form-reserva") */
  document.getElementById("form-reserva").onsubmit = function (e) {
    e.preventDefault();
    errorPago.textContent = "";
    if (botonConfirmar.disabled) return;
    reservar();
  };
}

/* ===== Comprobante ===== */

export function paginaConfirmacion() {
  /* La reserva se lee de la base (solo las del cliente que entró) */
  var codigo = leerUltimaReserva();
  var usuario = obtenerUsuario();
  if (!usuario || !codigo) {
    window.location.href = "index.html";
    return;
  }
  reservasDelApi().then(function (lista) {
    var deLaBase = lista.filter(function (r) { return r.codigo === codigo; })[0];
    if (!deLaBase) {
      window.location.href = "mis-reservas.html";
      return;
    }
    pintarConfirmacion(deLaBase);
  }).catch(function (error) {
    mostrarErrorDeConfirmacion(error.message);
  });
}

/* ===== Mis reservas ===== */

export function paginaMisReservas() {
  var usuario = obtenerUsuario();
  var contenedor = document.getElementById("contenido-reservas");

  /* Para ver las reservas hay que haber entrado: se abre la ventana emergente */
  if (!usuario) {
    abrirAcceso("entrar");
    return;
  }

  pintarSaludo(usuario);

  /* La lista sale de la base de datos */
  function pintar() {
    contenedor.setAttribute("aria-busy", "true");
    return reservasDelApi().then(function (reservas) {
      pintarListaReservas(contenedor, reservas);
    }).catch(function (error) {
      contenedor.innerHTML = '<p class="mensaje error" role="alert"><strong>Error:</strong> ' + escapar(error.message) + '</p>';
    }).then(function () {
      contenedor.removeAttribute("aria-busy");
    });
  }

  /* Ventana para cancelar una reserva con su causa */
  var ventana = crearVentanaCancelacion();
  var codigoAbierto = "";
  var avisoLista = document.getElementById("aviso-reservas");

  /* Botón "Ver QR" (lleva a la confirmación de esa reserva) y botón "Cancelar" (abre la ventana que pide la causa) */
  contenedor.addEventListener("click", function (evento) {
    var verQr = evento.target.closest("[data-qr]");
    var cancelar = evento.target.closest("[data-cancelar]");

    if (verQr) {
      guardarUltimaReserva(verQr.getAttribute("data-qr"));
      window.location.href = "confirmacion.html";
    } else if (cancelar) {
      codigoAbierto = cancelar.getAttribute("data-cancelar");
      abrirVentanaCancelacion(ventana, codigoAbierto);
    }
  });

  ventana.addEventListener("click", function (evento) {
    if (evento.target === ventana || evento.target.closest("[data-cerrar]")) ventana.close();
  });

  ventana.addEventListener("close", function () {
    var boton = contenedor.querySelector('[data-cancelar="' + codigoAbierto + '"]');
    if (boton) boton.focus();
  });

  ventana.addEventListener("submit", function (evento) {
    evento.preventDefault();
    var error = document.getElementById("error-cancelar");
    var datos = datosCancelacion("cancelar");
    if (datos.error) {
      error.innerHTML = "<strong>Error:</strong> " + datos.error;
      return;
    }

    var botonSi = ventana.querySelector('button[type="submit"]');
    botonSi.disabled = true;
    cancelarReservaCliente(codigoAbierto, datos.causa, datos.detalle).then(function () {
      var cancelada = codigoAbierto;
      codigoAbierto = "";
      ventana.close();
      return pintar().then(function () {
        avisoLista.textContent = "La reserva " + cancelada + " quedó cancelada.";
        avisoLista.focus();
      });
    }).catch(function (fallo) {
      botonSi.disabled = false;
      error.innerHTML = "<strong>Error:</strong> " + escapar(fallo.message);
    });
  });

  pintar();
}
