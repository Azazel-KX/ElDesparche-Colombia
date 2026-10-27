/* Entrada de admin.html (panel del administrador): una sección por ?seccion= */
import { iniciarSecciones } from "../controladores/adminControlador.js";
import { paginaAdministradores } from "../controladores/admin/administradoresControlador.js";
import { paginaAgentes } from "../controladores/admin/agentesControlador.js";
import { paginaClientes } from "../controladores/admin/clientesControlador.js";
import { paginaEventosAdmin } from "../controladores/admin/eventosControlador.js";
import { paginaPanel } from "../controladores/admin/panelControlador.js";
import { paginaReportes } from "../controladores/admin/reportesControlador.js";
import { paginaReservasAdmin } from "../controladores/admin/reservasControlador.js";
import { paginaUbicaciones } from "../controladores/admin/ubicacionesControlador.js";
import { paginaValidar } from "../controladores/admin/validarControlador.js";
import { iniciarLayout } from "../controladores/layoutControlador.js";

iniciarLayout();
iniciarSecciones({
  panel: paginaPanel,
  reportes: paginaReportes,
  agentes: paginaAgentes,
  eventos: paginaEventosAdmin,
  clientes: paginaClientes,
  administradores: paginaAdministradores,
  reservas: function () { paginaReservasAdmin(); },
  ubicaciones: paginaUbicaciones,
  validar: function () { paginaValidar(); }
});
