const db = require("../config/db");

// Modelo de EVENTOS: aquí vive TODO el SQL de la tabla EVENTO (y la UBICACION que la acompaña).
// El modelo no sabe de HTTP: no conoce req ni res, solo recibe datos y devuelve datos.

// Formato de fecha que devolvemos al frontend: "2026-11-15T19:00:00" (sin zona horaria).
// ¿Por qué to_char y no dejar que Node convierta?
// - La columna es TIMESTAMP (sin zona). El driver "pg" la convertiría a un objeto Date usando la zona
//   horaria del servidor, y al serializar a JSON el evento podría salir corrido varias horas.
// - Con to_char la hora que se guardó es EXACTAMENTE la que se devuelve.
const FECHA = (columna) => `to_char(${columna}, 'YYYY-MM-DD"T"HH24:MI:SS')`;

// Consulta base: un evento con su ubicación, ciudad, agente y cupos usados.
// La causa de una cancelación no tiene tabla propia: va escrita en e.observaciones.
//
// Detalles que evitan bugs silenciosos:
// - precio, latitud y longitud son NUMERIC: "pg" los devuelve como TEXTO ("50000.00"). Con ::float8 llegan como número.
// - SUM() devuelve bigint, que "pg" también entrega como texto. Con ::int llega como número.
// - Las entradas "ocupadas" excluyen las reservas Canceladas (misma regla del trigger fn_reserva_reglas).
const SELECT_EVENTO = `
  SELECT e.codigo, e.nombre, e.descripcion, e.categoria, e.url_imagen,
         ${FECHA("e.fecha_hora_inicio")} AS fecha_hora_inicio,
         ${FECHA("e.fecha_hora_fin")}    AS fecha_hora_fin,
         e.capacidad_total,
         (SELECT COALESCE(SUM(r.numero_entradas), 0)::int
            FROM RESERVA r
           WHERE r.codigo_evento = e.codigo AND r.estado <> 'Cancelada') AS entradas_reservadas,
         e.edad_minima, e.observaciones, e.estado,
         e.precio::float8 AS precio,
         ${FECHA("e.fecha_creacion")} AS fecha_creacion,
         e.teatro,
         e.numero_identificacion AS id_agente,
         COALESCE(ag.nombre_comercial, ag.razon_social) AS agente,
         ub.id_ubicacion, ub.direccion, ub.latitud::float8 AS latitud, ub.longitud::float8 AS longitud,
         c.id_ciudad, c.nombre AS ciudad, d.nombre AS departamento
    FROM EVENTO e
    JOIN UBICACION ub    ON ub.id_ubicacion = e.id_ubicacion
    JOIN CIUDAD c        ON c.id_ciudad = ub.id_ciudad
    JOIN DEPARTAMENTO d  ON d.id_departamento = c.id_departamento
    JOIN AGENTE ag       ON ag.numero_identificacion = e.numero_identificacion`;

// Convierte una fila plana de SQL en el JSON que ve el frontend (con la ubicación anidada).
// Los cupos disponibles se CALCULAN (capacidad - reservadas); no se guardan, igual que la edad del cliente.
function darForma(f) {
  return {
    codigo: f.codigo,
    nombre: f.nombre,
    descripcion: f.descripcion,
    categoria: f.categoria,
    url_imagen: f.url_imagen,
    teatro: f.teatro,
    fecha_hora_inicio: f.fecha_hora_inicio,
    fecha_hora_fin: f.fecha_hora_fin,
    capacidad_total: f.capacidad_total,
    cupos_disponibles: f.capacidad_total - f.entradas_reservadas,
    edad_minima: f.edad_minima,
    observaciones: f.observaciones,
    estado: f.estado,
    precio: f.precio,
    fecha_creacion: f.fecha_creacion,
    agente: { numero_identificacion: f.id_agente, nombre: f.agente },
    ubicacion: {
      id_ubicacion: f.id_ubicacion,
      direccion: f.direccion,
      latitud: f.latitud,
      longitud: f.longitud,
      id_ciudad: f.id_ciudad,
      ciudad: f.ciudad,
      departamento: f.departamento,
    },
  };
}

// Función 1: LISTAR eventos con filtros y paginación
//
// El WHERE se arma con una lista de condiciones. Los VALORES nunca se pegan en el texto del SQL:
// van en el arreglo "params" y el SQL solo tiene $1, $2... (así es imposible la inyección SQL).
// Lo único que se concatena son fragmentos fijos que escribimos nosotros, jamás datos del usuario.
async function listar({ ciudad, categoria, estado, limite, pagina }) {
  const condiciones = [];
  const params = [];
  const agregar = (sql, valor) => {
    params.push(valor);
    condiciones.push(sql.replace("?", `$${params.length}`));
  };

  if (ciudad) agregar("c.id_ciudad = ?", ciudad);
  if (categoria) agregar("e.categoria = ?", categoria);
  if (estado) agregar("e.estado = ?::estado_evento_t", estado);

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

  // Dos consultas en paralelo: la página pedida y el total (para que el frontend pinte la paginación)
  const [pagina_rows, total_rows] = await Promise.all([
    db.query(
      `${SELECT_EVENTO} ${where}
        ORDER BY e.fecha_hora_inicio, e.codigo
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limite, (pagina - 1) * limite]
    ),
    db.query(
      `SELECT COUNT(*)::int AS total
         FROM EVENTO e
         JOIN UBICACION ub ON ub.id_ubicacion = e.id_ubicacion
         JOIN CIUDAD c     ON c.id_ciudad = ub.id_ciudad
       ${where}`,
      params
    ),
  ]);

  return { eventos: pagina_rows.rows.map(darForma), total: total_rows.rows[0].total };
}

// Función 2: OBTENER un evento por su código (null si no existe)
async function obtener(codigo) {
  const { rows } = await db.query(`${SELECT_EVENTO} WHERE e.codigo = $1`, [codigo]);
  return rows[0] ? darForma(rows[0]) : null;
}

// Función auxiliar: inserta una UBICACION y devuelve su id.
// Recibe "cliente" (la conexión de la transacción) para que todo quede en el mismo "todo o nada".
async function insertarUbicacion(cliente, u) {
  const { rows } = await cliente.query(
    `INSERT INTO UBICACION (direccion, latitud, longitud, id_ciudad)
     VALUES ($1, $2, $3, $4) RETURNING id_ubicacion`,
    [u.direccion, u.latitud, u.longitud, u.id_ciudad]
  );
  return rows[0].id_ubicacion;
}

// Función auxiliar: genera el siguiente código "EVT-AAAA-NNNN" (EVT-2026-0006, por ejemplo)
//
// PROBLEMA: si dos agentes crean un evento al mismo tiempo, ambos leen "el último es 0005"
// y ambos intentan guardar el 0006 → uno falla. Es una condición de carrera.
// SOLUCIÓN: un "advisory lock" de transacción. El segundo espera a que el primero haga COMMIT
// y recién ahí calcula su número. El candado se libera solo al terminar la transacción.
async function siguienteCodigo(cliente) {
  await cliente.query("SELECT pg_advisory_xact_lock(hashtext('evento_codigo'))");
  const { rows } = await cliente.query(
    `SELECT 'EVT-' || EXTRACT(YEAR FROM NOW())::int || '-' ||
            LPAD((COALESCE(MAX(SUBSTRING(codigo FROM '[0-9]+$')::int), 0) + 1)::text, 4, '0') AS codigo
       FROM EVENTO
      WHERE codigo LIKE 'EVT-' || EXTRACT(YEAR FROM NOW())::int || '-%'`
  );
  return rows[0].codigo;
}

// Función 3: CREAR un evento (ubicación + evento en una sola transacción)
// Si el INSERT del evento falla, la ubicación recién creada también se deshace: no quedan filas huérfanas.
async function crear(datos, idAgente) {
  return db.conTransaccion(async (cliente) => {
    const idUbicacion = await insertarUbicacion(cliente, datos.ubicacion);
    const codigo = await siguienteCodigo(cliente);

    await cliente.query(
      `INSERT INTO EVENTO (codigo, nombre, descripcion, categoria, url_imagen, teatro, fecha_hora_inicio, fecha_hora_fin,
                           capacidad_total, edad_minima, observaciones, precio, id_ubicacion, numero_identificacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [codigo, datos.nombre, datos.descripcion, datos.categoria, datos.url_imagen, datos.teatro, datos.fecha_hora_inicio,
       datos.fecha_hora_fin, datos.capacidad_total, datos.edad_minima, datos.observaciones, datos.precio,
       idUbicacion, idAgente]
    );
    return codigo;
  });
}

// Función auxiliar: BLOQUEA la fila del evento y devuelve lo mínimo que hace falta para decidir.
// FOR UPDATE = nadie más puede modificar este evento hasta que termine nuestra transacción.
// (El trigger de reservas también bloquea el evento, así que no se cuelan reservas a mitad de nuestra edición.)
async function bloquearEvento(cliente, codigo) {
  const { rows } = await cliente.query(
    `SELECT e.numero_identificacion AS id_agente, e.estado, e.capacidad_total,
            (SELECT COALESCE(SUM(r.numero_entradas), 0)::int
               FROM RESERVA r
              WHERE r.codigo_evento = e.codigo AND r.estado <> 'Cancelada') AS entradas_reservadas
       FROM EVENTO e
      WHERE e.codigo = $1
        FOR UPDATE OF e`,
    [codigo]
  );
  return rows[0] || null;
}

// Función 4: ACTUALIZAR los datos de un evento
//
// "verificar" es una función que entrega el controlador con las reglas de negocio
// (¿es el dueño? ¿el estado permite editar? ¿la capacidad alcanza para las reservas?).
// Se ejecuta DENTRO de la transacción, con el evento bloqueado, así lo que se comprueba
// sigue siendo cierto cuando se escribe. Si lanza un error, se hace ROLLBACK.
// Devuelve false si el evento no existe.
async function actualizar(codigo, datos, verificar) {
  return db.conTransaccion(async (cliente) => {
    const actual = await bloquearEvento(cliente, codigo);
    if (!actual) return false;
    verificar(actual);

    // La ubicación puede estar compartida con otros eventos: en vez de modificarla, creamos una nueva
    const idUbicacion = datos.ubicacion ? await insertarUbicacion(cliente, datos.ubicacion) : null;

    await cliente.query(
      `UPDATE EVENTO
          SET nombre = $2, descripcion = $3, categoria = $4, url_imagen = $5, teatro = $6, fecha_hora_inicio = $7,
              fecha_hora_fin = $8, capacidad_total = $9, edad_minima = $10, observaciones = $11, precio = $12,
              id_ubicacion = COALESCE($13, id_ubicacion)
        WHERE codigo = $1`,
      [codigo, datos.nombre, datos.descripcion, datos.categoria, datos.url_imagen, datos.teatro, datos.fecha_hora_inicio,
       datos.fecha_hora_fin, datos.capacidad_total, datos.edad_minima, datos.observaciones, datos.precio, idUbicacion]
    );
    return true;
  });
}

// Función 5: CAMBIAR EL ESTADO de un evento.
// Al cancelar, "observaciones" recibe el texto de la causa ("Cancelado por el agente. Causa: ..."), que reemplaza
// a las observaciones anteriores (igual que hace la web). En los demás cambios de estado viene null y no se toca.
// Misma idea que actualizar(): "verificar" corre dentro de la transacción con el evento bloqueado.
async function cambiarEstado(codigo, { estado, observaciones }, verificar) {
  return db.conTransaccion(async (cliente) => {
    const actual = await bloquearEvento(cliente, codigo);
    if (!actual) return false;
    verificar(actual);

    await cliente.query(
      `UPDATE EVENTO SET estado = $2::estado_evento_t, observaciones = COALESCE($3, observaciones) WHERE codigo = $1`,
      [codigo, estado, observaciones]
    );
    return true;
  });
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado };
