/* ==========================================================================
   controladores/accesoControlador.js
   Iniciar sesión y registrarse: lee los formularios de la ventana de acceso, los revisa con las
   reglas de lib/validacion.js, los manda a la API y deja guardada la sesión.
   ========================================================================== */

import { errorContrasena, errorCorreo, errorDocumento, errorFechaNacimiento, errorNit, errorTelefono } from "../lib/validacion.js";
import { iniciarSesion, obtenerCiudadesRegistro, registrarCuenta } from "../modelos/authModelo.js";
import { guardarSesionDeLaApi } from "../modelos/sesionModelo.js";
import {
  CAMPOS_REGISTRO, ciudadesRegistroConError, limpiarError, llenarCiudadesRegistro, mostrarError
} from "../vistas/accesoVista.js";

/* Llena la lista de ciudades (una sola vez) con las que hay en la base de datos */
var ciudadesCargadas = false;

export function cargarCiudadesRegistro() {
  if (ciudadesCargadas) {
    return;
  }

  obtenerCiudadesRegistro().then(function (ciudades) {
    llenarCiudadesRegistro(ciudades);
    ciudadesCargadas = true;
  }).catch(function (error) {
    ciudadesRegistroConError();
    mostrarError("error-registro", error.message);
  });
}

/* Envía el formulario al API. Mientras espera, el botón queda desactivado
   para que un doble clic no cree la cuenta dos veces.
   "peticion" es la llamada al modelo (iniciarSesion o registrarCuenta); "campos" dice qué campo
   de la pantalla corresponde a cada campo del API. */
function enviarFormulario(formulario, peticion, idError, campos) {
  var boton = formulario.querySelector('button[type="submit"]');
  boton.disabled = true;

  peticion().then(function (resultado) {
    if (resultado.estado === 200 || resultado.estado === 201) {
      guardarSesionDeLaApi(resultado.datos);
      window.location.reload();
      return;
    }

    /* Si el API dice qué campo falló, se marca ese campo */
    var detalles = resultado.datos.detalles || {};
    var clave = Object.keys(detalles)[0];
    var mensaje = (clave && typeof detalles[clave] === "string")
      ? detalles[clave]
      : (resultado.datos.error || "No se pudo completar la solicitud.");

    mostrarError(idError, mensaje, campos[clave]);
    boton.disabled = false;
  }).catch(function (error) {
    mostrarError(idError, error.message);
    boton.disabled = false;
  });
}

/* Iniciar sesión */
export function entrar(evento) {
  evento.preventDefault();

  var correo = document.getElementById("correo-entrar").value.trim();
  var clave = document.getElementById("clave-entrar").value;

  limpiarError("error-entrar", ["correo-entrar", "clave-entrar"]);

  /* Los mensajes dicen QUÉ campo falta y CÓMO arreglarlo (WCAG 3.3.3) */
  if (correo === "") {
    mostrarError("error-entrar", "Escribe tu correo electrónico.", "correo-entrar");
    return;
  }

  if (clave === "") {
    mostrarError("error-entrar", "Escribe tu contraseña.", "clave-entrar");
    return;
  }

  enviarFormulario(
    evento.target,
    function () { return iniciarSesion(correo, clave); },
    "error-entrar",
    { correo: "correo-entrar", contrasena: "clave-entrar" }
  );
}

/* Crear cuenta: los campos y las reglas siguen la base de datos */
export function registrar(evento) {
  evento.preventDefault();

  limpiarError("error-registro", CAMPOS_REGISTRO);

  var valor = function (id) {
    return document.getElementById(id).value.trim();
  };
  var esAgente = document.querySelector('input[name="tipo-cuenta"]:checked').value === "agente";

  var datos = {
    tipo_cuenta: esAgente ? "AGENTE" : "CLIENTE",
    tipo_identificacion: valor("tipo-id-registro"),
    numero_identificacion: valor("numero-id-registro"),
    nombre: valor("nombres-registro"),
    apellidos: valor("apellidos-registro"),
    telefono: valor("telefono-registro"),
    id_ciudad: valor("ciudad-registro"),
    direccion: valor("direccion-registro"),
    correo: valor("correo-registro"),
    contrasena: document.getElementById("clave-registro").value
  };

  if (esAgente) {
    datos.nit = valor("nit-registro");
    datos.razon_social = valor("razon-registro");
    datos.nombre_comercial = valor("comercial-registro");
    datos.descripcion = valor("descripcion-registro");
  } else {
    datos.fecha_nacimiento = valor("nacimiento-registro");
    datos.alias = valor("alias-registro");
  }

  /* Revisión en el navegador, en el orden en que aparecen los campos, con las
     mismas reglas que valida el API (lib/validacion.js). El servidor las repite y la base
     de datos es la última barrera: aquí solo se avisa antes y con el campo marcado. */
  var revisiones = [
    ["numero-id-registro", errorDocumento(datos.tipo_identificacion, datos.numero_identificacion)],
    ["nombres-registro", datos.nombre ? "" : "Escribe tus nombres."],
    ["apellidos-registro", datos.apellidos ? "" : "Escribe tus apellidos."],
    ["telefono-registro", errorTelefono(datos.telefono, false)],
    ["pais-registro", valor("pais-registro") ? "" : "Elige tu país."],
    ["departamento-registro", valor("departamento-registro") ? "" : "Elige tu departamento."],
    ["ciudad-registro", datos.id_ciudad ? "" : "Elige tu ciudad."],
    ["direccion-registro", datos.direccion ? "" : "Escribe tu dirección."]
  ];
  if (esAgente) {
    revisiones.push(["nit-registro", errorNit(datos.nit)]);
    revisiones.push(["razon-registro", datos.razon_social ? "" : "Escribe la razón social."]);
    revisiones.push(["comercial-registro", datos.nombre_comercial ? "" : "Escribe el nombre comercial."]);
  } else {
    revisiones.push(["nacimiento-registro", errorFechaNacimiento(datos.fecha_nacimiento)]);
  }
  revisiones.push(["correo-registro", errorCorreo(datos.correo)]);
  revisiones.push(["clave-registro", errorContrasena(datos.contrasena)]);
  revisiones.push(["clave2-registro",
    document.getElementById("clave2-registro").value === datos.contrasena ? "" : "Las dos contraseñas no coinciden."]);

  for (var i = 0; i < revisiones.length; i++) {
    if (revisiones[i][1]) {
      mostrarError("error-registro", revisiones[i][1], revisiones[i][0]);
      return;
    }
  }

  /* Nombre de cada campo del API -> id del campo en pantalla */
  enviarFormulario(evento.target, function () { return registrarCuenta(datos); }, "error-registro", {
    tipo_cuenta: "tipo-id-registro",
    tipo_identificacion: "tipo-id-registro",
    numero_identificacion: "numero-id-registro",
    nombre: "nombres-registro",
    apellidos: "apellidos-registro",
    telefono: "telefono-registro",
    id_ciudad: "ciudad-registro",
    direccion: "direccion-registro",
    fecha_nacimiento: "nacimiento-registro",
    alias: "alias-registro",
    nit: "nit-registro",
    razon_social: "razon-registro",
    nombre_comercial: "comercial-registro",
    correo: "correo-registro",
    contrasena: "clave-registro"
  });
}
