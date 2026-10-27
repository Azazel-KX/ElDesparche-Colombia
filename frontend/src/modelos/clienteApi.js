/* ==========================================================================
   modelos/clienteApi.js
   Cliente HTTP de la API: agrega el token de la sesión, cierra la sesión si vence y revisa las respuestas.
   ========================================================================== */

import { borrarUsuario, marcarSesionVencida, obtenerUsuario } from "./sesionModelo.js";

/* Dirección del API, en este orden:
   1. VITE_API_URL al construir la web (frontend/.env, ver .env.example): la web y el API en dominios distintos
   2. window.DESPARCHE_API_URL definida antes de cargar la página
   3. "/api" en el mismo dominio (en desarrollo, Vite la redirige al backend: ver vite.config.js) */
var API_URL = String(import.meta.env.VITE_API_URL || window.DESPARCHE_API_URL || "/api").replace(/\/+$/, "");

/* Tiempo máximo de espera de una respuesta. Neon suspende la base cuando no se usa y la primera
   consulta tarda unos segundos en despertarla: el límite es amplio, pero evita esperar para siempre. */
var TIEMPO_LIMITE_MS = 20000;

var SIN_CONEXION = "No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos.";
var SIN_RESPUESTA = "El servidor tardó demasiado en responder. Inténtalo de nuevo en unos segundos.";

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
   - Si el servidor no responde (o tarda más de TIEMPO_LIMITE_MS), rechaza la promesa con un mensaje que se
     puede mostrar tal cual. */
export function llamarApi(ruta, opciones) {
  var config = Object.assign({}, opciones);
  var cabeceras = Object.assign({}, config.headers);
  var usuario = RUTAS_SIN_TOKEN.indexOf(ruta) === -1 ? obtenerUsuario() : null;
  var limite = null;

  if (typeof config.body === "string" && !cabeceras["Content-Type"]) {
    cabeceras["Content-Type"] = "application/json";
  }
  if (usuario && usuario.token && !cabeceras.Authorization) {
    cabeceras.Authorization = "Bearer " + usuario.token;
  }
  config.headers = cabeceras;

  /* Quien llama puede traer su propia señal de cancelación; si no, se pone el tiempo límite */
  if (!config.signal && typeof AbortController === "function") {
    var control = new AbortController();
    limite = setTimeout(function () { control.abort(); }, TIEMPO_LIMITE_MS);
    config.signal = control.signal;
  }

  return fetch(API_URL + ruta, config).then(
    function (respuesta) {
      return respuesta.json().then(
        function (datos) { return { estado: respuesta.status, datos: datos }; },
        function () { return { estado: respuesta.status, datos: {} }; }
      ).then(function (resultado) {
        clearTimeout(limite);
        if (resultado.estado === 401 && cabeceras.Authorization) return sesionVencida();
        return resultado;
      });
    },
    function (error) {
      clearTimeout(limite);
      throw new Error(error && error.name === "AbortError" ? SIN_RESPUESTA : SIN_CONEXION);
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
