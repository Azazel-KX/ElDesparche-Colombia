/* ==========================================================================
   controladores/agente/reservasValidarControlador.js
   Reservas y Validar entradas del agente: son las mismas secciones del administrador,
   limitadas a los eventos del agente.
   ========================================================================== */

import { escapar } from "../../lib/formato.js";
import { obtenerEventosDelAgente } from "../../modelos/eventoModelo.js";
import { cancelarReservaAgente, obtenerReservasAgente } from "../../modelos/reservaModelo.js";
import { pintarEstadoCuenta } from "../../vistas/agenteVista.js";
import { paginaReservasAdmin } from "../admin/reservasControlador.js";
import { paginaValidar } from "../admin/validarControlador.js";
import { entrarComoAgente } from "../agenteControlador.js";

function avisarError(error) {
  document.getElementById("admin-aviso").innerHTML = "<strong>Error:</strong> " + escapar(error.message);
}

export function paginaValidarAgente() {
  var usuario = entrarComoAgente();
  if (!usuario) return;

  obtenerEventosDelAgente().then(function (datos) {
    pintarEstadoCuenta(datos.agente);
    paginaValidar({
      usuario: usuario,
      eventos: datos.eventos.map(function (e) { return e.id; }),
      obtenerReservas: obtenerReservasAgente,
      rutaIngreso: "/agente/entradas/"
    });
  }).catch(avisarError);
}

export function paginaReservasAgente() {
  var usuario = entrarComoAgente();
  if (!usuario) return;

  obtenerEventosDelAgente().then(function (datos) {
    pintarEstadoCuenta(datos.agente);
    paginaReservasAdmin({
      eventos: datos.eventos.map(function (e) { return e.id; }),
      obtenerReservas: obtenerReservasAgente,
      cancelar: cancelarReservaAgente,
      quien: "el agente",
      notaDevolucion: " El pago ya fue aprobado: el equipo de El Desparche hará la devolución del dinero al cliente."
    });
  }).catch(avisarError);
}
