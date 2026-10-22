const { Router } = require("express");
const eventos = require("../controllers/eventoController");
const { asincrono } = require("../utils/errores");

const router = Router(); // Router para /api/eventos (catálogo público, solo lectura)

// Crear, editar y cambiar de estado un evento se hace desde los paneles: /api/agente/eventos y /api/admin/eventos
router.get("/", asincrono(eventos.listar));
router.get("/:codigo", asincrono(eventos.obtener));

module.exports = router;
