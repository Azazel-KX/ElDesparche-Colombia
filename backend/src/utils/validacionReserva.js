// Validación de las reservas: las del cliente (crear y cancelar) y las de los paneles (administrador y agente).
// Los campos se llaman como los manda la web (frontend/js/admin.js y script.js).

const { texto, normalizarDocumento } = require("./validacion");
const { RE_CANCELACION } = require("./formato");
const { CAUSAS_RESERVA } = require("./validacionEvento");

const MAX_ENTRADAS = 10; // por reserva, igual que el formulario del panel ("De 1 a 10 por reserva")
const ESTADOS_ADMIN = ["Reservada", "Confirmada"]; // los que el administrador puede elegir al registrar o editar

const vacio = (v) => v === undefined || v === null || v === "";

function leerEntradas(valor, errores) {
  const n = vacio(valor) ? NaN : Number(valor);
  if (!Number.isInteger(n) || n < 1 || n > MAX_ENTRADAS) errores.entradas = `Las entradas deben ser un número entero de 1 a ${MAX_ENTRADAS}.`;
  return n;
}

function leerObservaciones(valor, errores) {
  const o = texto(valor);
  if (o.length > 1000) errores.observaciones = "Las observaciones no pueden superar los 1000 caracteres.";
  return o || null;
}

// "CC 1116254789" (como lo muestran los paneles) o solo "1116254789" -> el documento normalizado
function documentoDe(valor) {
  const partes = texto(valor).split(/\s+/);
  return normalizarDocumento(partes[partes.length - 1]);
}

// El administrador registra una reserva para un cliente: { documento, eventoId, entradas, estado, observaciones }.
// Lo demás que manda el formulario (valor, código, fecha...) se ignora: el servidor lo calcula.
function validarReservaNueva(body) {
  const b = body && typeof body === "object" ? body : {};
  const errores = {};

  const documento = documentoDe(b.documento);
  if (!documento) errores.cliente = "Elige el cliente.";
  const eventoId = texto(b.eventoId);
  if (!eventoId) errores.evento = "Elige el evento.";
  const entradas = leerEntradas(b.entradas, errores);
  const estado = vacio(b.estado) ? "Reservada" : texto(b.estado);
  if (!ESTADOS_ADMIN.includes(estado)) errores.estado = `El estado debe ser uno de: ${ESTADOS_ADMIN.join(", ")}.`;
  const observaciones = leerObservaciones(b.observaciones, errores);

  return Object.keys(errores).length ? { errores } : { datos: { documento, eventoId, entradas, estado, observaciones } };
}

// El administrador modifica una reserva: { entradas, estado, observaciones }. Con un pago, solo cambian las observaciones
// (la web manda { observaciones } nada más), así que las entradas y el estado son opcionales.
function validarReservaEdicion(body) {
  const b = body && typeof body === "object" ? body : {};
  const errores = {};
  const datos = { observaciones: undefined, entradas: undefined, estado: undefined };

  if (b.observaciones !== undefined) datos.observaciones = leerObservaciones(b.observaciones, errores);
  if (!vacio(b.entradas)) datos.entradas = leerEntradas(b.entradas, errores);
  if (!vacio(b.estado)) {
    datos.estado = texto(b.estado);
    if (!ESTADOS_ADMIN.includes(datos.estado)) errores.estado = `El estado debe ser uno de: ${ESTADOS_ADMIN.join(", ")}.`;
  }
  return Object.keys(errores).length ? { errores } : { datos };
}

// Un administrador o un agente cancela una reserva: { estado: "Cancelada", observaciones }.
// "observaciones" lleva el texto completo con la nota de causa (la web ya arma la nota con agregarNota).
function validarCancelacionPanel(body) {
  const b = body && typeof body === "object" ? body : {};
  const errores = {};
  if (texto(b.estado) !== "Cancelada") errores.estado = "Desde aquí solo se puede cancelar una reserva (estado Cancelada).";
  const observaciones = texto(b.observaciones);
  if (!observaciones || observaciones.length > 2000 || !RE_CANCELACION.test(observaciones)) {
    errores.observaciones = "Falta la causa de la cancelación (Cancelada por ... Causa: ...).";
  }
  return Object.keys(errores).length ? { errores } : { datos: { observaciones } };
}

// El cliente reserva: { idEvento, entradas, observaciones }
function validarReservaCliente(body) {
  const b = body && typeof body === "object" ? body : {};
  const errores = {};
  const idEvento = texto(b.idEvento);
  if (!idEvento) errores.idEvento = "Elige el evento.";
  const entradas = leerEntradas(b.entradas, errores);
  const observaciones = leerObservaciones(b.observaciones, errores);
  return Object.keys(errores).length ? { errores } : { datos: { idEvento, entradas, observaciones } };
}

// El cliente cancela su reserva: { causa, detalle }. Las causas son las que le ofrece la web (CAUSAS_CLIENTE).
function validarCancelacionCliente(body) {
  const b = body && typeof body === "object" ? body : {};
  const errores = {};
  const causa = texto(b.causa);
  if (!CAUSAS_RESERVA.includes(causa) || causa === "Pago no realizado a tiempo") {
    errores.causa = "Elige la causa de la cancelación.";
  }
  const detalle = texto(b.detalle).replace(/\s+/g, " ") || null;
  if (detalle && detalle.length > 300) errores.detalle = "El detalle no puede superar los 300 caracteres.";
  else if (causa === "Otra causa" && !detalle) errores.detalle = "Escribe el detalle de la causa.";
  return Object.keys(errores).length ? { errores } : { datos: { causa, detalle } };
}

module.exports = {
  MAX_ENTRADAS, ESTADOS_ADMIN,
  validarReservaNueva, validarReservaEdicion, validarCancelacionPanel, validarReservaCliente, validarCancelacionCliente,
};
