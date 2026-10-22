const reporteModel = require("../models/reporteModel");
const { ErrorHttp } = require("../utils/errores");

// Resumen y reportes del panel. Solo leen: no cambian nada.

// GET /api/admin/resumen?meses=6  (1 a 24)  -> indicadores, meses, estados, categorias, agentes y actividad
async function resumenAdmin(req, res) {
  const meses = req.query.meses === undefined ? 6 : Number(req.query.meses);
  if (!Number.isInteger(meses) || meses < 1 || meses > 24) {
    throw new ErrorHttp(400, "Parámetro inválido.", { meses: "Los meses deben ser un entero de 1 a 24." });
  }
  res.json(await reporteModel.resumenAdmin(meses));
}

// GET /api/admin/reportes?anio=2026  -> totales, promedios, ingresos por agente / cliente / mes, reservas por evento y mes...
async function reportes(req, res) {
  const anio = req.query.anio === undefined ? new Date().getFullYear() : Number(req.query.anio);
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    throw new ErrorHttp(400, "Parámetro inválido.", { anio: "El año debe estar entre 2000 y 2100." });
  }
  res.json(await reporteModel.reportes(anio));
}

// GET /api/agente/resumen  -> el resumen de ESE agente (sale de su token)
async function resumenAgente(req, res) {
  const resumen = await reporteModel.resumenAgente(req.usuario.id);
  if (!resumen) throw new ErrorHttp(404, "No encontramos la empresa de esta cuenta de agente.");
  res.json(resumen);
}

module.exports = { resumenAdmin, reportes, resumenAgente };
