const { port } = require("./config/env");
const { pool } = require("./config/db");
const app = require("./app");

async function iniciar() {
  // Falla rápido si la base de datos no responde, en vez de fallar en la primera petición.
  await pool.query("SELECT 1");
  app.listen(port, () => console.log(`API de ElDesparche escuchando en http://localhost:${port}`));
}

iniciar().catch((err) => {
  console.error("No se pudo iniciar el servidor:", err.message);
  process.exit(1);
});
