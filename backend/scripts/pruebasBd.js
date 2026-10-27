// Corre las pruebas de la base (database/pruebas_bd.sql) sin psql ni Docker, en local o en Neon.
//
// Uso (desde backend/):
//   npm run test:bd               → muestra las pruebas que fallan y el total
//   npm run test:bd -- --todas    → además, la tabla con las 88 pruebas
//
// Las pruebas cuentan con los datos exactos de seed.sql (sin seed_demo.sql), así que NO corren sobre la base del .env:
// en el mismo servidor (el de DATABASE_URL o el de DB_*) se crea una base temporal, se le cargan schema + seed, se corren
// las pruebas y se borra, salga bien o mal. Tus datos no se tocan. Termina con código 1 si alguna prueba falla.
const { Client } = require("pg");
const { describirBd } = require("../src/config/env");
const { configDirecta, conOtraBase, leerSql, cargarArchivos, textoError } = require("./bd");

// pruebas_bd.sql está escrito para psql: sus comandos (\set, \pset, \o, \echo) no son SQL. Se toma todo lo que va antes
// de la sección de resultados (el "\o" que vuelve a mostrar la salida) y se quitan esos comandos. Los resultados se leen
// después de la tabla temporal "resultado" que llenan las pruebas.
function sqlDeLasPruebas() {
  const lineas = leerSql("pruebas_bd.sql").split(/\r?\n/);
  const fin = lineas.findIndex((l) => l.trim() === "\\o");
  if (fin === -1) throw new Error('database/pruebas_bd.sql cambió: no se encontró la línea "\\o" antes de los resultados.');
  return lineas.slice(0, fin).filter((l) => !l.trimStart().startsWith("\\")).join("\n");
}

async function correr() {
  const pruebas = sqlDeLasPruebas();
  const todas = process.argv.includes("--todas");
  const config = configDirecta();
  const temporal = `desparche_pruebas_bd_${process.pid}`;

  console.log(`Servidor: ${describirBd(config)} → base temporal ${temporal}`);
  const admin = new Client(config);
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${temporal}`);
    await admin.query(`CREATE DATABASE ${temporal}`);

    const cliente = new Client(conOtraBase(config, temporal));
    await cliente.connect();
    try {
      await cargarArchivos(cliente, ["schema_ElDesparche.sql", "seed.sql"], { silencioso: true });
      await cliente.query(pruebas);   // abre la transacción (BEGIN) y llena la tabla temporal "resultado"
      const { rows } = await cliente.query(
        "SELECT n, grupo, prueba, ok, left(detalle, 90) AS detalle FROM resultado ORDER BY n");
      await cliente.query("ROLLBACK");

      const fallas = rows.filter((r) => !r.ok);
      if (todas) {
        console.table(rows.map((r) => ({ "#": r.n, Grupo: r.grupo, Prueba: r.prueba, Resultado: r.ok ? "OK" : "FALLA", Detalle: r.detalle })));
      }
      if (fallas.length) {
        console.error("\nPruebas que fallaron:");
        console.table(fallas.map((r) => ({ "#": r.n, Grupo: r.grupo, Prueba: r.prueba, Detalle: r.detalle })));
        process.exitCode = 1;
      }
      console.log(`\n${fallas.length ? "✗" : "✓"} Pruebas de la base: ${rows.length - fallas.length} pasaron, ${fallas.length} fallaron, ${rows.length} en total`);
    } finally {
      await cliente.end();
    }
  } finally {
    // WITH (FORCE): cierra cualquier conexión que haya quedado abierta a la base temporal (PostgreSQL 13+)
    await admin.query(`DROP DATABASE IF EXISTS ${temporal} WITH (FORCE)`);
    await admin.end();
  }
}

correr().catch((err) => {
  console.error("✗ No se pudieron correr las pruebas de la base:", textoError(err));
  process.exitCode = 1;
});
