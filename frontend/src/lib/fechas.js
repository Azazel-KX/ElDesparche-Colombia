/* ==========================================================================
   lib/fechas.js
   Fechas: textos legibles, edad y meses.
   ========================================================================== */

/* "2026-12-05T19:00" -> "5 de diciembre de 2026, 7:00 p. m." */
export function fechaLegible(valor) {
  var fecha = new Date(valor);
  if (isNaN(fecha)) return String(valor);
  return fecha.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) + ", " +
    fecha.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

/* Fecha corta para "Enviado el": "15 oct 2026, 9:24 a. m." */
export function fechaEnvio(valor) {
  var fecha = new Date(valor);
  if (isNaN(fecha)) return String(valor);
  var meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return fecha.getDate() + " " + meses[fecha.getMonth()] + " " + fecha.getFullYear() + ", " +
    fecha.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

export function fechaLarga(iso) {
  var partes = iso.split("-");
  return new Date(partes[0], partes[1] - 1, partes[2]).toLocaleDateString("es-CO", {
    day: "numeric", month: "long", year: "numeric"
  });
}

export function fechaHora(iso) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit"
  });
}

function dosCifras(n) {
  return (n < 10 ? "0" : "") + n;
}

/* "20 de marzo de 2027 - 4:00 p. m." -> "2027-03-20T16:00" (fechas de los eventos de ejemplo) */
var MESES_TEXTO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function fechaTextoAIso(texto) {
  var limpio = String(texto || "").replace(/[\u00a0\u202f]/g, " ").toLowerCase();
  var m = /(\d{1,2}) de ([a-záéíóú]+) de (\d{4})\s*-\s*(\d{1,2}):(\d{2})\s*([ap])\.?\s*m/.exec(limpio);
  if (!m) return "";
  var mes = MESES_TEXTO.indexOf(m[2]) + 1;
  if (!mes) return "";
  var dos = function (n) { return (n < 10 ? "0" : "") + n; };
  var hora = Number(m[4]) % 12 + (m[6] === "p" ? 12 : 0);
  return m[3] + "-" + dos(mes) + "-" + dos(Number(m[1])) + "T" + dos(hora) + ":" + m[5];
}

/* Años cumplidos en una fecha (la del evento), como age() en la base de datos */
export function edadEn(nacimiento, fecha) {
  var n = String(nacimiento).split("-").map(Number);
  var f = fecha instanceof Date ? fecha : new Date(fecha);
  var anios = f.getFullYear() - n[0];
  if (f.getMonth() + 1 < n[1] || (f.getMonth() + 1 === n[1] && f.getDate() < n[2])) anios--;
  return anios;
}

export function edad(nacimiento) {
  var partes = nacimiento.split("-");
  var hoy = new Date();
  var anios = hoy.getFullYear() - Number(partes[0]);
  var mes = hoy.getMonth() + 1 - Number(partes[1]);
  if (mes < 0 || (mes === 0 && hoy.getDate() < Number(partes[2]))) anios--;
  return anios;
}

var NOMBRE_MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function ultimosMeses(cantidad) {
  var lista = [];
  var hoy = new Date();
  for (var i = cantidad - 1; i >= 0; i--) {
    var fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    lista.push(NOMBRE_MES[fecha.getMonth()] + " " + String(fecha.getFullYear()).slice(2));
  }
  return lista;
}

/* Fecha y hora actual en el formato de <input type="datetime-local"> */
export function ahoraLocal() {
  var ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
  return ahora.toISOString().slice(0, 16);
}
