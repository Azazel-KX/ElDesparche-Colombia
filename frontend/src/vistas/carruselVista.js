/* ==========================================================================
   vistas/carruselVista.js
   Carrusel de eventos principales de la portada.
   ========================================================================== */

import { DESTACADOS, buscarEvento } from "../modelos/eventoModelo.js";
import { cartelPrincipal } from "./eventoVista.js";

/* Pinta el carrusel y enciende las flechas */
export function prepararCarrusel() {
  var lista = document.getElementById("principales");
  if (!lista) return;

  var html = "";
  for (var i = 0; i < DESTACADOS.length; i++) {
    var evento = buscarEvento(DESTACADOS[i]);
    if (evento) {
      html = html + cartelPrincipal(evento);
    }
  }
  lista.innerHTML = html;

  var tira = lista.parentNode;
  var atras = document.getElementById("principales-atras");
  var adelante = document.getElementById("principales-adelante");
  var pausa = document.getElementById("principales-pausa");
  var pausaTexto = document.getElementById("principales-pausa-texto");
  var marco = tira.parentNode;
  if (!atras || !adelante) return;

  /* Cuanto se mueve cada pulsacion: un cartel mas su separacion */
  function paso() {
    var cartel = lista.querySelector(".cartel");
    if (!cartel) return 240;
    var separacion = parseFloat(getComputedStyle(lista).gap) || 0;
    return cartel.getBoundingClientRect().width + separacion;
  }

  function alFinal() {
    /* Margen de 24px: el scroll-snap deja la tira unos pixeles antes del
       final, y sin esta tolerancia nunca se detectaria el extremo. */
    return tira.scrollLeft >= tira.scrollWidth - tira.clientWidth - 24;
  }

  /* El carrusel da la vuelta: al llegar al final vuelve al principio y al
     reves. Asi las flechas y el avance automatico se comportan igual y no
     hace falta desactivarlas. El bucle solo mueve el scroll; la lista del
     DOM no se duplica, asi que un lector de pantalla no lee dos veces los
     mismos eventos. */
  function irA(posicion, suave) {
    tira.scrollTo({ left: posicion, behavior: suave ? "smooth" : "auto" });
  }

  function quiereAnimacion() {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function avanzar() {
    if (alFinal()) {
      irA(0, quiereAnimacion());
    } else {
      tira.scrollBy({ left: paso(), behavior: quiereAnimacion() ? "smooth" : "auto" });
    }
  }

  function retroceder() {
    if (tira.scrollLeft <= 24) {
      irA(tira.scrollWidth, quiereAnimacion());
    } else {
      tira.scrollBy({ left: -paso(), behavior: quiereAnimacion() ? "smooth" : "auto" });
    }
  }

  /* ===== MOVIMIENTO AUTOMATICO =====
     WCAG 2.2.2 (Pausar, detener, ocultar): todo lo que se mueva solo mas
     de 5 segundos necesita una forma de pararlo. De ahi el boton. */
  var SEGUNDOS = 3000;
  var reloj = null;
  var detenidoPorElUsuario = false;

  var ratonEncima = false;

  /* El turno del reloj no avanza a ciegas: comprueba antes si el raton
     esta encima o si el foco del teclado esta dentro del carrusel. Se
     mira document.activeElement en vez de fiarse solo de los eventos
     focusin/focusout, porque asi no depende de que el navegador los
     lance: si alguien esta leyendo o a punto de pulsar un cartel, el
     carrusel no se le mueve debajo. */
  function turno() {
    if (ratonEncima) return;
    if (marco.contains(document.activeElement)) return;
    avanzar();
  }

  function arrancar() {
    /* No arranca si el usuario lo paro, ni si pidio menos animacion en su
       sistema operativo: ahi el carrusel se queda quieto desde el inicio. */
    if (reloj || detenidoPorElUsuario || !quiereAnimacion()) return;
    reloj = setInterval(turno, SEGUNDOS);
  }

  function parar() {
    if (reloj) {
      clearInterval(reloj);
      reloj = null;
    }
  }

  if (pausa) {
    /* Si el sistema pide menos animacion no hay nada que pausar */
    if (!quiereAnimacion()) {
      pausa.hidden = true;
      detenidoPorElUsuario = true;
    }

    pausa.onclick = function () {
      detenidoPorElUsuario = !detenidoPorElUsuario;
      if (detenidoPorElUsuario) {
        parar();
        pausaTexto.textContent = "Reanudar";
      } else {
        pausaTexto.textContent = "Pausar";
        arrancar();
      }
    };
  }

  marco.addEventListener("mouseenter", function () { ratonEncima = true; });
  marco.addEventListener("mouseleave", function () { ratonEncima = false; });

  /* Si la pestana deja de verse, no tiene sentido seguir moviendolo */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) parar(); else arrancar();
  });

  atras.onclick = function () { retroceder(); };
  adelante.onclick = function () { avanzar(); };

  arrancar();
}
