/* ==========================================================================
   controladores/admin/panelControlador.js
   Panel de administración: indicadores y gráficas de los últimos meses.
   ========================================================================== */

import { entrarComoAdmin } from "../adminControlador.js";
import { obtenerResumen } from "../../modelos/reporteModelo.js";
import { escapar } from "../../lib/formato.js";
import { pintarActividad, pintarAgentes, pintarCategorias, pintarEstados, pintarIndicadores, pintarMeses, prepararSelectorSerie } from "../../vistas/graficasVista.js";

export function paginaPanel() {
  var usuario = entrarComoAdmin();
  if (!usuario) return;

  document.getElementById("admin-saludo").textContent =
    "Hola, " + usuario.nombre.split(" ")[0] + ". Este es el resumen de El Desparche.";

  var aviso = document.getElementById("admin-aviso");
  var selector = document.getElementById("admin-meses");
  var datosActuales = null;

  function cargar() {
    var cantidad = Number(selector.value);

    obtenerResumen(cantidad).then(function (datos) {
      datosActuales = datos;
      aviso.textContent = "";
      pintarIndicadores(datos);
      pintarMeses(datos);
      pintarEstados(datos);
      pintarCategorias(datos);
      pintarAgentes(datos);
      pintarActividad(datos);
    }).catch(function (error) {
      aviso.innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
    });
  }

  selector.onchange = cargar;
  prepararSelectorSerie(function () { return datosActuales; });

  var cajaMeses = document.getElementById("grafica-meses");
  var anchoAnterior = 0;
  var espera = null;
  if ("ResizeObserver" in window) {
    new ResizeObserver(function () {
      clearTimeout(espera);
      espera = setTimeout(function () {
        var ancho = cajaMeses.clientWidth;
        if (datosActuales && ancho > 0 && Math.abs(ancho - anchoAnterior) > 20) {
          anchoAnterior = ancho;
          pintarMeses(datosActuales);
        }
      }, 150);
    }).observe(cajaMeses);
  }

  cargar();
}
