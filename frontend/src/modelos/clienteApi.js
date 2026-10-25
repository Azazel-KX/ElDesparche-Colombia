/* ==========================================================================
   modelos/clienteApi.js
   Cliente HTTP de la API: agrega el token de la sesión, cierra la sesión si vence y revisa las respuestas.
   ========================================================================== */

import { borrarUsuario, marcarSesionVencida, obtenerUsuario } from "./sesionModelo.js";

/* La dirección del API se puede cambiar definiendo window.DESPARCHE_API_URL antes de cargar la página */
var API_URL = window.DESPARCHE_API_URL || "/api";

/* Rutas que no llevan el token de la sesión */
var RUTAS_SIN_TOKEN = ["/auth/login", "/auth/register"];

/* El token venció o ya no sirve: se cierra la sesión y se recarga la página,
   que pide entrar de nuevo (el aviso sale en la ventana de acceso). */
export function sesionVencida() {
  borrarUsuario();
  marcarSesionVencida();
  window.location.reload();
  return new Promise(function () {});   /* la página se recarga: nada más debe seguir */
}

/* Llama al API y devuelve { estado, datos }.
   - Si hay sesión, agrega solo el encabezado Authorization: nadie más lo arma a mano.
   - Si el servidor responde 401 estando con sesión, cierra la sesión (sesionVencida).
   - Si el servidor no responde, rechaza la promesa con un mensaje que se puede mostrar tal cual. */
export function llamarApi(ruta, opciones) {
  var config = Object.assign({}, opciones);
  var cabeceras = Object.assign({}, config.headers);
  var usuario = RUTAS_SIN_TOKEN.indexOf(ruta) === -1 ? obtenerUsuario() : null;

  if (typeof config.body === "string" && !cabeceras["Content-Type"]) {
    cabeceras["Content-Type"] = "application/json";
  }
  if (usuario && usuario.token && !cabeceras.Authorization) {
    cabeceras.Authorization = "Bearer " + usuario.token;
  }
  config.headers = cabeceras;

  return fetch(API_URL + ruta, config).then(
    function (respuesta) {
      return respuesta.json().then(
        function (datos) { return { estado: respuesta.status, datos: datos }; },
        function () { return { estado: respuesta.status, datos: {} }; }
      ).then(function (resultado) {
        if (resultado.estado === 401 && cabeceras.Authorization) return sesionVencida();
        return resultado;
      });
    },
    function () {
      throw new Error("No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos.");
    }
  );
}

/* Devuelve los datos de la respuesta del API o lanza un error que se puede
   mostrar tal cual. Si la sesión venció (401), llamarApi ya la cerró. */
export function revisarRespuesta(resultado, esperado, textoError) {
  if (resultado.estado === esperado) return resultado.datos;
  throw new Error(resultado.datos.error || textoError);
}

/* POST (registrar), PUT (modificar) o DELETE (eliminar) contra el API */
export function enviarCrud(ruta, metodo, datos, error) {
  return llamarApi(ruta, {
    method: metodo,
    body: datos ? JSON.stringify(datos) : undefined
  }).then(function (resultado) {
    if (resultado.estado !== 200 && resultado.estado !== 201 && resultado.estado !== 204) {
      throw new Error((resultado.datos && resultado.datos.error) || error);
    }
    return resultado.datos;
  });
}
