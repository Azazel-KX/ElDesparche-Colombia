const { Router } = require("express");
const ciudadModel = require("../models/ciudadModel");
const { asincrono } = require("../utils/errores");

const router = Router();

// Público: el formulario de registro lo necesita antes de que exista una sesión.
router.get(
  "/",
  asincrono(async (_req, res) => {
    res.json({ ciudades: await ciudadModel.listar() });
  })
);

module.exports = router;
