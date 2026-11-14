/* ==========================================================================
   controladores/catalogoControlador.js
   Arranque de las páginas que muestran eventos: pide el catálogo a la API y, cuando llega,
   ejecuta lo propio de la página.
   ========================================================================== */

import { avisoCatalogo } from "../vistas/eventoVista.js";
import { cargarCatalogo, usarCatalogo } from "../modelos/eventoModelo.js";

/* Promesa que se cumple cuando el catálogo ya está cargado (o falló): sirve a los scripts
   que dependen de los eventos y no son una "página" (cifras de Nosotros, planeta de prensa) */
export var catalogoListo = Promise.resolve();

/* Carga el catálogo y llama a arrancar().
   Si no carga, avisa arriba de la página: sin catálogo no hay evento que mostrar ni reservar, así que
   las páginas "evento" y "reservar" se quedan con el aviso y las demás arrancan con la lista vacía. */
export function abrirConCatalogo(arrancar, pagina) {
  catalogoListo = cargarCatalogo().then(function () {
    arrancar();
  }, function (error) {
    usarCatalogo([]);
    avisoCatalogo(error.message);
    if (pagina !== "evento" && pagina !== "reservar") arrancar();
  });
  return catalogoListo;
}
