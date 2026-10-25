/* ==========================================================================
   vistas/sesionVista.js
   Zona de la cabecera con el nombre de la persona y los botones de acceso.
   ========================================================================== */

import { escapar } from "../lib/formato.js";
import { abrirAcceso } from "./accesoVista.js";

/* usuario = la sesión (o null); alSalir = qué hacer al pulsar "Cerrar sesión" */
export function pintarSesion(usuario, alSalir) {
  var caja = document.getElementById("sesion");
  if (!caja) return;

  if (usuario) {
    /* Con sesión: inicial, nombre, tipo de cuenta y botón de salir */
    var marca = "";
    if (usuario.tipo === "agente") {
      marca = '<span class="marca-agente">Agente</span>';
      agregarEnlacePanel("agente.html", "Mi panel", "agente");
    } else if (usuario.tipo === "admin") {
      marca = '<span class="marca-agente">Administrador</span>';
      agregarEnlacePanel("admin.html", "Administración", "admin");
    }

    /* La inicial del círculo es decorativa: el nombre completo ya va al
       lado, así que se oculta al lector con aria-hidden para que no lea
       la letra suelta antes del nombre. */
    caja.innerHTML =
      '<div class="usuario">' +
        '<span class="usuario-inicial" aria-hidden="true">' +
          escapar(usuario.nombre.charAt(0).toUpperCase()) +
        '</span>' +
        '<span class="usuario-nombre">' +
          '<span class="oculto">Sesión iniciada como </span>' + escapar(usuario.nombre) +
        '</span>' +
        marca +
        '<button type="button" id="salir">' +
          'Cerrar sesión<span class="oculto"> de ' + escapar(usuario.nombre) + '</span>' +
        '</button>' +
      '</div>';

    document.getElementById("salir").onclick = alSalir;
  } else {
    /* Sin sesión: los dos botones abren la ventana emergente */
    caja.innerHTML =
      '<button type="button" class="boton-entrar" id="abrir-entrar">Iniciar sesión</button>' +
      '<button type="button" class="boton-registro" id="abrir-registro">Registrarse</button>';

    document.getElementById("abrir-entrar").onclick = function () {
      abrirAcceso("entrar");
    };

    document.getElementById("abrir-registro").onclick = function () {
      abrirAcceso("registro");
    };
  }
}

/* Con sesión de administrador o de agente, el menú principal gana el
   enlace a su panel. "prefijo" es el comienzo del data-pagina de esas
   páginas, para marcar el enlace como actual dentro del panel. */
function agregarEnlacePanel(href, texto, prefijo) {
  var lista = document.querySelector("#menu-principal ul");
  if (!lista || lista.querySelector('a[href="' + href + '"]')) return;

  var enPanel = (document.body.getAttribute("data-pagina") || "").indexOf(prefijo) === 0;
  var elemento = document.createElement("li");
  elemento.innerHTML = '<a href="' + href + '" data-panel="' + prefijo + '"' +
    (enPanel ? ' class="activo" aria-current="page"' : '') + '>' + texto + '</a>';
  lista.appendChild(elemento);
}
