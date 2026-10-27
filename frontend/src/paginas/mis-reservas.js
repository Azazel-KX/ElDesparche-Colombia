/* Entrada de mis-reservas.html (reservas del cliente) */
import { abrirConCatalogo } from "../controladores/catalogoControlador.js";
import { iniciarLayout } from "../controladores/layoutControlador.js";
import { paginaMisReservas } from "../controladores/reservaControlador.js";

iniciarLayout();
abrirConCatalogo(paginaMisReservas, "mis-reservas");
