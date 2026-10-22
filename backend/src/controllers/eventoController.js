const eventoModel = require("../models/eventoModel");
const { validarFiltros } = require("../utils/validacionEvento");
const { ErrorHttp } = require("../utils/errores");

// Catálogo PÚBLICO de eventos (lo ve cualquiera, incluso sin sesión). Devuelve los eventos con la misma forma que
// EVENTOS en frontend/js/script.js. Un evento "En revisión" o "Rechazado" nunca aparece aquí.

// GET /api/eventos?ciudad=1&categoria=teatro&estado=Programado&pagina=1&limite=20
async function listar(req, res) {
  const { filtros, errores } = validarFiltros(req.query);
  if (errores) throw new ErrorHttp(400, "Filtros inválidos.", errores);

  const { eventos, total } = await eventoModel.listarPublicos(filtros);
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

// GET /api/eventos/:codigo
async function obtener(req, res) {
  const evento = await eventoModel.obtenerPublico(req.params.codigo);
  if (!evento) throw new ErrorHttp(404, "El evento no existe.");
  res.json({ evento });
}

module.exports = { listar, obtener };
