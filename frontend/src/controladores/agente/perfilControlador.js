/* ==========================================================================
   controladores/agente/perfilControlador.js
   Perfil de la empresa (agente.html?seccion=perfil).
   El NIT, la razón social y la comisión no se cambian aquí.
   ========================================================================== */

import { reducirImagen } from "../../lib/dom.js";
import { escapar } from "../../lib/formato.js";
import { obtenerEventosDelAgente } from "../../modelos/eventoModelo.js";
import { errorDePerfil, guardarPerfil } from "../../modelos/personaModelo.js";
import {
  llenarFormularioPerfil, mostrarErrorEnFormulario, mostrarLogoPerfil, pintarCabeceraPerfil, pintarEstadoCuenta, pintarLegalesPerfil
} from "../../vistas/agenteVista.js";
import { cargarCiudadesAgente, entrarComoAgente } from "../agenteControlador.js";

export function paginaPerfilAgente() {
  var usuario = entrarComoAgente();
  if (!usuario) return;

  var aviso = document.getElementById("admin-aviso");
  var exito = document.getElementById("exito-perfil");
  var error = document.getElementById("error-perfil");
  var formulario = document.getElementById("formulario-perfil");
  var archivoLogo = document.getElementById("perfil-logo-archivo");
  var quitarLogo = document.getElementById("perfil-quitar-logo");

  var campos = {
    nombre: document.getElementById("perfil-comercial"),
    descripcion: document.getElementById("perfil-descripcion"),
    correo: document.getElementById("perfil-correo"),
    telefono: document.getElementById("perfil-telefono"),
    ciudad: document.getElementById("perfil-ciudad"),
    experiencia: document.getElementById("perfil-experiencia")
  };
  var agente = null;
  var logoActual = "";

  function leerCampos() {
    var v = {};
    Object.keys(campos).forEach(function (k) { v[k] = campos[k].value.trim(); });
    return v;
  }

  Object.keys(campos).forEach(function (k) {
    campos[k].addEventListener("input", function () { campos[k].removeAttribute("aria-invalid"); });
  });

  archivoLogo.addEventListener("change", function () {
    var archivo = archivoLogo.files[0];
    if (!archivo) return;
    if (!/^image\//.test(archivo.type) || archivo.size > 10 * 1024 * 1024) {
      archivoLogo.value = "";
      mostrarErrorEnFormulario(error, "Elige una imagen (JPG, PNG o WebP) de menos de 10 MB.");
      archivoLogo.focus();
      return;
    }
    reducirImagen(archivo, 400).then(function (url) {
      logoActual = url;
      mostrarLogoPerfil(logoActual);
    }).catch(function (e) {
      mostrarErrorEnFormulario(error, e.message);
    });
  });

  quitarLogo.addEventListener("click", function () {
    logoActual = "";
    archivoLogo.value = "";
    mostrarLogoPerfil(logoActual);
    archivoLogo.focus();
  });

  formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();
    error.textContent = "";
    exito.textContent = "";
    Object.keys(campos).forEach(function (k) { campos[k].removeAttribute("aria-invalid"); });

    var problema = errorDePerfil(leerCampos());
    if (problema) {
      mostrarErrorEnFormulario(error, problema[1]);
      campos[problema[0]].setAttribute("aria-invalid", "true");
      campos[problema[0]].focus();
      return;
    }

    var datos = {
      nombre: campos.nombre.value.trim(),
      descripcion: campos.descripcion.value.trim(),
      logo: logoActual,
      correo: campos.correo.value.trim(),
      telefono: campos.telefono.value.trim(),
      ciudad: campos.ciudad.value,
      experiencia: Number(campos.experiencia.value)
    };

    var boton = document.getElementById("guardar-perfil");
    boton.disabled = true;
    guardarPerfil(datos).then(function () {
      Object.assign(agente, datos);
      pintarCabeceraPerfil(agente, logoActual);
      exito.textContent = "Guardaste los cambios del perfil de " + datos.nombre + ".";
    }).catch(function (e) {
      mostrarErrorEnFormulario(error, e.message);
    }).then(function () {
      boton.disabled = false;
    });
  });

  Promise.all([obtenerEventosDelAgente(), cargarCiudadesAgente(campos.ciudad).catch(function () {})])
    .then(function (resultado) {
      agente = resultado[0].agente;
      pintarEstadoCuenta(agente);
      llenarFormularioPerfil(campos, agente);
      logoActual = agente.logo || "";
      pintarCabeceraPerfil(agente, logoActual);
      pintarLegalesPerfil(agente, usuario, resultado[0].eventos.length);
    }).catch(function (e) {
      aviso.innerHTML = "<strong>Error:</strong> " + escapar(e.message);
    });
}
