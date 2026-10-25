/* ==========================================================================
   modelos/sesionModelo.js
   Sesión de la persona que entró: se guarda en el navegador (localStorage) y se
   descarta cuando el token vence. Las reservas, en cambio, viven en la base de datos.
   ========================================================================== */

/* Segundos en que vence un token, leído de su cuerpo (solo para saber cuándo
   descartar la sesión: el servidor es quien valida el token de verdad) */
function vencimientoDelToken(token) {
  try {
    var cuerpo = String(token).split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return Number(JSON.parse(atob(cuerpo)).exp) || 0;
  } catch (e) {
    return 0;
  }
}

/* La sesión guardada, o null si no hay o ya venció */
export function obtenerUsuario() {
  var usuario = null;
  try {
    usuario = JSON.parse(localStorage.getItem("usuario"));
  } catch (e) {}

  if (!usuario || !usuario.token) {
    return null;
  }

  var vence = vencimientoDelToken(usuario.token);
  if (vence && vence * 1000 <= Date.now()) {
    borrarUsuario();
    return null;
  }
  return usuario;
}

export function guardarUsuario(usuario) {
  localStorage.setItem("usuario", JSON.stringify(usuario));
}

export function borrarUsuario() {
  localStorage.removeItem("usuario");
}

/* Guarda la sesión que devolvió el API al entrar o registrarse.
   El API devuelve el nombre en un solo campo (nombre_completo, igual que la tabla USUARIO).
   Se guarda con el formato que usan las pantallas (nombre, correo y tipo "usuario" | "agente" | "admin")
   y se agrega el token para las próximas llamadas. */
export function guardarSesionDeLaApi(respuesta) {
  var u = respuesta.usuario;
  var tipos = { AGENTE: "agente", ADMIN: "admin" };

  guardarUsuario({
    nombre: (u.nombre_completo || "").trim(),
    correo: u.correo,
    tipo: tipos[u.tipo_usuario] || "usuario",
    rol: u.tipo_usuario,
    id: u.numero_identificacion,
    tipoDocumento: u.tipo_identificacion || "",
    nacimiento: u.fecha_nacimiento || "",
    nit: u.nit || "",
    token: respuesta.token
  });
}

/* Cuando el token vence se recarga la página; esta marca avisa a la página nueva de que debe decirlo */
export function marcarSesionVencida() {
  try {
    sessionStorage.setItem("sesionVencida", "1");
  } catch (e) {}
}

/* true una sola vez si la sesión acaba de vencer */
export function consumirSesionVencida() {
  try {
    if (sessionStorage.getItem("sesionVencida")) {
      sessionStorage.removeItem("sesionVencida");
      return true;
    }
  } catch (e) {}
  return false;
}
