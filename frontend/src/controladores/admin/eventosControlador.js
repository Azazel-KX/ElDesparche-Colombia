/* ==========================================================================
   controladores/admin/eventosControlador.js
   Eventos del administrador: buscar, registrar, editar, cambiar el estado, eliminar y
   revisar los eventos que envían los agentes.
   ========================================================================== */

import { enfocarSiExiste, reducirImagen } from "../../lib/dom.js";
import { escapar } from "../../lib/formato.js";
import { agregarNota, notaCancelacion } from "../../modelos/cancelacionModelo.js";
import {
  EVENTOS, cambiarEstadoEvento, ubicacionesDe, completarEvento, cuerpoEvento, eliminarEvento, filtrarEventosAdmin,
  guardarEvento, obtenerEventosAdmin, obtenerSolicitudesEventos, resolverSolicitudEvento, validarEvento
} from "../../modelos/eventoModelo.js";
import { obtenerAgentes } from "../../modelos/personaModelo.js";
import { obtenerReservasAdmin } from "../../modelos/reservaModelo.js";
import { obtenerCiudadesLista } from "../../modelos/ubicacionModelo.js";
import { camposEvento } from "../../vistas/camposVista.js";
import { datosCancelacion } from "../../vistas/cancelacionVista.js";
import { leerFormulario, mostrarErroresFormulario } from "../../vistas/formularioVista.js";
import {
  confirmarCancelacionEvento, confirmarEliminacionEvento, mostrarCampoRechazo,
  mostrarMotivoDeCancelacion, ocultarCampoRechazo, pintarDetalleEventoAdmin, pintarFormularioEvento, pintarPorRevisar,
  pintarResumenEventos, pintarSolicitud, pintarTablaEventos, restaurarBotonesEvento, volverACancelarEvento
} from "../../vistas/admin/eventosVista.js";
import { pintarFiltrosActivos, prepararMenuFiltros } from "../../vistas/filtrosEventosVista.js";
import { llenarLista } from "../../vistas/inicioVista.js";
import { entrarComoAdmin } from "../adminControlador.js";

export function paginaEventosAdmin() {
  if (!entrarComoAdmin()) return;

  var eventos = [];
  var aviso = document.getElementById("admin-aviso");
  var buscar = document.getElementById("buscar-evento");
  var filtroEstado = document.getElementById("filtro-estado-evento");
  var filtroPais = document.getElementById("filtro-pais-evento");
  var filtroDepartamento = document.getElementById("filtro-departamento-evento");
  var filtroCiudad = document.getElementById("filtro-ciudad-evento");
  var lugares = {};   /* { país: { departamento: [ciudades] } } con los eventos cargados */
  var orden = document.getElementById("orden-eventos");
  var cuerpo = document.getElementById("cuerpo-eventos");
  var dialogo = document.getElementById("detalle-evento");
  var contenido = document.getElementById("detalle-contenido");
  var abierto = null;
  var modo = null;   /* "nuevo" o "editar" mientras se ve el formulario */
  var ciudades = [];
  var agentesLista = [];

  function pintarTabla() {
    pintarTablaEventos(filtrarEventosAdmin(eventos, {
      texto: buscar.value, estado: filtroEstado.value, pais: filtroPais.value, departamento: filtroDepartamento.value,
      ciudad: filtroCiudad.value, orden: orden.value
    }), eventos.length);
    pintarFiltrosActivos(filtrosActivos(), quitarFiltro, ids);
  }

  function pintarDetalle(e, mensaje) {
    pintarDetalleEventoAdmin(contenido, e, mensaje);
  }

  function mostrarFormulario(e) {
    modo = e ? "editar" : "nuevo";
    pintarFormularioEvento(contenido, e, ciudades, agentesLista);
    document.getElementById("detalle-nombre").focus();
  }

  /* ----- Registrar y editar ----- */

  contenido.addEventListener("submit", function (evento) {
    if (evento.target.id !== "form-evento") return;
    evento.preventDefault();

    var nuevo = modo === "nuevo";
    var campos = camposEvento(nuevo, ciudades, agentesLista);
    var v = leerFormulario(campos);
    if (!nuevo) v.estado = abierto.estado;
    if (mostrarErroresFormulario("form-evento", campos, validarEvento(v, nuevo ? null : abierto))) return;

    var botones = evento.target.querySelectorAll("button");
    botones.forEach(function (b) { b.disabled = true; });

    (v.imagen ? reducirImagen(v.imagen, 1000) : Promise.resolve(nuevo ? "" : abierto.imagen))
      .then(function (imagen) {
        return guardarEvento(cuerpoEvento(v, imagen), nuevo ? null : abierto.id);
      })
      .then(function (guardado) {
        /* El servidor crea el evento "Programado": si se eligió otro estado inicial, se pasa ahora */
        if (!nuevo || v.estado === guardado.estado) return guardado;
        return cambiarEstadoEvento(guardado.id, v.estado).catch(function () { return guardado; });
      })
      .then(function (datos) {
        /* La lista pública (EVENTOS) y la de esta página se actualizan juntas, con lo que dejó el servidor */
        var original = EVENTOS.filter(function (x) { return x.id === datos.id; })[0];
        if (original) Object.assign(original, datos);
        else EVENTOS.push(datos);

        var completo = completarEvento(original || datos);
        if (nuevo) eventos.push(completo);
        else Object.assign(abierto, completo);
        abierto = nuevo ? completo : abierto;
        modo = null;

        var mensaje = nuevo ? "Se registró " + datos.titulo + "." : "Se guardaron los cambios de " + datos.titulo + ".";
        aviso.textContent = mensaje;
        pintarResumenEventos(eventos);
        pintarTabla();
        pintarDetalle(abierto, mensaje);
        document.getElementById("detalle-nombre").focus();
      })
      .catch(function (error) {
        document.getElementById("form-evento-error").innerHTML = "<strong>Error:</strong> " + escapar(error.message);
        botones.forEach(function (b) { b.disabled = false; });
      });
  });

  document.getElementById("nuevo-evento").onclick = function () {
    abierto = null;
    revisando = null;
    mostrarFormulario(null);
    dialogo.showModal();
    document.getElementById("detalle-nombre").focus();
  };

  /* ----- Cambiar el estado y eliminar ----- */

  /* "cancelacion" = { causa, detalle } cuando el nuevo estado es Cancelado */
  function guardarEstado(e, estado, cancelacion) {
    var botones = document.getElementById("botones-estado");
    botones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });

    var observaciones = cancelacion
      ? agregarNota(e.observaciones, notaCancelacion("evento", "el administrador", cancelacion.causa, cancelacion.detalle))
      : undefined;

    cambiarEstadoEvento(e.id, estado, observaciones).then(function (actualizado) {
      /* Se toma lo que dejó el servidor (estado, observaciones con la causa y cupos) */
      var original = EVENTOS.filter(function (x) { return x.id === e.id; })[0];
      if (original) Object.assign(original, actualizado);
      Object.assign(e, completarEvento(actualizado));

      var mensaje = "El estado de " + e.titulo + " ahora es " + estado + ".";
      aviso.textContent = mensaje;
      pintarResumenEventos(eventos);
      pintarTabla();
      pintarDetalle(e, mensaje);
      document.getElementById("detalle-nombre").focus();
    }).catch(function (error) {
      document.getElementById("error-estado").innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
      botones.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
    });
  }

  contenido.addEventListener("change", function (evento) {
    if (evento.target.id !== "nuevo-estado") return;
    mostrarMotivoDeCancelacion(evento.target.value === "Cancelado");
  });

  var cancelacionPendiente = null;

  contenido.addEventListener("submit", function (evento) {
    if (evento.target.id !== "form-estado") return;
    evento.preventDefault();
    if (!abierto) return;

    var lista = document.getElementById("nuevo-estado");
    var elegido = lista.value;
    var error = document.getElementById("error-estado");
    error.textContent = "";

    if (elegido === abierto.estado) {
      error.innerHTML = "<strong>Error:</strong> Elige un estado distinto al actual.";
      lista.focus();
      return;
    }

    if (elegido !== "Cancelado") {
      guardarEstado(abierto, elegido);
      return;
    }

    cancelacionPendiente = datosCancelacion("motivo");
    if (cancelacionPendiente.error) {
      error.innerHTML = "<strong>Error:</strong> " + cancelacionPendiente.error;
      return;
    }

    confirmarCancelacionEvento(contenido, abierto);
  });

  contenido.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-accion]");
    if (!boton) return;
    var accion = boton.getAttribute("data-accion");

    if (accion === "cancelar-formulario") {
      if (modo === "nuevo") {
        dialogo.close();
      } else {
        modo = null;
        pintarDetalle(abierto);
        document.getElementById("detalle-nombre").focus();
      }
      return;
    }
    if (!abierto) return;

    if (accion === "editar") {
      mostrarFormulario(abierto);
    } else if (accion === "eliminar") {
      var e = abierto;
      obtenerReservasAdmin().catch(function () { return []; }).then(function (reservas) {
        confirmarEliminacionEvento(e, reservas.filter(function (r) { return r.eventoId === e.id; }).length);
      });
    } else if (accion === "no-eliminar") {
      restaurarBotonesEvento();
    } else if (accion === "si-eliminar") {
      var borrado = abierto;
      var acciones = document.getElementById("acciones-evento");
      acciones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
      eliminarEvento(borrado.id).then(function () {
        eventos = eventos.filter(function (x) { return x !== borrado; });
        var posicion = EVENTOS.findIndex(function (x) { return x.id === borrado.id; });
        if (posicion !== -1) EVENTOS.splice(posicion, 1);
        aviso.textContent = "Se eliminó " + borrado.titulo + ".";
        abierto = null;
        dialogo.close();
        pintarResumenEventos(eventos);
        pintarTabla();
        aviso.setAttribute("tabindex", "-1");
        setTimeout(function () { aviso.focus(); }, 0);
      }).catch(function (error) {
        document.getElementById("detalle-aviso").innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
        acciones.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
      });
    } else if (accion === "si-cancelar") {
      guardarEstado(abierto, "Cancelado", cancelacionPendiente);
    } else if (accion === "volver") {
      volverACancelarEvento();
    }
  });

  cuerpo.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-id]");
    if (!boton) return;

    abierto = eventos.filter(function (e) { return String(e.id) === boton.getAttribute("data-id"); })[0];
    revisando = null;
    modo = null;
    pintarDetalle(abierto);
    dialogo.showModal();
    document.getElementById("detalle-nombre").focus();
  });

  document.getElementById("detalle-cerrar").onclick = function () {
    dialogo.close();
  };

  dialogo.addEventListener("click", function (evento) {
    if (evento.target === dialogo) dialogo.close();
  });

  dialogo.addEventListener("close", function () {
    if (modo === "nuevo") {
      modo = null;
      /* después de que el navegador devuelve el foco por su cuenta */
      setTimeout(function () { enfocarSiExiste("nuevo-evento"); }, 0);
      return;
    }
    modo = null;
    if (!abierto) return;
    var id = abierto.id;
    abierto = null;
    setTimeout(function () {
      var boton = cuerpo.querySelector('button[data-id="' + id + '"]');
      if (boton) {
        boton.focus();
      } else {
        enfocarSiExiste("titulo-lista-eventos");
      }
    }, 0);
  });

  document.getElementById("filtros-eventos").addEventListener("submit", function (evento) {
    evento.preventDefault();
  });
  buscar.addEventListener("input", pintarTabla);
  filtroEstado.onchange = pintarTabla;
  orden.onchange = pintarTabla;

  /* País → departamentos de ese país → ciudades de ese departamento */
  var alfabetico = function (a, b) { return a.localeCompare(b, "es"); };
  filtroPais.onchange = function () {
    llenarLista(filtroDepartamento, filtroPais.value ? Object.keys(lugares[filtroPais.value]).sort(alfabetico) : [], "Todos");
    llenarLista(filtroCiudad, [], "Todas");
    pintarTabla();
  };
  filtroDepartamento.onchange = function () {
    var ciudades = filtroDepartamento.value ? lugares[filtroPais.value][filtroDepartamento.value].slice().sort(alfabetico) : [];
    llenarLista(filtroCiudad, ciudades, "Todas");
    pintarTabla();
  };
  filtroCiudad.onchange = pintarTabla;

  /* ----- Menú desplegable de filtros y etiquetas de lo aplicado ----- */
  var ids = { boton: "abrir-filtros-evento", panel: "panel-filtros-evento", listo: "cerrar-filtros-evento",
              chips: "filtros-chips-evento", cantidad: "filtros-activos-evento" };

  function filtrosActivos() {
    var chips = [];
    if (filtroEstado.value) chips.push({ clave: "estado", texto: filtroEstado.value });
    if (filtroPais.value) chips.push({ clave: "pais", texto: filtroPais.value });
    if (filtroDepartamento.value) chips.push({ clave: "departamento", texto: filtroDepartamento.value });
    if (filtroCiudad.value) chips.push({ clave: "ciudad", texto: filtroCiudad.value });
    return chips;
  }

  function reiniciarDepartamento() { llenarLista(filtroDepartamento, [], "Todos"); }
  function reiniciarCiudad() { llenarLista(filtroCiudad, [], "Todas"); }

  /* Quitar una etiqueta: al quitar el país también se quitan su departamento y su ciudad */
  function quitarFiltro(clave) {
    if (clave === "estado") {
      filtroEstado.value = "";
    } else if (clave === "pais") {
      filtroPais.value = "";
      reiniciarDepartamento();
      reiniciarCiudad();
    } else if (clave === "departamento") {
      filtroDepartamento.value = "";
      reiniciarCiudad();
    } else if (clave === "ciudad") {
      filtroCiudad.value = "";
    }
    pintarTabla();
    document.getElementById(ids.boton).focus();
  }

  document.getElementById("limpiar-filtros-evento").onclick = function () {
    filtroEstado.value = "";
    filtroPais.value = "";
    reiniciarDepartamento();
    reiniciarCiudad();
    pintarTabla();
  };

  prepararMenuFiltros(ids);

  /* ----- Eventos por revisar ----- */

  var listaRevision = document.getElementById("lista-por-revisar");
  var conteoRevision = document.getElementById("conteo-por-revisar");
  var solicitudes = [];
  var revisando = null;

  function cargarPorRevisar() {
    return obtenerSolicitudesEventos().then(function (lista) {
      solicitudes = lista;
      pintarPorRevisar(solicitudes);
    });
  }

  function decidir(estado, motivo) {
    var botones = document.getElementById("botones-revision");
    botones.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
    var nombre = revisando.nombre;

    resolverSolicitudEvento(revisando.id, estado, motivo).then(function () {
      aviso.textContent = estado === "Aprobado"
        ? "Aprobaste «" + nombre + "». Ya está publicado como Programado."
        : "Rechazaste «" + nombre + "». El agente verá el motivo para corregirlo.";
      /* La tarjeta revisada desaparece de la lista: el foco va al título */
      revisando = null;
      dialogo.close();
      return Promise.all([cargarPorRevisar(), obtenerEventosAdmin()]);
    }).then(function (datos) {
      eventos = datos[1];
      pintarResumenEventos(eventos);
      pintarTabla();
      document.getElementById("titulo-por-revisar").focus();
    }).catch(function (error) {
      var caja = document.getElementById("error-revision");
      if (caja) {
        caja.innerHTML = "<strong>Error:</strong> " + escapar(error.message);
        botones.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
      } else {
        aviso.innerHTML = "<strong>Error:</strong> " + escapar(error.message);
      }
    });
  }

  listaRevision.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-revisar]");
    if (!boton) return;

    revisando = solicitudes.filter(function (s) { return s.id === boton.getAttribute("data-revisar"); })[0];
    if (!revisando) return;
    abierto = null;
    pintarSolicitud(contenido, revisando);
    dialogo.showModal();
    document.getElementById("detalle-nombre").focus();
  });

  contenido.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-revision]");
    if (!boton || !revisando) return;

    var accion = boton.getAttribute("data-revision");
    var motivo = document.getElementById("motivo-rechazo-evento");
    var error = document.getElementById("error-revision");
    error.textContent = "";

    if (accion === "aprobar") {
      decidir("Aprobado");
    } else if (accion === "mostrar-rechazo") {
      mostrarCampoRechazo(revisando);
    } else if (accion === "volver") {
      ocultarCampoRechazo(revisando);
    } else if (accion === "rechazar") {
      if (motivo.value.trim().length < 10) {
        error.innerHTML = "<strong>Error:</strong> Escribe el motivo del rechazo (10 caracteres como mínimo).";
        motivo.setAttribute("aria-invalid", "true");
        motivo.focus();
        return;
      }
      decidir("Rechazado", motivo.value.trim());
    }
  });

  dialogo.addEventListener("close", function () {
    if (!revisando) return;
    var id = revisando.id;
    revisando = null;
    setTimeout(function () {
      var boton = listaRevision.querySelector('button[data-revisar="' + id + '"]');
      if (boton) { boton.focus(); } else { enfocarSiExiste("titulo-por-revisar"); }
    }, 0);
  });

  cargarPorRevisar().catch(function (error) {
    conteoRevision.innerHTML = "<strong>Error:</strong> " + escapar(error.message);
  });

  obtenerCiudadesLista().then(function (lista) { ciudades = lista; }).catch(function () {});
  obtenerAgentes().then(function (lista) {
    agentesLista = lista
      .slice()
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); })
      .map(function (a) { return [a.nit, a.nombre + (a.estado === "Activo" ? "" : " (" + a.estado.toLowerCase() + ")")]; });
  }).catch(function () {});

  obtenerEventosAdmin().then(function (lista) {
    eventos = lista;
    lugares = ubicacionesDe(eventos);
    llenarLista(filtroPais, Object.keys(lugares).sort(alfabetico), "Todos");
    pintarResumenEventos(eventos);
    pintarTabla();
  }).catch(function (error) {
    aviso.innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
  });
}
