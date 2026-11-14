/* ==========================================================================
   controladores/agenteControlador.js
   Base del panel del agente.
   ========================================================================== */

import { ciudadesPorDepartamento } from "../modelos/ubicacionModelo.js";
import { obtenerUsuario } from "../modelos/sesionModelo.js";
import { abrirAcceso } from "../vistas/accesoVista.js";
import { llenarCiudadesAgente } from "../vistas/agenteVista.js";

/* Muestra el panel si hay sesión de agente; si no, el aviso de acceso */
export function entrarComoAgente() {
  var usuario = obtenerUsuario();

  if (!usuario || usuario.tipo !== "agente") {
    document.getElementById("admin-bloqueo").hidden = false;
    document.getElementById("bloqueo-entrar").onclick = function () {
      abrirAcceso("entrar");
    };
    return null;
  }

  document.getElementById("admin-marco").hidden = false;
  return usuario;
}

/* Llena la lista de ciudades del formulario, agrupadas por departamento */
export function cargarCiudadesAgente(lista) {
  return ciudadesPorDepartamento().then(function (grupos) {
    llenarCiudadesAgente(lista, grupos);
  });
}
