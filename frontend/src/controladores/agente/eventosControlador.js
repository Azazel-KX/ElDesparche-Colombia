/* ==========================================================================
   controladores/agente/eventosControlador.js
   Mis eventos (agente.html?seccion=eventos): lista, crear, corregir y retirar solicitudes.
   Una solicitud nueva o corregida queda "En revisión" hasta que un administrador la apruebe.
   ========================================================================== */

import { reducirImagen } from "../../lib/dom.js";
import { ahoraLocal } from "../../lib/fechas.js";
import { escapar } from "../../lib/formato.js";
import { cancelarEventoAgente, editarEventoPublicado, enviarSolicitud, errorDeEdicionPublicada, errorDeSolicitud, filtrarMisEventos, obtenerEventosDelAgente, retirarSolicitud } from "../../modelos/eventoModelo.js";
import {
  camposSolicitud, datosDeSolicitud, leerCamposSolicitud, mostrarErrorEnFormulario, pintarEstadoCuenta, pintarMisEventos
} from "../../vistas/agenteVista.js";
import { confirmar } from "../../vistas/confirmarVista.js";
import { crearMapaEvento } from "../../vistas/mapaVista.js";
import { cargarCiudadesAgente, entrarComoAgente } from "../agenteControlador.js";
import { campoDialogo, pedirDatos } from "../../vistas/dialogoVista.js";
import { camposCancelacion, datosCancelacion } from "../../vistas/cancelacionVista.js";

export function paginaEventosAgente() {
  var usuario = entrarComoAgente();
  if (!usuario) return;

  var aviso = document.getElementById("admin-aviso");
  var exito = document.getElementById("exito-evento");
  var lista = document.getElementById("lista-mis-eventos");
  var conteo = document.getElementById("resultado-mis-eventos");
  var buscar = document.getElementById("buscar-mis-eventos");
  var filtro = document.getElementById("filtro-mis-eventos");
  var botonCrear = document.getElementById("crear-evento");

  var dialogo = document.getElementById("dialogo-evento");
  var formulario = document.getElementById("formulario-evento");
  var error = document.getElementById("error-evento");
  var vista = document.getElementById("vista-imagen");
  var campoImagen = document.getElementById("evento-imagen");

  var datos = { eventos: [], solicitudes: [] };
  var editando = null;        /* id de la solicitud que se corrige */
  var imagenActual = "";      /* imagen reducida, en data URL */
  var origenFoco = null;      /* botón que abrió el formulario */

  var campos = camposSolicitud();

  /* ----- Lista ----- */

  function pintarLista() {
    pintarMisEventos(lista, conteo, filtrarMisEventos(datos, buscar.value, filtro.value),
      datos.solicitudes.length + datos.eventos.length > 0);
  }

  function cargar() {
    return obtenerEventosDelAgente().then(function (resultado) {
      datos = resultado;
      pintarEstadoCuenta(resultado.agente);

      var activo = resultado.agente.estado === "Activo";
      botonCrear.disabled = !activo;
      if (!activo) {
        botonCrear.setAttribute("aria-describedby", "agente-cuenta");
      } else {
        botonCrear.removeAttribute("aria-describedby");
      }

      pintarLista();
    });
  }

  buscar.addEventListener("input", pintarLista);
  filtro.addEventListener("change", pintarLista);
  document.getElementById("filtros-agente").addEventListener("submit", function (evento) {
    evento.preventDefault();
  });

  /* Un evento ya publicado: solo se cambia lo que no toca a las reservas, o se cancela */
  function editarPublicado(id, boton) {
    var evento = datos.eventos.filter(function (e) { return e.id === id; })[0];
    if (!evento) return;
    pedirDatos({
      titulo: "Editar «" + evento.titulo + "»",
      texto: "Fechas, precio, capacidad y lugar los cambia un administrador. Aquí puedes ajustar la descripción, las observaciones y la foto.",
      campos:
        campoDialogo("pub-descripcion", "Descripción", "textarea", { filas: 5, max: 3000, valor: evento.descripcion }) +
        campoDialogo("pub-observaciones", "Observaciones", "textarea", {
          filas: 3, max: 1000, opcional: true, valor: evento.observaciones === "Sin observaciones." ? "" : evento.observaciones
        }) +
        campoDialogo("pub-imagen", "Foto nueva", "file", { opcional: true, ayuda: "Si no eliges una, se queda la actual." }),
      textoSi: "Guardar cambios",
      leer: function (caja) {
        var descripcion = caja.querySelector("#pub-descripcion").value.trim();
        var observaciones = caja.querySelector("#pub-observaciones").value.trim();
        var problema = errorDeEdicionPublicada(descripcion, observaciones);
        if (problema) return { error: problema, campo: descripcion.length < 30 || descripcion.length > 3000 ? "pub-descripcion" : "pub-observaciones" };
        return { datos: { descripcion: descripcion, observaciones: observaciones, archivo: caja.querySelector("#pub-imagen").files[0] || null } };
      },
      enviar: function (d) {
        var imagen = d.archivo ? reducirImagen(d.archivo, 1000) : Promise.resolve(null);
        return imagen.then(function (url) {
          return editarEventoPublicado(id, { descripcion: d.descripcion, observaciones: d.observaciones, imagen: url });
        });
      }
    }).then(function (guardado) {
      if (!guardado) return;
      exito.textContent = "Guardaste los cambios de «" + evento.titulo + "».";
      return cargar().then(function () { buscar.focus(); });
    });
  }

  function cancelarPublicado(id) {
    var evento = datos.eventos.filter(function (e) { return e.id === id; })[0];
    if (!evento) return;
    pedirDatos({
      titulo: "¿Cancelar «" + evento.titulo + "»?",
      texto: "Las reservas del evento quedarán canceladas y este cambio no se puede deshacer.",
      campos: camposCancelacion("evento", "cancelar-evento"),
      textoSi: "Sí, cancelar el evento",
      peligro: true,
      leer: function () {
        var lectura = datosCancelacion("cancelar-evento");
        return lectura.error ? { error: lectura.error, campo: "cancelar-evento-causa" } : { datos: lectura };
      },
      enviar: function (d) { return cancelarEventoAgente(id, d.causa, d.detalle); }
    }).then(function (cancelado) {
      if (!cancelado) return;
      exito.textContent = "Cancelaste «" + evento.titulo + "». Sus reservas quedaron canceladas.";
      return cargar().then(function () { buscar.focus(); });
    });
  }

  lista.addEventListener("click", function (evento) {
    var publicadoEditar = evento.target.closest("[data-editar-publicado]");
    var publicadoCancelar = evento.target.closest("[data-cancelar-evento]");
    if (publicadoEditar) return editarPublicado(publicadoEditar.getAttribute("data-editar-publicado"));
    if (publicadoCancelar) return cancelarPublicado(publicadoCancelar.getAttribute("data-cancelar-evento"));

    var editar = evento.target.closest("[data-editar]");
    var retirar = evento.target.closest("[data-retirar]");

    if (editar) {
      var solicitud = datos.solicitudes.filter(function (s) { return s.id === editar.getAttribute("data-editar"); })[0];
      if (solicitud) abrirFormulario(solicitud, editar);
    }

    if (retirar) {
      var id = retirar.getAttribute("data-retirar");
      var cual = datos.solicitudes.filter(function (s) { return s.id === id; })[0];
      if (!cual) return;

      confirmar("¿Retirar «" + cual.nombre + "»?", "La solicitud se borra y no se publicará.", "Sí, retirar").then(function (acepto) {
        if (!acepto) return;
        return retirarSolicitud(id).then(function () {
          exito.textContent = "Retiraste «" + cual.nombre + "».";
          return cargar();
        }).then(function () {
          buscar.focus();
        });
      }).catch(function (e) {
        aviso.innerHTML = "<strong>Error:</strong> " + escapar(e.message);
      });
    }
  });

  /* ----- Formulario ----- */

  function limpiarErrores() {
    error.textContent = "";
    Object.keys(campos).forEach(function (k) { campos[k].removeAttribute("aria-invalid"); });
  }

  function abrirFormulario(solicitud, boton) {
    origenFoco = boton;
    editando = solicitud ? solicitud.id : null;
    formulario.reset();
    limpiarErrores();

    imagenActual = solicitud && solicitud.imagen ? solicitud.imagen : "";
    vista.hidden = !imagenActual;
    vista.src = imagenActual || "";

    if (solicitud) {
      Object.keys(campos).forEach(function (k) {
        if (solicitud[k] !== undefined) campos[k].value = solicitud[k];
      });
    }

    document.getElementById("titulo-formulario").textContent = solicitud ? "Editar evento" : "Crear evento";
    document.getElementById("enviar-evento").textContent = solicitud ? "Guardar y reenviar a revisión" : "Enviar a revisión";
    campos.inicio.min = ahoraLocal();
    campos.fin.min = campos.inicio.value || ahoraLocal();

    dialogo.showModal();
    campos.nombre.focus();

    /* El mapa se dibuja cuando la ventana ya está abierta y tiene tamaño */
    mapa.preparar().then(function () {
      if (solicitud && solicitud.lat !== undefined && solicitud.lat !== "") {
        mapa.ponerPunto(Number(solicitud.lat), Number(solicitud.lon), true);
      } else {
        mapa.quitarPunto();
        mapa.centrarEnCiudad(campos.ciudad.value);
      }
    });
  }

  function cerrarFormulario() {
    if (dialogo.open) dialogo.close();
  }

  dialogo.addEventListener("close", function () {
    var volver = origenFoco;
    setTimeout(function () { if (volver && document.body.contains(volver)) volver.focus(); }, 0);
  });

  botonCrear.addEventListener("click", function () { abrirFormulario(null, botonCrear); });
  document.getElementById("cerrar-formulario").addEventListener("click", cerrarFormulario);
  document.getElementById("cancelar-formulario").addEventListener("click", cerrarFormulario);

  var mapa = crearMapaEvento(campos, {
    caja: document.getElementById("mapa-evento"),
    estado: document.getElementById("estado-mapa"),
    buscar: document.getElementById("buscar-direccion")
  });

  campos.inicio.addEventListener("change", function () {
    campos.fin.min = campos.inicio.value || ahoraLocal();
  });

  Object.keys(campos).forEach(function (k) {
    campos[k].addEventListener("input", function () { campos[k].removeAttribute("aria-invalid"); });
  });

  campoImagen.addEventListener("change", function () {
    var archivo = campoImagen.files[0];
    if (!archivo) return;

    if (!/^image\//.test(archivo.type) || archivo.size > 10 * 1024 * 1024) {
      campoImagen.value = "";
      campoImagen.setAttribute("aria-invalid", "true");
      mostrarErrorEnFormulario(error, "Elige una imagen (JPG, PNG o WebP) de menos de 10 MB.");
      return;
    }

    campoImagen.removeAttribute("aria-invalid");
    reducirImagen(archivo).then(function (url) {
      imagenActual = url;
      vista.src = url;
      vista.hidden = false;
    }).catch(function (e) {
      mostrarErrorEnFormulario(error, e.message);
    });
  });

  formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();
    limpiarErrores();

    var problema = errorDeSolicitud(leerCamposSolicitud(campos));
    if (problema) {
      mostrarErrorEnFormulario(error, problema[1]);
      campos[problema[0]].setAttribute("aria-invalid", "true");
      campos[problema[0]].focus();
      return;
    }

    var boton = document.getElementById("enviar-evento");
    var nuevos = datosDeSolicitud(campos, imagenActual);
    boton.disabled = true;

    enviarSolicitud(nuevos, editando).then(function () {
      exito.textContent = (editando ? "Guardaste los cambios de «" : "Enviaste «") + nuevos.nombre +
        "» a revisión. Te avisaremos cuando un administrador lo revise.";
      origenFoco = buscar;
      cerrarFormulario();
      return cargar();
    }).catch(function (e) {
      mostrarErrorEnFormulario(error, e.message);
    }).then(function () {
      boton.disabled = false;
    });
  });

  cargarCiudadesAgente(campos.ciudad).catch(function () {
    campos.ciudad.innerHTML = '<option value="">No se pudieron cargar las ciudades</option>';
  });

  cargar().catch(function (e) {
    aviso.innerHTML = "<strong>Error:</strong> " + escapar(e.message);
  });
}
