const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { corsOrigins } = require("./config/env");
const authRoutes = require("./routes/authRoutes");
const ciudadRoutes = require("./routes/ciudadRoutes");
const eventoRoutes = require("./routes/eventoRoutes");
const adminRoutes = require("./routes/adminRoutes");
const reservaRoutes = require("./routes/reservaRoutes");
const agenteRoutes = require("./routes/agenteRoutes");
const { CARPETA_UPLOADS } = require("./utils/imagenes");
const { errorHandler, noEncontrado } = require("./middlewares/errorHandler");
const { jsonSegunRuta } = require("./middlewares/cuerpo");

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
// - Los paneles (/api/admin y /api/agente) admiten 3MB para las imágenes, pero lo leen después de validar el token
//   (ver middlewares/cuerpo.js)
app.use(jsonSegunRuta);

// 5. Imágenes subidas (eventos y logos)
// - helmet manda Cross-Origin-Resource-Policy: same-origin; la web corre en otro origen, así que se relaja solo aquí
app.use("/uploads", (_req, res, next) => {
  res.set("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static(CARPETA_UPLOADS, { index: false, fallthrough: true }));

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

// Rutas de eventos
// GET /api/eventos, GET /api/eventos/:codigo (públicas); POST, PUT y PATCH estado (agente dueño o admin)
app.use("/api/eventos", eventoRoutes);

// Rutas del panel de administración (solo ADMINISTRADOR)
app.use("/api/admin", adminRoutes);

// Rutas del panel del agente (solo AGENTE): sus eventos, sus reservas y el perfil de su empresa
app.use("/api/agente", agenteRoutes);

// Reservas del cliente autenticado (solo CLIENTE)
app.use("/api/reservas", reservaRoutes);

// ============================================
// MANEJO DE ERRORES (DEBE IR AL FINAL)
// ============================================

// 1. Si la ruta no existe → 404
app.use(noEncontrado);

// 2. Si hay error en cualquier ruta → manejarlo centralizadamente
app.use(errorHandler);

module.exports = app;
