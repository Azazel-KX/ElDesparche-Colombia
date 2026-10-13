const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../controllers/authController");
const { requiereToken } = require("../middlewares/auth");
const { asincrono } = require("../utils/errores");

const router = Router();

// Frena la fuerza bruta sobre login y registro: 20 intentos cada 15 minutos por IP.
const limitador = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "test" ? 1000 : 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Demasiados intentos; espera unos minutos." },
});

router.post("/register", limitador, asincrono(auth.registrar));
router.post("/login", limitador, asincrono(auth.iniciarSesion));
router.get("/me", requiereToken, asincrono(auth.miPerfil));

module.exports = router;
