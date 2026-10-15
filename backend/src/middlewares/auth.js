const jwt = require("jsonwebtoken");
const { jwt: jwtConfig } = require("../config/env");
const { ErrorHttp } = require("../utils/errores");

// MIDDLEWARE 1: Exige un JWT válido en el header Authorization
//
// FLUJO:
// 1. Extraer token del header: "Authorization: Bearer <token>"
// 2. Verificar que esté en formato correcto
// 3. Decriptar y validar el JWT (usando JWT_SECRET)
// 4. Extraer datos (ID y rol del usuario)
// 5. Guardar en req.usuario para que lo usen los controladores
//
// Ejemplo de uso:
//   router.get("/mi-perfil", requiereToken, miPerfil);
//   → /mi-perfil solo funciona si envías un JWT válido
function requiereToken(req, _res, next) {
  const cabecera = req.headers.authorization || "";
  const [esquema, token] = cabecera.split(" ");

  // Validar formato: "Bearer <token>"
  if (esquema !== "Bearer" || !token) {
    return next(new ErrorHttp(401, "Falta el token de sesión."));
  }

  try {
    // Decriptar JWT usando JWT_SECRET
    const payload = jwt.verify(token, jwtConfig.secret, { algorithms: ["HS256"] });

    // Extraer datos del payload
    // - sub: subject (el ID del usuario)
    // - rol: el tipo de usuario (CLIENTE, AGENTE, ADMIN)
    req.usuario = { id: payload.sub, rol: payload.rol };
    next(); // ✅ Todo bien, continuar
  } catch (err) {
    // Diferenciar entre JWT expirado y JWT inválido
    const mensaje = err.name === "TokenExpiredError"
      ? "La sesión expiró; inicia sesión de nuevo."
      : "Token inválido.";
    next(new ErrorHttp(401, mensaje));
  }
}

// MIDDLEWARE 2: Restringe una ruta a ciertos roles
//
// FLUJO:
// 1. Verificar que req.usuario exista (requiereToken debe venir primero)
// 2. Verificar que el rol del usuario esté en la lista permitida
// 3. Si sí → continuar; si no → error 403 (Forbidden)
//
// Ejemplo de uso:
//   router.post("/operacion-admin", requiereToken, requiereRol("ADMIN"), hacerAlgo);
//   router.get("/ver-servicios", requiereToken, requiereRol("CLIENTE", "AGENTE"), verServicios);
const requiereRol = (...roles) => (req, _res, next) => {
  // Verificar que el usuario existe y su rol está permitido
  const tieneRol = req.usuario && roles.includes(req.usuario.rol);

  if (tieneRol) {
    next(); // ✅ Rol permitido
  } else {
    next(new ErrorHttp(403, "No tienes permiso para esta acción."));
  }
};

module.exports = { requiereToken, requiereRol };
