const { Router } = require("express");
const { requiereToken, requiereRol } = require("../middlewares/auth");
const { jsonPanel } = require("../middlewares/cuerpo");
const { asincrono } = require("../utils/errores");
const eventos = require("../controllers/adminEventosController");
const personas = require("../controllers/adminPersonasController");
const reservas = require("../controllers/adminReservasController");
const ubicaciones = require("../controllers/adminUbicacionesController");
const reportes = require("../controllers/reporteController");

// Todo /api/admin es solo para ADMINISTRADORES. El orden importa:
//   1. requiereToken → ¿quién eres, y tu cuenta está activa?
//   2. requiereRol   → ¿eres administrador?
const router = Router();
router.use(requiereToken, requiereRol("ADMIN"), jsonPanel); // jsonPanel: hasta 3 MB (imágenes), ya autenticado

// ---- Eventos y solicitudes de eventos ----
// Las rutas fijas ("solicitudes") van antes de las que llevan :id
router.get("/eventos/solicitudes", asincrono(eventos.listarSolicitudes));
router.patch("/eventos/solicitudes/:id", asincrono(eventos.decidirSolicitud));
router.get("/eventos", asincrono(eventos.listar));
router.post("/eventos", asincrono(eventos.crear));
router.put("/eventos/:id", asincrono(eventos.actualizar));
router.delete("/eventos/:id", asincrono(eventos.eliminar));
router.patch("/eventos/:id/estado", asincrono(eventos.cambiarEstado));

// ---- Agentes (clave: NIT) ----
router.get("/agentes", asincrono(personas.listarAgentes));
router.post("/agentes", asincrono(personas.crearAgente));
router.put("/agentes/:nit", asincrono(personas.actualizarAgente));
router.delete("/agentes/:nit", asincrono(personas.eliminarAgente));
router.patch("/agentes/:nit/estado", asincrono(personas.estadoAgente));

// ---- Clientes (clave: documento) ----
router.get("/clientes", asincrono(personas.listarClientes));
router.post("/clientes", asincrono(personas.crearCliente));
router.put("/clientes/:documento", asincrono(personas.actualizarCliente));
router.delete("/clientes/:documento", asincrono(personas.eliminarCliente));
router.patch("/clientes/:documento/estado", asincrono(personas.estadoCliente));

// ---- Administradores (clave: documento) ----
router.get("/administradores", asincrono(personas.listarAdministradores));
router.post("/administradores", asincrono(personas.crearAdministrador));
router.put("/administradores/:documento", asincrono(personas.actualizarAdministrador));
router.delete("/administradores/:documento", asincrono(personas.eliminarAdministrador));

// ---- Reservas y validación de entradas ----
router.get("/reservas", asincrono(reservas.listar));
router.post("/reservas", asincrono(reservas.crear));
router.put("/reservas/:codigo", asincrono(reservas.actualizar));
router.delete("/reservas/:codigo", asincrono(reservas.eliminar));
router.patch("/reservas/:codigo/estado", asincrono(reservas.cancelar));
router.post("/entradas/:codigo/ingreso", asincrono(reservas.ingreso));

// ---- Ubicaciones: país → departamento → ciudad ----
router.get("/ubicaciones", asincrono(ubicaciones.listar));
for (const nivel of ["paises", "departamentos", "ciudades"]) {
  router.post(`/${nivel}`, asincrono(ubicaciones.crear(nivel)));
  router.put(`/${nivel}/:id`, asincrono(ubicaciones.renombrar(nivel)));
  router.delete(`/${nivel}/:id`, asincrono(ubicaciones.eliminar(nivel)));
}

// ---- Resumen del panel y reportes ----
router.get("/resumen", asincrono(reportes.resumenAdmin));
router.get("/reportes", asincrono(reportes.reportes));

module.exports = router;
