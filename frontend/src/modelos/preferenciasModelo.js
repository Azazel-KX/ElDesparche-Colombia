/* ==========================================================================
   modelos/preferenciasModelo.js
   Preferencias de la persona que se guardan en el navegador: tamaño del texto.
   ========================================================================== */

/* Control del tamaño del texto.
   Los botones A- y A+ cambian la variable CSS --escala-texto, por la que
   se multiplican TODOS los font-size de la hoja de estilos.

   ¿Por qué no se descuadra la página? Porque las medias consultas
   (@media) miden el ANCHO DE LA PANTALLA, no la letra: las columnas de
   la rejilla siguen siendo 1, 2, 3 o 4 igual que antes. Y las cajas que
   tenían una altura fija (botones, buscador, listas) pasaron a
   min-height, así que crecen hacia abajo en vez de recortar el texto. */

/* Los cinco tamaños disponibles. 1 es el normal. */
export var ESCALAS = [0.9, 1, 1.15, 1.3, 1.5];

export function obtenerEscala() {
  try {
    var guardada = Number(localStorage.getItem("escalaTexto"));
    if (ESCALAS.indexOf(guardada) !== -1) {
      return guardada;
    }
  } catch (e) {
    /* Modo privado o almacenamiento bloqueado: se usa el tamaño normal */
  }
  return 1;
}

export function guardarEscala(escala) {
  try {
    localStorage.setItem("escalaTexto", String(escala));
  } catch (e) {
    /* Si no se puede guardar, el cambio igual funciona en esta página */
  }
}
