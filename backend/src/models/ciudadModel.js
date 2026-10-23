const db = require("../config/db");
const { ErrorHttp } = require("../utils/errores");

// Ciudades con su departamento, para los selectores del frontend (registro, filtros).
async function listar() {
  const { rows } = await db.query(
    `SELECT c.id_ciudad, c.nombre, d.id_departamento, d.nombre AS departamento
       FROM CIUDAD c
       JOIN DEPARTAMENTO d ON d.id_departamento = c.id_departamento
      ORDER BY d.nombre, c.nombre`
  );
  return rows;
}

// Busca una ciudad por su nombre (las listas de la web envían el nombre, no el id). Si hay dos con el mismo nombre en
// distintos departamentos, toma la primera. "ejecutor" puede ser el pool o la conexión de una transacción.
async function idPorNombre(nombre, ejecutor = db) {
  const { rows } = await ejecutor.query(
    `SELECT id_ciudad FROM CIUDAD WHERE LOWER(nombre) = LOWER($1) ORDER BY id_ciudad LIMIT 1`,
    [String(nombre || "").trim()]
  );
  return rows[0] ? rows[0].id_ciudad : null;
}

// Igual que idPorNombre, pero falla con un 400 claro si la ciudad no existe (error en el campo "ciudad")
async function idObligatorio(nombre, ejecutor = db) {
  const id = await idPorNombre(nombre, ejecutor);
  if (!id) throw new ErrorHttp(400, "La ciudad elegida no existe.", { ciudad: "La ciudad elegida no existe." });
  return id;
}

module.exports = { listar, idPorNombre, idObligatorio };
