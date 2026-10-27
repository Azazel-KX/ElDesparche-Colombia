/* Entrada de nosotros.html (quiénes somos, prensa y preguntas frecuentes) */
import { abrirConCatalogo } from "../controladores/catalogoControlador.js";
import { iniciarLayout } from "../controladores/layoutControlador.js";
import { paginaNosotros } from "../controladores/nosotrosControlador.js";

iniciarLayout();
paginaNosotros(abrirConCatalogo(function () {}, "nosotros"));
