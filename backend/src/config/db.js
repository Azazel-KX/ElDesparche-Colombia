const { Pool } = require("pg");
const { db: dbConfig } = require("./env");

// Pool: colección de conexiones reutilizables a PostgreSQL
// Por defecto mantiene 10 conexiones activas, listas para usar
const pool = new Pool(dbConfig);

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
//     await cliente.query("INSERT INTO TELEFONO_USUARIO ...");
//     return usuario_id;
//   });
//
// Si la segunda falla, la primera también se revierte (ROLLBACK)
async function conTransaccion(trabajo) {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");           // Iniciar transacción
    const resultado = await trabajo(cliente); // Ejecutar las consultas
    await cliente.query("COMMIT");          // Confirmar todo
    return resultado;
  } catch (err) {
    await cliente.query("ROLLBACK");        // Deshacer todo si hay error
    throw err;                              // Propagar el error
  } finally {
    cliente.release();                      // Liberar la conexión al pool
  }
}

module.exports = { pool, query, conTransaccion };
