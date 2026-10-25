/* ==========================================================================
   vistas/admin/reservasVista.js
   Reservas del panel (administrador y agente): tarjetas, gráficas, tabla, detalle y formularios.
   Solo dibujan; los datos y los eventos los maneja controladores/admin/reservasControlador.js.
   ========================================================================== */

import { animarAlVer } from "../../lib/dom.js";
import { fechaHora } from "../../lib/fechas.js";
import { escapar, numero, pesos, pesosCompacto, textoPrecio } from "../../lib/formato.js";
import { leerCancelacion } from "../../modelos/cancelacionModelo.js";
import { entradaValida, ingresosAprobados, reservasConEstado, reservasPorAprobar } from "../../modelos/reservaModelo.js";
import { camposReserva } from "../camposVista.js";
import { camposCancelacion } from "../cancelacionVista.js";
import { CLASE_RESERVA, COLOR_RESERVA, etiqueta, etiquetaAprobacion } from "../etiquetasVista.js";
import { htmlFormulario } from "../formularioVista.js";
import { graficaAnillo, pintarTarjetasResumen } from "../graficasVista.js";
import { pintarQrReal } from "../qrVista.js";

export function pintarResumenReservas(reservas) {
  pintarTarjetasResumen([
    { titulo: "Reservas", valor: reservas.length, formato: numero.format },
    { titulo: "Ingresos aprobados", valor: ingresosAprobados(reservas), formato: pesosCompacto.format, completo: pesos.format },
    { titulo: "Por aprobar", valor: reservasPorAprobar(reservas).length, formato: numero.format, alerta: true },
    { titulo: "Canceladas", valor: reservasConEstado(reservas, "Cancelada").length, formato: numero.format }
  ]);
}

export function pintarGraficasReservas(reservas) {
  /* Dinero aprobado de cada evento */
  var porEvento = {};
  reservas.filter(function (r) { return r.valor > 0 && r.estado === "Confirmada"; }).forEach(function (r) {
    porEvento[r.evento] = (porEvento[r.evento] || 0) + r.valor;
  });
  var lista = Object.keys(porEvento).map(function (nombre) { return { nombre: nombre, valor: porEvento[nombre] }; })
    .sort(function (a, b) { return b.valor - a.valor; }).slice(0, 5);
  var maximo = Math.max.apply(null, lista.map(function (m) { return m.valor; }).concat([1]));

  var cajaEventos = document.getElementById("grafica-ingresos-evento");
  cajaEventos.innerHTML =
    '<figure class="admin-figura">' +
      '<figcaption class="oculto">Dinero de las reservas aprobadas en cada evento.</figcaption>' +
      (lista.length
        ? '<ul class="barras">' + lista.map(function (m, i) {
          return '<li style="--orden:' + i + '">' +
            '<div class="barra-texto"><span>' + escapar(m.nombre) + '</span><strong>' + pesos.format(m.valor) + '</strong></div>' +
            '<div class="barra-pista" aria-hidden="true"><span class="barra" style="--ancho:' + (m.valor / maximo * 100).toFixed(1) + '%"></span></div>' +
          '</li>';
        }).join("") + '</ul>'
        : '<p class="texto-gris">Todavía no hay reservas aprobadas.</p>') +
    '</figure>';
  animarAlVer(cajaEventos.querySelector(".admin-figura"));

  var cajaEstados = document.getElementById("grafica-estados-reserva");
  cajaEstados.innerHTML = graficaAnillo(Object.keys(COLOR_RESERVA).map(function (estado) {
    return { nombre: estado, total: reservasConEstado(reservas, estado).length, color: COLOR_RESERVA[estado] };
  }), "reservas", "Cantidad de reservas en cada estado.");
  animarAlVer(cajaEstados.querySelector(".admin-figura"));
}

/* Opciones del filtro por evento (solo en el panel del agente) */
export function llenarFiltroEventos(filtro, reservas) {
  var vistos = {};
  reservas.forEach(function (r) { vistos[r.eventoId] = r.evento; });
  Object.keys(vistos).sort(function (a, b) { return vistos[a].localeCompare(vistos[b]); }).forEach(function (id) {
    var opcion = document.createElement("option");
    opcion.value = id;
    opcion.textContent = vistos[id];
    filtro.appendChild(opcion);
  });
}

export function pintarTablaReservas(lista, total) {
  var conteo = document.getElementById("conteo-reservas");
  var cuerpo = document.getElementById("cuerpo-reservas");

  conteo.textContent = lista.length === total
    ? "Mostrando las " + total + " reservas."
    : "Mostrando " + lista.length + " de " + total + " reservas.";

  if (lista.length === 0) {
    cuerpo.innerHTML = '<tr role="row"><td role="cell" colspan="7" class="tabla-vacia">' +
      'No hay reservas que coincidan con la búsqueda. Prueba con otros filtros.</td></tr>';
    return;
  }

  cuerpo.innerHTML = lista.map(function (r) {
    return '<tr role="row" class="' + (r.estado === "Cancelada" ? "fila-bloqueada" : "") + '">' +
      '<th scope="row" role="rowheader">' +
        '<span class="agente-nombre">' + escapar(r.codigo) + '</span>' +
        '<span class="agente-nit">' + escapar(r.estado) + ' · ' + fechaHora(r.fecha) + '</span>' +
      '</th>' +
      '<td role="cell" data-etiqueta="Cliente">' + escapar(r.cliente) + '</td>' +
      '<td role="cell" data-etiqueta="Evento">' + escapar(r.evento) + '</td>' +
      '<td role="cell" data-etiqueta="Entradas" class="numero">' + r.entradas + '</td>' +
      '<td role="cell" data-etiqueta="Valor" class="numero">' + textoPrecio(r.valor) + '</td>' +
      '<td role="cell" data-etiqueta="Aprobación">' + etiquetaAprobacion(r) + '</td>' +
      '<td role="cell" class="celda-accion">' +
        '<button type="button" class="admin-boton-sec" data-codigo="' + escapar(r.codigo) + '">' +
          'Ver detalle<span class="oculto"> de la reserva ' + escapar(r.codigo) + '</span>' +
        '</button>' +
      '</td>' +
    '</tr>';
  }).join("");
}

function notaAprobacion(r) {
  if (r.estado === "Cancelada") return "La reserva está cancelada.";
  if (r.valor === 0) return "Evento gratuito: la reserva no necesita aprobación ni pago.";
  if (r.estado === "Reservada") return "Falta que un administrador apruebe la reserva y el pago. Al aprobarla pasa a Confirmada y la entrada ya sirve.";
  return "Un administrador aprobó la reserva y el pago. La entrada ya sirve.";
}

export function botonesReserva(r, conCrud) {
  var aprobar = conCrud && r.estado === "Reservada" && r.valor > 0
    ? '<button type="button" class="admin-boton" data-accion="aprobar">Aprobar reserva y pago</button>'
    : '';
  var eliminar = conCrud
    ? '<button type="button" class="admin-boton admin-boton-peligro" data-accion="eliminar">Eliminar reserva</button>'
    : '';
  if (r.estado === "Cancelada") {
    return '<p class="texto-gris">Esta reserva está cancelada.</p>' + eliminar;
  }
  return aprobar + (conCrud ? '<button type="button" class="admin-boton-sec" data-accion="editar">Editar reserva</button>' : '') +
    '<button type="button" class="' + (conCrud ? 'admin-boton-sec' : 'admin-boton admin-boton-peligro') + '" data-accion="confirmar">Cancelar reserva</button>' +
    eliminar;
}

/* Valor total que se muestra bajo el formulario; precio undefined = no se sabe todavía */
export function pintarTotalReserva(entradas, precio) {
  var caja = document.getElementById("reserva-total");
  if (!caja) return;
  if (precio === undefined || !(entradas >= 1)) {
    caja.textContent = "";
    return;
  }
  caja.innerHTML = 'Valor total: <strong>' + textoPrecio(entradas * precio) + '</strong>';
}

/* r = null para registrar una reserva nueva */
export function pintarFormularioReserva(contenido, r, clientes, eventos) {
  contenido.innerHTML =
    '<div class="detalle-cabecera"><div>' +
      '<h2 id="detalle-nombre" tabindex="-1">' + (r ? "Editar la reserva " + escapar(r.codigo) : "Registrar reserva") + '</h2>' +
      '<p>' + (r ? escapar(r.cliente) + " · " + escapar(r.evento) : "Reserva entradas a nombre de un cliente.") + '</p>' +
    '</div></div>' +
    htmlFormulario("form-reserva", camposReserva(r, clientes, eventos),
      r ? { entradas: r.entradas, estado: r.estado, observaciones: r.observaciones }
        : { entradas: 1, estado: "Reservada" },
      r ? "Guardar cambios" : "Registrar reserva");
}

export function confirmarEliminacionReserva(r) {
  var acciones = document.getElementById("detalle-acciones");
  acciones.innerHTML =
    '<div class="detalle-confirmar">' +
      '<p id="texto-confirmar"><strong>¿Eliminar la reserva ' + escapar(r.codigo) + '?</strong> ' +
      'Desaparece del historial del cliente y de los reportes. Esto no se puede deshacer; ' +
      'si solo no se va a usar, mejor cancélala.</p>' +
      '<div class="detalle-botones">' +
        '<button type="button" class="admin-boton admin-boton-peligro" data-accion="si-eliminar" aria-describedby="texto-confirmar">Sí, eliminar</button>' +
        '<button type="button" class="admin-boton-sec" data-accion="volver">Volver</button>' +
      '</div>' +
    '</div>';
  acciones.querySelector('[data-accion="si-eliminar"]').focus();
}

export function confirmarCancelacionReserva(r, notaDevolucion) {
  var acciones = document.getElementById("detalle-acciones");
  var devolucion = r.estado === "Confirmada" && r.valor > 0 ? notaDevolucion : "";
  acciones.innerHTML =
    '<div class="detalle-confirmar">' +
      '<p id="texto-confirmar"><strong>¿Cancelar la reserva ' + escapar(r.codigo) + '?</strong> ' +
      'Las entradas volverán a quedar disponibles.' + devolucion + '</p>' +
      camposCancelacion("reserva", "cancelar") +
      '<p class="detalle-error" id="error-cancelar" role="alert"></p>' +
      '<div class="detalle-botones">' +
        '<button type="button" class="admin-boton admin-boton-peligro" data-accion="si-cancelar" aria-describedby="texto-confirmar">Sí, cancelar la reserva</button>' +
        '<button type="button" class="admin-boton-sec" data-accion="volver">Volver</button>' +
      '</div>' +
    '</div>';
  document.getElementById("cancelar-causa").focus();
}

function seccionEntrada(r) {
  if (!entradaValida(r)) {
    return '<p class="detalle-nota">Sin QR válido: ' +
      (r.estado === "Cancelada" ? "la reserva está cancelada."
        : "un administrador todavía no la aprueba.") + '</p>';
  }

  return '<div class="detalle-entrada">' +
    '<div class="qr qr-admin" id="detalle-qr"></div>' +
    '<p class="detalle-descripcion">' +
      (r.usada
        ? '<strong>Ya se usó:</strong> la entrada ya se validó en la puerta.'
        : "Todavía no se ha usado. Es el mismo QR que ve el cliente en su confirmación; se valida en \"Validar entradas\".") +
    '</p>' +
  '</div>';
}

export function pintarDetalleReserva(contenido, r, conCrud, mensaje) {
  var cancelacion = leerCancelacion(r.observaciones);

  contenido.innerHTML =
    '<div class="detalle-cabecera">' +
      '<div>' +
        '<h2 id="detalle-nombre" tabindex="-1">Reserva ' + escapar(r.codigo) + '</h2>' +
        '<p>' + escapar(r.evento) + '</p>' +
        '<span class="detalle-etiquetas">' +
          etiqueta(r.estado, CLASE_RESERVA[r.estado], "Reserva") +
          (r.valor > 0 && r.estado !== "Cancelada" ? etiquetaAprobacion(r) : "") +
        '</span>' +
      '</div>' +
    '</div>' +
    '<p class="detalle-aviso" id="detalle-aviso" role="status">' + (mensaje || "") + '</p>' +
    '<h3>Datos de la reserva</h3>' +
    '<dl class="detalle-datos">' +
      '<div><dt>Cliente</dt><dd>' + escapar(r.cliente) + '</dd></div>' +
      '<div><dt>Documento</dt><dd>' + escapar(r.documento) + '</dd></div>' +
      '<div><dt>Correo</dt><dd><a href="mailto:' + escapar(r.correo) + '">' + escapar(r.correo) + '</a></dd></div>' +
      '<div><dt>Fecha</dt><dd>' + fechaHora(r.fecha) + '</dd></div>' +
      '<div><dt>Evento</dt><dd><a href="evento.html?id=' + r.eventoId + '">' + escapar(r.evento) + '</a></dd></div>' +
      '<div><dt>Entradas</dt><dd>' + r.entradas + ' × ' + textoPrecio(r.precio) + '</dd></div>' +
      '<div><dt>Valor total</dt><dd><strong>' + textoPrecio(r.valor) + '</strong></dd></div>' +
      (cancelacion
        ? '<div><dt>Causa de la cancelación</dt><dd>' + escapar(cancelacion.causa) +
            ' <span class="texto-gris">(la canceló ' + escapar(cancelacion.quien) + ')</span>' +
            (cancelacion.detalle ? '<br />' + escapar(cancelacion.detalle) : '') +
          '</dd></div>'
        : '') +
    '</dl>' +
    '<h3>Aprobación</h3>' +
    '<p class="detalle-nota">' + notaAprobacion(r) + '</p>' +
    '<h3>Entrada</h3>' + seccionEntrada(r) +
    '<div class="detalle-acciones" id="detalle-acciones">' + botonesReserva(r, conCrud) + '</div>';

  var qr = document.getElementById("detalle-qr");
  if (qr) pintarQrReal(qr, r.codigo, r.eventoId);
}
