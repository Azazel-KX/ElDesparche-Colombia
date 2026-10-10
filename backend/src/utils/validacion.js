// Validación de la entrada de /api/auth. Devuelve { datos } o { errores: { campo: mensaje } }.
// Las reglas espejan los CHECK de database/schema.sql para dar mensajes claros antes de llegar a la BD.

const TIPOS_IDENTIFICACION = ["CC", "CE", "PAS", "PPT", "NIT"];
const TIPOS_CUENTA = ["CLIENTE", "EMPRESA"]; // el ADMIN no se auto-registra

const REGLAS_IDENTIFICACION = {
  CC: /^[0-9]{6,10}$/,
  CE: /^[0-9]{6,10}$/,
  PPT: /^[0-9]+$/,
  PAS: /^[A-Za-z0-9]{5,20}$/,
  NIT: /^[0-9]{9}$/,
};

const RE_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const RE_TELEFONO = /^(3[0-9]{9}|60[1-8][0-9]{7})$/;
const RE_NIT = /^[0-9]{9}-[0-9]$/;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const LONGITUD_MIN_CONTRASENA = 8;

// Lista blanca de caracteres para los textos que luego se muestran en pantalla.
// Quita de raíz los símbolos < > " & que sirven para inyectar HTML; el frontend
// además escapa todo lo que pinta (defensa en capas).
const RE_PERSONA = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u; // nombres y apellidos
const RE_ALIAS = /^[\p{L}\p{N}_.-]+$/u;
const RE_NOMBRE_EMPRESA = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}\s.,&'’()-]*$/u;
const RE_DIRECCION = /^[\p{L}\p{N}\s#.,°ºª/'’-]+$/u;

function texto(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

function numeroOpcional(valor) {
  if (valor === undefined || valor === null || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : NaN;
}

function validarContrasena(contrasena, errores) {
  if (typeof contrasena !== "string" || contrasena.length < LONGITUD_MIN_CONTRASENA) {
    errores.contrasena = `La contraseña debe tener al menos ${LONGITUD_MIN_CONTRASENA} caracteres.`;
  } else if (contrasena.length > 72) {
    // bcrypt solo usa los primeros 72 bytes: se rechaza en vez de truncar en silencio.
    errores.contrasena = "La contraseña no puede superar los 72 caracteres.";
  }
}

function validarRegistro(body) {
  const b = body || {};
  const errores = {};

  const tipo_cuenta = texto(b.tipo_cuenta).toUpperCase();
  if (!TIPOS_CUENTA.includes(tipo_cuenta)) {
    errores.tipo_cuenta = "El tipo de cuenta debe ser CLIENTE o EMPRESA.";
  }

  const tipo_identificacion = texto(b.tipo_identificacion).toUpperCase();
  const numero_identificacion = texto(b.numero_identificacion);
  if (!TIPOS_IDENTIFICACION.includes(tipo_identificacion)) {
    errores.tipo_identificacion = `El tipo de identificación debe ser uno de: ${TIPOS_IDENTIFICACION.join(", ")}.`;
  } else if (!REGLAS_IDENTIFICACION[tipo_identificacion].test(numero_identificacion)) {
    errores.numero_identificacion = `El número no es válido para el tipo ${tipo_identificacion}.`;
  }

  const nombres = texto(b.nombres);
  const apellidos = texto(b.apellidos);
  if (!nombres || nombres.length > 60 || !RE_PERSONA.test(nombres)) {
    errores.nombres = "Escribe tus nombres (solo letras, espacios, punto, apóstrofe o guion; máximo 60).";
  }
  if (!apellidos || apellidos.length > 60 || !RE_PERSONA.test(apellidos)) {
    errores.apellidos = "Escribe tus apellidos (solo letras, espacios, punto, apóstrofe o guion; máximo 60).";
  }

  const correo = texto(b.correo).toLowerCase();
  if (!RE_CORREO.test(correo) || correo.length > 100) errores.correo = "Escribe un correo electrónico válido.";

  validarContrasena(b.contrasena, errores);

  const direccion = texto(b.direccion);
  if (!direccion || direccion.length > 150 || !RE_DIRECCION.test(direccion)) {
    errores.direccion = "Escribe una dirección válida (letras, números, # . , - /; máximo 150).";
  }

  const id_ciudad = Number(b.id_ciudad);
  if (!Number.isInteger(id_ciudad) || id_ciudad <= 0) errores.id_ciudad = "Elige una ciudad válida.";

  const telefono = texto(b.telefono);
  if (telefono && !RE_TELEFONO.test(telefono)) {
    errores.telefono = "El teléfono debe ser un celular (3XXXXXXXXX) o fijo (60X + 7 dígitos).";
  }

  const latitud = numeroOpcional(b.latitud);
  const longitud = numeroOpcional(b.longitud);
  if (Number.isNaN(latitud) || Number.isNaN(longitud) || (latitud === null) !== (longitud === null)) {
    errores.coordenadas = "Si envías coordenadas deben ser latitud y longitud numéricas.";
  } else if (latitud !== null && (latitud < -4.3 || latitud > 13.6 || longitud < -82 || longitud > -66.8)) {
    errores.coordenadas = "Las coordenadas deben estar dentro de Colombia.";
  }

  const datos = {
    tipo_cuenta, tipo_identificacion, numero_identificacion, nombres, apellidos,
    correo, contrasena: b.contrasena, direccion, id_ciudad,
    telefono: telefono || null, latitud, longitud,
  };

  if (tipo_cuenta === "CLIENTE") {
    const fecha = texto(b.fecha_nacimiento);
    const fechaValida = RE_FECHA.test(fecha) && !Number.isNaN(Date.parse(fecha));
    if (!fechaValida) {
      errores.fecha_nacimiento = "Escribe tu fecha de nacimiento con formato AAAA-MM-DD.";
    } else if (new Date(fecha) >= new Date()) {
      errores.fecha_nacimiento = "La fecha de nacimiento debe ser anterior a hoy.";
    }
    datos.fecha_nacimiento = fecha;
    const alias = texto(b.alias);
    if (alias && (alias.length > 30 || !RE_ALIAS.test(alias))) {
      errores.alias = "El alias solo admite letras, números, _ . - y hasta 30 caracteres.";
    }
    datos.alias = alias || null;
  }

  if (tipo_cuenta === "EMPRESA") {
    const nit = texto(b.nit);
    if (!RE_NIT.test(nit)) errores.nit = "El NIT debe tener el formato 123456789-0.";
    const razon_social = texto(b.razon_social);
    const nombre_comercial = texto(b.nombre_comercial);
    if (!razon_social || razon_social.length > 120 || !RE_NOMBRE_EMPRESA.test(razon_social)) {
      errores.razon_social = "Escribe la razón social (letras, números y . , & ( ) -; máximo 120).";
    }
    if (!nombre_comercial || nombre_comercial.length > 100 || !RE_NOMBRE_EMPRESA.test(nombre_comercial)) {
      errores.nombre_comercial = "Escribe el nombre comercial (letras, números y . , & ( ) -; máximo 100).";
    }
    const descripcion = texto(b.descripcion);
    if (descripcion.length > 1000) errores.descripcion = "La descripción no puede superar los 1000 caracteres.";
    datos.nit = nit;
    datos.razon_social = razon_social;
    datos.nombre_comercial = nombre_comercial;
    datos.descripcion = descripcion || null;
  }

  return Object.keys(errores).length ? { errores } : { datos };
}

function validarLogin(body) {
  const b = body || {};
  const errores = {};
  const correo = texto(b.correo).toLowerCase();
  if (!correo) errores.correo = "Escribe tu correo electrónico.";
  if (typeof b.contrasena !== "string" || !b.contrasena) errores.contrasena = "Escribe tu contraseña.";
  return Object.keys(errores).length ? { errores } : { datos: { correo, contrasena: b.contrasena } };
}

module.exports = { validarRegistro, validarLogin, LONGITUD_MIN_CONTRASENA };
