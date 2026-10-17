const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { corsOrigins } = require("./config/env");
const authRoutes = require("./routes/authRoutes");
const ciudadRoutes = require("./routes/ciudadRoutes");
const { errorHandler, noEncontrado } = require("./middlewares/errorHandler");

// Crear aplicación Express
const app = express();

// ============================================
// MIDDLEWARES DE SEGURIDAD
// ============================================

// 1. Remover header "X-Powered-By: Express" (no ayuda, solo da información al atacante)
app.disable("x-powered-by");

// 2. HELMET: conjunto de middlewares de seguridad
// - Establece headers HTTP seguros (Content-Security-Policy, X-Frame-Options, etc.)
// - Evita ataques comunes (clickjacking, inyección de código, etc.)
app.use(helmet());

// 3. CORS: permitir solo ciertos orígenes
// - corsOrigins viene de .env (ej: http://localhost:5173)
// - Si está vacío → no permitir ninguno (seguro por defecto)
app.use(cors({ origin: corsOrigins.length ? corsOrigins : false }));

// 4. Parsear JSON en el body
// - limit: máximo 100KB (evita ataques DoS con payloads enormes)
app.use(express.json({ limit: "100kb" }));

// ============================================
// RUTAS PÚBLICAS
// ============================================

// Health check: verificar que el servidor está vivo
// GET /api/health → { estado: "ok" }
app.get("/api/health", (_req, res) => res.json({ estado: "ok" }));

// ============================================
// RUTAS DE AUTENTICACIÓN Y APP
// ============================================

// Rutas de autenticación
// POST /api/auth/register, /api/auth/login, GET /api/auth/me
app.use("/api/auth", authRoutes);

// Rutas de ciudades
// GET /api/ciudades, etc.
app.use("/api/ciudades", ciudadRoutes);

// ============================================
// MANEJO DE ERRORES (DEBE IR AL FINAL)
// ============================================

// 1. Si la ruta no existe → 404
app.use(noEncontrado);

// 2. Si hay error en cualquier ruta → manejarlo centralizadamente
app.use(errorHandler);

module.exports = app;
