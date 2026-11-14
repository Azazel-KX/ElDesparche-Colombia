/* ==========================================================================
   controladores/agente/panelControlador.js
   Panel del agente (agente.html): indicadores, gráficas y actividad de sus eventos.
   ========================================================================== */

import { escapar } from "../../lib/formato.js";
import { obtenerResumenAgente } from "../../modelos/reporteModelo.js";
import { pintarEstadoCuenta, pintarEventosAgente, pintarIndicadoresAgente, pintarSaludoAgente } from "../../vistas/agenteVista.js";
import { pintarActividad, pintarEstados, pintarMeses, prepararSelectorSerie } from "../../vistas/graficasVista.js";
import { entrarComoAgente } from "../agenteControlador.js";

export function paginaPanelAgente() {
  var usuario = entrarComoAgente();
  if (!usuario) return;

  var aviso = document.getElementById("admin-aviso");
  var datosActuales = null;

  obtenerResumenAgente().then(function (datos) {
    datosActuales = datos;

    pintarSaludoAgente(usuario, datos);
    datos.nombreCantidad = "Entradas";

    aviso.textContent = "";

    pintarEstadoCuenta(datos.agente);
    pintarIndicadoresAgente(datos);
    pintarMeses(datos);
    pintarEventosAgente(datos);
    pintarEstados(datos);
    pintarActividad(datos);
  }).catch(function (error) {
    aviso.innerHTML = "<strong>Error:</strong> " + escapar(error.message);
  });

  prepararSelectorSerie(function () { return datosActuales; });

  /* La gráfica de meses se vuelve a dibujar si cambia mucho el ancho */
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
}
