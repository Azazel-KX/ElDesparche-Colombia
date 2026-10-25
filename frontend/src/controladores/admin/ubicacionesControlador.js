/* ==========================================================================
   controladores/admin/ubicacionesControlador.js
   Ubicaciones: agregar, renombrar y eliminar países, departamentos y ciudades.
   ========================================================================== */

import { escapar } from "../../lib/formato.js";
import { NIVELES_UBICACION } from "../../modelos/catalogos.js";
import {
  cambiarUbicacion, cargarDatosDeUbicaciones, nombreDeUbicacion, obtenerUbicaciones, validarNombreUbicacion
} from "../../modelos/ubicacionModelo.js";
import { pintarResumenUbicaciones, pintarUbicaciones } from "../../vistas/admin/ubicacionesVista.js";
import { entrarComoAdmin } from "../adminControlador.js";

export function paginaUbicaciones() {
  if (!entrarComoAdmin()) return;

  var aviso = document.getElementById("admin-aviso");
  /* Todo lo que la vista necesita para dibujar (ver vistas/admin/ubicacionesVista.js).
     "enCurso" es lo que se está editando o confirmando: { nivel, id, accion: "editar" | "eliminar" } */
  var estado = {
    datos: { paises: [], departamentos: [], ciudades: [] },
    personas: { clientes: [], agentes: [], administradores: [] },
    elegidos: { pais: null, departamento: null },
    enCurso: null
  };

  function recargar(mensaje, foco) {
    return obtenerUbicaciones().then(function (nuevos) {
      estado.datos = nuevos;
      estado.enCurso = null;
      aviso.textContent = mensaje;
      pintarResumenUbicaciones(estado);
      pintarUbicaciones(estado);
      var destino = foco && document.querySelector(foco);
      (destino || aviso).focus();
    });
  }

  /* Agregar */
  ["pais", "departamento", "ciudad"].forEach(function (nivel) {
    var form = document.getElementById("agregar-" + nivel);
    form.addEventListener("submit", function (evento) {
      evento.preventDefault();
      var campo = document.getElementById("nuevo-" + nivel);
      var error = document.getElementById("error-nuevo-" + nivel);
      var nombre = campo.value.replace(/\s+/g, " ").trim();
      var idPadre = nivel === "departamento" ? estado.elegidos.pais : (nivel === "ciudad" ? estado.elegidos.departamento : null);
      var problema = validarNombreUbicacion(estado.datos, nivel, nombre, idPadre, null);
      if (problema) {
        error.innerHTML = "<strong>Error:</strong> " + problema;
        campo.setAttribute("aria-invalid", "true");
        campo.focus();
        return;
      }
      error.textContent = "";
      campo.removeAttribute("aria-invalid");
      cambiarUbicacion(nivel, null, nombre, idPadre).then(function () {
        campo.value = "";
        return recargar("Se agregó " + nombre + ".", "#nuevo-" + nivel);
      }).catch(function (e) {
        error.innerHTML = "<strong>Error:</strong> " + escapar(e.message);
      });
    });
  });

  /* Elegir, editar y eliminar */
  document.getElementById("ubicaciones").addEventListener("click", function (evento) {
    var elegir = evento.target.closest("[data-elegir]");
    if (elegir) {
      var nivel = elegir.getAttribute("data-elegir");
      var id = Number(elegir.getAttribute("data-id"));
      estado.elegidos[nivel] = id;
      if (nivel === "pais") estado.elegidos.departamento = null;
      estado.enCurso = null;
      pintarUbicaciones(estado);
      /* El foco sigue en el elegido; el título de la siguiente lista ya cambió */
      document.querySelector('[data-elegir="' + nivel + '"][data-id="' + id + '"]').focus();
      aviso.textContent = "Mostrando " + (nivel === "pais" ? "los departamentos" : "las ciudades") + " de " + nombreDeUbicacion(estado.datos, nivel, id) + ".";
      return;
    }

    var boton = evento.target.closest("button[data-accion]");
    if (!boton) return;
    var accion = boton.getAttribute("data-accion");

    if (accion === "editar" || accion === "eliminar") {
      estado.enCurso = { nivel: boton.getAttribute("data-nivel"), id: Number(boton.getAttribute("data-id")), accion: accion };
      pintarUbicaciones(estado);
      var abierto = document.querySelector(".ubic-item-abierto");
      (abierto.querySelector("input") || abierto.querySelector("button")).focus();
    } else if (accion === "volver") {
      var antes = estado.enCurso;
      estado.enCurso = null;
      pintarUbicaciones(estado);
      var volver = document.querySelector('[data-accion="' + antes.accion + '"][data-nivel="' + antes.nivel + '"][data-id="' + antes.id + '"]');
      if (volver) volver.focus();
    } else if (accion === "si-eliminar") {
      var borrar = estado.enCurso;
      var nombreBorrado = nombreDeUbicacion(estado.datos, borrar.nivel, borrar.id);
      cambiarUbicacion(borrar.nivel, borrar.id, null).then(function () {
        if (estado.elegidos[borrar.nivel] === borrar.id) {
          estado.elegidos[borrar.nivel] = null;
          if (borrar.nivel === "pais") estado.elegidos.departamento = null;
        }
        return recargar("Se eliminó " + nombreBorrado + ".", "#titulo-" + NIVELES_UBICACION[borrar.nivel].lista);
      }).catch(function (e) {
        aviso.innerHTML = "<strong>Error:</strong> " + escapar(e.message);
      });
    }
  });

  document.getElementById("ubicaciones").addEventListener("submit", function (evento) {
    var form = evento.target.closest(".ubic-editar");
    if (!form) return;
    evento.preventDefault();
    var nivel = form.getAttribute("data-nivel");
    var id = Number(form.getAttribute("data-id"));
    var x = estado.datos[NIVELES_UBICACION[nivel].lista].filter(function (y) { return y.id === id; })[0];
    var campo = form.querySelector("input");
    var error = form.querySelector(".detalle-error");
    var nombre = campo.value.replace(/\s+/g, " ").trim();
    var n = NIVELES_UBICACION[nivel];
    var problema = validarNombreUbicacion(estado.datos, nivel, nombre, n.padre ? x[n.padre] : null, id);
    if (problema) {
      error.innerHTML = "<strong>Error:</strong> " + problema;
      campo.setAttribute("aria-invalid", "true");
      campo.focus();
      return;
    }
    var anterior = x.nombre;
    cambiarUbicacion(nivel, id, nombre, null).then(function () {
      if (nivel === "ciudad") {
        ["clientes", "agentes", "administradores"].forEach(function (k) {
          estado.personas[k].forEach(function (p) { if (p.ciudad === anterior) p.ciudad = nombre; });
        });
      }
      return recargar(anterior + " ahora se llama " + nombre + ".",
        '[data-accion="editar"][data-nivel="' + nivel + '"][data-id="' + id + '"]');
    }).catch(function (e) {
      error.innerHTML = "<strong>Error:</strong> " + escapar(e.message);
    });
  });

  cargarDatosDeUbicaciones().then(function (r) {
    estado.datos = r.datos;
    estado.personas = r.personas;
    var colombia = estado.datos.paises.filter(function (p) { return p.nombre === "Colombia"; })[0];
    estado.elegidos.pais = colombia ? colombia.id : null;
    pintarResumenUbicaciones(estado);
    pintarUbicaciones(estado);
  }).catch(function (error) {
    aviso.innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
  });
}
