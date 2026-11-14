// Pruebas de la conexión con la base (local o Neon): cómo se arma la configuración del pool a partir del .env, qué
// responde el API cuando la base no está disponible y los reintentos del arranque.
// Las de configuración no abren conexiones; las de /api/health simulan la caída reemplazando pool.query.
process.env.NODE_ENV = "test";

const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { construirConfigBd, describirBd } = require("../src/config/env");
const { pool, verificarConexion, conTransaccion } = require("../src/config/db");
const { errorHandler, esErrorDeConexion } = require("../src/middlewares/errorHandler");
const app = require("../src/app");

const NEON = "postgresql://neondb_owner:cl%40ve@ep-frio-123-pooler.us-east-2.aws.neon.tech/neondb";

after(() => pool.end());

// ---------------------------------------------------------------------------------------------
// construirConfigBd
// ---------------------------------------------------------------------------------------------

test("Neon: SSL verificando el certificado, channel binding y sin sslmode en la URL", () => {
  const config = construirConfigBd({ DATABASE_URL: `${NEON}?sslmode=require&channel_binding=require` });
  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
  assert.equal(config.enableChannelBinding, true);
  assert.equal(config.connectionString, NEON);       // la clave sigue codificada (%40) y se quitan los parámetros
  assert.equal(config.host, undefined);               // las DB_* no se usan en este modo
  assert.equal(config.options, undefined);            // el pooler de Neon no admite parámetros de arranque
});

test("Neon: sin sslmode también va con SSL (solo una base local va sin SSL)", () => {
  const config = construirConfigBd({ DATABASE_URL: NEON });
  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
  assert.equal(config.enableChannelBinding, false);
});

test("DATABASE_URL local: sin SSL por defecto, y DB_SSL o sslmode mandan sobre el valor por defecto", () => {
  const local = "postgresql://postgres:admin@localhost:5432/desparche_db";
  assert.equal(construirConfigBd({ DATABASE_URL: local }).ssl, false);
  assert.deepEqual(construirConfigBd({ DATABASE_URL: `${local}?sslmode=require` }).ssl, { rejectUnauthorized: true });
  assert.equal(construirConfigBd({ DATABASE_URL: `${NEON}?sslmode=disable` }).ssl, false);
  assert.equal(construirConfigBd({ DATABASE_URL: `${NEON}?sslmode=require`, DB_SSL: "false" }).ssl, false);
  assert.deepEqual(construirConfigBd({ DATABASE_URL: local, DB_SSL: "true" }).ssl, { rejectUnauthorized: true });
});

test("channel_binding solo se activa con SSL", () => {
  const config = construirConfigBd({ DATABASE_URL: `${NEON}?sslmode=disable&channel_binding=require` });
  assert.equal(config.enableChannelBinding, false);
});

test("DATABASE_URL inválida: error claro al arrancar", () => {
  assert.throws(() => construirConfigBd({ DATABASE_URL: "no es una url" }), /DATABASE_URL no es una URL válida/);
  assert.throws(() => construirConfigBd({ DATABASE_URL: "mysql://u:c@host/base" }), /postgresql:\/\//);
});

test("modo local: parámetros DB_* y zona horaria en cada conexión", () => {
  const config = construirConfigBd({ DB_HOST: "db", DB_PORT: "5433", DB_NAME: "base", DB_USER: "yo", DB_PASSWORD: "x" });
  assert.equal(config.host, "db");
  assert.equal(config.port, 5433);
  assert.equal(config.database, "base");
  assert.equal(config.options, "-c TimeZone=America/Bogota");
  assert.equal(config.connectionString, undefined);
});

test("pool: valores por defecto y variables del .env (las inválidas se ignoran)", () => {
  const porDefecto = construirConfigBd({});
  assert.equal(porDefecto.max, 10);
  assert.equal(porDefecto.connectionTimeoutMillis, 10000);
  assert.equal(porDefecto.query_timeout, 15000);
  assert.equal(porDefecto.idleTimeoutMillis, 30000);
  assert.equal(porDefecto.keepAlive, true);

  const propio = construirConfigBd({ DATABASE_URL: NEON, DB_POOL_MAX: "3", DB_CONNECT_TIMEOUT_MS: "15000", DB_QUERY_TIMEOUT_MS: "-1", DB_IDLE_TIMEOUT_MS: "abc" });
  assert.equal(propio.max, 3);
  assert.equal(propio.connectionTimeoutMillis, 15000);
  assert.equal(propio.query_timeout, 15000);
  assert.equal(propio.idleTimeoutMillis, 30000);
});

test("describirBd no muestra el usuario ni la contraseña", () => {
  const texto = describirBd(construirConfigBd({ DATABASE_URL: `${NEON}?sslmode=require` }));
  assert.equal(texto, "ep-frio-123-pooler.us-east-2.aws.neon.tech/neondb (SSL)");
  assert.equal(describirBd(construirConfigBd({ DB_HOST: "localhost", DB_PORT: "5432", DB_NAME: "desparche_db" })),
    "localhost:5432/desparche_db");
});

// ---------------------------------------------------------------------------------------------
// Base no disponible → 503
// ---------------------------------------------------------------------------------------------

test("esErrorDeConexion reconoce los errores de red, de PostgreSQL y del pool", () => {
  for (const code of ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "08006", "08001", "53300", "57P01"]) {
    assert.equal(esErrorDeConexion(Object.assign(new Error("x"), { code })), true, code);
  }
  assert.equal(esErrorDeConexion(new Error("timeout exceeded when trying to connect")), true);
  assert.equal(esErrorDeConexion(new Error("Connection terminated unexpectedly")), true);
  assert.equal(esErrorDeConexion(new Error("Query read timeout")), true);
  assert.equal(esErrorDeConexion(Object.assign(new Error("duplicado"), { code: "23505" })), false);
  assert.equal(esErrorDeConexion(new Error("otro error")), false);
});

test("errorHandler: sin conexión con la base responde 503 con Retry-After", () => {
  const res = {
    estado: null, cuerpo: null, cabeceras: {},
    status(c) { this.estado = c; return this; },
    json(b) { this.cuerpo = b; return this; },
    set(k, v) { this.cabeceras[k] = v; return this; },
  };
  const original = console.error;
  console.error = () => {};
  try {
    errorHandler(Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }), {}, res, () => {});
  } finally {
    console.error = original;
  }
  assert.equal(res.estado, 503);
  assert.equal(res.cabeceras["Retry-After"], "5");
  assert.match(res.cuerpo.error, /no está disponible/);
});

// Reemplaza pool.query mientras corre trabajo() (simula una base caída o que despierta)
async function conQuery(falsa, trabajo) {
  const original = pool.query;
  pool.query = falsa;
  try {
    return await trabajo();
  } finally {
    pool.query = original;
  }
}

async function pedirHealth() {
  const servidor = app.listen(0);
  try {
    const res = await fetch(`http://127.0.0.1:${servidor.address().port}/api/health`);
    return { estado: res.status, json: await res.json(), cache: res.headers.get("cache-control") };
  } finally {
    await new Promise((r) => servidor.close(r));
  }
}

test("health: 503 y baseDatos 'sin conexión' si la base no responde", async () => {
  const caida = () => Promise.reject(Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }));
  const { estado, json, cache } = await conQuery(caida, pedirHealth);
  assert.equal(estado, 503);
  assert.deepEqual(json, { estado: "error", baseDatos: "sin conexión" });
  assert.equal(cache, "no-store");
});

test("verificarConexion reintenta mientras la base despierta y se rinde tras los intentos", async () => {
  let llamadas = 0;
  const despierta = () => (++llamadas < 3 ? Promise.reject(new Error("timeout exceeded when trying to connect")) : Promise.resolve({ rows: [] }));
  const avisos = [];
  await conQuery(despierta, () => verificarConexion({ intentos: 4, esperaMs: 1, alFallar: (_e, intento) => avisos.push(intento) }));
  assert.equal(llamadas, 3);
  assert.deepEqual(avisos, [1, 2]);

  llamadas = 0;
  const caida = () => { llamadas++; return Promise.reject(new Error("connect ECONNREFUSED")); };
  await assert.rejects(conQuery(caida, () => verificarConexion({ intentos: 2, esperaMs: 1 })), /ECONNREFUSED/);
  assert.equal(llamadas, 2);
});

test("conTransaccion: si la conexión se corta, conserva el error original y descarta la conexión", async () => {
  const liberadas = [];
  const rota = {
    query: (sql) => (sql === "BEGIN" ? Promise.resolve() : Promise.reject(new Error("Query read timeout"))),
    release: (err) => liberadas.push(err),
  };
  const original = pool.connect;
  pool.connect = () => Promise.resolve(rota);
  try {
    await assert.rejects(conTransaccion((c) => c.query("INSERT ...")), /Query read timeout/);
  } finally {
    pool.connect = original;
  }
  assert.equal(liberadas.length, 1);
  assert.ok(liberadas[0] instanceof Error, "release(err) destruye la conexión en vez de devolverla al pool");
});
