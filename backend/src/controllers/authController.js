const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { jwt: jwtConfig } = require("../config/env");
const usuarioModel = require("../models/usuarioModel");
const { validarRegistro, validarLogin } = require("../utils/validacion");
const { ErrorHttp } = require("../utils/errores");

const RONDAS_BCRYPT = 10;
// Hash de relleno: se compara contra él cuando el correo no existe, para que la
// respuesta tarde lo mismo y no se pueda averiguar qué correos están registrados.
const HASH_FALSO = bcrypt.hashSync("contrasena-que-nadie-usa", RONDAS_BCRYPT);

function firmarToken(usuario) {
  return jwt.sign(
    { rol: usuario.tipo_usuario },
    jwtConfig.secret,
    { subject: usuario.numero_identificacion, expiresIn: jwtConfig.expiresIn, algorithm: "HS256" }
  );
}

function usuarioPublico(u) {
  return {
    numero_identificacion: u.numero_identificacion,
    nombres: u.nombres,
    apellidos: u.apellidos,
    correo: u.correo,
    tipo_usuario: u.tipo_usuario,
  };
}

async function registrar(req, res) {
  const { datos, errores } = validarRegistro(req.body);
  if (errores) throw new ErrorHttp(400, "Datos de registro inválidos.", errores);

  // Sin coordenadas, se usa el punto medio de las ubicaciones ya registradas en la ciudad.
  if (datos.latitud === null) {
    const centro = await usuarioModel.centroideCiudad(datos.id_ciudad);
    if (!centro) {
      throw new ErrorHttp(400, "Datos de registro inválidos.", {
        coordenadas: "No hay referencia para esa ciudad: envía latitud y longitud.",
      });
    }
    datos.latitud = centro.latitud;
    datos.longitud = centro.longitud;
  }

  datos.contrasena_hash = await bcrypt.hash(datos.contrasena, RONDAS_BCRYPT);
  delete datos.contrasena;

  await usuarioModel.crear(datos);
  const usuario = await usuarioModel.perfilPorId(datos.numero_identificacion);

  res.status(201).json({ token: firmarToken(usuario), usuario: usuarioPublico(usuario) });
}

async function iniciarSesion(req, res) {
  const { datos, errores } = validarLogin(req.body);
  if (errores) throw new ErrorHttp(400, "Datos de inicio de sesión inválidos.", errores);

  const usuario = await usuarioModel.buscarPorCorreo(datos.correo);
  const coincide = await bcrypt.compare(datos.contrasena, usuario ? usuario.contrasena_hash : HASH_FALSO);

  if (!usuario || !coincide) {
    throw new ErrorHttp(401, "Correo o contraseña incorrectos.");
  }
  if (usuario.estado_cuenta !== "Activa") {
    throw new ErrorHttp(403, "La cuenta está inactiva.");
  }

  res.json({ token: firmarToken(usuario), usuario: usuarioPublico(usuario) });
}

async function miPerfil(req, res) {
  const perfil = await usuarioModel.perfilPorId(req.usuario.id);
  if (!perfil) throw new ErrorHttp(404, "El usuario ya no existe.");
  res.json({ usuario: perfil });
}

module.exports = { registrar, iniciarSesion, miPerfil };
