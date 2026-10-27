/* Entrada de agente.html (panel del agente): una sección por ?seccion= */
import { iniciarSecciones } from "../controladores/adminControlador.js";
import { paginaEventosAgente } from "../controladores/agente/eventosControlador.js";
import { paginaPanelAgente } from "../controladores/agente/panelControlador.js";
import { paginaPerfilAgente } from "../controladores/agente/perfilControlador.js";
import { paginaReservasAgente, paginaValidarAgente } from "../controladores/agente/reservasValidarControlador.js";
import { iniciarLayout } from "../controladores/layoutControlador.js";

iniciarLayout();
iniciarSecciones({
  panel: paginaPanelAgente,
  eventos: paginaEventosAgente,
  reservas: paginaReservasAgente,
  validar: paginaValidarAgente,
  perfil: paginaPerfilAgente
});
