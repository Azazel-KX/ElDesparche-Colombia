/* ==========================================================================
   vistas/sesionVista.js
   Zona de la cabecera con el nombre de la persona y los botones de acceso.
   ========================================================================== */

import { escapar } from "../lib/formato.js";
import { abrirAcceso } from "./accesoVista.js";

/* usuario = la sesión (o null); alSalir = qué hacer al pulsar "Cerrar sesión"; alCambiarClave = al pulsar "Contraseña" */
export function pintarSesion(usuario, alSalir, alCambiarClave) {
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
      '<div class="usuario-menu">' +
        '<div class="usuario">' +
          '<span class="usuario-inicial" aria-hidden="true">' +
            escapar(usuario.nombre.charAt(0).toUpperCase()) +
          '</span>' +
          '<span class="usuario-nombre">' +
            '<span class="oculto">Sesión iniciada como </span>' + escapar(usuario.nombre) +
          '</span>' +
          marca +
          '<button type="button" class="boton-menu-usuario" id="abrir-menu-usuario" aria-expanded="false" ' +
            'aria-controls="panel-usuario">' +
            'Mi cuenta<span class="oculto"> de ' + escapar(usuario.nombre) + '</span>' +
            '<span class="flecha-accesibilidad" aria-hidden="true">&#9662;</span>' +
          '</button>' +
        '</div>' +
        '<div class="panel-usuario" id="panel-usuario" hidden>' +
          '<button type="button" id="cambiar-clave">Cambiar contraseña</button>' +
          '<button type="button" id="salir" class="salir">Cerrar sesión</button>' +
        '</div>' +
      '</div>';

    document.getElementById("salir").onclick = alSalir;
    document.getElementById("cambiar-clave").onclick = function () {
      cerrarMenuUsuario();
      alCambiarClave();
    };
    prepararMenuUsuario();
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

/* ----- Menú desplegable de la cuenta (mismo patrón que el panel de accesibilidad) -----
   Un botón con aria-expanded abre y cierra el panel; Escape y un clic fuera lo cierran, y si el foco sale
   del menú con el tabulador también se cierra. */
function cerrarMenuUsuario() {
  var boton = document.getElementById("abrir-menu-usuario");
  var panel = document.getElementById("panel-usuario");
  if (!boton || !panel) return;
  boton.setAttribute("aria-expanded", "false");
  panel.hidden = true;
}

function prepararMenuUsuario() {
  var boton = document.getElementById("abrir-menu-usuario");
  var panel = document.getElementById("panel-usuario");
  if (!boton || !panel) return;

  function abierto() { return boton.getAttribute("aria-expanded") === "true"; }
  function dentro(elemento) { return panel.contains(elemento) || boton.contains(elemento); }

  boton.onclick = function () {
    var abrir = !abierto();
    boton.setAttribute("aria-expanded", abrir ? "true" : "false");
    panel.hidden = !abrir;
    if (abrir) panel.querySelector("button").focus();
  };

  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && abierto() && document.contains(boton)) {
      /* Si el foco estaba dentro del menú, vuelve al botón para no perderse (WCAG 2.4.3) */
      var estabaDentro = panel.contains(document.activeElement);
      cerrarMenuUsuario();
      if (estabaDentro) boton.focus();
    }
  });
  document.addEventListener("click", function (evento) {
    if (abierto() && document.contains(boton) && !dentro(evento.target)) cerrarMenuUsuario();
  });
  document.addEventListener("focusin", function (evento) {
    if (abierto() && document.contains(boton) && !dentro(evento.target)) cerrarMenuUsuario();
  });
}
