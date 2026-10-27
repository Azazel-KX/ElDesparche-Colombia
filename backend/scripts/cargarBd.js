// Carga el esquema y los datos en la base del .env (Neon o local) sin necesitar psql.
//
// Uso (desde backend/):
//   npm run bd:cargar            → schema_ElDesparche.sql + seed.sql
//   npm run bd:cargar -- --demo  → además seed_demo.sql (más eventos, ciudades, clientes y reservas para la web)
//
// Solo trabaja sobre una base VACÍA: si ya existe la tabla USUARIO se detiene sin tocar nada. Para empezar de cero en
// Neon, borra y vuelve a crear la base desde la consola de Neon (o crea una rama nueva).
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { db, describirBd, construirConfigBd } = require("../src/config/env");

// En Neon, el esquema se carga por la conexión directa (DATABASE_URL_UNPOOLED, sin "-pooler" en el host): el pooler
// trabaja por transacciones y no conserva lo que el script fija para toda la sesión (SET timezone, tablas temporales).
const config = process.env.DATABASE_URL_UNPOOLED
  ? construirConfigBd({ ...process.env, DATABASE_URL: process.env.DATABASE_URL_UNPOOLED })
  : db;

const CARPETA_BD = path.join(__dirname, "..", "..", "database");

async function cargar() {
  const archivos = ["schema_ElDesparche.sql", "seed.sql"];
  if (process.argv.includes("--demo")) archivos.push("seed_demo.sql");

  // Un Client y no el pool: los archivos traen varias sentencias (y transacciones propias) y deben ir por la misma conexión
  const cliente = new Client(config);
  await cliente.connect();
  console.log(`Conectado a ${describirBd(config)}`);

  try {
    const { rows } = await cliente.query("SELECT to_regclass('usuario') IS NOT NULL AS existe");
    if (rows[0].existe) {
      console.error("✗ La base ya tiene el esquema (existe la tabla USUARIO). No se cargó nada.");
      process.exitCode = 1;
      return;
    }

    for (const archivo of archivos) {
      const sql = fs.readFileSync(path.join(CARPETA_BD, archivo), "utf8");
      const inicio = Date.now();
      await cliente.query(sql);
      console.log(`✓ ${archivo} (${((Date.now() - inicio) / 1000).toFixed(1)} s)`);
    }

    const conteo = await cliente.query(
      "SELECT (SELECT COUNT(*) FROM usuario) AS usuarios, (SELECT COUNT(*) FROM evento) AS eventos");
    const { usuarios, eventos } = conteo.rows[0];
    console.log(`Listo: ${usuarios} usuarios y ${eventos} eventos.`);
  } finally {
    await cliente.end();
  }
}

cargar().catch((err) => {
  console.error("✗ No se pudo cargar la base:", err.message);
  process.exitCode = 1;
});
