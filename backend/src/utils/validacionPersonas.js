// Validación de los formularios de personas de los paneles: agentes, clientes y administradores.
// Los campos se llaman como los manda la web (frontend/js/admin.js): tipoDoc, documento, nombres, apellidos, correo,
// telefono, direccion, ciudad (por su nombre)... Las reglas espejan las de la base y de validacion.js.

const {
  texto, normalizarDocumento, TIPOS_IDENTIFICACION, REGLAS_IDENTIFICACION, RE_CORREO, RE_TELEFONO, RE_NIT, RE_FECHA,
} = require("./validacion");

const HORARIOS = ["Mañana", "Tarde", "Noche", "Completa"];
const ESTADOS_AGENTE = ["Activo", "Pendiente", "Suspendido"];
const ESTADOS_CLIENTE = ["Activa", "Bloqueada"];

const vacio = (v) => v === undefined || v === null || v === "";

// Datos comunes de una persona. nuevo = se registra (pide documento y contraseña); si no, el documento no cambia.
function datosPersona(b, errores, nuevo) {
  const d = {};

  if (nuevo) {
    d.tipoDoc = texto(b.tipoDoc).toUpperCase();
    d.documento = normalizarDocumento(b.documento);
    if (!TIPOS_IDENTIFICACION.includes(d.tipoDoc)) {
      errores.tipoDoc = `El tipo de documento debe ser uno de: ${TIPOS_IDENTIFICACION.join(", ")}.`;
    } else if (!REGLAS_IDENTIFICACION[d.tipoDoc].test(d.documento)) {
      errores.documento = `El número no es válido para el tipo ${d.tipoDoc}.`;
    }
    const contrasena = typeof b.contrasena === "string" ? b.contrasena : "";
    if (contrasena.length < 8) errores.contrasena = "La contraseña debe tener al menos 8 caracteres.";
    else if (contrasena.length > 72) errores.contrasena = "La contraseña no puede superar los 72 caracteres.";
    d.contrasena = contrasena;
  }

  d.nombres = texto(b.nombres);
  d.apellidos = texto(b.apellidos);
  if (!d.nombres || d.nombres.length > 80) errores.nombres = "Escribe los nombres (máximo 80 caracteres).";
  if (!d.apellidos || d.apellidos.length > 80) errores.apellidos = "Escribe los apellidos (máximo 80 caracteres).";

  d.correo = texto(b.correo).toLowerCase();
  if (!RE_CORREO.test(d.correo) || d.correo.length > 100) errores.correo = "Escribe un correo válido, por ejemplo nombre@correo.com.";

  d.telefono = texto(b.telefono).replace(/\s/g, "");
  if (d.telefono && !RE_TELEFONO.test(d.telefono)) {
    errores.telefono = "El teléfono debe ser un celular de 10 números o un fijo que empiece por 60.";
  }

  d.direccion = texto(b.direccion);
  if (!d.direccion || d.direccion.length > 200) errores.direccion = "Escribe la dirección (máximo 200 caracteres).";

  d.ciudad = texto(b.ciudad);
  if (!d.ciudad) errores.ciudad = "Elige la ciudad.";

  return d;
}

const resultado = (d, errores) => (Object.keys(errores).length ? { errores } : { datos: d });

// Agente: la empresa (nit, razon, nombre, ...) y su representante (los datos de persona)
function validarAgente(body, { nuevo }) {
  const b = body && typeof body === "object" ? body : {};
  const errores = {};
  const d = datosPersona(b, errores, nuevo);

  d.nit = texto(b.nit);
  if (nuevo && !RE_NIT.test(d.nit)) errores.nit = "El NIT debe tener el formato 900123456-7.";
  d.razon = texto(b.razon);
  if (!d.razon || d.razon.length > 150) errores.razon = "Escribe la razón social (máximo 150 caracteres).";
  d.nombre = texto(b.nombre);
  if (!d.nombre || d.nombre.length > 150) errores.nombre = "Escribe el nombre comercial (máximo 150 caracteres).";

  d.experiencia = vacio(b.experiencia) ? 0 : Number(b.experiencia);
  if (!Number.isInteger(d.experiencia) || d.experiencia < 0 || d.experiencia > 100) {
    errores.experiencia = "Los años de experiencia deben ser un número entero de 0 en adelante.";
  }
  d.comision = Number(String(vacio(b.comision) ? "" : b.comision).replace(",", "."));
  if (vacio(b.comision) || !Number.isFinite(d.comision) || d.comision < 0 || d.comision > 100) {
    errores.comision = "La comisión debe ser un número de 0 a 100.";
  }
  d.descripcion = texto(b.descripcion) || null;

  if (nuevo) {
    d.estado = vacio(b.estado) ? "Activo" : texto(b.estado);
    if (!ESTADOS_AGENTE.includes(d.estado)) errores.estado = `El estado debe ser uno de: ${ESTADOS_AGENTE.join(", ")}.`;
  }
  return resultado(d, errores);
}

// Cliente
function validarCliente(body, { nuevo, ahora = new Date() }) {
  const b = body && typeof body === "object" ? body : {};
  const errores = {};
  const d = datosPersona(b, errores, nuevo);

  d.nacimiento = texto(b.nacimiento);
  if (!RE_FECHA.test(d.nacimiento) || Number.isNaN(Date.parse(d.nacimiento))) {
    errores.nacimiento = "Escribe la fecha de nacimiento con formato AAAA-MM-DD.";
  } else if (new Date(d.nacimiento) >= ahora) {
    errores.nacimiento = "La fecha de nacimiento debe ser anterior a hoy.";
  }

  d.alias = texto(b.alias) || null;
  if (d.alias && d.alias.length > 40) errores.alias = "El alias no puede superar los 40 caracteres.";

  d.puntos = vacio(b.puntos) ? 0 : Number(b.puntos);
  if (!Number.isInteger(d.puntos) || d.puntos < 0) errores.puntos = "Los puntos deben ser un número entero de 0 en adelante.";

  if (vacio(b.publicidad)) d.publicidad = true;
  else if (typeof b.publicidad === "boolean") d.publicidad = b.publicidad;
  else errores.publicidad = "La preferencia de publicidad debe ser verdadero o falso.";

  return resultado(d, errores);
}

// Administrador
function validarAdministrador(body, { nuevo }) {
  const b = body && typeof body === "object" ? body : {};
  const errores = {};
  const d = datosPersona(b, errores, nuevo);

  d.salario = vacio(b.salario) ? NaN : Number(b.salario);
  if (!Number.isFinite(d.salario) || d.salario < 0) errores.salario = "El salario debe ser un número de 0 en adelante.";
  d.horario = texto(b.horario);
  if (!HORARIOS.includes(d.horario)) errores.horario = `El horario debe ser uno de: ${HORARIOS.join(", ")}.`;

  return resultado(d, errores);
}

// El propio agente edita el perfil de su empresa: { nombre, descripcion, logo, correo, telefono, ciudad, experiencia }.
// "logo" llega como imagen en data URL (o una URL); si no llega, se conserva el que tiene.
function validarPerfilAgente(body) {
  const b = body && typeof body === "object" ? body : {};
  const errores = {};
  const d = {};

  d.nombre = texto(b.nombre);
  if (!d.nombre || d.nombre.length > 150) errores.nombre = "Escribe el nombre comercial (máximo 150 caracteres).";
  d.descripcion = texto(b.descripcion) || null;
  if (d.descripcion && d.descripcion.length > 3000) errores.descripcion = "La descripción no puede superar los 3000 caracteres.";
  d.correo = texto(b.correo).toLowerCase();
  if (!RE_CORREO.test(d.correo) || d.correo.length > 100) errores.correo = "Escribe un correo válido, por ejemplo nombre@correo.com.";
  d.telefono = texto(b.telefono).replace(/\s/g, "");
  if (d.telefono && !RE_TELEFONO.test(d.telefono)) errores.telefono = "El teléfono debe ser un celular de 10 números o un fijo que empiece por 60.";
  d.ciudad = texto(b.ciudad);
  if (!d.ciudad) errores.ciudad = "Elige la ciudad.";
  d.experiencia = vacio(b.experiencia) ? 0 : Number(b.experiencia);
  if (!Number.isInteger(d.experiencia) || d.experiencia < 0 || d.experiencia > 100) errores.experiencia = "Los años de experiencia deben ser un número entero de 0 en adelante.";
  d.logo = typeof b.logo === "string" ? b.logo : null;

  return resultado(d, errores);
}

// Cambio de estado de una cuenta. Agentes: Activo | Pendiente | Suspendido. Clientes: Activa | Bloqueada.
function validarEstadoCuenta(body, permitidos) {
  const estado = texto(body && body.estado);
  return permitidos.includes(estado)
    ? { datos: { estado } }
    : { errores: { estado: `El estado debe ser uno de: ${permitidos.join(", ")}.` } };
}

module.exports = {
  HORARIOS, ESTADOS_AGENTE, ESTADOS_CLIENTE,
  validarAgente, validarCliente, validarAdministrador, validarPerfilAgente, validarEstadoCuenta,
};
