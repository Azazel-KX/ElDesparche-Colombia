const { Router } = require("express");
const { requiereToken, requiereRol } = require("../middlewares/auth");
const { asincrono } = require("../utils/errores");
const reservas = require("../controllers/reservaController");

// Reservas del cliente autenticado (/api/reservas). Solo CLIENTE: un agente o un administrador no reservan.
const router = Router();
router.use(requiereToken, requiereRol("CLIENTE"));

router.post("/", asincrono(reservas.crear));
router.get("/mias", asincrono(reservas.mias));
router.patch("/:codigo/cancelar", asincrono(reservas.cancelar));

module.exports = router;
