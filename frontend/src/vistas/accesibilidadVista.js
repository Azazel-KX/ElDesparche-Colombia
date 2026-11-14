/* ==========================================================================
   vistas/accesibilidadVista.js
   Panel de accesibilidad de la cabecera y tamaño del texto.
   ========================================================================== */

import { ESCALAS } from "../modelos/preferenciasModelo.js";

/* Aplica un tamaño y actualiza lo que ve y lo que escucha el usuario */
export function aplicarEscala(escala, avisar) {
  document.documentElement.style.setProperty("--escala-texto", String(escala));

  var porcentaje = Math.round(escala * 100) + "%";

  var valor = document.getElementById("texto-valor");
  if (valor) {
    valor.textContent = porcentaje;
  }

  /* ESTADO: al llegar a los extremos el botón se desactiva de verdad
     (disabled), no solo se pinta más claro. Así el lector de pantalla
     lo anuncia como "no disponible" (WCAG 1.4.1). */
  var posicion = ESCALAS.indexOf(escala);
  var menos = document.getElementById("texto-menos");
  var mas = document.getElementById("texto-mas");
  var normal = document.getElementById("texto-normal");

  if (menos) menos.disabled = posicion === 0;
  if (mas) mas.disabled = posicion === ESCALAS.length - 1;
  if (normal) normal.disabled = escala === 1;

  /* Solo se anuncia cuando el cambio lo pidió el usuario, no al cargar */
  if (avisar) {
    var aviso = document.getElementById("aviso-tamano");
    if (aviso) {
      aviso.textContent = "Tamaño del texto: " + porcentaje + ".";
    }
  }
}

/* ===== BOTÓN DE ACCESIBILIDAD QUE DESPLIEGA EL PANEL =====
   Es el patrón "disclosure": un botón que abre y cierra un panel.
   Lo importante para el lector de pantalla es aria-expanded, que le dice
   si está abierto o cerrado; y el atributo hidden del panel, que cuando
   está cerrado lo saca del orden de tabulación (si no, se podría llegar
   con el teclado a botones invisibles). */
export function prepararPanelAccesibilidad() {
  var boton = document.getElementById("abrir-accesibilidad");
  var panel = document.getElementById("panel-accesibilidad");

  if (!boton || !panel) return;

  function abrirOcerrar(abierto) {
    boton.setAttribute("aria-expanded", abierto ? "true" : "false");
    panel.hidden = !abierto;
  }

  function cerrar(devolverFoco) {
    /* Si el foco estaba dentro del panel hay que devolverlo al botón:
       si no, al ocultarse el panel el foco se perdería y quien navega
       con teclado quedaría sin punto de referencia (WCAG 2.4.3). */
    if (devolverFoco && panel.contains(document.activeElement)) {
      boton.focus();
    }
    abrirOcerrar(false);
  }

  boton.onclick = function () {
    abrirOcerrar(boton.getAttribute("aria-expanded") !== "true");
  };

  /* La tecla Escape cierra el panel, como en cualquier menú */
  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && boton.getAttribute("aria-expanded") === "true") {
      cerrar(true);
    }
  });

  /* Al pulsar fuera del panel también se cierra */
  document.addEventListener("click", function (evento) {
    if (boton.getAttribute("aria-expanded") !== "true") return;
    if (!panel.contains(evento.target) && !boton.contains(evento.target)) {
      cerrar(false);
    }
  });

  /* Si el foco sale del panel con el tabulador, se cierra solo */
  document.addEventListener("focusin", function (evento) {
    if (boton.getAttribute("aria-expanded") !== "true") return;
    if (!panel.contains(evento.target) && !boton.contains(evento.target)) {
      abrirOcerrar(false);
    }
  });

  abrirOcerrar(false);
}
