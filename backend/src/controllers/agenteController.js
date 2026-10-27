const eventoModel = require("../models/eventoModel");
const reservaModel = require("../models/reservaModel");
const personaModel = require("../models/personaModel");
const { validarEvento, validarEdicionPublicada, validarCambioEstado, ESTADOS_RESERVABLES } = require("../utils/validacionEvento");
const { validarCancelacionPanel } = require("../utils/validacionReserva");
const { validarPerfilAgente } = require("../utils/validacionPersonas");
const { agregarNota, notaCancelacion } = require("../utils/formato");
const { ErrorHttp } = require("../utils/errores");

// Panel del AGENTE (rutas /api/agente). Contrato en frontend/js/agente.js. Un agente solo ve y toca lo SUYO: sus
// eventos, las reservas de sus eventos y el perfil de su empresa. El agente sale del token, nunca del body ni de la URL.
//
// ¿Por qué no basta con requiereRol("AGENTE")?
// - El rol solo dice "eres un agente". No dice "este evento es tuyo".
// - Sin comprobar la propiedad, el agente A podría editar o cancelar lo del agente B cambiando el código en la URL.
//   Ese fallo se llama IDOR y es muy común. Por eso cada operación compara contra req.usuario.id.

const SOLICITUD = ["En revisión", "Rechazado"];

// El agente (con la forma de AGENTES_DEMO) de la cuenta que hace la petición
async function agenteActual(req) {
  const agente = await personaModel.obtenerAgentePorDocumento(req.usuario.id);
  if (!agente) throw new ErrorHttp(404, "No encontramos la empresa de esta cuenta de agente.");
  return agente;
}

// ---------------------------------------------------------------------------------------------
// Eventos y solicitudes
// ---------------------------------------------------------------------------------------------

// GET /api/agente/eventos -> { agente, eventos: [publicados], solicitudes: [en revisión y rechazadas] }
async function listarEventos(req, res) {
  const [agente, eventos, solicitudes] = await Promise.all([
    agenteActual(req),
    eventoModel.listarPublicados({ docAgente: req.usuario.id }),
    eventoModel.listarSolicitudes({ docAgente: req.usuario.id }),
  ]);
  res.json({ agente, eventos, solicitudes });
}

// POST /api/agente/eventos  (los campos de datosFormulario() en agente.js)
// El agente no publica: envía una solicitud que queda "En revisión" hasta que un administrador la apruebe.
// Un agente todavía Pendiente (no aprobado) no puede enviar eventos.
async function crearSolicitud(req, res) {
  if (req.usuario.estado !== "Activo") {
    throw new ErrorHttp(403, "Tu cuenta de agente todavía no está aprobada: un administrador debe revisarla antes de que envíes eventos.");
  }
  const { datos, errores } = validarEvento(req.body, { exigirFuturo: true });
  if (errores) throw new ErrorHttp(400, "Datos del evento inválidos.", errores);

  const codigo = await eventoModel.crear(datos, req.usuario.id, "En revisión");
  res.status(201).json(eventoModel.aFormaSolicitud(await eventoModel.obtenerFila(codigo)));
}

// PUT /api/agente/eventos/:id  Corrige una solicitud "En revisión" o "Rechazada": siempre vuelve a quedar "En revisión".
async function corregirSolicitud(req, res) {
  const { datos, errores } = validarEvento(req.body, { exigirFuturo: true });
  if (errores) throw new ErrorHttp(400, "Datos del evento inválidos.", errores);

  const verificar = (actual) => {
    // Se responde 404 y no 403 para no revelar que el evento existe y es de otro agente
    if (actual.doc_agente !== req.usuario.id) throw new ErrorHttp(404, "La solicitud no existe.");
    if (!SOLICITUD.includes(actual.estado)) {
      throw new ErrorHttp(422, "Este evento ya está publicado: solo se corrigen solicitudes en revisión o rechazadas.");
    }
  };
  const existe = await eventoModel.actualizar(req.params.id, datos, verificar, "En revisión");
  if (!existe) throw new ErrorHttp(404, "La solicitud no existe.");
  res.json(eventoModel.aFormaSolicitud(await eventoModel.obtenerFila(req.params.id)));
}

// DELETE /api/agente/eventos/:id  Retira una solicitud que todavía no se publica.
async function retirarSolicitud(req, res) {
  const existe = await eventoModel.eliminar(req.params.id, (actual) => {
    if (actual.doc_agente !== req.usuario.id) throw new ErrorHttp(404, "La solicitud no existe.");
    if (!SOLICITUD.includes(actual.estado)) throw new ErrorHttp(422, "Este evento ya está publicado: no se puede retirar.");
  });
  if (!existe) throw new ErrorHttp(404, "La solicitud no existe.");
  res.status(204).end();
}

// Que el evento sea de este agente y esté publicado. Se responde 404 y no 403 para no revelar eventos de otros.
function verificarPublicadoDelAgente(req) {
  return (actual) => {
    if (actual.doc_agente !== req.usuario.id) throw new ErrorHttp(404, "El evento no existe.");
    if (SOLICITUD.includes(actual.estado)) throw new ErrorHttp(422, "Este evento todavía es una solicitud: se corrige desde sus solicitudes.");
  };
}

// PUT /api/agente/eventos/:id/publicado  { descripcion, observaciones, imagen }
// Edita lo que no toca a las reservas de un evento ya publicado. Fechas, precio, capacidad y lugar: un administrador.
async function editarEventoPublicado(req, res) {
  const { datos, errores } = validarEdicionPublicada(req.body);
  if (errores) throw new ErrorHttp(400, "Datos del evento inválidos.", errores);

  const verificarDueno = verificarPublicadoDelAgente(req);
  const verificar = (actual) => {
    verificarDueno(actual);
    if (actual.estado === "Cancelado" || actual.estado === "Finalizado") {
      throw new ErrorHttp(422, `No se puede editar un evento en estado "${actual.estado}".`);
    }
  };
  if (!(await eventoModel.editarPublicado(req.params.id, datos, verificar))) throw new ErrorHttp(404, "El evento no existe.");
  res.json({ evento: await eventoModel.obtenerPublico(req.params.id) });
}

// PATCH /api/agente/eventos/:id/cancelar  { causa, detalle }  (o { observaciones } con la nota ya armada)
// Cancela un evento publicado suyo; sus reservas Reservada y Confirmada se cancelan con él. No hay otros cambios
// de estado: Programado → En Boletería → En Vivo → Finalizado lo hace un administrador.
async function cancelarEvento(req, res) {
  const { datos, errores } = validarCambioEstado({ ...req.body, estado: "Cancelado" });
  if (errores) throw new ErrorHttp(400, "Datos de la cancelación inválidos.", errores);

  const quien = "el agente";
  const observaciones = datos.observaciones || ((actual) => agregarNota(actual, notaCancelacion("evento", quien, datos.causa, datos.detalle)));
  const verificarDueno = verificarPublicadoDelAgente(req);
  const verificar = (actual) => {
    verificarDueno(actual);
    if (actual.estado === "Cancelado") throw new ErrorHttp(409, "El evento ya está cancelado.");
    if (actual.estado === "Finalizado") throw new ErrorHttp(409, "El evento ya finalizó: no se puede cancelar.");
  };
  const existe = await eventoModel.cambiarEstado(req.params.id, { estado: "Cancelado", observaciones }, quien, verificar);
  if (!existe) throw new ErrorHttp(404, "El evento no existe.");
  res.json({ evento: await eventoModel.obtenerPublico(req.params.id) });
}

// ---------------------------------------------------------------------------------------------
// Reservas y entradas de SUS eventos
// ---------------------------------------------------------------------------------------------

// GET /api/agente/reservas -> { reservas } (solo las de los eventos de este agente)
async function listarReservas(req, res) {
  res.json({ reservas: await reservaModel.listar({ docAgente: req.usuario.id }) });
}

// PATCH /api/agente/reservas/:codigo/estado  { estado: "Cancelada", observaciones }
// Solo si la reserva es de un evento de este agente; si no, 403.
async function cancelarReserva(req, res) {
  const { datos, errores } = validarCancelacionPanel(req.body);
  if (errores) throw new ErrorHttp(400, "Datos de la cancelación inválidos.", errores);

  const verificar = (actual) => {
    if (actual.doc_agente !== req.usuario.id) throw new ErrorHttp(403, "Esta reserva es de un evento de otro organizador.");
    if (actual.estado === "Cancelada") throw new ErrorHttp(409, "La reserva ya está cancelada.");
    if (actual.estado === "Usada") throw new ErrorHttp(409, "La entrada ya se usó: no se puede cancelar.");
  };
  const existe = await reservaModel.cancelar(req.params.codigo, datos.observaciones, verificar);
  if (!existe) throw new ErrorHttp(404, "La reserva no existe.");
  res.json({ reserva: await reservaModel.obtener(req.params.codigo) });
}

// PATCH /api/agente/reservas/:codigo/confirmar  -> { reserva }
// El agente aprueba la reserva (y el pago) de un evento suyo: pasa de Reservada a Confirmada.
async function confirmarReserva(req, res) {
  const verificar = (actual) => {
    if (actual.doc_agente !== req.usuario.id) throw new ErrorHttp(403, "Esta reserva es de un evento de otro organizador.");
    if (actual.estado !== "Reservada") throw new ErrorHttp(409, "Solo se puede aprobar una reserva que está por aprobar (Reservada).");
    if (!ESTADOS_RESERVABLES.includes(actual.estado_evento)) {
      throw new ErrorHttp(409, `El evento está ${actual.estado_evento === "Cancelado" ? "cancelado" : "finalizado"}: ya no se aprueban reservas.`);
    }
  };
  const existe = await reservaModel.actualizar(req.params.codigo, { estado: "Confirmada" }, verificar);
  if (!existe) throw new ErrorHttp(404, "La reserva no existe.");
  res.json({ reserva: await reservaModel.obtener(req.params.codigo) });
}

// POST /api/agente/entradas/:codigo/ingreso -> 201 { ingreso }  Rechaza (403) una entrada de otro organizador.
async function ingreso(req, res) {
  const registro = await reservaModel.registrarIngreso(req.params.codigo, { docAgente: req.usuario.id, revisor: req.usuario.id });
  res.status(201).json({ ingreso: registro });
}

// ---------------------------------------------------------------------------------------------
// Perfil de la empresa
// ---------------------------------------------------------------------------------------------

// PUT /api/agente/perfil  { nombre, descripcion, logo, correo, telefono, ciudad, experiencia }
// nombre = nombre comercial. El NIT, la razón social y la comisión no se cambian aquí (los fija un administrador).
async function actualizarPerfil(req, res) {
  const { datos, errores } = validarPerfilAgente(req.body);
  if (errores) throw new ErrorHttp(400, "Datos del perfil inválidos.", errores);

  await personaModel.actualizarPerfilAgente(req.usuario.id, datos);
  const a = await agenteActual(req);
  res.json({
    nombre: a.nombre, descripcion: a.descripcion, logo: a.logo || "", correo: a.correo, telefono: a.telefono,
    ciudad: a.ciudad, experiencia: a.experiencia,
  });
}

module.exports = {
  listarEventos, crearSolicitud, corregirSolicitud, retirarSolicitud, editarEventoPublicado, cancelarEvento,
  listarReservas, confirmarReserva, cancelarReserva, ingreso, actualizarPerfil, agenteActual,
};
