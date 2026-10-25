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
import { campoDialogo, pedirDatos } from "../vistas/dialogoVista.js";
import { errorContrasena } from "../lib/validacion.js";
import { cambiarContrasena } from "../modelos/authModelo.js";
import { confirmar } from "../vistas/confirmarVista.js";

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

/* "Contraseña" en la cabecera: la persona cambia la suya pidiendo la actual */
function pedirCambioDeContrasena() {
  pedirDatos({
    titulo: "Cambiar mi contraseña",
    texto: "Escribe la contraseña de ahora y la nueva (de 8 a 72 caracteres).",
    campos:
      campoDialogo("clave-actual", "Contraseña actual", "password", { max: 72, autocompletar: "current-password" }) +
      campoDialogo("clave-nueva", "Contraseña nueva", "password", { max: 72, autocompletar: "new-password" }) +
      campoDialogo("clave-repetida", "Repite la contraseña nueva", "password", { max: 72, autocompletar: "new-password" }),
    textoSi: "Cambiar contraseña",
    leer: function (caja) {
      var actual = caja.querySelector("#clave-actual").value;
      var nueva = caja.querySelector("#clave-nueva").value;
      var repetida = caja.querySelector("#clave-repetida").value;
      if (!actual) return { error: "Escribe tu contraseña actual.", campo: "clave-actual" };
      var problema = errorContrasena(nueva);
      if (problema) return { error: problema, campo: "clave-nueva" };
      if (nueva === actual) return { error: "La contraseña nueva debe ser distinta de la actual.", campo: "clave-nueva" };
      if (nueva !== repetida) return { error: "Las dos contraseñas nuevas no coinciden.", campo: "clave-repetida" };
      return { datos: { actual: actual, nueva: nueva } };
    },
    enviar: function (d) { return cambiarContrasena(d.actual, d.nueva); }
  }).then(function (hecho) {
    if (hecho) {
      var aviso = document.getElementById("admin-aviso");
      if (aviso) aviso.textContent = "Tu contraseña se cambió.";
      confirmar("Contraseña cambiada", "Ya puedes entrar con tu contraseña nueva.", "Entendido");
    }
  });
}

/* Lo primero que hace cada página */
export function iniciarLayout() {
  crearModalAcceso({ alEntrar: entrar, alRegistrar: registrar, alAbrirRegistro: cargarCiudadesRegistro });
  pintarSesion(obtenerUsuario(), function () {
    borrarUsuario();
    window.location.href = "index.html";
  }, pedirCambioDeContrasena);
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
