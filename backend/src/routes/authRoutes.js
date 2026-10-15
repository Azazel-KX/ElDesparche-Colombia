const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../controllers/authController");
const { requiereToken } = require("../middlewares/auth");
const { asincrono } = require("../utils/errores");

const router = Router(); // Crear router para /api/auth

// RATE LIMITING: protección contra fuerza bruta
//
// ¿Por qué?
// - Un atacante puede intentar millones de contraseñas rápidamente
// - Rate limiting lo frena: máximo 20 intentos cada 15 minutos por IP
//
// Configuración:
// - windowMs: ventana de tiempo (15 minutos = 900,000 ms)
// - limit: intentos permitidos en esa ventana (20)
// - En test: permitir 1000 (para no quebrar tests)
const limitador = rateLimit({
  windowMs: 15 * 60 * 1000,        // 15 minutos
  limit: process.env.NODE_ENV === "test" ? 1000 : 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Demasiados intentos; espera unos minutos." },
});

// RUTA 1: Registrarse
// POST /api/auth/register
// Body: { tipo_cuenta, tipo_identificacion, numero_identificacion, ... }
// Response: { token, usuario }
// ¿Middlewares?
// - limitador: máximo 20 intentos cada 15 minutos
// - asincrono: captura errores de funciones async
router.post("/register", limitador, asincrono(auth.registrar));

// RUTA 2: Iniciar sesión
// POST /api/auth/login
// Body: { correo, contrasena }
// Response: { token, usuario }
// ¿Middlewares?
// - limitador: máximo 20 intentos cada 15 minutos (evita ataques de fuerza bruta)
// - asincrono: captura errores
router.post("/login", limitador, asincrono(auth.iniciarSesion));

// RUTA 3: Obtener mi perfil
// GET /api/auth/me
// Headers: Authorization: Bearer <token>
// Response: { usuario: {...perfil completo...} }
// ¿Middlewares?
// - requiereToken: verifica que el JWT sea válido
// - asincrono: captura errores
router.get("/me", requiereToken, asincrono(auth.miPerfil));

module.exports = router;
