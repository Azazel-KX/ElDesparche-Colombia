const reservaModel = require("../models/reservaModel");
const { validarReservaNueva, validarReservaEdicion, validarCancelacionPanel } = require("../utils/validacionReserva");
const { ErrorHttp, esRestriccion } = require("../utils/errores");

// Reservas vistas por el ADMINISTRADOR (rutas /api/admin/reservas y /api/admin/entradas). Contrato en
// frontend/js/admin.js. La respuesta tiene la forma de reservasLocales(). El código de una reserva es "DES-1041".

// GET /api/admin/reservas -> { reservas: [ igual que reservasLocales() ] }
async function listar(_req, res) {
  res.json({ reservas: await reservaModel.listar() });
}

// POST /api/admin/reservas  { documento: "CC 123", eventoId, entradas, estado, observaciones }
// Registra una reserva para un cliente, sin pago en Wompi (por ejemplo, una venta en taquilla). El valor, el código y
// la fecha los pone el servidor aunque el formulario los mande.
async function crear(req, res) {
  const { datos, errores } = validarReservaNueva(req.body);
  if (errores) throw new ErrorHttp(400, "Datos de la reserva inválidos.", errores);

  const codigo = await reservaModel.crear({
    docCliente: datos.documento, codigoEvento: datos.eventoId, entradas: datos.entradas, estado: datos.estado, observaciones: datos.observaciones,
  });
  res.status(201).json({ reserva: await reservaModel.obtener(codigo) });
}

// PUT /api/admin/reservas/:codigo  { entradas, estado, observaciones }
// Con un pago en Wompi solo se pueden cambiar las observaciones: el valor pagado y el estado ya no se tocan.
async function actualizar(req, res) {
  const { datos, errores } = validarReservaEdicion(req.body);
  if (errores) throw new ErrorHttp(400, "Datos de la reserva inválidos.", errores);

  const verificar = (actual) => {
    if (actual.estado === "Cancelada" || actual.estado === "Usada") {
      throw new ErrorHttp(422, `No se puede modificar una reserva en estado "${actual.estado}".`);
    }
    if (actual.estado_pago && (datos.entradas !== undefined || datos.estado !== undefined)) {
      throw new ErrorHttp(422, "Ya tiene un pago en Wompi: solo se pueden cambiar las observaciones. Para cambiar las entradas, cancélala y registra otra.");
    }
  };

  const existe = await reservaModel.actualizar(req.params.codigo, datos, verificar);
  if (!existe) throw new ErrorHttp(404, "La reserva no existe.");
  res.json({ reserva: await reservaModel.obtener(req.params.codigo) });
}

// PATCH /api/admin/reservas/:codigo/estado  { estado: "Cancelada", observaciones }
async function cancelar(req, res) {
  const { datos, errores } = validarCancelacionPanel(req.body);
  if (errores) throw new ErrorHttp(400, "Datos de la cancelación inválidos.", errores);

  const verificar = (actual) => {
    if (actual.estado === "Cancelada") throw new ErrorHttp(409, "La reserva ya está cancelada.");
    if (actual.estado === "Usada") throw new ErrorHttp(409, "La entrada ya se usó: no se puede cancelar.");
  };
  const existe = await reservaModel.cancelar(req.params.codigo, datos.observaciones, verificar);
  if (!existe) throw new ErrorHttp(404, "La reserva no existe.");
  res.json({ reserva: await reservaModel.obtener(req.params.codigo) });
}

// DELETE /api/admin/reservas/:codigo  (409 si ya tiene un pago: PAGO.id_reserva es RESTRICT)
async function eliminar(req, res) {
  try {
    if (!(await reservaModel.eliminar(req.params.codigo))) throw new ErrorHttp(404, "La reserva no existe.");
  } catch (err) {
    if (esRestriccion(err)) throw new ErrorHttp(409, "No se puede eliminar: la reserva tiene un pago. Cancélala en lugar de eliminarla.");
    throw err;
  }
  res.status(204).end();
}

// POST /api/admin/entradas/:codigo/ingreso  -> 201 { ingreso }  (marca la entrada como usada)
// Comprueba que la reserva exista, que no esté cancelada ni usada, que esté pagada o confirmada y que el evento siga vigente.
async function ingreso(req, res) {
  const registro = await reservaModel.registrarIngreso(req.params.codigo, { revisor: req.usuario.id });
  res.status(201).json({ ingreso: registro });
}

module.exports = { listar, crear, actualizar, cancelar, eliminar, ingreso };
