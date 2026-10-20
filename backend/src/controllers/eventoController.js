const eventoModel = require("../models/eventoModel");
const {
  TRANSICIONES, validarEventoNuevo, validarEventoEdicion, validarCambioEstado, validarFiltros, textoCancelacion,
} = require("../utils/validacionEvento");
const { ErrorHttp } = require("../utils/errores");

// Estados en los que todavía se pueden editar los datos del evento.
// Una vez "En Vivo", "Finalizado" o "Cancelado", cambiar fecha, precio o capacidad no tiene sentido.
const ESTADOS_EDITABLES = ["Programado", "En Boletería"];

// Regla de PROPIEDAD: un agente solo toca SUS eventos; el administrador puede tocar todos.
//
// ¿Por qué no basta con requiereRol("AGENTE")?
// - El rol solo dice "eres un agente". No dice "este evento es tuyo".
// - Sin esta comprobación, el agente A podría editar o cancelar los eventos del agente B
//   con solo cambiar el código en la URL. Ese fallo se llama IDOR y es muy común.
function exigirPropietario(usuario, evento) {
  const esDueno = evento.id_agente === usuario.id;
  if (usuario.rol !== "ADMIN" && !esDueno) {
    throw new ErrorHttp(403, "Solo el agente que creó el evento (o un administrador) puede modificarlo.");
  }
}

// GET /api/eventos  → público (el catálogo lo ve cualquiera)
// Filtros opcionales: ?ciudad=1&categoria=teatro&estado=Programado&pagina=1&limite=20
async function listar(req, res) {
  const { filtros, errores } = validarFiltros(req.query);
  if (errores) throw new ErrorHttp(400, "Filtros inválidos.", errores);

  const { eventos, total } = await eventoModel.listar(filtros);
  res.json({
    eventos,
    paginacion: {
      pagina: filtros.pagina,
      limite: filtros.limite,
      total,
      paginas: Math.ceil(total / filtros.limite),
    },
  });
}

// GET /api/eventos/:codigo  → público
async function obtener(req, res) {
  const evento = await eventoModel.obtener(req.params.codigo);
  if (!evento) throw new ErrorHttp(404, "El evento no existe.");
  res.json({ evento });
}

// POST /api/eventos  → solo AGENTE
// El agente dueño sale del TOKEN (req.usuario.id), nunca del body: así nadie puede crear eventos a nombre de otro.
async function crear(req, res) {
  const { datos, errores } = validarEventoNuevo(req.body);
  if (errores) throw new ErrorHttp(400, "Datos del evento inválidos.", errores);

  const codigo = await eventoModel.crear(datos, req.usuario.id);
  const evento = await eventoModel.obtener(codigo);
  res.status(201).json({ evento });
}

// PUT /api/eventos/:codigo  → AGENTE dueño o ADMIN
async function actualizar(req, res) {
  const { datos, errores } = validarEventoEdicion(req.body);
  if (errores) throw new ErrorHttp(400, "Datos del evento inválidos.", errores);

  // Estas reglas se evalúan dentro de la transacción, con el evento bloqueado (ver eventoModel.actualizar)
  const verificar = (actual) => {
    exigirPropietario(req.usuario, actual);
    if (!ESTADOS_EDITABLES.includes(actual.estado)) {
      throw new ErrorHttp(422, `No se puede editar un evento en estado "${actual.estado}".`);
    }
    if (datos.capacidad_total < actual.entradas_reservadas) {
      throw new ErrorHttp(422, `La capacidad no puede ser menor a las ${actual.entradas_reservadas} entradas ya reservadas.`, {
        capacidad_total: `Mínimo ${actual.entradas_reservadas}.`,
      });
    }
  };

  const existe = await eventoModel.actualizar(req.params.codigo, datos, verificar);
  if (!existe) throw new ErrorHttp(404, "El evento no existe.");

  res.json({ evento: await eventoModel.obtener(req.params.codigo) });
}

// PATCH /api/eventos/:codigo/estado  → AGENTE dueño o ADMIN
// Body: { "estado": "En Boletería" }   o   { "estado": "Cancelado", "causa": "Fuerza mayor o clima", "detalle": "..." }
// La causa queda escrita en EVENTO.observaciones ("Cancelado por el agente. Causa: ...").
async function cambiarEstado(req, res) {
  const { datos, errores } = validarCambioEstado(req.body);
  if (errores) throw new ErrorHttp(400, "Datos de estado inválidos.", errores);

  const verificar = (actual) => {
    exigirPropietario(req.usuario, actual);
    // Solo se permiten las transiciones del mapa TRANSICIONES (Programado → En Boletería → En Vivo → Finalizado)
    if (!TRANSICIONES[actual.estado].includes(datos.estado)) {
      throw new ErrorHttp(422, `No se puede pasar de "${actual.estado}" a "${datos.estado}".`);
    }
  };

  const observaciones = datos.estado === "Cancelado" ? textoCancelacion(req.usuario.rol, datos) : null;
  const existe = await eventoModel.cambiarEstado(req.params.codigo, { estado: datos.estado, observaciones }, verificar);
  if (!existe) throw new ErrorHttp(404, "El evento no existe.");

  res.json({ evento: await eventoModel.obtener(req.params.codigo) });
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado };
