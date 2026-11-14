/* ==========================================================================
   controladores/admin/reportesControlador.js
   Reportes del administrador: pide los datos del año y los reparte a la vista.
   ========================================================================== */

import { entrarComoAdmin } from "../adminControlador.js";
import { pintarCobertura, pintarComerciales, pintarGenerales, pintarHistorial, pintarOperacion } from "../../vistas/admin/reportesVista.js";
import { obtenerReportes } from "../../modelos/reporteModelo.js";
import { escapar } from "../../lib/formato.js";

export function paginaReportes() {
  if (!entrarComoAdmin()) return;

  var aviso = document.getElementById("admin-aviso");
  var datos = null;

  document.getElementById("reporte-cliente").onchange = function () { pintarHistorial(datos); };
  document.getElementById("form-historial").addEventListener("submit", function (evento) { evento.preventDefault(); });

  obtenerReportes().then(function (respuesta) {
    datos = respuesta;
    pintarGenerales(datos);
    pintarComerciales(datos);
    pintarCobertura(datos);
    pintarOperacion(datos);
  }).catch(function (error) {
    aviso.innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
  });
}
