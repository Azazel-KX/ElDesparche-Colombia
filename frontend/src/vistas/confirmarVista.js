/* ==========================================================================
   vistas/confirmarVista.js
   Cuadro de confirmación accesible (reemplaza al confirm() del navegador).
   ========================================================================== */

import { escapar } from "../lib/formato.js";

/* ===== CONFIRMACIÓN ACCESIBLE =====
   Reemplaza al confirm() del navegador, que no usa el diseño de la web, no se puede
   estilizar ni leer bien con lector de pantalla. Es un <dialog> con showModal(): atrapa
   el foco, se cierra con Escape y devuelve el foco a quien lo abrió.
   Devuelve una promesa: true si la persona acepta, false si cancela o cierra. */
export function confirmar(titulo, texto, textoSi) {
  return new Promise(function (resolver) {
    var anterior = document.activeElement;
    var dialogo = document.createElement("dialog");
    dialogo.className = "modal modal-cancelar";
    dialogo.setAttribute("aria-labelledby", "confirmar-titulo");
    dialogo.setAttribute("aria-describedby", "confirmar-texto");
    dialogo.innerHTML =
      '<div class="modal-caja">' +
        '<h2 class="cancelar-titulo" id="confirmar-titulo">' + escapar(titulo) + '</h2>' +
        '<p class="texto-gris" id="confirmar-texto">' + escapar(texto) + '</p>' +
        '<div class="cancelar-botones">' +
          '<button type="button" class="boton boton-peligro" data-confirmar="si">' + escapar(textoSi || "Sí, continuar") + '</button>' +
          '<button type="button" class="boton boton-borde" data-confirmar="no">Volver</button>' +
        '</div>' +
      '</div>';

    /* Se termina una sola vez, venga de un botón, de Escape o del clic en el fondo */
    var terminado = false;
    function terminar(respuesta) {
      if (terminado) return;
      terminado = true;
      if (dialogo.open) dialogo.close();
      dialogo.remove();
      if (anterior && anterior.focus && document.contains(anterior)) anterior.focus();
      resolver(respuesta);
    }

    dialogo.addEventListener("click", function (evento) {
      var boton = evento.target.closest("[data-confirmar]");
      if (boton) {
        terminar(boton.getAttribute("data-confirmar") === "si");
      } else if (evento.target === dialogo) {
        terminar(false);
      }
    });
    dialogo.addEventListener("cancel", function () { terminar(false); });   /* tecla Escape */
    dialogo.addEventListener("close", function () { terminar(false); });

    document.body.appendChild(dialogo);
    dialogo.showModal();
    dialogo.querySelector('[data-confirmar="no"]').focus();   /* el foco empieza en la opción segura */
  });
}
