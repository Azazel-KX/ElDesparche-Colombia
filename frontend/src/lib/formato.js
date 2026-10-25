/* ==========================================================================
   lib/formato.js
   Formato de texto y números: escape contra XSS, pesos y búsquedas sin tildes.
   ========================================================================== */

/* Escapar: todo dato que viene del usuario o de la base debe pasar por escapar() antes
   de armarse dentro de un innerHTML. Para solo mostrar texto es más simple
   textContent. */
export function escapar(valor) {
  if (valor === undefined || valor === null) {
    return "";
  }
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* Una URL de imagen solo se usa si es de la propia web o http(s): nunca javascript: ni data:text */
export function urlSegura(url, respaldo) {
  var texto = String(url || "");
  if (/^(https?:\/\/|\/|img\/)/i.test(texto) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(texto)) {
    return texto;
  }
  return respaldo || "img/evento-sin-foto.svg";
}

export var pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export var numero = new Intl.NumberFormat("es-CO");

export var compacto = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

export var pesosCompacto = new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", notation: "compact", maximumFractionDigits: 1
});

/* Convierte un número a pesos: 165000 -> "$165.000 COP" */
export function textoPesos(numero) {
  return "$" + numero.toLocaleString("es-CO") + " COP";
}

export function textoPrecio(precio) {
  return precio === 0 ? "Gratis" : pesos.format(precio);
}

export function normalizar(texto) {
  return String(texto).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/* Preguntas frecuentes: el buscador filtra mientras se escribe y un enlace
   con #id-de-pregunta llega con esa respuesta ya abierta */
export function sinTildes(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
