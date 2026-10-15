// Validación de datos del usuario (registro y login)
//
// FLUJO:
// 1. Usuario envía datos al frontend
// 2. Frontend envía a /api/auth/registrar o /api/auth/iniciarSesion
// 3. Validamos ANTES de tocar la BD (así evitamos consultas innecesarias)
// 4. Si hay errores, devolvemos { errores: { campo: "mensaje" } }
// 5. Si todo OK, devolvemos { datos: {...} }
//
// ¿Por qué validar aquí y no solo en la BD?
// - Respuestas más rápidas (sin ir a BD)
// - Mensajes claros en español
// - Seguridad: rechazamos valores imposibles temprano

// Tipos de identificación válidos en Colombia
const TIPOS_IDENTIFICACION = ["CC", "CE", "PAS", "PPT", "NIT"];
const TIPOS_CUENTA = ["CLIENTE", "EMPRESA"]; // ADMIN no se auto-registra

// Expresiones regulares para validar cada tipo de ID
const REGLAS_IDENTIFICACION = {
  CC: /^[0-9]{6,10}$/,        // Cédula de ciudadanía: 6-10 dígitos
  CE: /^[0-9]{6,10}$/,        // Cédula de extranjería: 6-10 dígitos
  PPT: /^[0-9]+$/,            // Pasaporte temporal: números
  PAS: /^[A-Za-z0-9]{5,20}$/, // Pasaporte: 5-20 caracteres alfanuméricos
  NIT: /^[0-9]{9}$/,          // NIT de empresa: 9 dígitos
};

// Regex para validar otros campos
const RE_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const RE_TELEFONO = /^(3[0-9]{9}|60[1-8][0-9]{7})$/; // Celular (31...) o fijo (601-608)
const RE_NIT = /^[0-9]{9}-[0-9]$/;                    // Formato NIT: 123456789-0
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;              // Formato fecha: YYYY-MM-DD

// Constante: contraseña mínima (8 caracteres)
const LONGITUD_MIN_CONTRASENA = 8;

// Función auxiliar: convierte un valor a string seguro
// Si no es string, devuelve ""
// Si es string, elimina espacios al inicio/final
function texto(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

// Función auxiliar: convierte un valor a número (nullable)
// Si es vacío/null, devuelve null
// Si no es un número, devuelve NaN
function numeroOpcional(valor) {
  if (valor === undefined || valor === null || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : NaN;
}

// Valida que la contraseña sea segura
// Reglas:
// 1. Mínimo 8 caracteres
// 2. Máximo 72 caracteres (bcrypt trunca después de eso)
function validarContrasena(contrasena, errores) {
  if (typeof contrasena !== "string" || contrasena.length < LONGITUD_MIN_CONTRASENA) {
    errores.contrasena = `La contraseña debe tener al menos ${LONGITUD_MIN_CONTRASENA} caracteres.`;
  } else if (contrasena.length > 72) {
    // Rechazamos en vez de truncar silenciosamente
    // Si el usuario usa una contraseña de 100 caracteres, es mejor que sepa que solo se guardan 72
    errores.contrasena = "La contraseña no puede superar los 72 caracteres.";
  }
}

// Valida los datos de REGISTRO
// Retorna: { datos } si todo OK
//          { errores: { campo: "mensaje" } } si hay problemas
function validarRegistro(body) {
  const b = body || {};
  const errores = {};

  // 1. Validar tipo de cuenta (CLIENTE o EMPRESA)
  const tipo_cuenta = texto(b.tipo_cuenta).toUpperCase();
  if (!TIPOS_CUENTA.includes(tipo_cuenta)) {
    errores.tipo_cuenta = "El tipo de cuenta debe ser CLIENTE o EMPRESA.";
  }

  // 2. Validar identificación (CC, CE, PAS, PPT, NIT)
  const tipo_identificacion = texto(b.tipo_identificacion).toUpperCase();
  const numero_identificacion = texto(b.numero_identificacion);
  if (!TIPOS_IDENTIFICACION.includes(tipo_identificacion)) {
    errores.tipo_identificacion = `El tipo de identificación debe ser uno de: ${TIPOS_IDENTIFICACION.join(", ")}.`;
  } else if (!REGLAS_IDENTIFICACION[tipo_identificacion].test(numero_identificacion)) {
    // Cada tipo tiene su propio formato (CC: 6-10 dígitos, PAS: 5-20 alfanuméricos, etc.)
    errores.numero_identificacion = `El número no es válido para el tipo ${tipo_identificacion}.`;
  }

  // 3. Nombres y apellidos (obligatorios, máximo 60 caracteres cada uno)
  const nombres = texto(b.nombres);
  const apellidos = texto(b.apellidos);
  if (!nombres || nombres.length > 60) errores.nombres = "Escribe tus nombres (máximo 60 caracteres).";
  if (!apellidos || apellidos.length > 60) errores.apellidos = "Escribe tus apellidos (máximo 60 caracteres).";

  // 4. Correo electrónico (obligatorio, máximo 100 caracteres)
  const correo = texto(b.correo).toLowerCase();
  if (!RE_CORREO.test(correo) || correo.length > 100) errores.correo = "Escribe un correo electrónico válido.";

  // 5. Contraseña (8-72 caracteres)
  validarContrasena(b.contrasena, errores);

  // 6. Dirección (obligatoria, máximo 150 caracteres)
  const direccion = texto(b.direccion);
  if (!direccion || direccion.length > 150) errores.direccion = "Escribe tu dirección (máximo 150 caracteres).";

  // 7. Ciudad (obligatoria, debe ser número positivo)
  const id_ciudad = Number(b.id_ciudad);
  if (!Number.isInteger(id_ciudad) || id_ciudad <= 0) errores.id_ciudad = "Elige una ciudad válida.";

  // 8. Teléfono (opcional, pero si se envía debe ser válido)
  const telefono = texto(b.telefono);
  if (telefono && !RE_TELEFONO.test(telefono)) {
    errores.telefono = "El teléfono debe ser un celular (3XXXXXXXXX) o fijo (60X + 7 dígitos).";
  }

  // 9. Coordenadas (opcional, pero si se envían deben ser números válidos dentro de Colombia)
  const latitud = numeroOpcional(b.latitud);
  const longitud = numeroOpcional(b.longitud);
  if (Number.isNaN(latitud) || Number.isNaN(longitud) || (latitud === null) !== (longitud === null)) {
    errores.coordenadas = "Si envías coordenadas deben ser latitud y longitud numéricas.";
  } else if (latitud !== null && (latitud < -4.3 || latitud > 13.6 || longitud < -82 || longitud > -66.8)) {
    errores.coordenadas = "Las coordenadas deben estar dentro de Colombia.";
  }

  // Construir datos validados
  const datos = {
    tipo_cuenta, tipo_identificacion, numero_identificacion, nombres, apellidos,
    correo, contrasena: b.contrasena, direccion, id_ciudad,
    telefono: telefono || null, latitud, longitud,
  };

  // Validaciones ESPECÍFICAS para CLIENTE
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
    if (alias.length > 30) errores.alias = "El alias no puede superar los 30 caracteres.";
    datos.alias = alias || null;
  }

  // Validaciones ESPECÍFICAS para EMPRESA
  if (tipo_cuenta === "EMPRESA") {
    const nit = texto(b.nit);
    if (!RE_NIT.test(nit)) errores.nit = "El NIT debe tener el formato 123456789-0.";
    const razon_social = texto(b.razon_social);
    const nombre_comercial = texto(b.nombre_comercial);
    if (!razon_social || razon_social.length > 120) errores.razon_social = "Escribe la razón social (máximo 120 caracteres).";
    if (!nombre_comercial || nombre_comercial.length > 100) errores.nombre_comercial = "Escribe el nombre comercial (máximo 100 caracteres).";
    datos.nit = nit;
    datos.razon_social = razon_social;
    datos.nombre_comercial = nombre_comercial;
    datos.descripcion = texto(b.descripcion) || null;
  }

  // Retornar: si hay errores, devuelverlos; si no, devolver los datos validados
  return Object.keys(errores).length ? { errores } : { datos };
}

// Valida los datos de LOGIN (mucho más simple que registro)
// Solo necesita: correo y contraseña
// Retorna: { datos } si todo OK
//          { errores: { campo: "mensaje" } } si hay problemas
function validarLogin(body) {
  const b = body || {};
  const errores = {};
  const correo = texto(b.correo).toLowerCase();

  // Validar que haya correo
  if (!correo) errores.correo = "Escribe tu correo electrónico.";

  // Validar que haya contraseña
  if (typeof b.contrasena !== "string" || !b.contrasena) errores.contrasena = "Escribe tu contraseña.";

  // Retornar
  return Object.keys(errores).length ? { errores } : { datos: { correo, contrasena: b.contrasena } };
}

module.exports = { validarRegistro, validarLogin, LONGITUD_MIN_CONTRASENA };
