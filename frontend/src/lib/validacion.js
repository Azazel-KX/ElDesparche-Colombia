/* ==========================================================================
   lib/validacion.js
   Reglas de validación de formularios. Son las mismas que valida el backend (backend/src/utils/validacion*.js).
   ========================================================================== */


export var RE_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export var RE_TELEFONO = /^(3[0-9]{9}|60[0-9]{8})$/;

/* celular (3XX) o fijo (60X), 10 números, sin +57 */
export var RE_NIT = /^[0-9]{9}-[0-9]$/;

export var FORMATO_DOCUMENTO = {
  CC: [/^[0-9]{6,10}$/, "La cédula de ciudadanía lleva de 6 a 10 números."],
  CE: [/^[0-9]{4,10}$/, "La cédula de extranjería lleva de 4 a 10 números."],
  PPT: [/^[0-9]{5,10}$/, "El permiso por protección temporal lleva de 5 a 10 números."],
  NIT: [/^[0-9]{9,10}$/, "El NIT lleva de 9 a 10 números, sin el dígito de verificación."],
  PAS: [/^[A-Z0-9]{5,15}$/, "El pasaporte lleva de 5 a 15 letras o números."]
};

/* "1.234.567-890" o "ab 12345" -> "1234567890" / "AB12345" */
export function documentoNormalizado(texto) {
  return String(texto).toUpperCase().replace(/[\s.\-]/g, "");
}

export function errorCorreo(correo) {
  var texto = String(correo || "").trim();
  if (!texto) return "Escribe tu correo electrónico.";
  if (!RE_CORREO.test(texto) || texto.length > 100) return "Escribe un correo válido, por ejemplo nombre@correo.com.";
  return "";
}

/* Teléfono: celular de 10 números o fijo que empiece por 60. Vacío es válido si es opcional. */
export function errorTelefono(telefono, obligatorio) {
  var texto = String(telefono || "").replace(/\s/g, "");
  if (!texto) return obligatorio ? "Escribe el teléfono." : "";
  if (!RE_TELEFONO.test(texto)) return "El teléfono debe ser un celular de 10 números o un fijo que empiece por 60.";
  return "";
}

export function errorDocumento(tipo, numero) {
  var doc = documentoNormalizado(numero);
  if (!doc) return "Escribe el número de documento.";
  var formato = FORMATO_DOCUMENTO[tipo];
  if (formato && !formato[0].test(doc)) return formato[1];
  return "";
}

export function errorContrasena(clave) {
  if (!clave) return "Escribe una contraseña.";
  if (clave.length < 8) return "La contraseña debe tener 8 caracteres como mínimo.";
  if (clave.length > 72) return "La contraseña no puede superar los 72 caracteres.";
  return "";
}

/* NIT de la empresa con dígito de verificación: 900123456-7 */
export function errorNit(nit) {
  return RE_NIT.test(String(nit || "").trim()) ? "" : "El NIT debe tener el formato 900123456-7.";
}

/* Fecha de nacimiento AAAA-MM-DD: que exista de verdad (no 31 de febrero), sea anterior a hoy y razonable */
export function errorFechaNacimiento(fecha) {
  var texto = String(fecha || "").trim();
  if (!texto) return "Escribe tu fecha de nacimiento.";
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!m) return "Escribe la fecha de nacimiento con formato AAAA-MM-DD.";
  var y = Number(m[1]), mes = Number(m[2]), d = Number(m[3]);
  var f = new Date(y, mes - 1, d);
  if (f.getFullYear() !== y || f.getMonth() !== mes - 1 || f.getDate() !== d) return "Esa fecha no existe en el calendario.";
  if (f >= new Date()) return "La fecha de nacimiento debe ser anterior a hoy.";
  if (y < 1900) return "Revisa el año de nacimiento.";
  return "";
}

/* Ubicación del evento: cualquier punto del planeta, igual que los CHECK de UBICACION en la base */
export function errorLatitud(valor) {
  var lat = Number(String(valor).replace(",", "."));
  if (String(valor).trim() === "" || isNaN(lat) || lat < -90 || lat > 90) {
    return "Marca el punto en el mapa o escribe una latitud entre -90 y 90.";
  }
  return "";
}

export function errorLongitud(valor) {
  var lon = Number(String(valor).replace(",", "."));
  if (String(valor).trim() === "" || isNaN(lon) || lon < -180 || lon > 180) {
    return "Marca el punto en el mapa o escribe una longitud entre -180 y 180.";
  }
  return "";
}
