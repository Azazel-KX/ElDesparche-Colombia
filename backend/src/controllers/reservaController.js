const reservaModel = require("../models/reservaModel");
const { validarReservaCliente, validarCancelacionCliente } = require("../utils/validacionReserva");
const { agregarNota, notaCancelacion } = require("../utils/formato");
const { ErrorHttp } = require("../utils/errores");

// Reservas del CLIENTE autenticado (rutas /api/reservas). Solo ve y toca las suyas.
// El pago con Wompi (iniciar el pago, firma de integridad y webhook) se conecta aparte: hoy una reserva de un evento
// de pago queda "Reservada" hasta que se confirme su pago, y una de un evento gratis queda "Confirmada".

// POST /api/reservas  { idEvento, entradas, observaciones }  -> 201 { reserva }
async function crear(req, res) {
  const { datos, errores } = validarReservaCliente(req.body);
  if (errores) throw new ErrorHttp(400, "Datos de la reserva inválidos.", errores);

  const codigo = await reservaModel.crear({
    docCliente: req.usuario.id, codigoEvento: datos.idEvento, entradas: datos.entradas, estado: "Reservada", observaciones: datos.observaciones,
  });
  res.status(201).json({ reserva: await reservaModel.obtener(codigo) });
}

// GET /api/reservas/mias -> { reservas }
async function mias(req, res) {
  res.json({ reservas: await reservaModel.listar({ docCliente: req.usuario.id }) });
}

// PATCH /api/reservas/:codigo/cancelar  { causa, detalle }
// El cliente cancela su reserva. La causa se agrega a las observaciones con el formato de la web. Una entrada ya usada
// o una reserva ya cancelada no se puede cancelar.
async function cancelar(req, res) {
  const { datos, errores } = validarCancelacionCliente(req.body);
  if (errores) throw new ErrorHttp(400, "Datos de la cancelación inválidos.", errores);

  const nota = notaCancelacion("reserva", "el cliente", datos.causa, datos.detalle);
  const verificar = (actual) => {
    // Se responde 404 y no 403 para no revelar que la reserva existe y es de otra persona
    if (actual.doc_cliente !== req.usuario.id) throw new ErrorHttp(404, "La reserva no existe.");
    if (actual.estado === "Cancelada") throw new ErrorHttp(409, "La reserva ya está cancelada.");
    if (actual.estado === "Usada") throw new ErrorHttp(409, "La entrada ya se usó: no se puede cancelar.");
  };
  const existe = await reservaModel.cancelar(req.params.codigo, (anteriores) => agregarNota(anteriores, nota), verificar);
  if (!existe) throw new ErrorHttp(404, "La reserva no existe.");
  res.json({ reserva: await reservaModel.obtener(req.params.codigo) });
}

module.exports = { crear, mias, cancelar };
