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

// La base no está disponible: no es culpa de quien hizo la petición, así que no es un 500 con traza sino un 503
// (puede reintentar en un momento). Pasa si PostgreSQL se apaga, si Neon está despertando o si se corta la red.
// - Códigos de Node: ECONNREFUSED, ECONNRESET, ETIMEDOUT, ENOTFOUND, EAI_AGAIN
// - Códigos de PostgreSQL: 08xxx (connection_exception), 53300 (demasiadas conexiones), 57P01 a 57P03 (apagado)
// - Mensajes de node-postgres sin código: tiempo de espera del pool, de la consulta (query_timeout) y conexión terminada
const CODIGOS_SIN_CONEXION = ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "53300", "57P01", "57P02", "57P03"];

function esErrorDeConexion(err) {
  if (!err) return false;
  if (CODIGOS_SIN_CONEXION.includes(err.code) || /^08/.test(err.code || "")) return true;
  return /timeout exceeded when trying to connect|Query read timeout|Connection terminated/i.test(err.message || "");
}

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
      // País, departamento o ciudad con un nombre que ya existe (en su país o departamento)
      if (/^(pais|departamento|ciudad)_.*nombre.*key$/.test(err.constraint || "")) {
        return new ErrorHttp(409, "Ya existe uno con ese nombre.", { nombre: "Ya existe uno con ese nombre." });
      }
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

    // 23001: RESTRICT (ej: se quiere borrar una ciudad que todavía usan personas o ubicaciones)
    case "23001":
      return new ErrorHttp(409, "No se puede eliminar: otros datos todavía dependen de este registro.");

    // 23503: Foreign key. Sale en dos casos:
    // - al borrar algo que otra tabla todavía usa (las FK ON DELETE RESTRICT también responden 23503) → 409
    // - al guardar una referencia que no existe (ej: id_ciudad) → 400
    case "23503":
      if (/^update or delete on table/.test(err.message || "")) {
        return new ErrorHttp(409, "No se puede eliminar: otros datos todavía dependen de este registro.");
      }
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

  // Caso especial: el cuerpo supera el límite de la ruta (100 KB, o 3 MB en los paneles)
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "El cuerpo de la petición es demasiado grande." });
  }

  // Intentar traducir el error
  // Si es ErrorHttp → usarlo directamente
  // Si es error de PG → traducirlo
  const error = err instanceof ErrorHttp ? err : traducirErrorPg(err);

  if (error) {
    // Error controlado → devolver respuesta clara
    const cuerpo = { error: error.message };
    if (error.detalles && Object.keys(error.detalles).length) cuerpo.detalles = error.detalles;   // sin detalles: { error }
    return res.status(error.estado).json(cuerpo);
  }

  // La base de datos no responde → 503 con un mensaje que la web puede mostrar tal cual
  if (esErrorDeConexion(err)) {
    console.error("Sin conexión con la base de datos:", err.code || "", err.message);
    res.set("Retry-After", "5");
    return res.status(503).json({ error: "El servicio no está disponible en este momento. Inténtalo de nuevo en unos segundos." });
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

module.exports = { errorHandler, noEncontrado, esErrorDeConexion };
