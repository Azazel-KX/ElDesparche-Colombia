/* ==========================================================================
   vistas/paginacionVista.js
   Botones "Anterior" y "Siguiente" bajo las tablas de los paneles. Cada tabla se identifica por el id
   de su <tbody>; al cambiar un filtro, la búsqueda o el orden se vuelve a la primera página.
   ========================================================================== */

import { paginar } from "../lib/paginacion.js";

var paginaDe = {};   /* id del cuerpo -> página que se está viendo */

function reiniciarSiEsFiltro(evento) {
  if (evento.target.closest && evento.target.closest(".admin-filtros")) paginaDe = {};
}
/* En la fase de captura, para que corra antes de que la tabla se vuelva a pintar */
document.addEventListener("input", reiniciarSiEsFiltro, true);
document.addEventListener("change", reiniciarSiEsFiltro, true);

function caja(idCuerpo) {
  var tabla = document.getElementById(idCuerpo).closest("table");
  var nav = tabla.nextElementSibling;
  if (!nav || !nav.classList.contains("paginacion")) {
    nav = document.createElement("nav");
    nav.className = "paginacion";
    nav.setAttribute("aria-label", "Páginas de la tabla");
    tabla.parentNode.insertBefore(nav, tabla.nextSibling);
  }
  return nav;
}

/* Sin filas que mostrar: se esconden los botones */
export function ocultarPaginacion(idCuerpo) {
  caja(idCuerpo).hidden = true;
}

/* Devuelve las filas de la página actual y dibuja los botones. "repintar" vuelve a pintar la tabla. */
export function paginarTabla(idCuerpo, lista, repintar) {
  var pag = paginar(lista, paginaDe[idCuerpo]);
  paginaDe[idCuerpo] = pag.pagina;

  var nav = caja(idCuerpo);
  nav.hidden = pag.paginas <= 1;
  nav.innerHTML =
    '<button type="button" class="admin-boton-sec" data-pagina="anterior"' + (pag.pagina === 1 ? " disabled" : "") + '>Anterior</button>' +
    '<span class="paginacion-texto" role="status">Página ' + pag.pagina + ' de ' + pag.paginas + '</span>' +
    '<button type="button" class="admin-boton-sec" data-pagina="siguiente"' + (pag.pagina === pag.paginas ? " disabled" : "") + '>Siguiente</button>';

  nav.onclick = function (evento) {
    var boton = evento.target.closest("button[data-pagina]");
    if (!boton || boton.disabled) return;
    var anterior = boton.getAttribute("data-pagina") === "anterior";
    paginaDe[idCuerpo] = pag.pagina + (anterior ? -1 : 1);
    repintar();
    /* El foco se queda en el mismo botón (el nav se vuelve a dibujar) */
    var otro = caja(idCuerpo).querySelector('button[data-pagina="' + (anterior ? "anterior" : "siguiente") + '"]');
    if (otro && !otro.disabled) otro.focus();
    else {
      var contrario = caja(idCuerpo).querySelector("button:not([disabled])");
      if (contrario) contrario.focus();
    }
  };
  return pag.items;
}
