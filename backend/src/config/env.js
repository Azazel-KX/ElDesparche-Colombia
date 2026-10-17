const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

// Función auxiliar: obtiene una variable de entorno requerida
// Si no existe, lanza error ANTES de que el servidor intente arrancar
function requerida(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. ` +
      `Copia backend/.env.example a backend/.env y complétala.`
    );
  }
  return valor;
}

// JWT_SECRET: debe existir y ser largo (al menos 32 caracteres)
// ¿Por qué 32? Es el mínimo para que sea criptográficamente seguro
const jwtSecret = requerida("JWT_SECRET");
if (jwtSecret.length < 32) {
  throw new Error("JWT_SECRET debe tener al menos 32 caracteres.");
}

// Configuración de PostgreSQL
// Soporta dos modos:
// 1. DATABASE_URL (para Neon, Heroku, etc.) - URL completa de conexión
// 2. Parámetros individuales (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
let dbConfig;

if (process.env.DATABASE_URL) {
  // Modo Neon/Cloud: usar URL de conexión
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  };
} else {
  // Modo local: usar parámetros individuales
  dbConfig = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "eldesparche_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
  };
}

// Exportar toda la configuración
module.exports = {
  // Puerto donde escucha el servidor (default 5000)
  port: Number(process.env.PORT) || 5000,

  // Node environment (development, production, test)
  nodeEnv: process.env.NODE_ENV || "development",

  // Configuración de conexión a PostgreSQL
  db: dbConfig,

  // Configuración de JWT (tokens de sesión)
  jwt: {
    secret: jwtSecret,                              // Clave privada para firmar tokens
    expiresIn: process.env.JWT_EXPIRES_IN || "2h", // Duración: 2 horas
  },

  // CORS: qué orígenes pueden acceder a nuestra API
  // Si viene vacío, no permitimos ninguno (seguro)
  corsOrigins: (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
};
