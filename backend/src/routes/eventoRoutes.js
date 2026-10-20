const { Router } = require("express");
const eventos = require("../controllers/eventoController");
const { requiereToken, requiereRol } = require("../middlewares/auth");
const { asincrono } = require("../utils/errores");

const router = Router(); // Router para /api/eventos

// PÚBLICAS: el catálogo lo puede ver cualquiera, incluso sin sesión
router.get("/", asincrono(eventos.listar));
router.get("/:codigo", asincrono(eventos.obtener));

// PROTEGIDAS: el orden de los middlewares importa
//   1. requiereToken → ¿quién eres? (si no hay token válido, responde 401 y no sigue)
//   2. requiereRol   → ¿tu rol puede hacer esto? (si no, responde 403)
//   3. controlador   → la lógica (aquí además se comprueba que el evento sea tuyo)

// Solo los AGENTES crean eventos (la tabla EVENTO exige un agente dueño)
router.post("/", requiereToken, requiereRol("AGENTE"), asincrono(eventos.crear));

// Editar y cambiar de estado: el agente dueño o un administrador
router.put("/:codigo", requiereToken, requiereRol("AGENTE", "ADMIN"), asincrono(eventos.actualizar));
router.patch("/:codigo/estado", requiereToken, requiereRol("AGENTE", "ADMIN"), asincrono(eventos.cambiarEstado));

module.exports = router;
