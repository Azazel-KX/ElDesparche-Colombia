const { ErrorHttp } = require("../utils/errores");

// Códigos de error de PostgreSQL que son culpa de los datos del cliente, no del servidor.
function traducirErrorPg(err) {
  switch (err.code) {
    case "23505": {
      const campo = /correo/i.test(err.constraint || err.detail || "")
        ? "correo"
        : /nit/i.test(err.constraint || err.detail || "")
          ? "nit"
          : /alias/i.test(err.constraint || err.detail || "")
            ? "alias"
            : "numero_identificacion";
      const mensajes = {
        correo: "Ese correo ya está registrado.",
        nit: "Ese NIT ya está registrado.",
        alias: "Ese alias ya está en uso.",
        numero_identificacion: "Ya existe una cuenta con ese número de identificación.",
      };
      return new ErrorHttp(409, mensajes[campo], { [campo]: mensajes[campo] });
    }
    case "23503":
      return new ErrorHttp(400, "Una referencia no existe (por ejemplo, la ciudad).");
    case "23514":
      return new ErrorHttp(400, "Algún dato no cumple las reglas de la base de datos.", { restriccion: err.constraint });
    case "22P02":
    case "22007":
      return new ErrorHttp(400, "Un dato tiene un formato inválido.");
    case "P0001": // RAISE EXCEPTION de los triggers del schema (reglas de negocio)
      return new ErrorHttp(422, err.message);
    default:
      return null;
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "El cuerpo de la petición no es JSON válido." });
  }

  const error = err instanceof ErrorHttp ? err : traducirErrorPg(err);
  if (error) {
    const cuerpo = { error: error.message };
    if (error.detalles) cuerpo.detalles = error.detalles;
    return res.status(error.estado).json(cuerpo);
  }

  console.error("Error no controlado:", err);
  res.status(500).json({ error: "Error interno del servidor." });
}

function noEncontrado(_req, res) {
  res.status(404).json({ error: "Ruta no encontrada." });
}

module.exports = { errorHandler, noEncontrado };
