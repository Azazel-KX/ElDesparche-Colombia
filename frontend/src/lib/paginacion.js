/* ==========================================================================
   lib/paginacion.js
   Cortar una lista en páginas (las tablas de los paneles muestran 10 filas a la vez).
   ========================================================================== */

export var POR_PAGINA = 10;

/* Devuelve { items, pagina, paginas, total }: la página pedida (se ajusta si queda fuera de rango) */
export function paginar(lista, pagina, porPagina) {
  porPagina = porPagina || POR_PAGINA;
  var paginas = Math.max(1, Math.ceil(lista.length / porPagina));
  pagina = Math.min(Math.max(1, pagina || 1), paginas);
  return {
    items: lista.slice((pagina - 1) * porPagina, pagina * porPagina),
    pagina: pagina,
    paginas: paginas,
    total: lista.length
  };
}
