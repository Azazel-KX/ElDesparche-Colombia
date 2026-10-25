const bcrypt = require("bcryptjs");
const personaModel = require("../models/personaModel");
const {
  ESTADOS_AGENTE, ESTADOS_CLIENTE, validarAgente, validarCliente, validarAdministrador, validarEstadoCuenta,
} = require("../utils/validacionPersonas");
const { ESTADO_DE_CUENTA } = require("../utils/formato");
const { validarContrasena } = require("../utils/validacion");
const { ErrorHttp, esRestriccion } = require("../utils/errores");

// Agentes, clientes y administradores, vistos por el ADMINISTRADOR (rutas /api/admin/agentes, /clientes y
// /administradores). Contrato en frontend/js/admin.js. Todas las altas llevan "contrasena" (se guarda solo su hash).

const RONDAS_BCRYPT = 10;

const noExiste = (que) => new ErrorHttp(404, `${que} no existe.`);

// Valida y, si el alta es nueva, convierte la contraseña en hash. Lanza 400 con el detalle de cada campo.
async function leer(validador, body, opciones) {
  const { datos, errores } = validador(body, opciones);
  if (errores) throw new ErrorHttp(400, "Datos inválidos.", errores);
  if (opciones.nuevo) {
    datos.contrasenaHash = await bcrypt.hash(datos.contrasena, RONDAS_BCRYPT);
    delete datos.contrasena;
  }
  return datos;
}

// Si algo todavía depende del registro (RESTRICT), responde 409 con un mensaje claro
async function borrar(accion, mensaje409) {
  try {
    return await accion();
  } catch (err) {
    if (esRestriccion(err)) throw new ErrorHttp(409, mensaje409);
    throw err;
  }
}

// ---------------------------------------------------------------------------------------------
// AGENTES (clave: el NIT)
// ---------------------------------------------------------------------------------------------

// GET /api/admin/agentes -> { agentes: [ igual que AGENTES_DEMO ] }
async function listarAgentes(_req, res) {
  res.json({ agentes: await personaModel.listarAgentes() });
}

// POST /api/admin/agentes  (el USUARIO del representante + AGENTE)
async function crearAgente(req, res) {
  const d = await leer(validarAgente, req.body, { nuevo: true });
  await personaModel.crearAgente(d);
  res.status(201).json({ agente: await personaModel.obtenerAgente(d.nit) });
}

// PUT /api/admin/agentes/:nit  (el NIT, el documento y el estado no cambian)
async function actualizarAgente(req, res) {
  const d = await leer(validarAgente, req.body, { nuevo: false });
  if (!(await personaModel.actualizarAgente(req.params.nit, d))) throw noExiste("El agente");
  res.json({ agente: await personaModel.obtenerAgente(req.params.nit) });
}

// PATCH /api/admin/agentes/:nit/estado   { estado: "Activo" | "Pendiente" | "Suspendido" }
async function estadoAgente(req, res) {
  const { datos, errores } = validarEstadoCuenta(req.body, ESTADOS_AGENTE);
  if (errores) throw new ErrorHttp(400, "Estado inválido.", errores);
  if (!(await personaModel.cambiarEstadoAgente(req.params.nit, datos.estado))) throw noExiste("El agente");
  res.json({ agente: await personaModel.obtenerAgente(req.params.nit) });
}

// DELETE /api/admin/agentes/:nit  (409 si tiene eventos: EVENTO.numero_identificacion es RESTRICT)
async function eliminarAgente(req, res) {
  const existe = await borrar(() => personaModel.eliminarAgente(req.params.nit), "No se puede eliminar: el agente tiene eventos.");
  if (!existe) throw noExiste("El agente");
  res.status(204).end();
}

// ---------------------------------------------------------------------------------------------
// CLIENTES (clave: el documento)
// ---------------------------------------------------------------------------------------------

// GET /api/admin/clientes -> { clientes: [ igual que CLIENTES_DEMO ] }
async function listarClientes(_req, res) {
  res.json({ clientes: await personaModel.listarClientes() });
}

// POST /api/admin/clientes
async function crearCliente(req, res) {
  const d = await leer(validarCliente, req.body, { nuevo: true });
  await personaModel.crearCliente(d);
  res.status(201).json({ cliente: await personaModel.obtenerCliente(d.documento) });
}

// PUT /api/admin/clientes/:documento  (el documento no cambia)
async function actualizarCliente(req, res) {
  const d = await leer(validarCliente, req.body, { nuevo: false });
  if (!(await personaModel.actualizarCliente(req.params.documento, d))) throw noExiste("El cliente");
  res.json({ cliente: await personaModel.obtenerCliente(req.params.documento) });
}

// PATCH /api/admin/clientes/:documento/estado   { estado: "Activa" | "Bloqueada" }
async function estadoCliente(req, res) {
  const { datos, errores } = validarEstadoCuenta(req.body, ESTADOS_CLIENTE);
  if (errores) throw new ErrorHttp(400, "Estado inválido.", errores);
  if (!(await personaModel.cambiarEstadoCliente(req.params.documento, ESTADO_DE_CUENTA[datos.estado]))) throw noExiste("El cliente");
  res.json({ cliente: await personaModel.obtenerCliente(req.params.documento) });
}

// DELETE /api/admin/clientes/:documento  (sus reservas se borran en cascada)
async function eliminarCliente(req, res) {
  const existe = await borrar(() => personaModel.eliminarCliente(req.params.documento),
    "No se puede eliminar: el cliente tiene datos que dependen de él.");
  if (!existe) throw noExiste("El cliente");
  res.status(204).end();
}

// ---------------------------------------------------------------------------------------------
// ADMINISTRADORES (clave: el documento)
// ---------------------------------------------------------------------------------------------

// GET /api/admin/administradores -> { administradores: [ igual que ADMINISTRADORES_DEMO ] }
async function listarAdministradores(_req, res) {
  res.json({ administradores: await personaModel.listarAdministradores() });
}

// POST /api/admin/administradores
async function crearAdministrador(req, res) {
  const d = await leer(validarAdministrador, req.body, { nuevo: true });
  await personaModel.crearAdministrador(d);
  res.status(201).json({ administrador: await personaModel.obtenerAdministrador(d.documento) });
}

// PUT /api/admin/administradores/:documento  (el documento no cambia)
async function actualizarAdministrador(req, res) {
  const d = await leer(validarAdministrador, req.body, { nuevo: false });
  if (!(await personaModel.actualizarAdministrador(req.params.documento, d))) throw noExiste("El administrador");
  res.json({ administrador: await personaModel.obtenerAdministrador(req.params.documento) });
}

// DELETE /api/admin/administradores/:documento  (no se borra la cuenta propia ni al último administrador)
async function eliminarAdministrador(req, res) {
  const existe = await personaModel.eliminarAdministrador(req.params.documento, req.usuario.id);
  if (!existe) throw noExiste("El administrador");
  res.status(204).end();
}

// ---------------------------------------------------------------------------------------------
// Restablecer la contraseña (el cliente, el agente o el administrador la olvidó)
// ---------------------------------------------------------------------------------------------

// PATCH /api/admin/{agentes|clientes|administradores}/:clave/contrasena   { contrasena }
// El administrador le pone una contraseña nueva (la entrega por su cuenta); en el servidor solo queda su hash.
function restablecer(tabla, columna, parametro, quien) {
  return async (req, res) => {
    const errores = {};
    const contrasena = req.body && req.body.contrasena;
    validarContrasena(contrasena, errores);
    if (errores.contrasena) throw new ErrorHttp(400, "Contraseña inválida.", errores);

    const hash = await bcrypt.hash(contrasena, RONDAS_BCRYPT);
    if (!(await personaModel.cambiarContrasenaDe(tabla, columna, req.params[parametro], hash))) throw noExiste(quien);
    res.json({ ok: true });
  };
}
const restablecerAgente = restablecer("AGENTE", "nit", "nit", "El agente");
const restablecerCliente = restablecer("CLIENTE", "numero_identificacion", "documento", "El cliente");
const restablecerAdministrador = restablecer("ADMIN", "numero_identificacion", "documento", "El administrador");

module.exports = {
  restablecerAgente, restablecerCliente, restablecerAdministrador,
  listarAgentes, crearAgente, actualizarAgente, estadoAgente, eliminarAgente,
  listarClientes, crearCliente, actualizarCliente, estadoCliente, eliminarCliente,
  listarAdministradores, crearAdministrador, actualizarAdministrador, eliminarAdministrador,
};
