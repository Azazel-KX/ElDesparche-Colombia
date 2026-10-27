const { port, db, describirBd } = require("./config/env");
const { pool, verificarConexion } = require("./config/db");
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
    // - Con Neon la base puede estar suspendida: verificarConexion reintenta mientras despierta
    await verificarConexion({
      alFallar: (err, intento, espera) =>
        console.warn(`… PostgreSQL no responde (intento ${intento}: ${err.message}); se reintenta en ${espera / 1000} s`),
    });
    console.log(`✓ PostgreSQL conectado: ${describirBd(db)}`);

    // PASO 2: Iniciar servidor Express
    // Escuchar en el puerto (5000 por defecto)
    const servidor = app.listen(port, () => {
      console.log(`✓ API de ElDesparche escuchando en http://localhost:${port}`);
    });

    // PASO 3: Apagado ordenado (Ctrl+C, docker stop, el proveedor de hosting)
    // Deja de aceptar peticiones, termina las que están en curso y cierra las conexiones del pool
    const apagar = (senal) => {
      console.log(`${senal} recibido: cerrando el servidor…`);
      servidor.close(() => pool.end().then(() => process.exit(0)));
      setTimeout(() => process.exit(1), 10000).unref();   // si algo se queda colgado, no esperar para siempre
    };
    process.once("SIGINT", apagar);
    process.once("SIGTERM", apagar);
  } catch (err) {
    // Si la BD falla, reportar y salir
    console.error(`✗ No se pudo iniciar el servidor (${describirBd(db)}):`, err.message);
    process.exit(1);
  }
}

// LANZAR
iniciar();
