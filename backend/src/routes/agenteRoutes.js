const { Router } = require("express");
const { requiereToken, requiereRol } = require("../middlewares/auth");
const { jsonPanel } = require("../middlewares/cuerpo");
const { asincrono } = require("../utils/errores");
const agente = require("../controllers/agenteController");
const reportes = require("../controllers/reporteController");

// Todo /api/agente es solo para AGENTES. Un agente suspendido ya no pasa requiereToken; uno Pendiente sí entra (para
// ver su panel) pero no puede enviar eventos.
const router = Router();
router.use(requiereToken, requiereRol("AGENTE"), jsonPanel); // jsonPanel: hasta 3 MB (imágenes), ya autenticado

router.get("/resumen", asincrono(reportes.resumenAgente));
router.get("/eventos", asincrono(agente.listarEventos));
router.post("/eventos", asincrono(agente.crearSolicitud));
router.put("/eventos/:id", asincrono(agente.corregirSolicitud));
router.delete("/eventos/:id", asincrono(agente.retirarSolicitud));

router.get("/reservas", asincrono(agente.listarReservas));
router.patch("/reservas/:codigo/estado", asincrono(agente.cancelarReserva));
router.post("/entradas/:codigo/ingreso", asincrono(agente.ingreso));

router.put("/perfil", asincrono(agente.actualizarPerfil));

module.exports = router;
