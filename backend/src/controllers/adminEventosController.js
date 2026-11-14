const eventoModel = require("../models/eventoModel");
const {
  TRANSICIONES, ESTADOS_SOLICITUD, validarEvento, validarCambioEstado, validarDecision,
} = require("../utils/validacionEvento");
const { agregarNota, notaCancelacion } = require("../utils/formato");
const { ErrorHttp, esRestriccion } = require("../utils/errores");

// Eventos y solicitudes de eventos, vistos por el ADMINISTRADOR (rutas /api/admin/eventos...).
// Contrato en frontend/js/admin.js (sección EVENTOS). Las respuestas usan la forma de EVENTOS y de SOLICITUDES_DEMO.

// GET /api/admin/eventos -> { eventos: [ forma web, con "agente" ] }   (solo los publicados)
async function listar(_req, res) {
  res.json({ eventos: await eventoModel.listarPublicados() });
}

// POST /api/admin/eventos  (los mismos campos de la solicitud del agente, más "nit" del agente dueño)
// El administrador registra el evento ya publicado: queda "Programado", sin pasar por revisión.
async function crear(req, res) {
  const { datos, errores } = validarEvento(req.body, { exigirFuturo: false, conAgente: true });
  if (errores) throw new ErrorHttp(400, "Datos del evento inválidos.", errores);

  const docAgente = await eventoModel.docAgentePorNit(datos.nit);
  if (!docAgente) throw new ErrorHttp(400, "El agente elegido no existe.", { nit: "El agente elegido no existe." });

  const codigo = await eventoModel.crear(datos, docAgente, "Programado");
  res.status(201).json({ evento: await eventoModel.obtenerPublico(codigo) });
}

// PUT /api/admin/eventos/:id  (el estado se cambia aparte)
async function actualizar(req, res) {
  const { datos, errores } = validarEvento(req.body, { exigirFuturo: false });
  if (errores) throw new ErrorHttp(400, "Datos del evento inválidos.", errores);

  const verificar = (actual) => {
    if (ESTADOS_SOLICITUD.includes(actual.estado)) {
      throw new ErrorHttp(422, "Este evento todavía es una solicitud: apruébalo o recházalo desde Eventos por revisar.");
    }
    if (actual.estado === "Cancelado" || actual.estado === "Finalizado") {
      throw new ErrorHttp(422, `No se puede editar un evento en estado "${actual.estado}".`);
    }
    if (datos.capacidad < actual.ocupadas) {
      throw new ErrorHttp(422, `La capacidad no puede ser menor a las ${actual.ocupadas} entradas ya reservadas.`, {
        capacidad: `Mínimo ${actual.ocupadas}.`,
      });
    }
  };

  const existe = await eventoModel.actualizar(req.params.id, datos, verificar);
  if (!existe) throw new ErrorHttp(404, "El evento no existe.");
  res.json({ evento: await eventoModel.obtenerPublico(req.params.id) });
}

// DELETE /api/admin/eventos/:id  (sus reservas se borran en cascada)
async function eliminar(req, res) {
  try {
    const existe = await eventoModel.eliminar(req.params.id);
    if (!existe) throw new ErrorHttp(404, "El evento no existe.");
  } catch (err) {
    if (esRestriccion(err)) {
      throw new ErrorHttp(409, "No se puede eliminar: el evento tiene datos que dependen de él. Cancélalo en lugar de eliminarlo.");
    }
    throw err;
  }
  res.status(204).end();
}

// PATCH /api/admin/eventos/:id/estado   { estado, observaciones }
// Al cancelar, "observaciones" trae el texto completo con la nota de causa (formato notaCancelacion de la web).
async function cambiarEstado(req, res) {
  const { datos, errores } = validarCambioEstado(req.body);
  if (errores) throw new ErrorHttp(400, "Datos de estado inválidos.", errores);

  const quien = "el administrador";
  const observaciones = datos.estado !== "Cancelado" ? null
    : datos.observaciones || ((actual) => agregarNota(actual, notaCancelacion("evento", quien, datos.causa, datos.detalle)));

  const verificar = (actual) => {
    if (ESTADOS_SOLICITUD.includes(actual.estado)) {
      throw new ErrorHttp(422, "Este evento todavía es una solicitud: apruébalo o recházalo desde Eventos por revisar.");
    }
    // Solo se permiten las transiciones del mapa TRANSICIONES (Programado → En Boletería → En Vivo → Finalizado)
    if (!TRANSICIONES[actual.estado].includes(datos.estado)) {
      throw new ErrorHttp(422, `No se puede pasar de "${actual.estado}" a "${datos.estado}".`);
    }
  };

  const existe = await eventoModel.cambiarEstado(req.params.id, { estado: datos.estado, observaciones }, quien, verificar);
  if (!existe) throw new ErrorHttp(404, "El evento no existe.");
  res.json({ evento: await eventoModel.obtenerPublico(req.params.id) });
}

// GET /api/admin/eventos/solicitudes -> { solicitudes: [ las que están "En revisión" ] }
async function listarSolicitudes(_req, res) {
  res.json({ solicitudes: await eventoModel.listarSolicitudes({ soloEnRevision: true }) });
}

// PATCH /api/admin/eventos/solicitudes/:id   { estado: "Aprobado" | "Rechazado", motivo }
// Al aprobar, el evento pasa a "Programado" y se publica. Al rechazar, el motivo se agrega a las observaciones.
async function decidirSolicitud(req, res) {
  const { datos, errores } = validarDecision(req.body);
  if (errores) throw new ErrorHttp(400, "Decisión inválida.", errores);

  const existe = await eventoModel.decidirSolicitud(req.params.id, datos);
  if (!existe) throw new ErrorHttp(404, "Esta solicitud ya no existe: quizá el agente la retiró.");

  const fila = await eventoModel.obtenerFila(req.params.id);
  res.json(datos.estado === "Aprobado"
    ? { ...eventoModel.aFormaSolicitud(fila), estado: "Aprobado", idEvento: fila.codigo }
    : eventoModel.aFormaSolicitud(fila));
}

module.exports = { listar, crear, actualizar, eliminar, cambiarEstado, listarSolicitudes, decidirSolicitud };
