/* ==========================================================================
   vistas/admin/clientesVista.js
   Gestión de clientes (admin.html?seccion=clientes): resumen, tabla y detalle con el historial de reservas.
   ========================================================================== */

import { escapar, normalizar, numero, pesos, textoPrecio } from "../../lib/formato.js";
import { edad, fechaLarga } from "../../lib/fechas.js";
import { CLASE_RESERVA, etiqueta } from "../etiquetasVista.js";
import { graficaVentas } from "../graficasVista.js";
import { animarAlVer } from "../../lib/dom.js";
import { pintarTarjetasResumen } from "../graficasVista.js";
import { EVENTOS } from "../../modelos/eventoModelo.js";

export function pintarResumenClientes(clientes) {
  var cuantos = function (prueba) { return clientes.filter(prueba).length; };
  pintarTarjetasResumen([
    { titulo: "Clientes registrados", valor: clientes.length, formato: numero.format },
    { titulo: "Cuentas activas", valor: cuantos(function (c) { return c.cuenta === "Activa"; }), formato: numero.format },
    { titulo: "Clientes con reservas", valor: cuantos(function (c) { return c.reservas.length > 0; }), formato: numero.format },
    { titulo: "Cuentas bloqueadas", valor: cuantos(function (c) { return c.cuenta === "Bloqueada"; }), formato: numero.format }
  ]);
}

export function pintarTablaClientes(clientes) {
  var buscar = document.getElementById("buscar-cliente");
  var filtroCuenta = document.getElementById("filtro-cuenta");
  var orden = document.getElementById("orden-clientes");
  var conteo = document.getElementById("conteo-clientes");
  var cuerpo = document.getElementById("cuerpo-clientes");
  var texto = normalizar(buscar.value.trim());

  var lista = clientes.filter(function (c) {
    var coincide = texto === "" ||
      normalizar(c.nombre + " " + c.documento + " " + c.correo + " " + c.alias).indexOf(texto) !== -1;
    return coincide &&
      (filtroCuenta.value === "" || c.cuenta === filtroCuenta.value);
  });

  lista.sort(function (a, b) {
    if (orden.value === "nombre") return a.nombre.localeCompare(b.nombre, "es");
    if (orden.value === "reservas") return b.reservas.length - a.reservas.length;
    if (orden.value === "puntos") return b.puntos - a.puntos;
    return b.registro.localeCompare(a.registro);
  });

  conteo.textContent = lista.length === clientes.length
    ? "Mostrando los " + clientes.length + " clientes."
    : "Mostrando " + lista.length + " de " + clientes.length + " clientes.";

  if (lista.length === 0) {
    cuerpo.innerHTML = '<tr role="row"><td role="cell" colspan="6" class="tabla-vacia">' +
      'No hay clientes que coincidan con la búsqueda. Prueba con otros filtros.</td></tr>';
    return;
  }

  cuerpo.innerHTML = lista.map(function (c) {
    return '<tr role="row" class="' + (c.cuenta === "Bloqueada" ? "fila-bloqueada" : "") + '">' +
      '<th scope="row" role="rowheader">' +
        '<span class="agente-celda">' +
          '<span class="agente-inicial agente-inicial-cliente" aria-hidden="true">' + escapar(c.nombre.charAt(0)) + '</span>' +
          '<span><span class="agente-nombre">' + escapar(c.nombre) + '</span>' +
          '<span class="agente-nit">' + escapar(c.tipoDoc) + ' ' + escapar(c.documento) +
            (c.cuenta === "Bloqueada" ? ' · <strong class="texto-bloqueada">Cuenta bloqueada</strong>' : '') + '</span></span>' +
        '</span>' +
      '</th>' +
      '<td role="cell" data-etiqueta="Ciudad">' + escapar(c.ciudad) + '</td>' +
      '<td role="cell" data-etiqueta="Edad" class="numero">' + edad(c.nacimiento) + ' años</td>' +
      '<td role="cell" data-etiqueta="Reservas" class="numero">' + c.reservas.length + '</td>' +
      '<td role="cell" data-etiqueta="Puntos" class="numero">' + numero.format(c.puntos) + '</td>' +
      '<td role="cell" class="celda-accion">' +
        '<button type="button" class="admin-boton-sec" data-documento="' + escapar(c.documento) + '">' +
          'Ver detalle<span class="oculto"> de ' + escapar(c.nombre) + '</span>' +
        '</button>' +
      '</td>' +
    '</tr>';
  }).join("");
}

export function botonesCliente(c) {
  return '<button type="button" class="admin-boton-sec" data-accion="editar">Editar datos</button>' +
    (c.cuenta === "Bloqueada"
      ? '<button type="button" class="admin-boton" data-accion="Activa">Desbloquear cuenta</button>'
      : '<button type="button" class="admin-boton-sec" data-accion="confirmar">Bloquear cuenta</button>') +
    '<button type="button" class="admin-boton admin-boton-peligro" data-accion="eliminar">Eliminar cliente</button>';
}

export function pintarDetalleCliente(c, mensaje) {
  var contenido = document.getElementById("detalle-contenido");
  var gastado = 0;
  var historial = c.reservas.map(function (r) {
    var evento = EVENTOS.filter(function (e) { return e.id === r[0]; })[0];
    if (!evento) return "";
    var valor = r[1] * evento.precio;
    if (r[2] !== "Cancelada") gastado += valor;
    return '<li>' +
      '<a href="evento.html?id=' + evento.id + '">' + escapar(evento.titulo) + '</a>' +
      '<span class="detalle-evento-dato">' + fechaLarga(r[3]) + ' · ' + r[1] +
        (r[1] === 1 ? " entrada" : " entradas") + ' · ' + textoPrecio(valor) + '</span>' +
      etiqueta(r[2], CLASE_RESERVA[r[2]], "Reserva") +
    '</li>';
  }).join("");

  contenido.innerHTML =
    '<div class="detalle-cabecera">' +
      '<span class="agente-inicial agente-inicial-grande agente-inicial-cliente" aria-hidden="true">' + escapar(c.nombre.charAt(0)) + '</span>' +
      '<div>' +
        '<h2 id="detalle-nombre" tabindex="-1">' + escapar(c.nombre) + '</h2>' +
        '<p>' + (c.alias ? '@' + escapar(c.alias) : 'Sin alias') + '</p>' +
        '<span class="detalle-etiquetas">' +
          (c.cuenta === "Bloqueada"
            ? etiqueta("Cuenta bloqueada", "agente-suspendido", "Cuenta")
            : etiqueta("Cuenta activa", "agente-activo", "Cuenta")) +
        '</span>' +
      '</div>' +
    '</div>' +
    '<p class="detalle-aviso" id="detalle-aviso" role="status">' + (mensaje || "") + '</p>' +
    '<dl class="detalle-datos">' +
      '<div><dt>Documento</dt><dd>' + escapar(c.tipoDoc) + ' ' + escapar(c.documento) + '</dd></div>' +
      '<div><dt>Ciudad</dt><dd>' + escapar(c.ciudad) + '</dd></div>' +
      '<div><dt>Correo</dt><dd><a href="mailto:' + escapar(c.correo) + '">' + escapar(c.correo) + '</a></dd></div>' +
      '<div><dt>Teléfono</dt><dd>' + (c.telefono ? escapar(c.telefono) : 'Sin teléfono') + '</dd></div>' +
      '<div><dt>Dirección</dt><dd>' + escapar(c.direccion || "") + '</dd></div>' +
      '<div><dt>Fecha de nacimiento</dt><dd>' + fechaLarga(c.nacimiento) + ' (' + edad(c.nacimiento) + ' años)</dd></div>' +
      '<div><dt>Registrado el</dt><dd>' + fechaLarga(c.registro) + '</dd></div>' +
      '<div><dt>Puntos</dt><dd>' + numero.format(c.puntos) + '</dd></div>' +
      '<div><dt>Recibe publicidad</dt><dd>' + (c.publicidad ? "Sí" : "No") + '</dd></div>' +
      '<div><dt>Reservas</dt><dd>' + c.reservas.length + '</dd></div>' +
      '<div><dt>Total gastado</dt><dd>' + pesos.format(gastado) + '</dd></div>' +
    '</dl>' +
    '<h3>Entradas compradas por mes</h3>' +
    graficaVentas(c.compras, "Entradas compradas por mes") +
    '<h3>Historial de reservas</h3>' +
    (historial
      ? '<ul class="detalle-eventos">' + historial + '</ul>'
      : '<p class="texto-gris">Todavía no ha hecho ninguna reserva.</p>') +
    '<div class="detalle-acciones" id="detalle-acciones">' + botonesCliente(c) + '</div>';

  animarAlVer(contenido.querySelector(".grafica-columnas"));
}
