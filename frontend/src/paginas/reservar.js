/* Entrada de reservar.html (formulario de reserva) */
import { abrirConCatalogo } from "../controladores/catalogoControlador.js";
import { iniciarLayout } from "../controladores/layoutControlador.js";
import { paginaReservar } from "../controladores/reservaControlador.js";

iniciarLayout();
abrirConCatalogo(paginaReservar, "reservar");
