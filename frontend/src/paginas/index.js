/* Entrada de index.html (portada) */
import { abrirConCatalogo } from "../controladores/catalogoControlador.js";
import { paginaInicio } from "../controladores/inicioControlador.js";
import { iniciarLayout } from "../controladores/layoutControlador.js";

iniciarLayout();
abrirConCatalogo(paginaInicio, "inicio");
