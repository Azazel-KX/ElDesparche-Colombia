/* ==========================================================================
   controladores/admin/validarControlador.js
   Validar entradas en la puerta. El agente usa esta misma sección limitada a sus eventos:
   config = { usuario, eventos: [ids], obtenerReservas, rutaIngreso }
   ========================================================================== */

import { entrarComoAdmin } from "../adminControlador.js";
import { abrirEscaner, enfocarResultado, llenarSelectorDeEventos, mostrarVisor, pintarIngresos, pintarResultado } from "../../vistas/admin/validarVista.js";
import { evaluarEntrada, eventosDeLaPuerta, ingresosRegistrados, leerContenidoQr, obtenerReservasAdmin, registrarIngreso } from "../../modelos/reservaModelo.js";
import { escapar } from "../../lib/formato.js";

export function paginaValidar(config) {
  config = config || {};
  var admin = config.usuario || entrarComoAdmin();
  if (!admin) return;

  var permitidos = config.eventos || null;
  var reservas = [];
  var aviso = document.getElementById("admin-aviso");
  var selectorEvento = document.getElementById("validar-evento");
  var botonAbrir = document.getElementById("validar-abrir");
  var botonDetener = document.getElementById("validar-detener");
  var caja = document.getElementById("validar-resultado");
  var controles = null;
  var ultimoLeido = "";
  var ultimaVez = 0;

  function mostrarIngresos() {
    pintarIngresos(ingresosRegistrados(reservas, permitidos));
  }

  function validar(texto) {
    var datos = leerContenidoQr(texto);
    var codigo = datos ? datos.codigo : texto.trim().toUpperCase();

    if (!codigo) return;

    var veredicto = evaluarEntrada(codigo, reservas, permitidos, selectorEvento.value);
    pintarResultado(veredicto.clase, veredicto.titulo, veredicto.texto, veredicto.reserva, veredicto.registrar);
  }

  caja.addEventListener("click", function (evento) {
    var boton = evento.target.closest(".validar-registrar");
    if (!boton) return;

    var reserva = reservas.filter(function (r) { return r.codigo === boton.getAttribute("data-codigo"); })[0];
    boton.disabled = true;

    registrarIngreso(reserva, admin.nombre, config.rutaIngreso).then(function () {
      reserva.usada = true;   /* si vuelven a mostrar el mismo QR, ya sale como usada */
      pintarResultado("validar-si", "Ingreso registrado",
        "Bienvenidos. La entrada quedó marcada como usada y no servirá otra vez.", reserva);
      mostrarIngresos();
      enfocarResultado();
    }).catch(function (error) {
      boton.disabled = false;
      pintarResultado("validar-no", "Error", error.message, reserva);
    });
  });

  function detener() {
    if (controles) {
      controles.stop();
      controles = null;
    }
    mostrarVisor(false);
  }

  botonAbrir.onclick = function () {
    mostrarVisor(true);

    abrirEscaner(function (texto) {
      /* El mismo QR delante de la cámara no se vuelve a validar enseguida */
      if (texto === ultimoLeido && Date.now() - ultimaVez < 4000) return;
      ultimoLeido = texto;
      ultimaVez = Date.now();
      validar(texto);
    }).then(function (c) {
      controles = c;
      botonDetener.focus();
    }).catch(function () {
      detener();
      pintarResultado("validar-no", "No se pudo abrir la cámara",
        "Revisa que diste permiso para usar la cámara, o escribe el código de la reserva a mano.");
    });
  };

  botonDetener.onclick = function () {
    detener();
    botonAbrir.focus();
  };

  document.getElementById("validar-manual").addEventListener("submit", function (evento) {
    evento.preventDefault();
    var campo = document.getElementById("validar-codigo");
    if (!campo.value.trim()) {
      pintarResultado("validar-no", "Falta el código", "Escribe el código de la reserva, por ejemplo DES-1052.");
      campo.focus();
      return;
    }
    validar(campo.value);
    campo.select();
  });

  window.addEventListener("pagehide", detener);
  /* En admin.html, al pasar a otra sección del panel */
  document.addEventListener("salirseccion", detener, { once: true });

  (config.obtenerReservas || obtenerReservasAdmin)().then(function (lista) {
    reservas = lista;
    llenarSelectorDeEventos(eventosDeLaPuerta(lista, permitidos));
    mostrarIngresos();
  }).catch(function (error) {
    aviso.innerHTML = '<strong>Error:</strong> ' + escapar(error.message);
  });
}
