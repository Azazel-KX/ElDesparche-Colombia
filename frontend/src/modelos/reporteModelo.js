/* ==========================================================================
   modelos/reporteModelo.js
   Resúmenes y reportes del administrador y del agente.
   ========================================================================== */

import { llamarApi } from "./clienteApi.js";
import { completarEvento } from "./eventoModelo.js";

export function obtenerResumen(cantidad) {
  return llamarApi("/admin/resumen?meses=" + cantidad).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudieron cargar los datos del panel.");
    }
    return resultado.datos;
  });
}

export function obtenerResumenAgente() {
  return llamarApi("/agente/resumen").then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudieron cargar los datos de tu panel.");
    }
    var datos = resultado.datos;
    datos.eventos = datos.eventos.map(completarEvento);
    return datos;
  });
}

/* El año en curso (el backend también usa el año actual si no se le pide otro) */
var ANIO_REPORTES = new Date().getFullYear();

export var NOMBRES_MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
  "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function obtenerReportes() {
  return llamarApi("/admin/reportes?anio=" + ANIO_REPORTES).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudieron cargar los reportes.");
    }
    return resultado.datos;
  });
}
