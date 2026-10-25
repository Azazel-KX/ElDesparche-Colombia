/* Entrada de evento.html (detalle de un evento) */
import { abrirConCatalogo } from "../controladores/catalogoControlador.js";
import { paginaEvento } from "../controladores/eventosControlador.js";
import { iniciarLayout } from "../controladores/layoutControlador.js";

iniciarLayout();
abrirConCatalogo(paginaEvento, "evento");
