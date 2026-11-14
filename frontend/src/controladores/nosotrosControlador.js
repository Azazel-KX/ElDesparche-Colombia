/* ==========================================================================
   controladores/nosotrosControlador.js
   Página Nosotros: las partes de la página, las cifras con datos reales, las animaciones,
   la cinta de fotos, las preguntas frecuentes y la sala de prensa (el planeta de eventos).
   ========================================================================== */

import {
  prepararAnimaciones, prepararCifras, prepararCinta, prepararPartes, prepararPreguntas, prepararRegistroAgente
} from "../vistas/nosotrosVista.js";
import { prepararCopiar, prepararGlobo } from "../vistas/prensaVista.js";

/* "catalogoListo": promesa que se cumple cuando los eventos ya están cargados.
   Las cifras y el planeta se arman con los eventos reales, así que esperan. */
export function paginaNosotros(catalogoListo) {
  /* Primero las partes: las preguntas frecuentes abren la respuesta del ancla
     y para eso su parte ya tiene que estar a la vista */
  prepararPartes();
  catalogoListo.then(prepararCifras);
  prepararAnimaciones();
  prepararCinta();
  prepararRegistroAgente();
  prepararPreguntas();

  prepararCopiar();
  catalogoListo.then(prepararGlobo);
}
