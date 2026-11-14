/* Entrada de confirmacion.html (comprobante de la reserva) */
import { abrirConCatalogo } from "../controladores/catalogoControlador.js";
import { iniciarLayout } from "../controladores/layoutControlador.js";
import { paginaConfirmacion } from "../controladores/reservaControlador.js";

iniciarLayout();
abrirConCatalogo(paginaConfirmacion, "confirmacion");
