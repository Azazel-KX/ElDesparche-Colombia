const db = require("../config/db");

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

module.exports = { listar };
