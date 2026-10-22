const jwt = require("jsonwebtoken");
const { jwt: jwtConfig } = require("../config/env");
const { ErrorHttp } = require("../utils/errores");
const usuarioModel = require("../models/usuarioModel");

// MIDDLEWARE 1: Exige un JWT válido en el header Authorization
//
// FLUJO:
// 1. Extraer token del header: "Authorization: Bearer <token>"
// 2. Verificar que esté en formato correcto
// 3. Decriptar y validar el JWT (usando JWT_SECRET)
// 4. Consultar la cuenta en la base: debe existir y no estar suspendida ni bloqueada
// 5. Guardar en req.usuario { id, rol, estado } para que lo usen los controladores
//
// ¿Por qué se consulta la base en cada petición?
// - El token dura horas. Si un administrador suspende o bloquea una cuenta (o la elimina), debe perder el acceso
//   ya, no cuando caduque el token.
// - El rol sale de la base (en qué tabla de subtipo está el usuario), no del token: así un token viejo no puede
//   conservar permisos que la cuenta ya no tiene.
//
// Ejemplo de uso:
//   router.get("/mi-perfil", requiereToken, miPerfil);
//   → /mi-perfil solo funciona si envías un JWT válido de una cuenta activa
async function requiereToken(req, _res, next) {
  const cabecera = req.headers.authorization || "";
  const [esquema, token] = cabecera.split(" ");

  // Validar formato: "Bearer <token>"
  if (esquema !== "Bearer" || !token) {
    return next(new ErrorHttp(401, "Falta el token de sesión."));
  }

  let payload;
  try {
    payload = jwt.verify(token, jwtConfig.secret, { algorithms: ["HS256"] });
  } catch (err) {
    // Diferenciar entre JWT expirado y JWT inválido
    const mensaje = err.name === "TokenExpiredError"
      ? "La sesión expiró; inicia sesión de nuevo."
      : "Token inválido.";
    return next(new ErrorHttp(401, mensaje));
  }

  try {
    const cuenta = await usuarioModel.estadoCuenta(payload.sub);
    if (!cuenta) return next(new ErrorHttp(401, "La cuenta ya no existe."));
    if (cuenta.estado_usuario === "Suspendido" || cuenta.estado_usuario === "Bloqueado") {
      return next(new ErrorHttp(403, cuenta.estado_usuario === "Bloqueado"
        ? "Tu cuenta está bloqueada. Comunícate con un administrador."
        : "Tu cuenta está suspendida. Comunícate con un administrador."));
    }
    req.usuario = { id: payload.sub, rol: cuenta.tipo_usuario, estado: cuenta.estado_usuario };
    next(); // ✅ Todo bien, continuar
  } catch (err) {
    next(err);
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
