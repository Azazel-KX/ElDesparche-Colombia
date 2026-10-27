/* Entrada de eventos.html (listado de eventos) */
import { abrirConCatalogo } from "../controladores/catalogoControlador.js";
import { paginaEventos } from "../controladores/eventosControlador.js";
import { iniciarLayout } from "../controladores/layoutControlador.js";

iniciarLayout();
abrirConCatalogo(paginaEventos, "eventos");
