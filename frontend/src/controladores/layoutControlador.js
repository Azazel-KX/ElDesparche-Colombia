/* ==========================================================================
   controladores/layoutControlador.js
   Lo común a todas las páginas: la cabecera (sesión, menú, accesibilidad, tamaño del texto),
   la ventana de acceso y el aviso de sesión vencida.
   ========================================================================== */

import { comprobarCuentaVigente } from "../modelos/authModelo.js";
import { ESCALAS, guardarEscala, obtenerEscala } from "../modelos/preferenciasModelo.js";
import { borrarUsuario, consumirSesionVencida, obtenerUsuario } from "../modelos/sesionModelo.js";
import { aplicarEscala, prepararPanelAccesibilidad } from "../vistas/accesibilidadVista.js";
import { abrirAcceso, crearModalAcceso, mostrarError } from "../vistas/accesoVista.js";
import { prepararMenuMovil } from "../vistas/menuVista.js";
import { pintarSesion } from "../vistas/sesionVista.js";
import { cargarCiudadesRegistro, entrar, registrar } from "./accesoControlador.js";

/* Mueve el tamaño un paso arriba o abajo dentro de la lista */
function cambiarEscala(paso) {
  var posicion = ESCALAS.indexOf(obtenerEscala()) + paso;

  if (posicion < 0) posicion = 0;
  if (posicion > ESCALAS.length - 1) posicion = ESCALAS.length - 1;

  var escala = ESCALAS[posicion];
  guardarEscala(escala);
  aplicarEscala(escala, true);
}

/* Enciende los botones de la cabecera */
function prepararTamanoTexto() {
  var menos = document.getElementById("texto-menos");
  var mas = document.getElementById("texto-mas");
  var normal = document.getElementById("texto-normal");

  /* Al ser <button> de verdad, ya funcionan con Enter y con la barra
     espaciadora: no hace falta añadir nada para el teclado. */
  if (menos) {
    menos.onclick = function () { cambiarEscala(-1); };
  }

  if (mas) {
    mas.onclick = function () { cambiarEscala(1); };
  }

  if (normal) {
    normal.onclick = function () {
      guardarEscala(1);
      aplicarEscala(1, true);
    };
  }

  /* false = no anunciar nada al cargar la página */
  aplicarEscala(obtenerEscala(), false);
}

/* Lo primero que hace cada página */
export function iniciarLayout() {
  crearModalAcceso({ alEntrar: entrar, alRegistrar: registrar, alAbrirRegistro: cargarCiudadesRegistro });
  pintarSesion(obtenerUsuario(), function () {
    borrarUsuario();
    window.location.href = "index.html";
  });
  prepararMenuMovil();
  prepararPanelAccesibilidad();
  prepararTamanoTexto();

  /* Si la sesión venció, la ventana de acceso se abre avisándolo */
  if (consumirSesionVencida()) {
    abrirAcceso("entrar");
    mostrarError("error-entrar", "Tu sesión venció. Vuelve a iniciar sesión.");
  }

  /* Los paneles confirman con el servidor que la sesión sigue vigente */
  if (obtenerUsuario() && /^(admin|agente)/.test(document.body.getAttribute("data-pagina") || "")) {
    comprobarCuentaVigente();
  }
}
