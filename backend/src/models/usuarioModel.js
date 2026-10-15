const db = require("../config/db");

// COLUMNAS_PUBLICAS: campos que SÍ podemos devolver al frontend
// NUNCA incluye: contrasena_hash, tokens, datos sensibles
// ¿Por qué separar esto? Para no exponernos a errores si hacemos SELECT *
const COLUMNAS_PUBLICAS = `
  u.numero_identificacion, u.tipo_identificacion, u.nombres, u.apellidos,
  u.tipo_usuario, u.correo, u.fecha_registro, u.estado_cuenta`;

// Función 1: Busca un usuario por correo
// ¿Cuándo se usa?
// - En login: para verificar que exista
// - Devuelve TODO (incluyendo contrasena_hash) para poder validar la contraseña
//
// ¿Por qué LOWER()?
// - Correos no son case-sensitive (Juan@email.com = juan@email.com)
// - Normalizamos a minúsculas para búsqueda consistente
async function buscarPorCorreo(correo) {
  const { rows } = await db.query(
    `SELECT ${COLUMNAS_PUBLICAS}, u.contrasena_hash
       FROM USUARIO u
      WHERE LOWER(u.correo) = LOWER($1)`,
    [correo]
  );
  return rows[0] || null; // Retorna el primer usuario o null si no existe
}

// Función 2: Obtiene el PERFIL COMPLETO de un usuario
// Devuelve: datos base + ubicación + ciudad/depto + subtipo (cliente/empresa/admin) + teléfonos
//
// ¿Por qué tantos JOINs?
// - USUARIO es la tabla central
// - UBICACION: dirección + coordenadas (geográficas con PostGIS)
// - CIUDAD/DEPARTAMENTO: contexto geográfico
// - CLIENTE/EMPRESA/ADMIN: datos específicos del tipo de usuario
// - TELEFONO_USUARIO: puede haber múltiples teléfonos (LEFT JOIN)
//
// ¿Por qué COALESCE?
// - Si no hay teléfonos, devolvemos array vacío {} en vez de NULL
// - Así el frontend siempre recibe un array
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
  return rows[0] || null; // Retorna perfil completo o null
}

// Función 3: Calcula el CENTROIDE (punto medio) de una ciudad
//
// ¿Para qué?
// - Si el usuario NO envía coordenadas al registrarse,
// - usamos el punto medio de todos los usuarios ya registrados en esa ciudad
// - Así los mapas quedan bien centrados
//
// ¿Cómo funciona?
// - ST_Y / ST_X: funciones PostGIS para extraer latitud/longitud de geografías
// - AVG: promedia todas las latitudes y longitudes
// - Si no hay ubicaciones en la ciudad, devolvemos null
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

// Función auxiliar 4: Inserta la UBICACIÓN (dirección + coordenadas geográficas)
//
// ¿Qué es ST_SetSRID?
// - Sistema de Referencia Espacial ID (SRID)
// - 4326 = WGS84 (latitud/longitud estándar mundial)
// - ST_MakePoint: crea un punto geográfico (longitud, latitud)
// - ::geography: tipo de dato PostGIS para distancias
//
// ¿Por qué geography y no geometry?
// - geography: calcula distancias en la Tierra real (km, m)
// - geometry: calcula en un plano 2D (más rápido, menos preciso)
async function insertarUbicacion(cliente, d) {
  const { rows } = await cliente.query(
    `INSERT INTO UBICACION (direccion, coordenadas, id_ciudad)
     VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4)
     RETURNING id_ubicacion`,
    [d.direccion, d.longitud, d.latitud, d.id_ciudad]
  );
  return rows[0].id_ubicacion;
}

// Función auxiliar 5: Inserta el USUARIO BASE + TELÉFONO (opcional)
//
// ¿Por qué el teléfono es una tabla aparte?
// - Un usuario puede tener múltiples teléfonos
// - Si fuera una columna, solo podrían tener 1
// - Esto es normalización de BD (evitar redundancia)
//
// ¿Qué es el "trigger diferido"?
// - La BD verifica que CLIENTE o EMPRESA exista
// - Si no existe, falla en el COMMIT (no inmediatamente)
// - Por eso creamos el subtipo DENTRO de la misma transacción
async function insertarUsuarioBase(cliente, d, idUbicacion) {
  await cliente.query(
    `INSERT INTO USUARIO (numero_identificacion, tipo_identificacion, nombres, apellidos,
                          tipo_usuario, correo, contrasena_hash, id_ubicacion)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [d.numero_identificacion, d.tipo_identificacion, d.nombres, d.apellidos,
     d.tipo_cuenta, d.correo, d.contrasena_hash, idUbicacion]
  );

  // Si hay teléfono, insertarlo
  if (d.telefono) {
    await cliente.query(
      `INSERT INTO TELEFONO_USUARIO (numero_identificacion, telefono) VALUES ($1, $2)`,
      [d.numero_identificacion, d.telefono]
    );
  }
}

// Función 6: CREAR UN USUARIO COMPLETO (todo o nada)
//
// FLUJO:
// 1. Insertar UBICACION
// 2. Insertar USUARIO (tabla base)
// 3. Insertar CLIENTE o EMPRESA (subtipo específico)
// 4. Si algo falla, ROLLBACK (se deshace todo)
//
// ¿Por qué transacción?
// - Si se inserta la ubicación pero falla el usuario, quedaría ubicación huérfana
// - Si se inserta el usuario pero falla el cliente, el trigger fallaría después
// - Transacción garantiza: o se crea TODO, o no se crea NADA
async function crear(d) {
  return db.conTransaccion(async (cliente) => {
    // Paso 1: Crear ubicación
    const idUbicacion = await insertarUbicacion(cliente, d);

    // Paso 2: Crear usuario base (con referencia a la ubicación)
    await insertarUsuarioBase(cliente, d, idUbicacion);

    // Paso 3: Crear subtipo (CLIENTE o EMPRESA)
    if (d.tipo_cuenta === "CLIENTE") {
      await cliente.query(
        `INSERT INTO CLIENTE (numero_identificacion, fecha_nacimiento, alias)
         VALUES ($1, $2, $3)`,
        [d.numero_identificacion, d.fecha_nacimiento, d.alias || null]
      );
    } else {
      // EMPRESA
      await cliente.query(
        `INSERT INTO EMPRESA (numero_identificacion, nit, razon_social, nombre_comercial, descripcion)
         VALUES ($1, $2, $3, $4, $5)`,
        [d.numero_identificacion, d.nit, d.razon_social, d.nombre_comercial, d.descripcion || null]
      );
    }

    // Si llegamos aquí sin error, COMMIT automático (en db.conTransaccion)
    return d.numero_identificacion;
  });
}

module.exports = { buscarPorCorreo, perfilPorId, centroideCiudad, crear };
