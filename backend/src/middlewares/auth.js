const jwt = require("jsonwebtoken");
const { jwt: jwtConfig } = require("../config/env");
const { ErrorHttp } = require("../utils/errores");

// Exige "Authorization: Bearer <token>" válido. Deja el usuario en req.usuario.
function requiereToken(req, _res, next) {
  const cabecera = req.headers.authorization || "";
  const [esquema, token] = cabecera.split(" ");

  if (esquema !== "Bearer" || !token) {
    return next(new ErrorHttp(401, "Falta el token de sesión."));
  }

  try {
    const payload = jwt.verify(token, jwtConfig.secret, { algorithms: ["HS256"] });
    req.usuario = { id: payload.sub, rol: payload.rol };
    next();
  } catch (err) {
    const mensaje = err.name === "TokenExpiredError" ? "La sesión expiró; inicia sesión de nuevo." : "Token inválido.";
    next(new ErrorHttp(401, mensaje));
  }
}

// Restringe una ruta a ciertos roles: requiereRol("ADMIN"), requiereRol("CLIENTE", "EMPRESA")...
const requiereRol = (...roles) => (req, _res, next) =>
  roles.includes(req.usuario && req.usuario.rol)
    ? next()
    : next(new ErrorHttp(403, "No tienes permiso para esta acción."));

module.exports = { requiereToken, requiereRol };
