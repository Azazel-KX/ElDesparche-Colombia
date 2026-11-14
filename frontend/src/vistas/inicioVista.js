/* ==========================================================================
   vistas/inicioVista.js
   Portada: filtros de país, departamento, ciudad y tipo de plan.
   ========================================================================== */

import { escapar } from "../lib/formato.js";
import { paginar } from "../lib/paginacion.js";

/* Los países salen de los eventos de la base, no de la lista fija del HTML */
export function llenarPaises(selector, paises) {
  selector.innerHTML = '<option value="">País: todos</option>' +
    paises.map(function (p) { return '<option>' + escapar(p) + '</option>'; }).join("");
}

/* Llena una lista desplegable con sus opciones; si no hay ninguna, queda desactivada con su ayuda */
export function llenarLista(lista, opciones, textoPorDefecto) {
  lista.innerHTML = '<option value="">' + escapar(textoPorDefecto) + '</option>';
  for (var i = 0; i < opciones.length; i++) {
    lista.innerHTML = lista.innerHTML +
      '<option>' + escapar(opciones[i]) + '</option>';
  }
  lista.disabled = opciones.length === 0;

  var ayuda = "ayuda-" + lista.id;
  if (document.getElementById(ayuda)) {
    if (lista.disabled) {
      lista.setAttribute("aria-describedby", ayuda);
    } else {
      lista.removeAttribute("aria-describedby");
    }
  }
}

/* Marca como "pulsado" el botón del tipo de plan elegido */
export function marcarParche(botones, elegido) {
  for (var b = 0; b < botones.length; b++) {
    var activo = botones[b].getAttribute("data-parche") === elegido;
    botones[b].setAttribute("aria-pressed", activo ? "true" : "false");
  }
}

/* El filtrado ya es instantaneo, asi que "Buscar" no busca: lleva
   a los resultados, que quedan mas abajo. Se mueve el FOCO y no
   solo el scroll, porque si solo se desplazara la vista, quien
   navega con teclado seguiria con el foco en el formulario. */
export function irAResultados() {
  var seccion = document.getElementById("titulo-destacados");
  if (seccion) {
    seccion.setAttribute("tabindex", "-1");
    seccion.focus();
    seccion.scrollIntoView({ block: "start", behavior: "smooth" });
  }
}

/* Botones para cambiar de página bajo las tarjetas: Anterior, los números y Siguiente.
   lista = todos los eventos de la búsqueda; pagina = la que se ve; alCambiar(pagina) vuelve a pintar.
   Devuelve los eventos de esa página. */
export function paginarEventos(contenedor, lista, pagina, porPagina, alCambiar) {
  var pag = paginar(lista, pagina, porPagina);

  var nav = document.getElementById("paginas-eventos");
  if (!nav) {
    nav = document.createElement("nav");
    nav.id = "paginas-eventos";
    nav.className = "paginas-eventos";
    nav.setAttribute("aria-label", "Páginas de eventos");
    contenedor.parentNode.insertBefore(nav, contenedor.nextSibling);
  }

  nav.hidden = pag.paginas <= 1;
  var numeros = "";
  for (var n = 1; n <= pag.paginas; n++) {
    /* Con muchas páginas solo se muestran la primera, la última y las que rodean a la actual */
    var cerca = n === 1 || n === pag.paginas || Math.abs(n - pag.pagina) <= 1;
    if (!cerca) {
      if (n === 2 || n === pag.paginas - 1) numeros += '<span class="pagina-puntos" aria-hidden="true">…</span>';
      continue;
    }
    numeros += '<button type="button" class="pagina-numero" data-pagina="' + n + '"' +
      (n === pag.pagina ? ' aria-current="page"' : '') + '>' +
      '<span class="oculto">Página </span>' + n + '</button>';
  }
  nav.innerHTML =
    '<button type="button" class="boton boton-borde" data-pagina="' + (pag.pagina - 1) + '"' + (pag.pagina === 1 ? " disabled" : "") + '>Anterior</button>' +
    '<div class="pagina-lista">' + numeros + '</div>' +
    '<button type="button" class="boton boton-borde" data-pagina="' + (pag.pagina + 1) + '"' + (pag.pagina === pag.paginas ? " disabled" : "") + '>Siguiente</button>';

  nav.onclick = function (evento) {
    var boton = evento.target.closest("button[data-pagina]");
    if (!boton || boton.disabled) return;
    alCambiar(Number(boton.getAttribute("data-pagina")));
    /* El foco y la vista vuelven al principio de los resultados: la lista cambió entera */
    irAResultados();
  };

  return pag.items;
}
