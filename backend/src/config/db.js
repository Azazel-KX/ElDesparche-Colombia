const { Pool } = require("pg");
const { db: dbConfig, zonaHoraria } = require("./env");

// Pool: colección de conexiones reutilizables a PostgreSQL
// Por defecto mantiene 10 conexiones activas, listas para usar
// Cada conexión trabaja con la zona horaria de Colombia (ver zonaHoraria en env.js):
// - Modo local: la pide al abrirse (parámetro de arranque "options").
// - Modo DATABASE_URL (Neon): el pooler de Neon (PgBouncer) no admite ese parámetro y entrega la zona del servidor (GMT)
//   aunque la base tenga otra con ALTER DATABASE. Se fija con set_config al abrir cada conexión: PgBouncer recuerda la zona
//   de cada cliente y la vuelve a poner en cada transacción. onConnect espera a que termine antes de usar la conexión.
const pool = new Pool(
  dbConfig.connectionString
    ? { ...dbConfig, onConnect: (cliente) => cliente.query("SELECT set_config('TimeZone', $1, false)", [zonaHoraria]) }
    : dbConfig
);

// Manejador de errores: si algo falla en una conexión inactiva
// (ej: PostgreSQL se reinicia mientras el servidor está activo)
pool.on("error", (err) => {
  console.error("Error inesperado en conexión de PostgreSQL:", err.message);
});

// Función 1: Ejecutar una consulta simple
// Parámetros: SQL + valores (para evitar SQL injection)
// Retorna: Promise con {rows, rowCount}
const query = (texto, params = []) => pool.query(texto, params);

// Función 2: Ejecutar múltiples consultas como TRANSACCIÓN
// TRANSACCIÓN = "todo o nada": si algo falla, se deshace todo
//
// Uso:
//   await conTransaccion(async (cliente) => {
//     await cliente.query("INSERT INTO USUARIO ...");
//     await cliente.query("INSERT INTO USUARIO_TELEFONO ...");
//     return usuario_id;
//   });
//
// Si la segunda falla, la primera también se revierte (ROLLBACK)
async function conTransaccion(trabajo) {
  const cliente = await pool.connect();
  let conexionRota;                         // si ni el ROLLBACK responde, la conexión no se reutiliza
  try {
    await cliente.query("BEGIN");           // Iniciar transacción
    const resultado = await trabajo(cliente); // Ejecutar las consultas
    await cliente.query("COMMIT");          // Confirmar todo
    return resultado;
  } catch (err) {
    // Deshacer todo si hay error. Si la conexión se cortó (red, Neon), el ROLLBACK también falla: se conserva el
    // error original y la conexión se descarta en vez de volver al pool
    await cliente.query("ROLLBACK").catch((errRollback) => { conexionRota = errRollback; });
    throw err;                              // Propagar el error
  } finally {
    cliente.release(conexionRota);          // Liberar la conexión al pool (o destruirla si quedó rota)
  }
}

// Función 3: Comprobar que la base responde ("SELECT 1"), con reintentos
// Neon suspende la base cuando no se usa: la primera conexión la despierta y puede fallar por tiempo de espera.
// Se reintenta con espera creciente (1 s, 2 s, 4 s...) antes de darla por caída.
async function verificarConexion({ intentos = 4, esperaMs = 1000, alFallar = () => {} } = {}) {
  for (let intento = 1; ; intento++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (err) {
      if (intento >= intentos) throw err;
      const espera = esperaMs * 2 ** (intento - 1);
      alFallar(err, intento, espera);
      await new Promise((r) => setTimeout(r, espera));
    }
  }
}

// Función 4: Estado de la base para /api/health: true si responde, false si no (nunca lanza error)
// Con un límite corto: el health debe contestar rápido aunque la base no lo haga
const baseDisponible = () => pool.query({ text: "SELECT 1", query_timeout: 5000 }).then(() => true, () => false);

module.exports = { pool, query, conTransaccion, verificarConexion, baseDisponible };
