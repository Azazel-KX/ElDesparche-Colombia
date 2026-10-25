/* ==========================================================================
   lib/dom.js
   Ayudas del navegador que no pertenecen a una vista concreta: foco, animación de aparición, contadores e imágenes.
   ========================================================================== */

export var reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Devuelve el foco a un elemento después de cerrar una ventana. En admin.html
   la sección puede haber cambiado entretanto (botón atrás del navegador) y el
   elemento ya no existir; entonces no hace nada. */
export function enfocarSiExiste(id) {
  var elemento = document.getElementById(id);
  if (elemento) elemento.focus();
}

/* Añade la clase "visible" cuando la tarjeta entra en pantalla: es la que
   arranca las animaciones del CSS */
export function animarAlVer(elemento) {
  if (reducirMovimiento || !("IntersectionObserver" in window)) {
    elemento.classList.add("visible");
    return;
  }

  var observador = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
      if (entrada.isIntersecting) {
        requestAnimationFrame(function () { elemento.classList.add("visible"); });
        observador.disconnect();
      }
    });
  }, { threshold: 0.25 });

  observador.observe(elemento);
}

/* Cuenta desde 0 hasta el valor final */
export function contar(elemento, final, formato) {
  if (reducirMovimiento) {
    elemento.textContent = formato(final);
    return;
  }

  var inicio = null;
  var duracion = 1100;

  function paso(tiempo) {
    if (inicio === null) inicio = tiempo;
    var avance = Math.min((tiempo - inicio) / duracion, 1);
    var suave = 1 - Math.pow(1 - avance, 3);
    elemento.textContent = formato(Math.round(final * suave));
    if (avance < 1) requestAnimationFrame(paso);
  }

  requestAnimationFrame(paso);
}

/* Lee un parámetro de la dirección: evento.html?id=3 -> "3" */
export function parametro(nombre) {
  var direccion = new URLSearchParams(window.location.search);
  return direccion.get(nombre);
}

/* Reduce la imagen a "maximo" px de ancho (1000 si no se indica), en JPEG,
   para que quepa en el navegador y pese poco cuando se suba al servidor */
export function reducirImagen(archivo, maximo) {
  return new Promise(function (resolver, rechazar) {
    var lector = new FileReader();
    lector.onerror = function () { rechazar(new Error("No se pudo leer la imagen.")); };
    lector.onload = function () {
      var imagen = new Image();
      imagen.onerror = function () { rechazar(new Error("El archivo no es una imagen válida.")); };
      imagen.onload = function () {
        var escala = Math.min(1, (maximo || 1000) / imagen.width);
        var lienzo = document.createElement("canvas");
        lienzo.width = Math.round(imagen.width * escala);
        lienzo.height = Math.round(imagen.height * escala);
        lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
        resolver(lienzo.toDataURL("image/jpeg", 0.8));
      };
      imagen.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}
