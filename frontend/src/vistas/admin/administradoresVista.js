/* ==========================================================================
   vistas/admin/administradoresVista.js
   Gestión de administradores (admin.html?seccion=administradores): resumen, tabla y detalle.
   ========================================================================== */

import { escapar, normalizar, numero, pesos, pesosCompacto } from "../../lib/formato.js";
import { esMiCuenta } from "../../modelos/personaModelo.js";
import { fechaLarga } from "../../lib/fechas.js";
import { pintarTarjetasResumen } from "../graficasVista.js";

export function pintarResumenAdministradores(administradores) {
  var nomina = administradores.reduce(function (s, a) { return s + a.salario; }, 0);
  pintarTarjetasResumen([
    { titulo: "Administradores", valor: administradores.length, formato: numero.format },
    { titulo: "Con jornada completa", valor: administradores.filter(function (a) { return a.horario === "Completa"; }).length, formato: numero.format },
    { titulo: "Nómina mensual", valor: nomina, formato: pesosCompacto.format, completo: pesos.format },
    { titulo: "Salario promedio", valor: administradores.length ? Math.round(nomina / administradores.length) : 0,
      formato: pesosCompacto.format, completo: pesos.format }
  ]);
}

export function pintarTablaAdministradores(administradores) {
  var buscar = document.getElementById("buscar-administrador");
  var filtroHorario = document.getElementById("filtro-horario");
  var orden = document.getElementById("orden-administradores");
  var conteo = document.getElementById("conteo-administradores");
  var cuerpo = document.getElementById("cuerpo-administradores");
  var texto = normalizar(buscar.value.trim());
  var lista = administradores.filter(function (a) {
    return (texto === "" || normalizar(a.nombre + " " + a.documento + " " + a.correo).indexOf(texto) !== -1) &&
      (filtroHorario.value === "" || a.horario === filtroHorario.value);
  });

  lista.sort(function (a, b) {
    if (orden.value === "salario") return b.salario - a.salario;
    if (orden.value === "registro") return b.registro.localeCompare(a.registro);
    return a.nombre.localeCompare(b.nombre, "es");
  });

  conteo.textContent = lista.length === administradores.length
    ? "Mostrando los " + administradores.length + " administradores."
    : "Mostrando " + lista.length + " de " + administradores.length + " administradores.";

  if (lista.length === 0) {
    cuerpo.innerHTML = '<tr role="row"><td role="cell" colspan="5" class="tabla-vacia">' +
      'No hay administradores que coincidan con la búsqueda. Prueba con otros filtros.</td></tr>';
    return;
  }

  cuerpo.innerHTML = lista.map(function (a) {
    return '<tr role="row">' +
      '<th scope="row" role="rowheader">' +
        '<span class="agente-celda">' +
          '<span class="agente-inicial" aria-hidden="true">' + escapar(a.nombre.charAt(0)) + '</span>' +
          '<span><span class="agente-nombre">' + escapar(a.nombre) + (esMiCuenta(a) ? ' <span class="admin-tu">(tú)</span>' : '') + '</span>' +
          '<span class="agente-nit">' + escapar(a.tipoDoc + " " + a.documento) + '</span></span>' +
        '</span>' +
      '</th>' +
      '<td role="cell" data-etiqueta="Ciudad">' + escapar(a.ciudad) + '</td>' +
      '<td role="cell" data-etiqueta="Horario">' + escapar(a.horario) + '</td>' +
      '<td role="cell" data-etiqueta="Salario" class="numero">' + pesos.format(a.salario) + '</td>' +
      '<td role="cell" class="celda-accion">' +
        '<button type="button" class="admin-boton-sec" data-documento="' + escapar(a.documento) + '">' +
          'Ver detalle<span class="oculto"> de ' + escapar(a.nombre) + '</span>' +
        '</button>' +
      '</td>' +
    '</tr>';
  }).join("");
}

export function botonesAdministrador() {
  return '<button type="button" class="admin-boton-sec" data-accion="editar">Editar datos</button>' +
    '<button type="button" class="admin-boton admin-boton-peligro" data-accion="eliminar">Eliminar administrador</button>';
}

export function pintarDetalleAdministrador(a, mensaje) {
  var contenido = document.getElementById("detalle-contenido");
  contenido.innerHTML =
    '<div class="detalle-cabecera">' +
      '<span class="agente-inicial agente-inicial-grande" aria-hidden="true">' + escapar(a.nombre.charAt(0)) + '</span>' +
      '<div>' +
        '<h2 id="detalle-nombre" tabindex="-1">' + escapar(a.nombre) + '</h2>' +
        '<p>Administrador' + (esMiCuenta(a) ? ' · es tu cuenta' : '') + '</p>' +
      '</div>' +
    '</div>' +
    '<p class="detalle-aviso" id="detalle-aviso" role="status">' + (mensaje || "") + '</p>' +
    '<dl class="detalle-datos">' +
      '<div><dt>Documento</dt><dd>' + escapar(a.tipoDoc + " " + a.documento) + '</dd></div>' +
      '<div><dt>Correo</dt><dd><a href="mailto:' + escapar(a.correo) + '">' + escapar(a.correo) + '</a></dd></div>' +
      '<div><dt>Teléfono</dt><dd>' + (a.telefono ? escapar(a.telefono) : 'Sin teléfono') + '</dd></div>' +
      '<div><dt>Dirección</dt><dd>' + escapar(a.direccion) + '</dd></div>' +
      '<div><dt>Ciudad</dt><dd>' + escapar(a.ciudad) + '</dd></div>' +
      '<div><dt>Horario</dt><dd>' + escapar(a.horario) + '</dd></div>' +
      '<div><dt>Salario mensual</dt><dd>' + pesos.format(a.salario) + '</dd></div>' +
      '<div><dt>Registrado el</dt><dd>' + fechaLarga(a.registro) + '</dd></div>' +
    '</dl>' +
    '<div class="detalle-acciones" id="detalle-acciones">' + botonesAdministrador() + '</div>';
}
