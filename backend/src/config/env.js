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

// Zona horaria de las consultas. Las columnas son TIMESTAMP sin zona y guardan la hora de Colombia (así las escribe la
// web), así que NOW() también debe dar la hora de Colombia: si el servidor de PostgreSQL está en UTC (Docker, Neon), las
// fechas automáticas saldrían 5 horas adelantadas y un evento se daría por terminado 5 horas antes.
// - Modo local: se pide al abrir cada conexión (parámetro de arranque "options"), sin consultas extra.
// - Modo DATABASE_URL: el pooler de Neon no admite parámetros de arranque y entrega la zona del servidor (GMT) aunque la
//   base tenga otra con el ALTER DATABASE de database/schema_ElDesparche.sql; la fija db.js al abrir cada conexión.
const ZONA_POR_DEFECTO = "America/Bogota";
const zonaHoraria = process.env.DB_TIMEZONE || ZONA_POR_DEFECTO;

const HOSTS_LOCALES = ["localhost", "127.0.0.1", "::1", "[::1]"];

// Número entero positivo de una variable de entorno, o el valor por defecto
function entero(valor, porDefecto) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : porDefecto;
}

// Configuración de PostgreSQL. Soporta dos modos:
// 1. DATABASE_URL (Neon u otra base en la nube): URL completa de conexión
// 2. Parámetros individuales (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD): PostgreSQL local o en Docker
// Se exporta para probarla sin abrir conexiones (test/conexionBd.test.js).
function construirConfigBd(env = process.env) {
  // Ajustes del pool, iguales en los dos modos:
  // - connectionTimeoutMillis: Neon suspende la base cuando no se usa y la primera conexión tarda unos segundos en
  //   despertarla; sin límite, una petición quedaría colgada si la base no responde.
  // - query_timeout: si una conexión ya abierta deja de responder (se cortó la red), la consulta falla en vez de quedar
  //   colgada; el pool descarta esa conexión y la siguiente petición abre una nueva.
  // - idleTimeoutMillis: cierra las conexiones ociosas antes de que el servidor las corte (Neon cierra las inactivas).
  // - keepAlive: evita que un proxy o NAT corte en silencio una conexión abierta.
  const pool = {
    max: entero(env.DB_POOL_MAX, 10),
    connectionTimeoutMillis: entero(env.DB_CONNECT_TIMEOUT_MS, 10000),
    query_timeout: entero(env.DB_QUERY_TIMEOUT_MS, 15000),
    idleTimeoutMillis: entero(env.DB_IDLE_TIMEOUT_MS, 30000),
    keepAlive: true,
  };

  if (env.DATABASE_URL) {
    let url;
    try {
      url = new URL(env.DATABASE_URL);
    } catch {
      throw new Error("DATABASE_URL no es una URL válida (postgresql://usuario:clave@host/base?sslmode=require).");
    }
    if (!/^postgres(ql)?:$/.test(url.protocol)) {
      throw new Error("DATABASE_URL debe empezar con postgresql://");
    }

    // sslmode y channel_binding se leen aquí y se quitan de la URL: si se quedaran, node-postgres los aplicaría por
    // encima de la opción ssl de abajo (y avisa que sslmode=require cambiará de significado). Se pide SSL verificando el
    // certificado del servidor, que es lo que exige Neon. Solo una base local puede ir sin SSL.
    const sslmode = url.searchParams.get("sslmode");
    const channelBinding = url.searchParams.get("channel_binding");
    url.searchParams.delete("sslmode");
    url.searchParams.delete("channel_binding");

    const usarSsl = env.DB_SSL
      ? env.DB_SSL !== "false"
      : sslmode
        ? sslmode !== "disable"
        : !HOSTS_LOCALES.includes(url.hostname);

    return {
      ...pool,
      connectionString: url.toString(),
      ssl: usarSsl ? { rejectUnauthorized: true } : false,
      // Neon trae channel_binding=require en su URL: autenticación SCRAM-SHA-256-PLUS atada a la conexión TLS
      enableChannelBinding: usarSsl && channelBinding === "require",
    };
  }

  return {
    ...pool,
    host: env.DB_HOST || "localhost",
    port: Number(env.DB_PORT) || 5432,
    database: env.DB_NAME || "eldesparche_db",
    user: env.DB_USER || "postgres",
    password: env.DB_PASSWORD || "",
    options: `-c TimeZone=${env.DB_TIMEZONE || ZONA_POR_DEFECTO}`,
  };
}

// Descripción de la base para los logs, sin usuario ni contraseña (ej: "ep-xxxx.neon.tech/neondb (SSL)")
function describirBd(config) {
  if (config.connectionString) {
    const url = new URL(config.connectionString);
    return `${url.hostname}${url.pathname}${config.ssl ? " (SSL)" : ""}`;
  }
  return `${config.host}:${config.port}/${config.database}`;
}

const dbConfig = construirConfigBd();

// Exportar toda la configuración
module.exports = {
  // Puerto donde escucha el servidor (default 5000)
  port: Number(process.env.PORT) || 5000,

  // Node environment (development, production, test)
  nodeEnv: process.env.NODE_ENV || "development",

  // Dirección pública del API: se usa para completar la URL de las imágenes que se suben (/uploads/...)
  // - Vacía (por defecto): la web recibe la ruta relativa "/uploads/..." y la pide a su mismo dominio, que la redirige
  //   al API (proxy de Vite en desarrollo, túnel o proxy inverso al publicar). Así la permite la CSP de la web ('self').
  // - Con valor (ej. https://api.eldesparche.online): cuando la web y el API están en dominios distintos.
  publicUrl: (process.env.PUBLIC_URL || "").replace(/\/+$/, ""),

  // Configuración de conexión a PostgreSQL
  db: dbConfig,
  construirConfigBd,
  describirBd,

  // Zona horaria con que trabajan las consultas (ver más arriba)
  zonaHoraria,

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
