/* ==========================================================================
   controladores/admin/reservasControlador.js
   Reservas del panel: buscar, ver el detalle, cancelar y (solo el administrador) registrar,
   editar y eliminar. El agente usa esta misma página limitada a sus eventos:
   config = { eventos: [ids], obtenerReservas, cancelar, quien, notaDevolucion }
   ========================================================================== */

import { enfocarSiExiste } from "../../lib/dom.js";
import { escapar } from "../../lib/formato.js";
import { agregarNota, notaCancelacion } from "../../modelos/cancelacionModelo.js";
import { cargarEventosAdmin } from "../../modelos/eventoModelo.js";
import { obtenerClientes } from "../../modelos/personaModelo.js";
import {
  cancelarReservaAdmin, eliminarReserva, erroresDeReserva, eventoPorId, filtrarReservas, guardarReserva, obtenerReservasAdmin
} from "../../modelos/reservaModelo.js";
import { camposReserva } from "../../vistas/camposVista.js";
import { datosCancelacion } from "../../vistas/cancelacionVista.js";
import { leerFormulario, mostrarErroresFormulario } from "../../vistas/formularioVista.js";
import {
  botonesReserva, confirmarCancelacionReserva, confirmarEliminacionReserva, llenarFiltroEventos, pintarDetalleReserva,
  pintarFormularioReserva, pintarGraficasReservas, pintarResumenReservas, pintarTablaReservas, pintarTotalReserva
} from "../../vistas/admin/reservasVista.js";
import { entrarComoAdmin } from "../adminControlador.js";

export function paginaReservasAdmin(config) {
  if (!config && !entrarComoAdmin()) return;
  config = config || {};
  var obtener = config.obtenerReservas || obtenerReservasAdmin;
  var cancelar = config.cancelar || cancelarReservaAdmin;
  var quien = config.quien || "el administrador";   /* quién cancela, para la nota */
  var notaDevolucion = config.notaDevolucion ||
    " El pago ya fue aprobado: recuerda devolverle el dinero al cliente.";

  var reservas = [];
  var aviso = document.getElementById("admin-aviso");
  var buscar = document.getElementById("buscar-reserva");
  var filtroEstado = document.getElementById("filtro-estado-reserva");
  var filtroEvento = document.getElementById("filtro-evento");   /* solo en el panel del agente */
  var orden = document.getElementById("orden-reservas");
  var cuerpo = document.getElementById("cuerpo-reservas");
  var dialogo = document.getElementById("detalle-reserva");
  var contenido = document.getElementById("detalle-contenido");
  var abierto = null;

  /* Registrar, editar y eliminar: solo en la página del administrador */
  var conCrud = !config.eventos && !!document.getElementById("nueva-reserva");
  var modo = null;   /* "nuevo" o "editar" mientras se ve el formulario */
  var clientesCrud = [];
  var eventosCrud = [];

  function pintarTabla() {
    pintarTablaReservas(filtrarReservas(reservas, {
      texto: buscar.value,
      evento: filtroEvento ? filtroEvento.value : "",
      estado: filtroEstado.value,
      orden: orden.value
    }), reservas.length);
  }

  function pintarDetalle(r, mensaje) {
    pintarDetalleReserva(contenido, r, conCrud, mensaje);
  }

  function pintarTotal() {
    if (!document.getElementById("reserva-total")) return;
    var entradas = Number(document.getElementById("f-entradas").value);
    var precio = modo === "nuevo"
      ? (eventoPorId(document.getElementById("f-evento").value) || {}).precio
      : abierto.precio;
    pintarTotalReserva(entradas, precio);
  }

  function mostrarFormulario(r) {
    modo = r ? "editar" : "nuevo";
    pintarFormularioReserva(contenido, r, clientesCrud, eventosCrud);
    pintarTotal();
    document.getElementById("detalle-nombre").focus();
  }

  contenido.addEventListener("input", function (evento) {
    if (evento.target.id === "f-entradas") pintarTotal();
  });
  contenido.addEventListener("change", function (evento) {
    if (evento.target.id === "f-evento") pintarTotal();
  });

  contenido.addEventListener("submit", function (evento) {
    if (evento.target.id !== "form-reserva") return;
    evento.preventDefault();

    var nuevo = modo === "nuevo";
    var campos = camposReserva(nuevo ? null : abierto, clientesCrud, eventosCrud);
    var v = leerFormulario(campos);
    var aprobada = !nuevo && abierto.estado === "Confirmada" && abierto.valor > 0;
    if (aprobada) {
      v.entradas = abierto.entradas;
      v.estado = abierto.estado;
    }

    var cliente = nuevo ? clientesCrud.datos.filter(function (c) { return c.documento === v.cliente; })[0] : null;
    var ev = nuevo ? eventoPorId(v.evento) : eventoPorId(abierto.eventoId);
    var errores = erroresDeReserva(v, { nuevo: nuevo, abierto: abierto, cliente: cliente, evento: ev });
    if (mostrarErroresFormulario("form-reserva", campos, errores)) return;

    /* El servidor pone el código, la fecha y el valor (entradas × precio del evento) */
    var datos = aprobada
      ? { observaciones: v.observaciones }
      : { entradas: Number(v.entradas), estado: v.estado, observaciones: v.observaciones };
    if (nuevo) {
      Object.assign(datos, { documento: cliente.tipoDoc + " " + cliente.documento, eventoId: ev.id });
    }

    var botones = evento.target.querySelectorAll("button");
    botones.forEach(function (b) { b.disabled = true; });

    guardarReserva(datos, nuevo ? null : abierto.codigo).then(function (guardada) {
      var reserva;
      if (nuevo) {
        reserva = guardada;
        reservas.push(reserva);
      } else {
        reserva = Object.assign(abierto, guardada);
      }
      abierto = reserva;
      modo = null;
      var mensaje = nuevo ? "Se registró la reserva " + reserva.codigo + "." : "Se guardaron los cambios de la reserva " + reserva.codigo + ".";
      aviso.textContent = mensaje;
      pintarResumenReservas(reservas);
      pintarTabla();
      pintarDetalle(reserva, mensaje);
      document.getElementById("detalle-nombre").focus();
    }).catch(function (error) {
      document.getElementById("form-reserva-error").innerHTML = "<strong>Error:</strong> " + escapar(error.message);
      botones.forEach(function (b) { b.disabled = false; });
    });
  });

  contenido.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-accion]");
    if (!boton) return;

    var accion = boton.getAttribute("data-accion");
    var acciones = document.getElementById("detalle-acciones");

    if (accion === "cancelar-formulario") {
      if (modo === "nuevo") {
        dialogo.close();
      } else {
        modo = null;
        pintarDetalle(abierto);
        document.getElementById("detalle-nombre").focus();
      }
      return;
    }
    if (!abierto) return;

    if (accion === "editar") {
      mostrarFormulario(abierto);
    } else if (accion === "aprobar") {
      var porAprobar = abierto;
      acciones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
      guardarReserva({ estado: "Confirmada" }, porAprobar.codigo).then(function (guardada) {
        Object.assign(porAprobar, guardada);
        var mensaje = "Aprobaste la reserva " + porAprobar.codigo + " y su pago.";
        aviso.textContent = mensaje;
        pintarResumenReservas(reservas);
        pintarGraficasReservas(reservas);
        pintarTabla();
        pintarDetalle(porAprobar, mensaje);
        document.getElementById("detalle-nombre").focus();
      }).catch(function (error) {
        document.getElementById("detalle-aviso").innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
        acciones.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
      });
    } else if (accion === "eliminar") {
      confirmarEliminacionReserva(abierto);
    } else if (accion === "si-eliminar") {
      var borrada = abierto;
      acciones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
      eliminarReserva(borrada.codigo).then(function () {
        reservas = reservas.filter(function (x) { return x !== borrada; });
        aviso.textContent = "Se eliminó la reserva " + borrada.codigo + ".";
        abierto = null;
        dialogo.close();
        pintarResumenReservas(reservas);
        pintarGraficasReservas(reservas);
        pintarTabla();
        aviso.setAttribute("tabindex", "-1");
        setTimeout(function () { aviso.focus(); }, 0);
      }).catch(function (error) {
        document.getElementById("detalle-aviso").innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
        acciones.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
      });
    } else if (accion === "confirmar") {
      confirmarCancelacionReserva(abierto, notaDevolucion);
    } else if (accion === "volver") {
      acciones.innerHTML = botonesReserva(abierto, conCrud);
      acciones.querySelector("button").focus();
    } else if (accion === "si-cancelar") {
      var reserva = abierto;
      var datos = datosCancelacion("cancelar");
      if (datos.error) {
        document.getElementById("error-cancelar").innerHTML = "<strong>Error:</strong> " + datos.error;
        return;
      }
      var observaciones = agregarNota(reserva.observaciones,
        notaCancelacion("reserva", quien, datos.causa, datos.detalle));
      acciones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });

      cancelar(reserva.codigo, observaciones).then(function () {
        reserva.estado = "Cancelada";
        reserva.observaciones = observaciones;
        var mensaje = "La reserva " + reserva.codigo + " quedó cancelada.";
        aviso.textContent = mensaje;
        pintarResumenReservas(reservas);
        pintarTabla();
        pintarDetalle(reserva, mensaje);
        document.getElementById("detalle-nombre").focus();
      }).catch(function (error) {
        document.getElementById("detalle-aviso").innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
        acciones.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
      });
    }
  });

  cuerpo.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-codigo]");
    if (!boton) return;

    abierto = reservas.filter(function (r) { return r.codigo === boton.getAttribute("data-codigo"); })[0];
    modo = null;
    pintarDetalle(abierto);
    dialogo.showModal();
    document.getElementById("detalle-nombre").focus();
  });

  document.getElementById("detalle-cerrar").onclick = function () {
    dialogo.close();
  };

  dialogo.addEventListener("click", function (evento) {
    if (evento.target === dialogo) dialogo.close();
  });

  dialogo.addEventListener("close", function () {
    if (modo === "nuevo") {
      modo = null;
      /* después de que el navegador devuelve el foco por su cuenta */
      setTimeout(function () { enfocarSiExiste("nueva-reserva"); }, 0);
      return;
    }
    modo = null;
    if (!abierto) return;
    var codigo = abierto.codigo;
    abierto = null;
    setTimeout(function () {
      var boton = cuerpo.querySelector('button[data-codigo="' + codigo + '"]');
      if (boton) {
        boton.focus();
      } else {
        enfocarSiExiste("titulo-lista-reservas");
      }
    }, 0);
  });

  document.getElementById("filtros-reservas").addEventListener("submit", function (evento) {
    evento.preventDefault();
  });
  buscar.addEventListener("input", pintarTabla);
  filtroEstado.onchange = pintarTabla;
  orden.onchange = pintarTabla;
  if (filtroEvento) filtroEvento.onchange = pintarTabla;

  if (conCrud) {
    document.getElementById("nueva-reserva").onclick = function () {
      abierto = null;
      mostrarFormulario(null);
      dialogo.showModal();
      document.getElementById("detalle-nombre").focus();
    };

    /* Clientes con la cuenta activa y eventos que aún se pueden reservar */
    obtenerClientes().then(function (lista) {
      var activos = lista.filter(function (c) { return c.cuenta !== "Bloqueada"; })
        .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); });
      clientesCrud = activos.map(function (c) { return [c.documento, c.nombre + " (" + c.tipoDoc + " " + c.documento + ")"]; });
      clientesCrud.datos = activos;
    }).catch(function () {});
    clientesCrud.datos = [];
    cargarEventosAdmin().then(function (eventos) {
      eventosCrud = eventos
        .filter(function (e) { return e.estado !== "Finalizado" && e.estado !== "Cancelado"; })
        .sort(function (a, b) { return a.titulo.localeCompare(b.titulo, "es"); })
        .map(function (e) { return [e.id, e.titulo + " · " + e.fechaCorta]; });
    }).catch(function () {});
  }

  obtener().then(function (lista) {
    reservas = config.eventos
      ? lista.filter(function (r) { return config.eventos.indexOf(r.eventoId) !== -1; })
      : lista;

    if (filtroEvento) llenarFiltroEventos(filtroEvento, reservas);

    pintarResumenReservas(reservas);
    pintarGraficasReservas(reservas);
    pintarTabla();
  }).catch(function (error) {
    aviso.innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
  });
}
