/* ==========================================================================
   vistas/inicioVista.js
   Portada: filtros de país, departamento, ciudad y tipo de plan.
   ========================================================================== */

import { escapar } from "../lib/formato.js";

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
