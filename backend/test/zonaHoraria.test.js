// Prueba de integración: cada conexión del pool abre con la zona horaria de DB_TIMEZONE, sin depender de la que tenga
// configurada el servidor o la base. Vale en los dos modos: local (parámetro de arranque, config/env.js) y DATABASE_URL
// (set_config al abrir cada conexión, config/db.js), que es el que necesita el pooler de Neon. Se usa una zona distinta de la de Colombia para comprobar
// que la pone el backend.
// Necesita la base del .env.
process.env.NODE_ENV = "test";
process.env.DB_TIMEZONE = "Europe/Madrid";

const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool, conTransaccion } = require("../src/config/db");

after(() => pool.end());

test("cada conexión del pool usa la zona horaria de DB_TIMEZONE", async () => {
  // Varias consultas a la vez abren varias conexiones: todas deben tener la zona
  const zonas = await Promise.all(
    Array.from({ length: 5 }, () => pool.query("SELECT current_setting('TimeZone') AS zona").then((r) => r.rows[0].zona)));
  assert.deepEqual(zonas, Array(5).fill("Europe/Madrid"));

  const enTransaccion = await conTransaccion((c) => c.query("SELECT current_setting('TimeZone') AS zona"));
  assert.equal(enTransaccion.rows[0].zona, "Europe/Madrid");
});

test("por defecto la zona es la de Colombia", () => {
  const anterior = process.env.DB_TIMEZONE;
  delete process.env.DB_TIMEZONE;
  delete require.cache[require.resolve("../src/config/env")];
  try {
    assert.equal(require("../src/config/env").zonaHoraria, "America/Bogota");
  } finally {
    process.env.DB_TIMEZONE = anterior;
    delete require.cache[require.resolve("../src/config/env")];
  }
});
