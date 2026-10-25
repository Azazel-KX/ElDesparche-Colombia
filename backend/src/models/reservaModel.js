const db = require("../config/db");
const { ErrorHttp } = require("../utils/errores");
const { ESTADOS_RESERVABLES } = require("../utils/validacionEvento");
const { codigoReserva, idDeCodigoReserva, agregarNota, notaCancelacion } = require("../utils/formato");

// Modelo de RESERVAS. Aquí vive el SQL de las reservas de los tres perfiles:
// el cliente (las suyas), el agente (las de sus eventos) y el administrador (todas).
// Las reglas de negocio (edad mínima, cupo, valor_total = entradas × precio) las hace cumplir la base
// con el trigger fn_reserva_reglas; aquí solo se comprueban las que dan un mensaje mejor que el del trigger.

// Consulta base: una reserva con su cliente y su evento.
// La forma de la fila de salida es la de reservasLocales() en frontend/js/admin.js.
const SELECT_RESERVA = `
  SELECT r.id_reserva, to_char(r.fecha_hora, 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha, r.estado, r.numero_entradas,
         r.valor_total::float8 AS valor, r.observaciones,
         u.nombre_completo AS cliente, u.tipo_identificacion || ' ' || u.numero_identificacion AS documento,
         u.correo, r.numero_identificacion AS doc_cliente, r.codigo_qr,
         e.codigo AS evento_id, e.nombre AS evento, e.precio::float8 AS precio, e.estado AS estado_evento,
         e.numero_identificacion AS doc_agente
    FROM RESERVA r
    JOIN USUARIO u ON u.numero_identificacion = r.numero_identificacion
    JOIN EVENTO e  ON e.codigo = r.codigo_evento
`;

// ---------------------------------------------------------------------------------------------
// Formas que ve la web
// ---------------------------------------------------------------------------------------------

// "Usada" es un estado interno de la reserva (la entrada ya se validó en la puerta): la web solo conoce Reservada,
// Confirmada y Cancelada, así que una Usada se ve Confirmada y se marca con usada: true.
function aFormaWeb(f) {
  return {
    codigo: codigoReserva(f.id_reserva),
    fecha: f.fecha,
    estado: f.estado === "Usada" ? "Confirmada" : f.estado,
    usada: f.estado === "Usada",
    cliente: f.cliente,
    documento: f.documento,
    correo: f.correo,
    eventoId: f.evento_id,
    evento: f.evento,
    entradas: f.numero_entradas,
    precio: f.precio,
    valor: f.valor,
    observaciones: f.observaciones || "",
  };
}

// ---------------------------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------------------------

// Las reservas de todos (administrador), de los eventos de un agente (docAgente) o de un cliente (docCliente)
async function listar({ docAgente, docCliente } = {}) {
  const { rows } = await db.query(
    `${SELECT_RESERVA}
      WHERE ($1::text IS NULL OR e.numero_identificacion = $1) AND ($2::text IS NULL OR r.numero_identificacion = $2)
      ORDER BY r.fecha_hora DESC, r.id_reserva DESC`,
    [docAgente || null, docCliente || null]
  );
  return rows.map(aFormaWeb);
}

// La fila de una reserva por su código "DES-1041" (null si el código no es válido o no existe)
async function obtenerFila(codigo) {
  const id = idDeCodigoReserva(codigo);
  if (!id) return null;
  const { rows } = await db.query(`${SELECT_RESERVA} WHERE r.id_reserva = $1`, [id]);
  return rows[0] || null;
}

const obtener = async (codigo) => {
  const fila = await obtenerFila(codigo);
  return fila ? aFormaWeb(fila) : null;
};

// ---------------------------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------------------------

// Crea una reserva y devuelve su código. Comprueba lo que da un mensaje mejor que el trigger: que el cliente exista y
// esté activo, y que el evento exista y todavía se puedan comprar entradas (no Finalizado, Cancelado ni una solicitud).
// El valor_total lo calcula el trigger (entradas × precio); la edad mínima y el cupo también.
//   estado: "Reservada" o "Confirmada". Un evento gratis siempre queda Confirmada (no hay nada que pagar).
async function crear({ docCliente, codigoEvento, entradas, estado, observaciones }) {
  return db.conTransaccion(async (cliente) => {
    const c = await cliente.query(
      `SELECT u.estado_usuario FROM CLIENTE cl JOIN USUARIO u ON u.numero_identificacion = cl.numero_identificacion
        WHERE cl.numero_identificacion = $1`, [docCliente]);
    if (!c.rows[0]) throw new ErrorHttp(400, "El cliente elegido no existe.", { cliente: "El cliente elegido no existe." });
    if (c.rows[0].estado_usuario !== "Activo") throw new ErrorHttp(409, "La cuenta del cliente no está activa.", { cliente: "La cuenta del cliente no está activa." });

    const ev = await cliente.query(
      "SELECT estado, precio::float8 AS precio, fecha_hora_fin <= NOW() AS terminado FROM EVENTO WHERE codigo = $1", [codigoEvento]);
    if (!ev.rows[0]) throw new ErrorHttp(400, "El evento elegido no existe.", { evento: "El evento elegido no existe." });
    if (!ESTADOS_RESERVABLES.includes(ev.rows[0].estado)) {
      throw new ErrorHttp(409, `No se pueden reservar entradas: el evento está "${ev.rows[0].estado}".`);
    }
    // El estado lo cambia una persona: un evento puede seguir "Programado" aunque su fecha de fin ya pasó
    if (ev.rows[0].terminado) throw new ErrorHttp(409, "No se pueden reservar entradas: el evento ya terminó.");

    const { rows } = await cliente.query(
      `INSERT INTO RESERVA (numero_entradas, estado, observaciones, numero_identificacion, codigo_evento)
       VALUES ($1, $2::estado_reserva_t, $3, $4, $5) RETURNING id_reserva`,
      [entradas, ev.rows[0].precio === 0 ? "Confirmada" : estado, observaciones, docCliente, codigoEvento]
    );
    return codigoReserva(rows[0].id_reserva);
  });
}

// Bloquea la reserva (y deja ver su evento) para decidir sin que otra petición la cambie a la vez.
async function bloquear(cliente, codigo) {
  const id = idDeCodigoReserva(codigo);
  if (!id) return null;
  const { rows } = await cliente.query(
    `SELECT r.id_reserva, r.estado, r.numero_entradas, r.observaciones, r.numero_identificacion AS doc_cliente,
            e.codigo AS evento_id, e.estado AS estado_evento, e.numero_identificacion AS doc_agente,
            e.fecha_hora_fin <= NOW() AS evento_terminado
       FROM RESERVA r JOIN EVENTO e ON e.codigo = r.codigo_evento
      WHERE r.id_reserva = $1
        FOR UPDATE OF r`,
    [id]
  );
  return rows[0] || null;
}

// Modifica entradas, estado u observaciones. "verificar" corre dentro de la transacción con la reserva bloqueada.
// Devuelve false si no existe. Si cambian las entradas, el trigger recalcula el valor con el precio original.
async function actualizar(codigo, { entradas, estado, observaciones }, verificar) {
  return db.conTransaccion(async (cliente) => {
    const actual = await bloquear(cliente, codigo);
    if (!actual) return false;
    verificar(actual);
    await cliente.query(
      `UPDATE RESERVA SET numero_entradas = COALESCE($2, numero_entradas), estado = COALESCE($3::estado_reserva_t, estado),
                          observaciones = CASE WHEN $4::boolean THEN $5 ELSE observaciones END
        WHERE id_reserva = $1`,
      [actual.id_reserva, entradas === undefined ? null : entradas, estado === undefined ? null : estado,
       observaciones !== undefined, observaciones === undefined ? null : observaciones]
    );
    return true;
  });
}

// Cancela una reserva. "observaciones" es el texto completo (observaciones anteriores + nota de causa) o una función
// que lo arma a partir de las que ya tenía. "verificar" decide si quien pide puede cancelarla. false si no existe.
async function cancelar(codigo, observaciones, verificar) {
  return db.conTransaccion(async (cliente) => {
    const actual = await bloquear(cliente, codigo);
    if (!actual) return false;
    verificar(actual);
    const texto = typeof observaciones === "function" ? observaciones(actual.observaciones) : observaciones;
    await cliente.query("UPDATE RESERVA SET estado = 'Cancelada', observaciones = $2 WHERE id_reserva = $1", [actual.id_reserva, texto]);
    return true;
  });
}

// Elimina una reserva . false si no existe.
async function eliminar(codigo) {
  const id = idDeCodigoReserva(codigo);
  if (!id) return false;
  const { rowCount } = await db.query("DELETE FROM RESERVA WHERE id_reserva = $1", [id]);
  return rowCount > 0;
}

// Marca la entrada como usada (ingreso a la puerta del evento) y devuelve los datos del ingreso.
// Todo ocurre con la reserva bloqueada, así dos lectores del mismo QR a la vez no pueden entrar los dos.
//   docAgente: si lo trae un agente, la reserva debe ser de uno de SUS eventos; el administrador no lo trae.
async function registrarIngreso(codigo, { docAgente, revisor }) {
  return db.conTransaccion(async (cliente) => {
    const actual = await bloquear(cliente, codigo);
    if (!actual) throw new ErrorHttp(404, "No encontramos una reserva con ese código.");
    if (docAgente && actual.doc_agente !== docAgente) throw new ErrorHttp(403, "Esta entrada es de otro organizador.");

    if (actual.estado === "Usada") throw new ErrorHttp(409, "Esta entrada ya se usó.");
    if (actual.estado === "Cancelada") throw new ErrorHttp(409, "La reserva está cancelada: la entrada no sirve.");
    if (actual.estado === "Reservada") throw new ErrorHttp(409, "La reserva todavía no está aprobada por un administrador.");
    if (actual.estado_evento === "Finalizado" || actual.estado_evento === "Cancelado") {
      throw new ErrorHttp(409, `El evento está ${actual.estado_evento === "Cancelado" ? "cancelado" : "finalizado"}.`);
    }
    if (actual.evento_terminado) throw new ErrorHttp(409, "El evento ya terminó.");

    await cliente.query("UPDATE RESERVA SET estado = 'Usada' WHERE id_reserva = $1", [actual.id_reserva]);

    const { rows } = await cliente.query(
      `SELECT to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha,
              (SELECT nombre_completo FROM USUARIO WHERE numero_identificacion = $1) AS revisor,
              (SELECT nombre_completo FROM USUARIO WHERE numero_identificacion = $2) AS cliente,
              (SELECT nombre FROM EVENTO WHERE codigo = $3) AS evento`,
      [revisor, actual.doc_cliente, actual.evento_id]
    );
    return { fecha: rows[0].fecha, eventoId: actual.evento_id, evento: rows[0].evento, cliente: rows[0].cliente,
      entradas: actual.numero_entradas, revisadoPor: rows[0].revisor };
  });
}

module.exports = {
  aFormaWeb, listar, obtener, obtenerFila, crear, actualizar, cancelar, eliminar, registrarIngreso,
  agregarNota, notaCancelacion,
};
