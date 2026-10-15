const { port } = require("./config/env");
const { pool } = require("./config/db");
const app = require("./app");

// PUNTO DE ENTRADA: iniciar el servidor
//
// ¿Por qué async?
// - Necesitamos verificar que la BD esté disponible ANTES de escuchar requests
// - Si la BD no responde, no tiene sentido que el servidor inicie
async function iniciar() {
  try {
    // PASO 1: Verificar conexión a PostgreSQL
    // "SELECT 1" es una consulta trivial que verifica que la BD responda
    // ¿Por qué?
    // - Si la BD no funciona, mejor fallar ahora que en la primera petición
    // - Los errores serán claros en los logs
    await pool.query("SELECT 1");
    console.log("✓ PostgreSQL conectado");

    // PASO 2: Iniciar servidor Express
    // Escuchar en el puerto (5000 por defecto)
    app.listen(port, () => {
      console.log(`✓ API de ElDesparche escuchando en http://localhost:${port}`);
    });
  } catch (err) {
    // Si la BD falla, reportar y salir
    console.error("✗ No se pudo iniciar el servidor:", err.message);
    process.exit(1);
  }
}

// LANZAR
iniciar();
