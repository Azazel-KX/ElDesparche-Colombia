// Clase ErrorHttp: error personalizado para la API
// Cada error tiene:
//   - estado: código HTTP (400, 401, 404, 500...)
//   - mensaje: descripción clara del error
//   - detalles: información extra (ej: qué campos fallaron en validación)
//
// Ejemplos:
//   throw new ErrorHttp(400, "Datos inválidos.", { correo: "Formato incorrecto" });
//   throw new ErrorHttp(401, "Contraseña incorrecta.");
//   throw new ErrorHttp(404, "Usuario no encontrado.");
class ErrorHttp extends Error {
  constructor(estado, mensaje, detalles) {
    super(mensaje);
    this.estado = estado;           // Código HTTP: 400, 401, 403, 404, 500...
    this.detalles = detalles || {}; // Información adicional (opcional)
  }
}

// Función auxiliar: envuelve funciones async para capturar errores
//
// ¿Por qué la necesitamos?
// Express 5+ captura errores de funciones async, pero Express 4 no.
// Esto permite escribir:
//   router.post("/registrar", asincrono(async (req, res) => {
//     throw new ErrorHttp(400, "Oops!"); // Se captura automáticamente
//   }));
//
// Sin esto, tendríamos que envolver CADA función en try/catch manualmente.
const asincrono = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ¿Algo que se quiere borrar todavía lo usa otra tabla con ON DELETE RESTRICT? PostgreSQL avisa con el código 23001
// (restrict_violation) cuando la llave se declaró RESTRICT, y con 23503 (foreign_key_violation) cuando es NO ACTION.
// El controlador lo traduce a un 409 con un mensaje claro.
const esRestriccion = (err) => err && (err.code === "23001" || err.code === "23503");

module.exports = { ErrorHttp, asincrono, esRestriccion };
