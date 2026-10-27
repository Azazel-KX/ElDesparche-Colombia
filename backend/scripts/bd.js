// Ayudas compartidas por los scripts de la base (bd:cargar y test:bd): conexión directa y carga de los .sql de database/.
const fs = require("fs");
const path = require("path");
const { db, construirConfigBd } = require("../src/config/env");

const CARPETA_BD = path.join(__dirname, "..", "..", "database");

// En Neon, los scripts usan la conexión directa (DATABASE_URL_UNPOOLED, sin "-pooler" en el host): el pooler trabaja por
// transacciones y no conserva lo que un script fija para toda la sesión (SET timezone, tablas temporales). CREATE y
// DROP DATABASE tampoco pasan por el pooler. En local no hay pooler: se usa la misma configuración del backend.
const configDirecta = () => (process.env.DATABASE_URL_UNPOOLED
  ? construirConfigBd({ ...process.env, DATABASE_URL: process.env.DATABASE_URL_UNPOOLED })
  : db);

// La misma configuración apuntando a otra base del mismo servidor (para las bases temporales de las pruebas)
function conOtraBase(config, nombre) {
  if (!config.connectionString) return { ...config, database: nombre };
  const url = new URL(config.connectionString);
  url.pathname = `/${nombre}`;
  return { ...config, connectionString: url.toString() };
}

const leerSql = (archivo) => fs.readFileSync(path.join(CARPETA_BD, archivo), "utf8");

// Ejecuta cada archivo .sql completo (varias sentencias en una sola llamada) e informa cuánto tardó.
// "cliente" es un Client y no el pool: los archivos traen transacciones propias y deben ir por la misma conexión.
async function cargarArchivos(cliente, archivos, { silencioso = false } = {}) {
  for (const archivo of archivos) {
    const inicio = Date.now();
    await cliente.query(leerSql(archivo));
    if (!silencioso) console.log(`✓ ${archivo} (${((Date.now() - inicio) / 1000).toFixed(1)} s)`);
  }
}

// Texto de un error de conexión para mostrar: si el servidor no responde, Node entrega un AggregateError sin mensaje
// (un intento por cada dirección del host) y solo trae el código, por ejemplo ECONNREFUSED.
const textoError = (err) => err.message || (err.errors && err.errors[0] && err.errors[0].message) || err.code || String(err);

module.exports = { configDirecta, conOtraBase, leerSql, cargarArchivos, textoError };
