/* ==========================================================================
   vistas/dialogoVista.js
   Ventana pequeña con un formulario: cancelar un evento con su causa, editar un evento ya publicado,
   cambiar o restablecer una contraseña. Es la hermana de confirmar() cuando hay que pedir datos.
   ========================================================================== */

import { escapar } from "../lib/formato.js";

/* Un campo de texto con su etiqueta (para armar el formulario de una ventana) */
export function campoDialogo(id, etiqueta, tipo, opciones) {
  opciones = opciones || {};
  var atributos = ' id="' + id + '"' + (opciones.max ? ' maxlength="' + opciones.max + '"' : "") +
    (opciones.autocompletar ? ' autocomplete="' + opciones.autocompletar + '"' : ' autocomplete="off"');
  var control = tipo === "textarea"
    ? '<textarea' + atributos + ' rows="' + (opciones.filas || 3) + '">' + escapar(opciones.valor || "") + '</textarea>'
    : '<input type="' + tipo + '"' + atributos + ' value="' + escapar(opciones.valor || "") + '" />';
  return '<div class="campo"><label for="' + id + '">' + etiqueta +
    (opciones.opcional ? ' <span class="opcional">(opcional)</span>' : '') + '</label>' + control +
    (opciones.ayuda ? '<p class="texto-pequeno">' + escapar(opciones.ayuda) + '</p>' : '') + '</div>';
}

/* Abre la ventana y devuelve una promesa: con lo que devuelve cfg.enviar si salió bien, o null si la cierran.
   cfg = {
     titulo, texto, campos (HTML), textoSi, peligro (el botón es rojo),
     leer(caja)   -> { datos } o { error, campo } (campo = id del control que se marca)
     enviar(datos) -> promesa; si falla, el mensaje se muestra dentro de la ventana y sigue abierta
   } */
export function pedirDatos(cfg) {
  return new Promise(function (resolver) {
    var anterior = document.activeElement;
    var dialogo = document.createElement("dialog");
    dialogo.className = "modal modal-cancelar modal-datos";
    dialogo.setAttribute("aria-labelledby", "datos-titulo");
    dialogo.innerHTML =
      '<div class="modal-caja">' +
        '<h2 class="cancelar-titulo" id="datos-titulo">' + escapar(cfg.titulo) + '</h2>' +
        (cfg.texto ? '<p class="texto-gris">' + escapar(cfg.texto) + '</p>' : '') +
        '<form novalidate id="datos-formulario">' +
          cfg.campos +
          '<p class="detalle-error" id="datos-error" role="alert"></p>' +
          '<div class="cancelar-botones">' +
            '<button type="submit" class="boton ' + (cfg.peligro ? "boton-peligro" : "boton-morado") + '">' + escapar(cfg.textoSi || "Guardar") + '</button>' +
            '<button type="button" class="boton boton-borde" data-datos="no">Cancelar</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    var terminado = false;
    function terminar(respuesta) {
      if (terminado) return;
      terminado = true;
      if (dialogo.open) dialogo.close();
      dialogo.remove();
      if (anterior && anterior.focus && document.contains(anterior)) anterior.focus();
      resolver(respuesta);
    }

    var error = dialogo.querySelector("#datos-error");
    var formulario = dialogo.querySelector("#datos-formulario");

    function marcarError(mensaje, idCampo) {
      error.innerHTML = "<strong>Error:</strong> " + escapar(mensaje);
      dialogo.querySelectorAll("[aria-invalid]").forEach(function (c) { c.removeAttribute("aria-invalid"); });
      var campo = idCampo && dialogo.querySelector("#" + idCampo);
      if (campo) {
        campo.setAttribute("aria-invalid", "true");
        campo.focus();
      }
    }

    formulario.addEventListener("submit", function (evento) {
      evento.preventDefault();
      error.textContent = "";
      var lectura = cfg.leer(dialogo);
      if (lectura.error) {
        marcarError(lectura.error, lectura.campo);
        return;
      }
      var botones = formulario.querySelectorAll("button");
      botones.forEach(function (b) { b.disabled = true; });
      cfg.enviar(lectura.datos).then(function (resultado) {
        terminar(resultado === undefined ? true : resultado);
      }).catch(function (fallo) {
        marcarError(fallo.message);
        botones.forEach(function (b) { b.disabled = false; });
      });
    });

    dialogo.addEventListener("click", function (evento) {
      if (evento.target === dialogo || evento.target.closest('[data-datos="no"]')) terminar(null);
    });
    dialogo.addEventListener("cancel", function (evento) { evento.preventDefault(); terminar(null); });
    dialogo.addEventListener("close", function () { terminar(null); });

    document.body.appendChild(dialogo);
    dialogo.showModal();
    var primero = dialogo.querySelector("input, textarea, select");
    if (primero) primero.focus();
  });
}
