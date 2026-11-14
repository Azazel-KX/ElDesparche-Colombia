/* ==========================================================================
   modelos/authModelo.js
   Autenticación: entrar, registrarse, comprobar que la cuenta sigue existiendo y pedir las
   ciudades que se eligen al registrarse.
   ========================================================================== */

import { enviarCrud, llamarApi, sesionVencida } from "./clienteApi.js";

/* Los dos devuelven { estado, datos }: el controlador decide qué hacer con los errores del API */
export function iniciarSesion(correo, contrasena) {
  return llamarApi("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo: correo, contrasena: contrasena })
  });
}

export function registrarCuenta(datos) {
  return llamarApi("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos)
  });
}

/* Los paneles confirman con el servidor que la sesión sigue vigente: si el token no sirve (401)
   llamarApi la cierra, y si la cuenta ya no existe (404) se cierra aquí */
export function comprobarCuentaVigente() {
  return llamarApi("/auth/me").then(function (resultado) {
    if (resultado.estado === 404) sesionVencida();
  }).catch(function () {});
}

/* Las ciudades para el formulario de registro: [{ id_ciudad, nombre, departamento }] */
export function obtenerCiudadesRegistro() {
  return llamarApi("/ciudades").then(function (resultado) {
    if (resultado.estado !== 200 || !resultado.datos.ciudades) {
      throw new Error("No se pudo cargar la lista de ciudades.");
    }
    return resultado.datos.ciudades;
  });
}

/* Cambia la contraseña de quien tiene la sesión abierta. Si algo falla lanza un Error con el mensaje del servidor. */
export function cambiarContrasena(actual, nueva) {
  return enviarCrud("/auth/contrasena", "PATCH", { actual: actual, nueva: nueva }, "No se pudo cambiar la contraseña.");
}
