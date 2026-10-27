// Carga el esquema y los datos en la base del .env (Neon o local) sin necesitar psql.
//
// Uso (desde backend/):
//   npm run bd:cargar            → schema_ElDesparche.sql + seed.sql
//   npm run bd:cargar -- --demo  → además seed_demo.sql (más eventos, ciudades, clientes y reservas para la web)
//
// Solo trabaja sobre una base VACÍA: si ya existe la tabla USUARIO se detiene sin tocar nada. Para empezar de cero en
// Neon, borra y vuelve a crear la base desde la consola de Neon (o crea una rama nueva).
const { Client } = require("pg");
const { describirBd } = require("../src/config/env");
const { configDirecta, cargarArchivos, textoError } = require("./bd");

async function cargar() {
  const archivos = ["schema_ElDesparche.sql", "seed.sql"];
  if (process.argv.includes("--demo")) archivos.push("seed_demo.sql");

  const config = configDirecta();
  console.log(`Base: ${describirBd(config)}`);
  const cliente = new Client(config);
  await cliente.connect();

  try {
    const { rows } = await cliente.query("SELECT to_regclass('usuario') IS NOT NULL AS existe");
    if (rows[0].existe) {
      console.error("✗ La base ya tiene el esquema (existe la tabla USUARIO). No se cargó nada.");
      process.exitCode = 1;
      return;
    }

    await cargarArchivos(cliente, archivos);

    const conteo = await cliente.query(
      "SELECT (SELECT COUNT(*) FROM usuario) AS usuarios, (SELECT COUNT(*) FROM evento) AS eventos");
    const { usuarios, eventos } = conteo.rows[0];
    console.log(`Listo: ${usuarios} usuarios y ${eventos} eventos.`);
  } finally {
    await cliente.end();
  }
}

cargar().catch((err) => {
  console.error("✗ No se pudo cargar la base:", textoError(err));
  process.exitCode = 1;
});
