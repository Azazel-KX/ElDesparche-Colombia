const db = require("../config/db");
const { ErrorHttp } = require("../utils/errores");
const ciudadModel = require("./ciudadModel");
const { guardarImagen, urlPublica } = require("../utils/imagenes");
const {
  fechaLarga, fechaCorta, planDeEvento, notaCancelacion, agregarNota, notaRechazo, leerRechazo, quitarRechazo,
} = require("../utils/formato");

// Modelo de EVENTOS: aquí vive TODO el SQL de la tabla EVENTO (y la UBICACION que la acompaña).
// El modelo no sabe de HTTP: no conoce req ni res, solo recibe datos y devuelve datos.
//
// Un evento tiene DOS caras en la web, según su estado:
// - Publicado (Programado, En Boletería, En Vivo, Finalizado, Cancelado): se ve en el catálogo y en los paneles.
//   Forma "web": la misma de EVENTOS en frontend/js/script.js.
// - Solicitud (En revisión, Rechazado): lo registró un agente y aún no lo aprueba un administrador. Solo lo ven su
//   agente y los administradores. Forma "solicitud": la de SOLICITUDES_DEMO.
// Es la misma fila de EVENTO; cambia solo su estado.

const SOLICITUD = ["En revisión", "Rechazado"];

// Formato de fecha que devolvemos al frontend: "2026-11-15T19:00" (sin zona horaria).
// ¿Por qué to_char y no dejar que Node convierta?
// - La columna es TIMESTAMP (sin zona). El driver "pg" la convertiría a un objeto Date usando la zona
//   horaria del servidor, y al serializar a JSON el evento podría salir corrido varias horas.
// - Con to_char la hora que se guardó es EXACTAMENTE la que se devuelve.
const FECHA = (columna) => `to_char(${columna}, 'YYYY-MM-DD"T"HH24:MI')`;

// Consulta base: un evento con su ubicación, ciudad, agente y cupos usados.
//
// Detalles que evitan bugs silenciosos:
// - precio, latitud y longitud son NUMERIC: "pg" los devuelve como TEXTO ("50000.00"). Con ::float8 llegan como número.
// - SUM() devuelve bigint, que "pg" también entrega como texto. Con ::int llega como número.
// - Las entradas "ocupadas" excluyen las reservas Canceladas (misma regla del trigger fn_reserva_reglas).
// - La causa de una cancelación (o el motivo de un rechazo) no tiene columna: va en e.observaciones.
const SELECT_EVENTO = `
  SELECT e.codigo, e.nombre, e.descripcion, e.categoria, e.url_imagen, e.teatro,
         ${FECHA("e.fecha_hora_inicio")} AS inicio,
         ${FECHA("e.fecha_hora_fin")}    AS fin,
         e.capacidad_total,
         (SELECT COALESCE(SUM(r.numero_entradas), 0)::int
            FROM RESERVA r
           WHERE r.codigo_evento = e.codigo AND r.estado <> 'Cancelada') AS ocupadas,
         e.edad_minima, e.observaciones, e.estado,
         e.precio::float8 AS precio,
         to_char(e.fecha_creacion, 'YYYY-MM-DD"T"HH24:MI:SS') AS enviado,
         e.numero_identificacion AS doc_agente, ag.nit,
         COALESCE(ag.nombre_comercial, ag.razon_social) AS agente,
         ub.id_ubicacion, ub.direccion, ub.latitud::float8 AS lat, ub.longitud::float8 AS lon,
         c.id_ciudad, c.nombre AS ciudad, d.nombre AS departamento, pa.nombre AS pais
    FROM EVENTO e
    JOIN UBICACION ub    ON ub.id_ubicacion = e.id_ubicacion
    JOIN CIUDAD c        ON c.id_ciudad = ub.id_ciudad
    JOIN DEPARTAMENTO d  ON d.id_departamento = c.id_departamento
    JOIN PAIS pa         ON pa.id_pais = d.id_pais
    JOIN AGENTE ag       ON ag.numero_identificacion = e.numero_identificacion`;

// ---------------------------------------------------------------------------------------------
// Formas que ve la web
// ---------------------------------------------------------------------------------------------

// Una fila plana de SQL -> el objeto de EVENTOS en frontend/js/script.js. "id" es el código del evento (EVT-2026-0001).
// Los cupos disponibles se CALCULAN (capacidad - reservadas); no se guardan, igual que la edad del cliente.
function aFormaWeb(f) {
  return {
    id: f.codigo,
    categoria: f.categoria,
    titulo: f.nombre,
    ciudad: f.ciudad,
    departamento: f.departamento,
    pais: f.pais,
    teatro: f.teatro,
    direccion: f.direccion,
    edad: f.edad_minima,
    fechaCorta: fechaCorta(f.inicio, f.fin),
    fechaInicio: fechaLarga(f.inicio),
    fechaFin: fechaLarga(f.fin),
    inicio: f.inicio,
    fin: f.fin,
    precio: f.precio,
    capacidad: `${f.capacidad_total.toLocaleString("es-CO")} personas`,
    disponibles: Math.max(f.capacidad_total - f.ocupadas, 0),
    observaciones: f.observaciones || "",
    estado: f.estado,
    descripcion: f.descripcion || "",
    imagen: urlPublica(f.url_imagen) || "img/evento-sin-foto.svg",
    lat: f.lat,
    lon: f.lon,
    parche: planDeEvento(f.categoria, f.precio),
    agente: f.agente,
    nitAgente: f.nit,
  };
}

// Una fila plana -> la solicitud de un agente (SOLICITUDES_DEMO). El motivo del rechazo sale de las observaciones.
function aFormaSolicitud(f) {
  return {
    id: f.codigo,
    nit: f.nit,
    agente: f.agente,
    nombre: f.nombre,
    categoria: f.categoria,
    plan: planDeEvento(f.categoria, f.precio),
    descripcion: f.descripcion || "",
    inicio: f.inicio,
    fin: f.fin,
    ciudad: f.ciudad,
    departamento: f.departamento,
    teatro: f.teatro,
    direccion: f.direccion,
    lat: f.lat,
    lon: f.lon,
    capacidad: f.capacidad_total,
    precio: f.precio,
    edad: f.edad_minima,
    observaciones: quitarRechazo(f.observaciones) || "",
    imagen: urlPublica(f.url_imagen),
    estado: f.estado,
    motivo: f.estado === "Rechazado" ? leerRechazo(f.observaciones) : "",
    enviado: f.enviado,
  };
}

// ---------------------------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------------------------

// Función 1: CATÁLOGO PÚBLICO con filtros y paginación. Nunca incluye solicitudes (En revisión / Rechazado).
//
// El WHERE se arma con una lista de condiciones. Los VALORES nunca se pegan en el texto del SQL:
// van en el arreglo "params" y el SQL solo tiene $1, $2... (así es imposible la inyección SQL).
// Lo único que se concatena son fragmentos fijos que escribimos nosotros, jamás datos del usuario.
async function listarPublicos({ ciudad, categoria, estado, limite, pagina }) {
  const condiciones = ["e.estado NOT IN ('En revisión', 'Rechazado')"];
  const params = [];
  const agregar = (sql, valor) => {
    params.push(valor);
    condiciones.push(sql.replace("?", `$${params.length}`));
  };

  if (ciudad) agregar("c.id_ciudad = ?", ciudad);
  if (categoria) agregar("e.categoria = ?", categoria);
  if (estado) agregar("e.estado = ?::estado_evento_t", estado);

  const where = `WHERE ${condiciones.join(" AND ")}`;

  // Dos consultas en paralelo: la página pedida y el total (para que el frontend pinte la paginación)
  const [paginaRows, totalRows] = await Promise.all([
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

  return { eventos: paginaRows.rows.map(aFormaWeb), total: totalRows.rows[0].total };
}

// Función 2: un evento por su código, tal cual está en la base (cualquier estado). null si no existe.
// Es para decidir permisos y reglas; lo que se le muestra a la web pasa por aFormaWeb o aFormaSolicitud.
async function obtenerFila(codigo) {
  const { rows } = await db.query(`${SELECT_EVENTO} WHERE e.codigo = $1`, [codigo]);
  return rows[0] || null;
}

// Un evento publicado en forma web (null si no existe o todavía es una solicitud)
async function obtenerPublico(codigo) {
  const fila = await obtenerFila(codigo);
  return fila && !SOLICITUD.includes(fila.estado) ? aFormaWeb(fila) : null;
}

// Todos los eventos publicados (administrador) o solo los de un agente (su documento)
async function listarPublicados({ docAgente } = {}) {
  const { rows } = await db.query(
    `${SELECT_EVENTO}
      WHERE e.estado NOT IN ('En revisión', 'Rechazado') AND ($1::text IS NULL OR e.numero_identificacion = $1)
      ORDER BY e.fecha_hora_inicio, e.codigo`,
    [docAgente || null]
  );
  return rows.map(aFormaWeb);
}

// Las solicitudes: las "En revisión" (administrador) o todas las de un agente, incluidas las rechazadas
async function listarSolicitudes({ docAgente, soloEnRevision } = {}) {
  const { rows } = await db.query(
    `${SELECT_EVENTO}
      WHERE e.estado IN ('En revisión', 'Rechazado')
        AND ($1::text IS NULL OR e.numero_identificacion = $1)
        AND ($2::boolean IS NOT TRUE OR e.estado = 'En revisión')
      ORDER BY e.fecha_creacion, e.codigo`,
    [docAgente || null, soloEnRevision || false]
  );
  return rows.map(aFormaSolicitud);
}

// ---------------------------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------------------------

// Función auxiliar: busca la ciudad por su nombre (así la elige el formulario) y falla con un 400 claro si no existe
const ciudadObligatoria = (cliente, nombre) => ciudadModel.idObligatorio(nombre, cliente);

// Función auxiliar: inserta una UBICACION y devuelve su id.
// Recibe "cliente" (la conexión de la transacción) para que todo quede en el mismo "todo o nada".
async function insertarUbicacion(cliente, datos, idCiudad) {
  const { rows } = await cliente.query(
    `INSERT INTO UBICACION (direccion, latitud, longitud, id_ciudad)
     VALUES ($1, $2, $3, $4) RETURNING id_ubicacion`,
    [datos.direccion, datos.lat, datos.lon, idCiudad]
  );
  return rows[0].id_ubicacion;
}

// Función auxiliar: genera el siguiente código "EVT-AAAA-NNNN" (EVT-2026-0008, por ejemplo)
//
// El número sale de la secuencia evento_numero_seq (ver el esquema). Una secuencia resuelve dos problemas:
// - Concurrencia: si dos agentes crean un evento al mismo tiempo, cada uno recibe un número distinto sin candados.
// - Reutilización: si se borra un evento, su número no se vuelve a entregar, así que un enlace viejo nunca apunta a
//   otro evento. (Si una transacción falla, su número se pierde: quedan saltos, y está bien.)
// El año es el de creación; el número sigue corriendo de un año al siguiente.
async function siguienteCodigo(cliente) {
  const { rows } = await cliente.query(
    `SELECT 'EVT-' || EXTRACT(YEAR FROM NOW())::int || '-' || LPAD(nextval('evento_numero_seq')::text, 4, '0') AS codigo`
  );
  return rows[0].codigo;
}

// Función 3: CREAR un evento (ubicación + evento en una sola transacción). Devuelve el código.
//   docAgente: documento del agente dueño.   estado: "En revisión" (agente) o "Programado" (administrador).
// Si el INSERT del evento falla, la ubicación recién creada también se deshace: no quedan filas huérfanas.
async function crear(datos, docAgente, estado) {
  const url = guardarImagen(datos.imagen, "eventos", "evento");
  return db.conTransaccion(async (cliente) => {
    const idCiudad = await ciudadObligatoria(cliente, datos.ciudad);
    const idUbicacion = await insertarUbicacion(cliente, datos, idCiudad);
    const codigo = await siguienteCodigo(cliente);

    await cliente.query(
      `INSERT INTO EVENTO (codigo, nombre, descripcion, categoria, url_imagen, teatro, fecha_hora_inicio, fecha_hora_fin,
                           capacidad_total, edad_minima, observaciones, estado, precio, id_ubicacion, numero_identificacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::estado_evento_t, $13, $14, $15)`,
      [codigo, datos.nombre, datos.descripcion, datos.categoria, url, datos.teatro, datos.inicio, datos.fin,
       datos.capacidad, datos.edad, datos.observaciones, estado, datos.precio, idUbicacion, docAgente]
    );
    return codigo;
  });
}

// Función auxiliar: BLOQUEA la fila del evento y devuelve lo mínimo que hace falta para decidir.
// FOR UPDATE = nadie más puede modificar este evento hasta que termine nuestra transacción.
// (El trigger de reservas también bloquea el evento, así que no se cuelan reservas a mitad de nuestra edición.)
async function bloquearEvento(cliente, codigo) {
  const { rows } = await cliente.query(
    `SELECT e.numero_identificacion AS doc_agente, e.estado, e.capacidad_total, e.observaciones, e.id_ubicacion,
            e.url_imagen, ub.direccion, ub.latitud::float8 AS lat, ub.longitud::float8 AS lon, ub.id_ciudad,
            (SELECT COALESCE(SUM(r.numero_entradas), 0)::int
               FROM RESERVA r
              WHERE r.codigo_evento = e.codigo AND r.estado <> 'Cancelada') AS ocupadas
       FROM EVENTO e
       JOIN UBICACION ub ON ub.id_ubicacion = e.id_ubicacion
      WHERE e.codigo = $1
        FOR UPDATE OF e`,
    [codigo]
  );
  return rows[0] || null;
}

// Las notas que escribe el sistema (cancelación y rechazo) no las edita el usuario: al guardar el formulario, las
// observaciones nuevas reemplazan a las anteriores pero las notas que ya estuvieran se conservan.
const ES_NOTA = /^(Cancelad[oa] por |Rechazado por )/;
function mezclar(nuevas, anteriores) {
  const notas = String(anteriores || "").split("\n").filter((l) => ES_NOTA.test(l));
  const base = String(nuevas || "").split("\n").filter((l) => !ES_NOTA.test(l)).join("\n").trim();
  return [base, ...notas].filter(Boolean).join("\n") || null;
}

// Función 4: ACTUALIZAR los datos de un evento. Devuelve false si el evento no existe.
//
// "verificar" es una función que entrega el controlador con las reglas de negocio
// (¿es el dueño? ¿el estado permite editar? ¿la capacidad alcanza para las reservas?).
// Se ejecuta DENTRO de la transacción, con el evento bloqueado, así lo que se comprueba
// sigue siendo cierto cuando se escribe. Si lanza un error, se hace ROLLBACK.
//
// "estadoNuevo" (opcional): un agente que corrige una solicitud la vuelve a enviar -> "En revisión", y se borra el
// motivo del rechazo anterior de las observaciones.
async function actualizar(codigo, datos, verificar, estadoNuevo) {
  // imagen null = la web no la mandó (se conserva); "" = se quita; data URL o URL = se guarda
  const url = datos.imagen === null ? undefined : guardarImagen(datos.imagen, "eventos", "evento");
  return db.conTransaccion(async (cliente) => {
    const actual = await bloquearEvento(cliente, codigo);
    if (!actual) return false;
    verificar(actual);

    const idCiudad = await ciudadObligatoria(cliente, datos.ciudad);
    // La ubicación puede estar compartida con otros eventos: en vez de modificarla, creamos una nueva (solo si cambió)
    const igual = actual.direccion === datos.direccion && actual.id_ciudad === idCiudad &&
                  Math.abs(actual.lat - datos.lat) < 1e-6 && Math.abs(actual.lon - datos.lon) < 1e-6;
    const idUbicacion = igual ? actual.id_ubicacion : await insertarUbicacion(cliente, datos, idCiudad);

    const mezcladas = mezclar(datos.observaciones, actual.observaciones);
    const observaciones = estadoNuevo ? quitarRechazo(mezcladas) : mezcladas;

    await cliente.query(
      `UPDATE EVENTO
          SET nombre = $2, descripcion = $3, categoria = $4, url_imagen = $5, teatro = $6, fecha_hora_inicio = $7,
              fecha_hora_fin = $8, capacidad_total = $9, edad_minima = $10, observaciones = $11, precio = $12,
              id_ubicacion = $13, estado = COALESCE($14::estado_evento_t, estado)
        WHERE codigo = $1`,
      [codigo, datos.nombre, datos.descripcion, datos.categoria, url === undefined ? actual.url_imagen : url, datos.teatro,
       datos.inicio, datos.fin, datos.capacidad, datos.edad, observaciones, datos.precio, idUbicacion, estadoNuevo || null]
    );
    return true;
  });
}

// Función 5: CAMBIAR EL ESTADO de un evento publicado. Devuelve false si no existe.
// Misma idea que actualizar(): "verificar" corre dentro de la transacción con el evento bloqueado.
//   observaciones: el texto completo (con la nota de cancelación ya agregada); null si el estado no es Cancelado.
//   quien: "el administrador" | "el agente", para la nota de las reservas que se cancelan en cascada.
// Al CANCELAR un evento también se cancelan sus reservas Reservada y Confirmada (las Usadas ya entraron).
async function cambiarEstado(codigo, { estado, observaciones }, quien, verificar) {
  return db.conTransaccion(async (cliente) => {
    const actual = await bloquearEvento(cliente, codigo);
    if (!actual) return false;
    verificar(actual);

    // Si no llega el texto completo, la nota se agrega en una línea nueva (como agregarNota() de la web)
    const texto = typeof observaciones === "function" ? observaciones(actual.observaciones) : observaciones;
    await cliente.query(
      `UPDATE EVENTO SET estado = $2::estado_evento_t, observaciones = COALESCE($3, observaciones) WHERE codigo = $1`,
      [codigo, estado, texto]
    );

    if (estado === "Cancelado") {
      await cliente.query(
        `UPDATE RESERVA
            SET estado = 'Cancelada',
                observaciones = CASE WHEN observaciones IS NULL OR observaciones = '' THEN $2::text
                                     ELSE observaciones || E'\\n' || $2::text END
          WHERE codigo_evento = $1 AND estado IN ('Reservada', 'Confirmada')`,
        [codigo, notaCancelacion("reserva", quien, "Otra causa", "el evento se canceló")]
      );
    }
    return true;
  });
}

// Función 6: decidir una solicitud. Aprobado -> Programado (se publica). Rechazado -> el motivo se agrega a las
// observaciones. Devuelve false si no existe; lanza 409 si ya no está "En revisión".
async function decidirSolicitud(codigo, { estado, motivo }) {
  return db.conTransaccion(async (cliente) => {
    const actual = await bloquearEvento(cliente, codigo);
    if (!actual) return false;
    if (actual.estado !== "En revisión") {
      throw new ErrorHttp(409, actual.estado === "Rechazado"
        ? "Esta solicitud ya fue rechazada: el agente debe corregirla y enviarla de nuevo."
        : `El evento ya está "${actual.estado}": no es una solicitud por revisar.`);
    }

    const limpias = quitarRechazo(actual.observaciones);
    const observaciones = estado === "Aprobado" ? limpias : agregarNota(limpias, notaRechazo(motivo));
    await cliente.query(`UPDATE EVENTO SET estado = $2::estado_evento_t, observaciones = $3 WHERE codigo = $1`,
      [codigo, estado === "Aprobado" ? "Programado" : "Rechazado", observaciones]);
    return true;
  });
}

// Función 7: ELIMINAR un evento (sus reservas se borran en cascada).
async function eliminar(codigo, verificar) {
  return db.conTransaccion(async (cliente) => {
    const actual = await bloquearEvento(cliente, codigo);
    if (!actual) return false;
    if (verificar) verificar(actual);
    await cliente.query("DELETE FROM EVENTO WHERE codigo = $1", [codigo]);
    return true;
  });
}

// Documento del agente a partir de su NIT (null si no existe)
async function docAgentePorNit(nit) {
  const { rows } = await db.query("SELECT numero_identificacion FROM AGENTE WHERE nit = $1", [nit]);
  return rows[0] ? rows[0].numero_identificacion : null;
}

module.exports = {
  docAgentePorNit, aFormaWeb, aFormaSolicitud, listarPublicos, obtenerFila, obtenerPublico, listarPublicados, listarSolicitudes,
  crear, actualizar, cambiarEstado, decidirSolicitud, eliminar,
};
