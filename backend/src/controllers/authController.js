const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { jwt: jwtConfig } = require("../config/env");
const usuarioModel = require("../models/usuarioModel");
const { validarRegistro, validarLogin } = require("../utils/validacion");
const { ErrorHttp, asincrono } = require("../utils/errores");

const RONDAS_BCRYPT = 10; // Costo: más alto = más lento (pero más seguro)

// HASH_FALSO: estrategia de seguridad importante
// ¿Por qué?
// - Si un atacante intenta login: "usuario_inexistente@example.com"
// - Sin HASH_FALSO: la respuesta sería rápida ("Usuario no existe")
// - Con HASH_FALSO: comparamos contra un hash falso, tarda lo mismo
// - El atacante NO puede adivinar qué correos están registrados
const HASH_FALSO = bcrypt.hashSync("contrasena-que-nadie-usa", RONDAS_BCRYPT);

// Función auxiliar: FIRMAR un JWT
//
// CONTENIDO del token:
// - rol: tipo_usuario (CLIENTE, AGENTE, ADMIN) - para autorización
// - subject: numero_identificacion - quién es
// - expiresIn: 2 horas - cuándo caduca
//
// SEGURIDAD:
// - Firmado con JWT_SECRET (solo el servidor lo sabe)
// - Si alguien modifica el token, la firma no coincide → rechazamos
function firmarToken(usuario) {
  return jwt.sign(
    { rol: usuario.tipo_usuario },
    jwtConfig.secret,
    {
      subject: usuario.numero_identificacion,
      expiresIn: jwtConfig.expiresIn,
      algorithm: "HS256"
    }
  );
}

// Función auxiliar: convertir usuario a datos PÚBLICOS
//
// ¿Por qué?
// - Nunca devolvemos TODOS los datos del usuario (seguridad)
// - Solo devolvemos: ID, nombre completo, correo, tipo
// - NO devolvemos: contrasena_hash, tokens, datos sensibles
function usuarioPublico(u) {
  return {
    numero_identificacion: u.numero_identificacion,
    nombre_completo: u.nombre_completo,
    correo: u.correo,
    tipo_usuario: u.tipo_usuario,
  };
}

// Controlador: REGISTRAR un nuevo usuario
//
// FLUJO:
// 1. Validar datos (usando validación.js)
// 2. Hashear contraseña (¡NUNCA guardar original!)
// 3. Crear usuario en BD (con transacción)
// 4. Leer el perfil recién creado
// 5. Devolver token JWT + datos públicos
async function registrar(req, res) {
  // Paso 1: Validar
  const { datos, errores } = validarRegistro(req.body);
  if (errores) throw new ErrorHttp(400, "Datos de registro inválidos.", errores);

  // Paso 2: Hashear contraseña
  // ¿Por qué await?
  // - bcrypt.hash es lento a propósito (seguridad)
  // - tarda ~100ms en hashear la contraseña
  datos.contrasena_hash = await bcrypt.hash(datos.contrasena, RONDAS_BCRYPT);
  delete datos.contrasena; // ⚠️ ELIMINAR original, guardar solo el hash

  // Paso 3: Crear usuario en BD (transacción automática)
  await usuarioModel.crear(datos);

  // Paso 4: Obtener perfil completo del usuario recién creado
  const usuario = await usuarioModel.perfilPorId(datos.numero_identificacion);

  // Paso 5: Devolver token + usuario público (201 = Created)
  res.status(201).json({
    token: firmarToken(usuario),
    usuario: usuarioPublico(usuario)
  });
}

// Controlador: INICIAR SESIÓN
//
// FLUJO:
// 1. Validar que correo y contraseña vengan en el request
// 2. Buscar usuario por correo
// 3. Comparar contraseña (contra hash guardado O hash falso)
// 4. Devolver token JWT + datos públicos
async function iniciarSesion(req, res) {
  // Paso 1: Validar datos básicos
  const { datos, errores } = validarLogin(req.body);
  if (errores) throw new ErrorHttp(400, "Datos de inicio de sesión inválidos.", errores);

  // Paso 2: Buscar usuario por correo
  const usuario = await usuarioModel.buscarPorCorreo(datos.correo);

  // Paso 3: Comparar contraseña
  // ¿Por qué contra HASH_FALSO si no existe?
  // - Evitamos que se pueda adivinar qué correos están registrados
  // - Usuario existe → compara contra su hash
  // - Usuario NO existe → compara contra hash falso (tarda lo mismo)
  const coincide = await bcrypt.compare(
    datos.contrasena,
    usuario ? usuario.contrasena_hash : HASH_FALSO
  );

  // Paso 4: Verificar resultado
  if (!usuario || !coincide) {
    throw new ErrorHttp(401, "Correo o contraseña incorrectos.");
  }

  // Paso 5: Devolver token + usuario público
  res.json({
    token: firmarToken(usuario),
    usuario: usuarioPublico(usuario)
  });
}

// Controlador: OBTENER MI PERFIL
//
// ¿Cuándo se usa?
// - Frontend hace: GET /api/auth/mi-perfil + header Authorization: Bearer <token>
// - req.usuario viene del middleware requiereToken (ya validó el JWT)
//
// ¿Por qué necesitamos esto?
// - El JWT tiene el ID, pero los datos pueden cambiar (usuario podría borrarse)
// - Verificamos que el usuario siga existiendo
// - Devolvemos su perfil completo actualizado
async function miPerfil(req, res) {
  // req.usuario.id viene del middleware (decriptó el JWT)
  const perfil = await usuarioModel.perfilPorId(req.usuario.id);

  // Si no existe, probablemente fue eliminado
  if (!perfil) throw new ErrorHttp(404, "El usuario ya no existe.");

  // Devolver perfil completo
  res.json({ usuario: perfil });
}

module.exports = { registrar, iniciarSesion, miPerfil };
