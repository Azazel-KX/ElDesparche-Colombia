/* ==========================================================================
   controladores/adminControlador.js
   Base del panel de administración: comprobar el rol y moverse entre secciones.
   ========================================================================== */

import { obtenerUsuario } from "../modelos/sesionModelo.js";
import { abrirAcceso } from "../vistas/accesoVista.js";

/* Muestra la página si hay sesión de administrador; si no, el aviso de acceso */
export function entrarComoAdmin() {
  var usuario = obtenerUsuario();

  if (!usuario || usuario.tipo !== "admin") {
    document.getElementById("admin-bloqueo").hidden = false;
    document.getElementById("bloqueo-entrar").onclick = function () {
      abrirAcceso("entrar");
    };
    return null;
  }

  document.getElementById("admin-marco").hidden = false;
  return usuario;
}

/* ===== SECCIONES DE LOS PANELES (admin.html y agente.html) =====
   Cada panel es una sola página. Cada sección es un <template id="seccion-...">
   y se muestra una a la vez: así los IDs que se repiten entre secciones
   (admin-aviso, detalle-contenido, los campos de los formularios...) nunca
   están dos veces en la página y cada función pagina...() sigue igual.
   La dirección cambia a admin.html?seccion=agentes (o agente.html?seccion=perfil)
   para que funcionen los botones atrás y adelante del navegador, recargar y
   compartir el enlace. La primera sección de la lista es la de inicio. */

/* En el celular el menú lateral es una fila que se desplaza: que se vea la
   opción actual. Va después de pintar la sección, que es la que muestra el marco. */
function centrarOpcionActual() {
  var actual = document.querySelector('.admin-lateral a[aria-current="page"]');
  if (!actual) return;
  var fila = actual.closest("ul");
  fila.scrollLeft = actual.offsetLeft - fila.offsetLeft - (fila.clientWidth - actual.offsetWidth) / 2;
}

/* secciones: { nombre: función que la arranca }, en el orden del menú */
export function iniciarSecciones(secciones) {
  var inicio = Object.keys(secciones)[0];
  var seccionActual = null;
  var enlaces = document.querySelectorAll(".admin-lateral a[data-seccion]");

  function seccionDeLaDireccion() {
    var nombre = new URLSearchParams(window.location.search).get("seccion");
    return secciones[nombre] ? nombre : inicio;
  }

  function mostrarSeccion(nombre, conFoco) {
    var plantilla = document.getElementById("seccion-" + nombre);
    var marco = document.getElementById("admin-marco");
    var dialogos = document.getElementById("admin-dialogos");

    /* Lo que la sección anterior deja abierto (la cámara de Validar entradas) */
    document.dispatchEvent(new CustomEvent("salirseccion"));

    Array.prototype.forEach.call(dialogos.querySelectorAll("dialog[open]"), function (dialogo) {
      dialogo.close();
    });
    var anterior = marco.querySelector(".admin-contenido");
    if (anterior) anterior.remove();
    dialogos.innerHTML = "";

    var copia = plantilla.content.cloneNode(true);
    Array.prototype.forEach.call(copia.querySelectorAll("dialog"), function (dialogo) {
      dialogos.appendChild(dialogo);
    });
    marco.appendChild(copia);
    seccionActual = nombre;

    document.title = plantilla.getAttribute("data-titulo") + " - El Desparche";
    Array.prototype.forEach.call(enlaces, function (enlace) {
      var esta = enlace.getAttribute("data-seccion") === nombre;
      enlace.classList.toggle("activo", esta);
      if (esta) {
        enlace.setAttribute("aria-current", "page");
      } else {
        enlace.removeAttribute("aria-current");
      }
    });

    secciones[nombre]();
    centrarOpcionActual();

    /* Como en un cambio de página: arriba y con el foco en el título, para que
       el lector de pantalla anuncie la sección nueva */
    if (conFoco) {
      var titulo = marco.querySelector(".admin-contenido h1");
      titulo.setAttribute("tabindex", "-1");
      window.scrollTo(0, 0);
      titulo.focus();
    }
  }

  Array.prototype.forEach.call(enlaces, function (enlace) {
    enlace.addEventListener("click", function (evento) {
      /* Ctrl o clic central abren la sección en otra pestaña, como un enlace normal */
      if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.button !== 0) return;
      evento.preventDefault();
      var nombre = enlace.getAttribute("data-seccion");
      if (nombre === seccionActual) return;
      history.pushState(null, "", enlace.getAttribute("href"));
      mostrarSeccion(nombre, true);
    });
  });

  /* Atrás y adelante. Los enlaces internos de una sección (#grupo-... en
     Reportes) también disparan popstate, pero no cambian de sección. */
  window.addEventListener("popstate", function () {
    var nombre = seccionDeLaDireccion();
    if (nombre !== seccionActual) mostrarSeccion(nombre, true);
  });

  mostrarSeccion(seccionDeLaDireccion(), false);
  /* Las tipografías cambian el ancho de las opciones cuando terminan de cargar */
  if (document.fonts) document.fonts.ready.then(centrarOpcionActual);
}
