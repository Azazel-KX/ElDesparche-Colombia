/* ==========================================================================
   controladores/gestionControlador.js
   Gestión de personas (agentes, clientes y administradores).
   ========================================================================== */

import { enfocarSiExiste } from "../lib/dom.js";
import { escapar } from "../lib/formato.js";
import { obtenerCiudadesLista } from "../modelos/ubicacionModelo.js";
import { htmlFormulario, leerFormulario, mostrarErroresFormulario } from "../vistas/formularioVista.js";

/* ===== GESTIÓN DE PERSONAS (agentes, clientes y administradores) =====
   Las tres páginas se comportan igual: una tabla con filtros, una ventana con el detalle, un formulario para
   registrar y editar, y una confirmación para eliminar. Esa parte es común y vive aquí; cada página solo aporta
   lo suyo: cómo pinta su tabla y su detalle, sus campos y reglas, y sus acciones propias (suspender, bloquear...).

   cfg = {
     ids: { cuerpo, dialogo, nuevo, formulario, filtros, tituloLista }   ids del HTML de la página
     atributo                  atributo del botón "Ver detalle" de cada fila ("data-nit" o "data-documento")
     id(e)                     identificador de la persona (el NIT o el documento)
     preparar(e)               opcional: ajusta lo que devuelve el servidor (por ejemplo, arma el nombre)
     textos: { nuevoTitulo, nuevoSub, botonNuevo, editarTitulo(e) }
     valoresNuevo              valores iniciales del formulario de registro
     campos(nuevo, ciudades), valores(e), validar(v, actual, lista), armar(v, nuevo)
     inmutables                campos que no cambian al editar
     guardar(datos, id), eliminar(id)
     eliminacion(e, lista)     { bloqueo: "motivo" } si no se puede eliminar, o { consecuencia: "texto." }
     botones(e)                botones de acción del detalle
     accion(accion, e, ayuda)  opcional: atiende las acciones propias; devuelve true si lo hizo
     pintarResumen(lista), pintarTabla(lista), pintarDetalle(e, mensaje)
     alCargar(lista)           opcional: se llama al llegar los datos
   }
   Devuelve { lista, abierto, repintar(), repintarTabla(), iniciar(promesaDeLaLista) }. */
export function crearGestion(cfg) {
  var aviso = document.getElementById("admin-aviso");
  var cuerpo = document.getElementById(cfg.ids.cuerpo);
  var dialogo = document.getElementById(cfg.ids.dialogo);
  var contenido = document.getElementById("detalle-contenido");
  var preparar = cfg.preparar || function (e) { return e; };
  var g = { lista: [], abierto: null, modo: null, ciudades: [] };   /* modo: "nuevo" o "editar" mientras se ve el formulario */

  function acciones() { return document.getElementById("detalle-acciones"); }
  function enfocarNombre() { document.getElementById("detalle-nombre").focus(); }
  function deshabilitar(botones, si) { botones.forEach(function (b) { b.disabled = si; }); }
  function errorEnDetalle(error, botones) {
    document.getElementById("detalle-aviso").innerHTML = "<strong>Error:</strong> " + escapar(error.message);
    deshabilitar(botones, false);
  }

  g.repintar = function () {
    cfg.pintarResumen(g.lista);
    cfg.pintarTabla(g.lista);
  };
  g.repintarTabla = function () { cfg.pintarTabla(g.lista); };

  /* Después de un cambio: aviso arriba, tablas al día y el detalle con el mensaje */
  function mostrarCambio(e, mensaje) {
    aviso.textContent = mensaje;
    g.repintar();
    cfg.pintarDetalle(e, mensaje);
    enfocarNombre();
  }

  /* Lo que usan las acciones propias de cada página */
  var ayuda = {
    /* Pregunta con "Sí" (lleva a la acción accionSi) y "Cancelar" */
    confirmar: function (pregunta, consecuencia, textoSi, accionSi) {
      acciones().innerHTML =
        '<div class="detalle-confirmar">' +
          '<p id="texto-confirmar"><strong>' + pregunta + '</strong> ' + consecuencia + '</p>' +
          '<div class="detalle-botones">' +
            '<button type="button" class="admin-boton admin-boton-peligro" data-accion="' + accionSi + '" aria-describedby="texto-confirmar">' + textoSi + '</button>' +
            '<button type="button" class="admin-boton-sec" data-accion="cancelar">Cancelar</button>' +
          '</div>' +
        '</div>';
      acciones().querySelector('[data-accion="' + accionSi + '"]').focus();
    },
    /* Espera la promesa; si sale bien, alTerminar() aplica el cambio y devuelve el mensaje que se muestra */
    ejecutar: function (promesa, alTerminar) {
      var botones = Array.prototype.slice.call(acciones().querySelectorAll("button"));
      deshabilitar(botones, true);
      promesa.then(function () {
        mostrarCambio(g.abierto, alTerminar());
      }).catch(function (error) {
        errorEnDetalle(error, botones);
      });
    }
  };

  /* ----- Registrar y editar ----- */

  function mostrarFormulario(e) {
    g.modo = e ? "editar" : "nuevo";
    var ciudades = g.ciudades.slice();
    if (e && e.ciudad && !ciudades.some(function (x) { return x[0] === e.ciudad; })) ciudades.push([e.ciudad, e.ciudad]);

    contenido.innerHTML =
      '<div class="detalle-cabecera"><div>' +
        '<h2 id="detalle-nombre" tabindex="-1">' + (e ? cfg.textos.editarTitulo(e) : cfg.textos.nuevoTitulo) + '</h2>' +
        '<p>' + (e ? "Cambia los datos que necesites y guarda." : cfg.textos.nuevoSub) + '</p>' +
      '</div></div>' +
      htmlFormulario(cfg.ids.formulario, cfg.campos(!e, ciudades),
        e ? cfg.valores(e) : cfg.valoresNuevo,
        e ? "Guardar cambios" : cfg.textos.botonNuevo);
    enfocarNombre();
  }

  contenido.addEventListener("submit", function (evento) {
    if (evento.target.id !== cfg.ids.formulario) return;
    evento.preventDefault();

    var nuevo = g.modo === "nuevo";
    var campos = cfg.campos(nuevo, g.ciudades);
    var v = leerFormulario(campos);
    if (!nuevo) {
      cfg.inmutables.forEach(function (k) { v[k] = g.abierto[k]; });
    }
    if (mostrarErroresFormulario(cfg.ids.formulario, campos, cfg.validar(v, nuevo ? null : g.abierto, g.lista))) return;

    var datos = cfg.armar(v, nuevo);
    var botones = Array.prototype.slice.call(evento.target.querySelectorAll("button"));
    deshabilitar(botones, true);

    cfg.guardar(nuevo ? Object.assign({ contrasena: v.contrasena }, datos) : datos, nuevo ? null : cfg.id(g.abierto))
      .then(function (guardado) {
        /* Lo que quedó en la base: el servidor completa la fecha de registro y los totales */
        var e;
        if (nuevo) {
          e = guardado;
          g.lista.push(e);
        } else {
          e = preparar(Object.assign(g.abierto, guardado));
        }
        g.abierto = e;
        g.modo = null;
        mostrarCambio(e, nuevo ? "Se registró a " + e.nombre + "." : "Se guardaron los cambios de " + e.nombre + ".");
      })
      .catch(function (error) {
        document.getElementById(cfg.ids.formulario + "-error").innerHTML = "<strong>Error:</strong> " + escapar(error.message);
        deshabilitar(botones, false);
      });
  });

  document.getElementById(cfg.ids.nuevo).onclick = function () {
    g.abierto = null;
    mostrarFormulario(null);
    dialogo.showModal();
    enfocarNombre();
  };

  /* ----- Eliminar ----- */

  function pedirEliminacion() {
    var e = g.abierto;
    var resultado = cfg.eliminacion(e, g.lista);
    var nombre = escapar(e.nombre);

    if (resultado.bloqueo) {
      acciones().innerHTML =
        '<div class="detalle-confirmar">' +
          '<p id="texto-confirmar"><strong>No se puede eliminar a ' + nombre + '.</strong> ' + resultado.bloqueo + '</p>' +
          '<div class="detalle-botones">' +
            '<button type="button" class="admin-boton-sec" data-accion="cancelar">Entendido</button>' +
          '</div>' +
        '</div>';
      acciones().querySelector('[data-accion="cancelar"]').focus();
      return;
    }
    ayuda.confirmar("¿Eliminar a " + nombre + "?", resultado.consecuencia + " Esto no se puede deshacer.", "Sí, eliminar", "si-eliminar");
  }

  function eliminarAbierto() {
    var e = g.abierto;
    var botones = Array.prototype.slice.call(acciones().querySelectorAll("button"));
    deshabilitar(botones, true);

    cfg.eliminar(cfg.id(e)).then(function () {
      g.lista = g.lista.filter(function (x) { return x !== e; });
      aviso.textContent = "Se eliminó a " + e.nombre + ".";
      g.abierto = null;
      dialogo.close();
      g.repintar();
      aviso.setAttribute("tabindex", "-1");
      setTimeout(function () { aviso.focus(); }, 0);
    }).catch(function (error) {
      errorEnDetalle(error, botones);
    });
  }

  /* ----- Botones del detalle ----- */

  contenido.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[data-accion]");
    if (!boton) return;

    var accion = boton.getAttribute("data-accion");
    if (accion === "cancelar-formulario") {
      if (g.modo === "nuevo") {
        dialogo.close();
      } else {
        g.modo = null;
        cfg.pintarDetalle(g.abierto);
        enfocarNombre();
      }
      return;
    }
    if (!g.abierto) return;

    if (accion === "editar") {
      mostrarFormulario(g.abierto);
    } else if (accion === "eliminar") {
      pedirEliminacion();
    } else if (accion === "si-eliminar") {
      eliminarAbierto();
    } else if (accion === "cancelar") {
      acciones().innerHTML = cfg.botones(g.abierto);
      acciones().querySelector("button").focus();
    } else if (cfg.accion) {
      cfg.accion(accion, g.abierto, ayuda);
    }
  });

  /* ----- Abrir y cerrar el detalle ----- */

  cuerpo.addEventListener("click", function (evento) {
    var boton = evento.target.closest("button[" + cfg.atributo + "]");
    if (!boton) return;

    g.abierto = g.lista.filter(function (e) { return String(cfg.id(e)) === boton.getAttribute(cfg.atributo); })[0];
    g.modo = null;
    cfg.pintarDetalle(g.abierto);
    dialogo.showModal();
    enfocarNombre();
  });

  document.getElementById("detalle-cerrar").onclick = function () {
    dialogo.close();
  };

  dialogo.addEventListener("click", function (evento) {
    if (evento.target === dialogo) dialogo.close();
  });

  /* Al cerrar, el foco vuelve al botón que abrió el detalle (o al de "Registrar") */
  dialogo.addEventListener("close", function () {
    if (g.modo === "nuevo") {
      g.modo = null;
      /* después de que el navegador devuelve el foco por su cuenta */
      setTimeout(function () { enfocarSiExiste(cfg.ids.nuevo); }, 0);
      return;
    }
    g.modo = null;
    if (!g.abierto) return;
    var id = String(cfg.id(g.abierto));
    g.abierto = null;
    setTimeout(function () {
      var boton = cuerpo.querySelector('button[' + cfg.atributo + '="' + id + '"]');
      if (boton) {
        boton.focus();
      } else {
        enfocarSiExiste(cfg.ids.tituloLista);
      }
    }, 0);
  });

  document.getElementById(cfg.ids.filtros).addEventListener("submit", function (evento) {
    evento.preventDefault();
  });

  /* Pide las ciudades del formulario y espera la lista de personas para pintar */
  g.iniciar = function (promesa) {
    obtenerCiudadesLista().then(function (lista) { g.ciudades = lista; }).catch(function () {});

    return promesa.then(function (lista) {
      g.lista = lista;
      if (cfg.alCargar) cfg.alCargar(lista);
      g.repintar();
    }).catch(function (error) {
      aviso.innerHTML = "<strong>Error:</strong> " + escapar(error.message);
    });
  };

  return g;
}
