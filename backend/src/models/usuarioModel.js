const db = require("../config/db");

// TIPO_USUARIO: el perfil del usuario (ADMIN, CLIENTE o AGENTE).
// En la base NO hay una columna tipo_usuario: el perfil lo define la tabla de subtipo en la que está la fila
// (generalización IS-A total y disjunta), así que aquí se deduce de en cuál aparece el usuario.
// Como la herencia es disjunta, solo una de las tres consultas EXISTS puede dar verdadero.
const TIPO_USUARIO = `
  CASE WHEN EXISTS (SELECT 1 FROM CLIENTE x WHERE x.numero_identificacion = u.numero_identificacion) THEN 'CLIENTE'
       WHEN EXISTS (SELECT 1 FROM AGENTE  x WHERE x.numero_identificacion = u.numero_identificacion) THEN 'AGENTE'
       ELSE 'ADMIN'
  END`;

// FECHAS: las columnas DATE y TIMESTAMP no llevan zona horaria. Si dejamos que el driver "pg" las convierta
// a Date, salen como "1995-03-12T05:00:00.000Z" y, según la zona del servidor, pueden correrse de día u hora.
// Con to_char devolvemos exactamente lo que se guardó: "1995-03-12" y "2026-10-20T10:32:25".
const FECHA = (columna) => `to_char(${columna}, 'YYYY-MM-DD')`;
const FECHA_HORA = (columna) => `to_char(${columna}, 'YYYY-MM-DD"T"HH24:MI:SS')`;

// COLUMNAS_PUBLICAS: campos que SÍ podemos devolver al frontend
// NUNCA incluye: contrasena_hash, tokens, datos sensibles
// ¿Por qué separar esto? Para no exponernos a errores si hacemos SELECT *
const COLUMNAS_PUBLICAS = `
  u.numero_identificacion, u.tipo_identificacion, u.nombre_completo,
  ${TIPO_USUARIO} AS tipo_usuario, u.correo, ${FECHA_HORA("u.fecha_registro")} AS fecha_registro, u.estado_usuario`;

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

// Función 1.b: Perfil y estado de la cuenta, leídos de la base en cada petición protegida (ver middlewares/auth.js).
// Así una cuenta suspendida, bloqueada o eliminada pierde el acceso al instante, sin esperar a que caduque su token.
async function estadoCuenta(numeroIdentificacion) {
  const { rows } = await db.query(
    `SELECT ${TIPO_USUARIO} AS tipo_usuario, u.estado_usuario FROM USUARIO u WHERE u.numero_identificacion = $1`,
    [numeroIdentificacion]
  );
  return rows[0] || null;
}

// Función 2: Obtiene el PERFIL COMPLETO de un usuario
// Devuelve: datos base + ciudad/departamento/país + datos del subtipo + teléfonos
//
// ¿Por qué tantos JOINs?
// - USUARIO es la tabla central
// - CIUDAD → DEPARTAMENTO → PAIS: el contexto geográfico (el usuario solo guarda id_ciudad)
// - CLIENTE / AGENTE / ADMIN: datos del tipo de usuario (solo uno tendrá valores; LEFT JOIN)
// - USUARIO_TELEFONO: puede haber varios teléfonos
//
// ¿Por qué COALESCE?
// - Si no hay teléfonos, devolvemos array vacío {} en vez de NULL
// - Así el frontend siempre recibe un array
//
// ¿Por qué la edad se calcula aquí?
// - En el modelo la edad es un atributo DERIVADO: no se guarda, se calcula de fecha_nacimiento
async function perfilPorId(numeroIdentificacion) {
  const { rows } = await db.query(
    `SELECT ${COLUMNAS_PUBLICAS},
            u.direccion, c.nombre AS ciudad, d.nombre AS departamento, p.nombre AS pais,
            ${FECHA("cl.fecha_nacimiento")} AS fecha_nacimiento, cl.alias, cl.foto_perfil, cl.puntos, cl.publicidad,
            EXTRACT(YEAR FROM AGE(cl.fecha_nacimiento))::int AS edad,
            ag.nit, ag.razon_social, ag.nombre_comercial, ag.descripcion, ag.logo_url,
            ag.comision::float8 AS comision, ag.experiencia,
            ad.horario, ad.salario::float8 AS salario,
            COALESCE(
              (SELECT ARRAY_AGG(t.telefono ORDER BY t.telefono)
                 FROM USUARIO_TELEFONO t
                WHERE t.numero_identificacion = u.numero_identificacion),
              '{}') AS telefonos
       FROM USUARIO u
       JOIN CIUDAD c        ON c.id_ciudad = u.id_ciudad
       JOIN DEPARTAMENTO d  ON d.id_departamento = c.id_departamento
       JOIN PAIS p          ON p.id_pais = d.id_pais
       LEFT JOIN CLIENTE cl ON cl.numero_identificacion = u.numero_identificacion
       LEFT JOIN AGENTE ag  ON ag.numero_identificacion = u.numero_identificacion
       LEFT JOIN ADMIN ad   ON ad.numero_identificacion = u.numero_identificacion
      WHERE u.numero_identificacion = $1`,
    [numeroIdentificacion]
  );
  return rows[0] || null; // Retorna perfil completo o null
}

// Función auxiliar 3: Inserta el USUARIO BASE + TELÉFONO (opcional)
//
// El formulario envía nombre y apellidos por separado; la base guarda un solo campo, nombre_completo.
// El perfil (CLIENTE o AGENTE) no se escribe aquí: queda definido por la tabla de subtipo que se inserta después.
//
// ¿Por qué el teléfono es una tabla aparte?
// - Un usuario puede tener múltiples teléfonos
// - Si fuera una columna, solo podrían tener 1
// - Esto es normalización de BD (1FN: atributo multivalorado)
//
// ¿Qué es el "trigger diferido"?
// - La BD exige que todo USUARIO esté en exactamente una de CLIENTE, AGENTE o ADMIN
// - Lo verifica al COMMIT, no en cada INSERT
// - Por eso creamos el subtipo DENTRO de la misma transacción
async function insertarUsuarioBase(cliente, d) {
  await cliente.query(
    `INSERT INTO USUARIO (numero_identificacion, tipo_identificacion, nombre_completo,
                          correo, contrasena_hash, direccion, id_ciudad, estado_usuario)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    // Un agente que se registra solo queda Pendiente hasta que un administrador lo aprueba
    [d.numero_identificacion, d.tipo_identificacion, `${d.nombre} ${d.apellidos}`,
     d.correo, d.contrasena_hash, d.direccion, d.id_ciudad, d.tipo_cuenta === "AGENTE" ? "Pendiente" : "Activo"]
  );

  // Si hay teléfono, insertarlo
  if (d.telefono) {
    await cliente.query(
      `INSERT INTO USUARIO_TELEFONO (numero_identificacion, telefono) VALUES ($1, $2)`,
      [d.numero_identificacion, d.telefono]
    );
  }
}

// Función 4: CREAR UN USUARIO COMPLETO (todo o nada)
//
// FLUJO:
// 1. Insertar USUARIO (tabla base) y su teléfono
// 2. Insertar CLIENTE o AGENTE (subtipo específico)
// 3. Si algo falla, ROLLBACK (se deshace todo)
//
// ¿Por qué transacción?
// - Si se inserta el usuario pero falla el subtipo, el trigger diferido rechazaría el COMMIT
// - Transacción garantiza: o se crea TODO, o no se crea NADA
async function crear(d) {
  return db.conTransaccion(async (cliente) => {
    // Paso 1: Crear usuario base (con teléfono)
    await insertarUsuarioBase(cliente, d);

    // Paso 2: Crear subtipo (CLIENTE o AGENTE)
    if (d.tipo_cuenta === "CLIENTE") {
      await cliente.query(
        `INSERT INTO CLIENTE (numero_identificacion, fecha_nacimiento, alias, publicidad)
         VALUES ($1, $2, $3, $4)`,
        [d.numero_identificacion, d.fecha_nacimiento, d.alias || null, d.publicidad]
      );
    } else {
      // AGENTE: comisión y experiencia quedan en sus valores por defecto (los fija un administrador)
      await cliente.query(
        `INSERT INTO AGENTE (numero_identificacion, nit, razon_social, nombre_comercial, descripcion)
         VALUES ($1, $2, $3, $4, $5)`,
        [d.numero_identificacion, d.nit, d.razon_social, d.nombre_comercial, d.descripcion || null]
      );
    }

    // Si llegamos aquí sin error, COMMIT automático (en db.conTransaccion)
    return d.numero_identificacion;
  });
}

// Función 1.c: el hash de la contraseña actual (para comprobarla antes de cambiarla) y su cambio
async function hashDeContrasena(numeroIdentificacion) {
  const { rows } = await db.query("SELECT contrasena_hash FROM USUARIO WHERE numero_identificacion = $1", [numeroIdentificacion]);
  return rows[0] ? rows[0].contrasena_hash : null;
}

async function cambiarContrasena(numeroIdentificacion, hash) {
  const { rowCount } = await db.query("UPDATE USUARIO SET contrasena_hash = $2 WHERE numero_identificacion = $1", [numeroIdentificacion, hash]);
  return rowCount > 0;
}

module.exports = { buscarPorCorreo, perfilPorId, estadoCuenta, hashDeContrasena, cambiarContrasena, crear, TIPO_USUARIO, FECHA, FECHA_HORA };
