const db = require("../config/db");

// Modelo de UBICACIONES GEOGRÁFICAS: país → departamento → ciudad (las tres tablas del enunciado).
// Lo usa el panel de administración (admin-ubicaciones). La forma es la de leerUbicaciones() en frontend/js/script.js:
// { paises: [{ id, nombre }], departamentos: [{ id, nombre, idPais }], ciudades: [{ id, nombre, idDepartamento }] }

// Cada nivel con su tabla, su llave y su padre. Son constantes nuestras: nada de esto viene del usuario, así que es seguro
// armar el SQL con ellas (los VALORES siempre van como parámetros $1, $2).
const NIVELES = {
  paises: { tabla: "PAIS", id: "id_pais", maxNombre: 60, padre: null },
  departamentos: { tabla: "DEPARTAMENTO", id: "id_departamento", maxNombre: 60, padre: "id_pais", cuerpoPadre: "idPais" },
  ciudades: { tabla: "CIUDAD", id: "id_ciudad", maxNombre: 80, padre: "id_departamento", cuerpoPadre: "idDepartamento" },
};

async function listar() {
  const [paises, departamentos, ciudades] = await Promise.all([
    db.query("SELECT id_pais AS id, nombre FROM PAIS ORDER BY nombre"),
    db.query("SELECT id_departamento AS id, nombre, id_pais AS \"idPais\" FROM DEPARTAMENTO ORDER BY nombre"),
    db.query("SELECT id_ciudad AS id, nombre, id_departamento AS \"idDepartamento\" FROM CIUDAD ORDER BY nombre"),
  ]);
  return { paises: paises.rows, departamentos: departamentos.rows, ciudades: ciudades.rows };
}

// Registra un país, departamento o ciudad y devuelve el registro con la forma de la web.
// Si el padre no existe, PostgreSQL lanza 23503 (llave foránea) y el controlador lo vuelve un 400.
async function crear(nivel, nombre, idPadre) {
  const n = NIVELES[nivel];
  const columnas = n.padre ? `nombre, ${n.padre}` : "nombre";
  const valores = n.padre ? "$1, $2" : "$1";
  const { rows } = await db.query(
    `INSERT INTO ${n.tabla} (${columnas}) VALUES (${valores}) RETURNING ${n.id} AS id, nombre${n.padre ? `, ${n.padre} AS "${n.cuerpoPadre}"` : ""}`,
    n.padre ? [nombre, idPadre] : [nombre]
  );
  return rows[0];
}

// Renombra. Devuelve el registro, o null si no existe.
async function renombrar(nivel, id, nombre) {
  const n = NIVELES[nivel];
  const { rows } = await db.query(
    `UPDATE ${n.tabla} SET nombre = $2 WHERE ${n.id} = $1 RETURNING ${n.id} AS id, nombre${n.padre ? `, ${n.padre} AS "${n.cuerpoPadre}"` : ""}`,
    [id, nombre]
  );
  return rows[0] || null;
}

// Elimina. false si no existe. Si el país tiene departamentos, el departamento tiene ciudades o la ciudad la usan
// personas o ubicaciones (todas esas llaves son RESTRICT), PostgreSQL lanza 23001 y el controlador lo vuelve un 409.
async function eliminar(nivel, id) {
  const n = NIVELES[nivel];
  const { rowCount } = await db.query(`DELETE FROM ${n.tabla} WHERE ${n.id} = $1`, [id]);
  return rowCount > 0;
}

module.exports = { NIVELES, listar, crear, renombrar, eliminar };
