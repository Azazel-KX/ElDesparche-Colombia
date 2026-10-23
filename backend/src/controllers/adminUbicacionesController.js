const ubicacionModel = require("../models/ubicacionModel");
const { texto } = require("../utils/validacion");
const { ErrorHttp, esRestriccion } = require("../utils/errores");

// Países, departamentos y ciudades, administrados por el ADMINISTRADOR (rutas /api/admin/ubicaciones, /paises,
// /departamentos y /ciudades). Contrato en frontend/js/admin.js (sección UBICACIONES).

const { NIVELES } = ubicacionModel;

// Mensaje del 409 cuando algo todavía depende del registro (todas esas llaves son RESTRICT)
const EN_USO = {
  paises: "No se puede eliminar: el país tiene departamentos.",
  departamentos: "No se puede eliminar: el departamento tiene ciudades.",
  ciudades: "No se puede eliminar: la ciudad la usan personas, eventos o ubicaciones.",
};

// GET /api/admin/ubicaciones -> { paises: [...], departamentos: [...], ciudades: [...] }
async function listar(_req, res) {
  res.json(await ubicacionModel.listar());
}

function leerNombre(body, nivel) {
  const nombre = texto(body && body.nombre).replace(/\s+/g, " ");
  if (!nombre || nombre.length > NIVELES[nivel].maxNombre) {
    throw new ErrorHttp(400, "Nombre inválido.", { nombre: `Escribe el nombre (máximo ${NIVELES[nivel].maxNombre} caracteres).` });
  }
  return nombre;
}

// POST /api/admin/<nivel>   { nombre } y, según el nivel, idPais o idDepartamento
const crear = (nivel) => async (req, res) => {
  const nombre = leerNombre(req.body, nivel);
  let idPadre = null;
  if (NIVELES[nivel].padre) {
    idPadre = Number(req.body && req.body[NIVELES[nivel].cuerpoPadre]);
    if (!Number.isInteger(idPadre) || idPadre <= 0) {
      throw new ErrorHttp(400, "Falta elegir a qué pertenece.", { [NIVELES[nivel].cuerpoPadre]: "Elige a qué pertenece." });
    }
  }
  try {
    res.status(201).json(await ubicacionModel.crear(nivel, nombre, idPadre));
  } catch (err) {
    // 23503 = el país o departamento al que pertenecería no existe
    if (err.code === "23503") throw new ErrorHttp(400, "Lo que elegiste no existe.", { [NIVELES[nivel].cuerpoPadre]: "No existe." });
    throw err;
  }
};

const idDe = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorHttp(404, "No existe.");
  return id;
};

// PUT /api/admin/<nivel>/:id   { nombre }
const renombrar = (nivel) => async (req, res) => {
  const registro = await ubicacionModel.renombrar(nivel, idDe(req), leerNombre(req.body, nivel));
  if (!registro) throw new ErrorHttp(404, "No existe.");
  res.json(registro);
};

// DELETE /api/admin/<nivel>/:id   (409 si algo todavía depende de él)
const eliminar = (nivel) => async (req, res) => {
  try {
    if (!(await ubicacionModel.eliminar(nivel, idDe(req)))) throw new ErrorHttp(404, "No existe.");
  } catch (err) {
    if (esRestriccion(err)) throw new ErrorHttp(409, EN_USO[nivel]);
    throw err;
  }
  res.status(204).end();
};

module.exports = { listar, crear, renombrar, eliminar };
