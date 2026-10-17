const { ErrorHttp } = require("../utils/errores");

// Función auxiliar: traducir errores de PostgreSQL a mensajes legibles
//
// ¿Por qué la necesitamos?
// - PostgreSQL devuelve errores técnicos: "duplicate key value violates unique constraint"
// - El usuario no entiende eso
// - Traducimos a mensajes claros: "Ese correo ya está registrado"
//
// Restricciones con nombre propio en database/schema_ElDesparche.sql → campo y mensaje para el usuario
const RESTRICCIONES_CONOCIDAS = {
  ck_usuario_documento_formato: ["numero_identificacion", "El número de documento no es válido para su tipo."],
  ck_usuario_documento_normalizado: ["numero_identificacion", "El número de documento solo admite letras mayúsculas y dígitos."],
  usuario_correo_check: ["correo", "Escribe un correo electrónico válido."],
};

// Códigos de error:
// - 23505: Duplicate key (violación de UNIQUE)
// - 23503: Foreign key (referencia que no existe)
// - 23514: Check constraint (dato fuera de rango)
// - 22P02: Invalid format (tipo de dato inválido)
// - P0001: RAISE EXCEPTION personalizado en triggers de BD
function traducirErrorPg(err) {
  switch (err.code) {
    // 23505: Violación de UNIQUE (correo ya existe, NIT ya existe, etc.)
    case "23505": {
      // Detectar qué campo duplicado fue (leyendo el error message de PG)
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
        numero_identificacion: "Ya existe una cuenta con ese número de documento.",
      };
      // 409 = Conflict (recurso ya existe)
      return new ErrorHttp(409, mensajes[campo], { [campo]: mensajes[campo] });
    }

    // 23503: Foreign key (ej: id_ciudad no existe)
    case "23503":
      if (/id_ciudad/.test(err.constraint || "")) {
        return new ErrorHttp(400, "La ciudad elegida no existe.", { id_ciudad: "La ciudad elegida no existe." });
      }
      return new ErrorHttp(400, "Una referencia no existe (por ejemplo, la ciudad).");

    // 23514: Check constraint (dato fuera de rangos permitidos)
    case "23514": {
      const conocida = RESTRICCIONES_CONOCIDAS[err.constraint];
      if (conocida) return new ErrorHttp(400, conocida[1], { [conocida[0]]: conocida[1] });
      return new ErrorHttp(400, "Algún dato no cumple las reglas de la base de datos.", { restriccion: err.constraint });
    }

    // 22P02: Invalid input (número inválido, UUID mal formado, etc.)
    // 22007: Invalid date format
    case "22P02":
    case "22007":
      return new ErrorHttp(400, "Un dato tiene un formato inválido.");

    // P0001: RAISE EXCEPTION de los triggers de la BD
    // Estos son errores de lógica de negocio (no duplicados ni referencias)
    case "P0001":
      return new ErrorHttp(422, err.message); // 422 = Unprocessable Entity

    default:
      return null; // Error desconocido, manejarlo en el errorHandler
  }
}

// MIDDLEWARE 3: Manejador centralizado de ERRORES
//
// ¿Por qué esto es importante?
// - Todos los errores pasan por aquí (desde controladores, modelos, validación)
// - Devolvemos respuestas consistentes al frontend
// - Evitamos exponer detalles técnicos peligrosos (stack traces, contraseñas, etc.)
//
// ¿Cuándo se ejecuta?
// - Cuando un controlador hace: throw new ErrorHttp(...)
// - Cuando ocurre un error en PostgreSQL
// - Cuando Express.json() falla (JSON inválido)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  // Caso especial: JSON inválido en el body
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "El cuerpo de la petición no es JSON válido." });
  }

  // Intentar traducir el error
  // Si es ErrorHttp → usarlo directamente
  // Si es error de PG → traducirlo
  const error = err instanceof ErrorHttp ? err : traducirErrorPg(err);

  if (error) {
    // Error controlado → devolver respuesta clara
    const cuerpo = { error: error.message };
    if (error.detalles) cuerpo.detalles = error.detalles;
    return res.status(error.estado).json(cuerpo);
  }

  // Error desconocido (bug del servidor, no del usuario)
  console.error("Error no controlado:", err);
  res.status(500).json({ error: "Error interno del servidor." });
}

// MIDDLEWARE 4: Ruta NO ENCONTRADA
//
// ¿Cuándo se ejecuta?
// - Cuando no hay ninguna ruta que coincida con el request
// - Debe ir AL FINAL de todas las otras rutas (catchall)
function noEncontrado(_req, res) {
  res.status(404).json({ error: "Ruta no encontrada." });
}

module.exports = { errorHandler, noEncontrado };
