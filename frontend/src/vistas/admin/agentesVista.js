/* ==========================================================================
   vistas/admin/agentesVista.js
   Gestión de agentes (admin.html?seccion=agentes): resumen, tabla, detalle y filtros.
   ========================================================================== */

import { escapar, normalizar, numero, pesos } from "../../lib/formato.js";
import { avatarAgente, etiquetaAgente } from "../etiquetasVista.js";
import { fechaLarga } from "../../lib/fechas.js";
import { graficaVentas } from "../graficasVista.js";
import { animarAlVer } from "../../lib/dom.js";
import { pintarTarjetasResumen } from "../graficasVista.js";
import { EVENTOS } from "../../modelos/eventoModelo.js";
import { etiquetaEstado } from "../etiquetasVista.js";

export function pintarResumenAgentes(agentes) {
  var contar = function (estado) { return agentes.filter(function (a) { return a.estado === estado; }).length; };
  pintarTarjetasResumen([
    { titulo: "Agentes registrados", valor: agentes.length, formato: numero.format },
    { titulo: "Activos", valor: contar("Activo"), formato: numero.format },
    { titulo: "Pendientes de aprobación", valor: contar("Pendiente"), formato: numero.format, alerta: true },
    { titulo: "Suspendidos", valor: contar("Suspendido"), formato: numero.format }
  ]);
}

export function pintarTablaAgentes(agentes) {
  var buscar = document.getElementById("buscar-agente");
  var filtroEstado = document.getElementById("filtro-estado");
  var filtroCiudad = document.getElementById("filtro-ciudad");
  var orden = document.getElementById("orden-agentes");
  var conteo = document.getElementById("conteo-agentes");
  var cuerpo = document.getElementById("cuerpo-agentes");
  var texto = normalizar(buscar.value.trim());

  var lista = agentes.filter(function (a) {
    var coincide = texto === "" ||
      normalizar(a.nombre + " " + a.razon + " " + a.nit + " " + a.correo).indexOf(texto) !== -1;
    return coincide &&
      (filtroEstado.value === "" || a.estado === filtroEstado.value) &&
      (filtroCiudad.value === "" || a.ciudad === filtroCiudad.value);
  });

  lista.sort(function (a, b) {
    if (orden.value === "nombre") return a.nombre.localeCompare(b.nombre, "es");
    if (orden.value === "registro") return b.registro.localeCompare(a.registro);
    if (orden.value === "entradas") return b.entradas - a.entradas;
    return b.ingresos - a.ingresos;
  });

  conteo.textContent = lista.length === agentes.length
    ? "Mostrando los " + agentes.length + " agentes."
    : "Mostrando " + lista.length + " de " + agentes.length + " agentes.";

  if (lista.length === 0) {
    cuerpo.innerHTML = '<tr role="row"><td role="cell" colspan="7" class="tabla-vacia">' +
      'No hay agentes que coincidan con la búsqueda. Prueba con otros filtros.</td></tr>';
    return;
  }

  cuerpo.innerHTML = lista.map(function (a) {
    var accion = a.estado === "Pendiente" ? "Revisar" : "Ver detalle";
    return '<tr role="row" class="' + (a.estado === "Pendiente" ? "fila-pendiente" : "") + '">' +
      '<th scope="row" role="rowheader">' +
        '<span class="agente-celda">' +
          avatarAgente(a, false) +
          '<span><span class="agente-nombre">' + escapar(a.nombre) + '</span>' +
          '<span class="agente-nit">NIT ' + escapar(a.nit) + '</span></span>' +
        '</span>' +
      '</th>' +
      '<td role="cell" data-etiqueta="Ciudad">' + escapar(a.ciudad) + '</td>' +
      '<td role="cell" data-etiqueta="Eventos" class="numero">' + a.eventos.length + '</td>' +
      '<td role="cell" data-etiqueta="Entradas vendidas" class="numero">' + numero.format(a.entradas) + '</td>' +
      '<td role="cell" data-etiqueta="Ingresos" class="numero">' + pesos.format(a.ingresos) + '</td>' +
      '<td role="cell" data-etiqueta="Estado">' + etiquetaAgente(a.estado) + '</td>' +
      '<td role="cell" class="celda-accion">' +
        '<button type="button" class="admin-boton-sec" data-nit="' + escapar(a.nit) + '">' +
          accion + '<span class="oculto"> de ' + escapar(a.nombre) + '</span>' +
        '</button>' +
      '</td>' +
    '</tr>';
  }).join("");
}

export function botonesAgente(a) {
  var estado;
  if (a.estado === "Pendiente") {
    estado = '<button type="button" class="admin-boton" data-accion="Activo">Aprobar agente</button>';
  } else if (a.estado === "Suspendido") {
    estado = '<button type="button" class="admin-boton" data-accion="Activo">Reactivar agente</button>';
  } else {
    estado = '<button type="button" class="admin-boton-sec" data-accion="confirmar">Suspender agente</button>';
  }
  return '<button type="button" class="admin-boton-sec" data-accion="editar">Editar datos</button>' + estado +
    '<button type="button" class="admin-boton admin-boton-peligro" data-accion="eliminar">Eliminar agente</button>';
}

export function pintarDetalleAgente(a, mensaje) {
  var contenido = document.getElementById("detalle-contenido");
  var eventos = a.eventos.map(function (id) {
    return EVENTOS.filter(function (e) { return e.id === id; })[0];
  }).filter(Boolean);

  contenido.innerHTML =
    '<div class="detalle-cabecera">' +
      avatarAgente(a, true) +
      '<div>' +
        '<h2 id="detalle-nombre" tabindex="-1">' + escapar(a.nombre) + '</h2>' +
        '<p>' + escapar(a.razon) + '</p>' +
        etiquetaAgente(a.estado) +
      '</div>' +
    '</div>' +
    '<p class="detalle-aviso" id="detalle-aviso" role="status">' + (mensaje || "") + '</p>' +
    (a.descripcion ? '<p class="detalle-descripcion">' + escapar(a.descripcion) + '</p>' : '') +
    '<dl class="detalle-datos">' +
      '<div><dt>NIT</dt><dd>' + escapar(a.nit) + '</dd></div>' +
      (a.nombres
        ? '<div><dt>Representante</dt><dd>' + escapar(a.nombres + " " + a.apellidos) +
            '<br /><span class="texto-gris">' + escapar(a.tipoDoc + " " + a.documento) + '</span></dd></div>'
        : '') +
      (a.direccion ? '<div><dt>Dirección</dt><dd>' + escapar(a.direccion) + '</dd></div>' : '') +
      '<div><dt>Ciudad</dt><dd>' + escapar(a.ciudad) + '</dd></div>' +
      '<div><dt>Correo</dt><dd><a href="mailto:' + escapar(a.correo) + '">' + escapar(a.correo) + '</a></dd></div>' +
      '<div><dt>Teléfono</dt><dd>' + (a.telefono ? escapar(a.telefono) : 'Sin teléfono') + '</dd></div>' +
      '<div><dt>Registrado el</dt><dd>' + fechaLarga(a.registro) + '</dd></div>' +
      '<div><dt>Experiencia</dt><dd>' + a.experiencia + (a.experiencia === 1 ? " año" : " años") + '</dd></div>' +
      '<div><dt>Comisión</dt><dd>' + String(a.comision).replace(".", ",") + ' %</dd></div>' +
      '<div><dt>Ingresos (12 meses)</dt><dd>' + pesos.format(a.ingresos) + '</dd></div>' +
    '</dl>' +
    '<h3>Entradas vendidas por mes</h3>' +
    graficaVentas(a.ventas, "Entradas vendidas por mes") +
    '<h3>Eventos publicados</h3>' +
    (eventos.length
      ? '<ul class="detalle-eventos">' + eventos.map(function (e) {
          return '<li><a href="evento.html?id=' + e.id + '">' + escapar(e.titulo) + '</a>' +
            '<span class="detalle-evento-dato">' + escapar(e.ciudad) + ' · ' + escapar(e.fechaCorta) + '</span>' +
            etiquetaEstado(e.estado, false) + '</li>';
        }).join("") + '</ul>'
      : '<p class="texto-gris">Todavía no tiene eventos publicados.</p>') +
    '<div class="detalle-acciones" id="detalle-acciones">' + botonesAgente(a) + '</div>';

  animarAlVer(contenido.querySelector(".grafica-columnas"));
}

/* Las ciudades que tienen agentes se agregan al filtro de ciudad */
export function llenarFiltroCiudades(agentes) {
  var filtroCiudad = document.getElementById("filtro-ciudad");
  var ciudadesFiltro = agentes.map(function (a) { return a.ciudad; })
    .filter(function (c, i, todas) { return todas.indexOf(c) === i; })
    .sort(function (a, b) { return a.localeCompare(b, "es"); });
  ciudadesFiltro.forEach(function (ciudad) {
    var opcion = document.createElement("option");
    opcion.value = ciudad;
    opcion.textContent = ciudad;
    filtroCiudad.appendChild(opcion);
  });
}
