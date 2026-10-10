const { Pool } = require("pg");
const { db } = require("./env");

const pool = new Pool(db);

pool.on("error", (err) => {
  console.error("Error inesperado en una conexión inactiva de PostgreSQL:", err.message);
});

// Ejecuta varias consultas en una sola transacción; hace ROLLBACK si algo falla.
async function conTransaccion(trabajo) {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const resultado = await trabajo(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (err) {
    await cliente.query("ROLLBACK");
    throw err;
  } finally {
    cliente.release();
  }
}

module.exports = {
  pool,
  query: (texto, params) => pool.query(texto, params),
  conTransaccion,
};
