const db = require("../config/db");

// Columnas públicas del usuario (nunca incluye contrasena_hash).
const COLUMNAS_PUBLICAS = `
  u.numero_identificacion, u.tipo_identificacion, u.nombres, u.apellidos,
  u.tipo_usuario, u.correo, u.fecha_registro, u.estado_cuenta`;

async function buscarPorCorreo(correo) {
  const { rows } = await db.query(
    `SELECT ${COLUMNAS_PUBLICAS}, u.contrasena_hash
       FROM USUARIO u
      WHERE LOWER(u.correo) = LOWER($1)`,
    [correo]
  );
  return rows[0] || null;
}

// Perfil completo: usuario + ciudad/departamento + datos del subtipo + teléfonos.
async function perfilPorId(numeroIdentificacion) {
  const { rows } = await db.query(
    `SELECT ${COLUMNAS_PUBLICAS},
            ub.direccion, c.nombre AS ciudad, d.nombre AS departamento,
            cl.fecha_nacimiento, cl.alias, cl.foto_perfil,
            e.nit, e.razon_social, e.nombre_comercial, e.descripcion, e.logo_url,
            a.horario,
            COALESCE(
              (SELECT ARRAY_AGG(t.telefono ORDER BY t.telefono)
                 FROM TELEFONO_USUARIO t
                WHERE t.numero_identificacion = u.numero_identificacion),
              '{}') AS telefonos
       FROM USUARIO u
       JOIN UBICACION ub    ON ub.id_ubicacion = u.id_ubicacion
       JOIN CIUDAD c        ON c.id_ciudad = ub.id_ciudad
       JOIN DEPARTAMENTO d  ON d.id_departamento = c.id_departamento
       LEFT JOIN CLIENTE cl ON cl.numero_identificacion = u.numero_identificacion
       LEFT JOIN EMPRESA e  ON e.numero_identificacion = u.numero_identificacion
       LEFT JOIN ADMIN a    ON a.numero_identificacion = u.numero_identificacion
      WHERE u.numero_identificacion = $1`,
    [numeroIdentificacion]
  );
  return rows[0] || null;
}

// Punto medio de las ubicaciones ya registradas en una ciudad (null si no hay ninguna).
async function centroideCiudad(idCiudad) {
  const { rows } = await db.query(
    `SELECT AVG(ST_Y(coordenadas::geometry)) AS latitud,
            AVG(ST_X(coordenadas::geometry)) AS longitud
       FROM UBICACION
      WHERE id_ciudad = $1`,
    [idCiudad]
  );
  const fila = rows[0];
  if (!fila || fila.latitud === null) return null;
  return { latitud: Number(fila.latitud), longitud: Number(fila.longitud) };
}

// Crea ubicación + usuario + subtipo (+ teléfono) en la transacción recibida.
// El trigger diferido de USUARIO exige que el subtipo exista antes del COMMIT.
async function insertarUsuarioBase(cliente, d, idUbicacion) {
  await cliente.query(
    `INSERT INTO USUARIO (numero_identificacion, tipo_identificacion, nombres, apellidos,
                          tipo_usuario, correo, contrasena_hash, id_ubicacion)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [d.numero_identificacion, d.tipo_identificacion, d.nombres, d.apellidos,
     d.tipo_cuenta, d.correo, d.contrasena_hash, idUbicacion]
  );
  if (d.telefono) {
    await cliente.query(
      `INSERT INTO TELEFONO_USUARIO (numero_identificacion, telefono) VALUES ($1, $2)`,
      [d.numero_identificacion, d.telefono]
    );
  }
}

async function insertarUbicacion(cliente, d) {
  const { rows } = await cliente.query(
    `INSERT INTO UBICACION (direccion, coordenadas, id_ciudad)
     VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4)
     RETURNING id_ubicacion`,
    [d.direccion, d.longitud, d.latitud, d.id_ciudad]
  );
  return rows[0].id_ubicacion;
}

async function crear(d) {
  return db.conTransaccion(async (cliente) => {
    const idUbicacion = await insertarUbicacion(cliente, d);
    await insertarUsuarioBase(cliente, d, idUbicacion);

    if (d.tipo_cuenta === "CLIENTE") {
      await cliente.query(
        `INSERT INTO CLIENTE (numero_identificacion, fecha_nacimiento, alias)
         VALUES ($1, $2, $3)`,
        [d.numero_identificacion, d.fecha_nacimiento, d.alias || null]
      );
    } else {
      await cliente.query(
        `INSERT INTO EMPRESA (numero_identificacion, nit, razon_social, nombre_comercial, descripcion)
         VALUES ($1, $2, $3, $4, $5)`,
        [d.numero_identificacion, d.nit, d.razon_social, d.nombre_comercial, d.descripcion || null]
      );
    }
    return d.numero_identificacion;
  });
}

module.exports = { buscarPorCorreo, perfilPorId, centroideCiudad, crear };
