// Error con código HTTP; el manejador central lo convierte en la respuesta JSON.
class ErrorHttp extends Error {
  constructor(estado, mensaje, detalles) {
    super(mensaje);
    this.estado = estado;
    this.detalles = detalles;
  }
}

// Permite usar controladores async sin try/catch (Express 4 no captura sus rechazos).
const asincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ErrorHttp, asincrono };
