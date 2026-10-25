/* ==========================================================================
   modelos/personaModelo.js
   Personas (agentes, clientes y administradores): reglas de validación y acceso a la API.
   ========================================================================== */

import { documentoNormalizado, errorContrasena, errorCorreo, errorDocumento, errorFechaNacimiento, errorNit, errorTelefono } from "../lib/validacion.js";
import { enviarCrud, llamarApi } from "./clienteApi.js";
import { obtenerUsuario } from "./sesionModelo.js";

/* Errores de los datos comunes de una persona (tabla USUARIO) */
function validarPersona(v, errores) {
  if (!v.tipoDoc) errores.tipoDoc = "Elige el tipo de documento.";
  var errorDoc = errorDocumento(v.tipoDoc, v.documento);
  if (errorDoc) errores.documento = errorDoc;
  if (!v.nombres) errores.nombres = "Escribe los nombres.";
  if (!v.apellidos) errores.apellidos = "Escribe los apellidos.";
  var errorMail = errorCorreo(v.correo);
  if (errorMail) errores.correo = errorMail;
  var errorTel = errorTelefono(v.telefono, false);
  if (errorTel) errores.telefono = errorTel;
  if (!v.direccion) errores.direccion = "Escribe la dirección.";
  if (!v.ciudad) errores.ciudad = "Elige la ciudad.";
  if (v.contrasena !== undefined) {
    var errorClave = errorContrasena(v.contrasena);
    if (errorClave) errores.contrasena = errorClave;
  }
  return errores;
}

/* "nombre" es nombres + apellidos, como se muestra en las listas */
export function conNombre(persona) {
  persona.nombre = persona.nombres !== undefined
    ? (persona.nombres + " " + persona.apellidos).trim()
    : persona.nombre;
  return persona;
}

/* Los agentes de la última consulta: sirven para poner el nombre a los eventos de un NIT */
export var agentesConocidos = [];

export function obtenerAgentes() {
  return llamarApi("/admin/agentes").then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cargar la lista de agentes.");
    }
    agentesConocidos = resultado.datos.agentes;
    return agentesConocidos;
  });
}

/* nit = null para registrar uno nuevo. Devuelve el agente como lo dejó el servidor */
export function guardarAgente(datos, nit) {
  var guardado = nit === null
    ? enviarCrud("/admin/agentes", "POST", datos, "No se pudo registrar el agente.")
    : enviarCrud("/admin/agentes/" + encodeURIComponent(nit), "PUT", datos, "No se pudieron guardar los cambios.");
  return guardado.then(function (respuesta) { return respuesta.agente; });
}

export function eliminarAgente(nit) {
  return enviarCrud("/admin/agentes/" + encodeURIComponent(nit), "DELETE", null, "No se pudo eliminar el agente.");
}

export function cambiarEstadoAgente(nit, estado) {
  return llamarApi("/admin/agentes/" + encodeURIComponent(nit) + "/estado", {
    method: "PATCH",
    body: JSON.stringify({ estado: estado })
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cambiar el estado del agente.");
    }
  });
}

/* actual = el agente que se edita (null al registrar) */
export function validarAgente(v, actual, agentes) {
  var errores = {};
  var errorNitAgente = errorNit(v.nit);
  if (errorNitAgente) errores.nit = errorNitAgente;
  if (!v.razon) errores.razon = "Escribe la razón social.";
  if (!v.nombre) errores.nombre = "Escribe el nombre comercial.";
  if (!/^[0-9]+$/.test(String(v.experiencia))) errores.experiencia = "Los años de experiencia deben ser un número entero de 0 en adelante.";
  var comision = Number(String(v.comision).replace(",", "."));
  if (String(v.comision) === "" || isNaN(comision) || comision < 0 || comision > 100) {
    errores.comision = "La comisión debe ser un número de 0 a 100.";
  }
  if (!v.estado) errores.estado = "Elige el estado.";
  validarPersona(v, errores);

  var otros = agentes.filter(function (a) { return a !== actual; });
  var documento = documentoNormalizado(v.documento);
  if (!actual && !errores.nit && otros.some(function (a) { return a.nit === v.nit; })) {
    errores.nit = "Ya hay un agente con ese NIT.";
  }
  if (!actual && !errores.documento && otros.some(function (a) { return a.documento === documento; })) {
    errores.documento = "Ya hay un agente con ese documento.";
  }
  if (!errores.correo && otros.some(function (a) { return (a.correo || "").toLowerCase() === v.correo.toLowerCase(); })) {
    errores.correo = "Ya hay un agente con ese correo.";
  }

  /* El formulario sigue el orden de la pantalla: primero la empresa, luego el representante */
  var ordenados = {};
  ["nit", "razon", "nombre", "experiencia", "comision", "estado", "descripcion", "tipoDoc", "documento",
    "nombres", "apellidos", "correo", "telefono", "direccion", "ciudad", "contrasena"].forEach(function (k) {
    if (errores[k]) ordenados[k] = errores[k];
  });
  return ordenados;
}

export function obtenerClientes() {
  return llamarApi("/admin/clientes").then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cargar la lista de clientes.");
    }
    return resultado.datos.clientes.map(conNombre);
  });
}

/* documento = null para registrar uno nuevo. Devuelve el cliente como lo dejó el servidor */
export function guardarCliente(datos, documento) {
  var guardado = documento === null
    ? enviarCrud("/admin/clientes", "POST", datos, "No se pudo registrar el cliente.")
    : enviarCrud("/admin/clientes/" + encodeURIComponent(documento), "PUT", datos, "No se pudieron guardar los cambios.");
  return guardado.then(function (respuesta) { return conNombre(respuesta.cliente); });
}

export function eliminarCliente(documento) {
  return enviarCrud("/admin/clientes/" + encodeURIComponent(documento), "DELETE", null, "No se pudo eliminar el cliente.");
}

export function cambiarCuentaCliente(documento, cuenta) {
  return llamarApi("/admin/clientes/" + encodeURIComponent(documento) + "/estado", {
    method: "PATCH",
    body: JSON.stringify({ estado: cuenta })
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cambiar el estado de la cuenta.");
    }
  });
}

/* actual = el cliente que se edita (null al registrar) */
export function validarCliente(v, actual, clientes) {
  var errores = validarPersona(v, {});
  var documento = documentoNormalizado(v.documento);
  var otros = clientes.filter(function (c) { return c !== actual; });

  if (!actual && otros.some(function (c) { return c.documento === documento; })) {
    errores.documento = "Ya hay un cliente con ese documento.";
  }
  if (!errores.correo && otros.some(function (c) { return c.correo.toLowerCase() === v.correo.toLowerCase(); })) {
    errores.correo = "Ya hay un cliente con ese correo.";
  }
  var errorNac = errorFechaNacimiento(v.nacimiento);
  if (errorNac) errores.nacimiento = errorNac;
  if (v.alias && otros.some(function (c) { return (c.alias || "").toLowerCase() === v.alias.toLowerCase(); })) {
    errores.alias = "Ese alias ya lo usa otro cliente.";
  }
  if (!/^[0-9]+$/.test(String(v.puntos))) errores.puntos = "Los puntos deben ser un número entero de 0 en adelante.";
  return errores;
}

export function obtenerAdministradores() {
  return llamarApi("/admin/administradores").then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cargar la lista de administradores.");
    }
    return resultado.datos.administradores.map(conNombre);
  });
}

/* documento = null para registrar uno nuevo. Devuelve el administrador como lo dejó el servidor */
export function guardarAdministrador(datos, documento) {
  var guardado = documento === null
    ? enviarCrud("/admin/administradores", "POST", datos, "No se pudo registrar el administrador.")
    : enviarCrud("/admin/administradores/" + encodeURIComponent(documento), "PUT", datos, "No se pudieron guardar los cambios.");
  return guardado.then(function (respuesta) { return conNombre(respuesta.administrador); });
}

export function eliminarAdministrador(documento) {
  return enviarCrud("/admin/administradores/" + encodeURIComponent(documento), "DELETE", null,
    "No se pudo eliminar el administrador.");
}

/* actual = el administrador que se edita (null al registrar) */
export function validarAdministrador(v, actual, administradores) {
  var errores = validarPersona(v, {});
  var otros = administradores.filter(function (a) { return a !== actual; });
  var documento = documentoNormalizado(v.documento);

  if (!actual && !errores.documento && otros.some(function (a) { return a.documento === documento; })) {
    errores.documento = "Ya hay un administrador con ese documento.";
  }
  if (!errores.correo && otros.some(function (a) { return a.correo.toLowerCase() === v.correo.toLowerCase(); })) {
    errores.correo = "Ya hay un administrador con ese correo.";
  }
  if (!/^[0-9]+$/.test(String(v.salario))) errores.salario = "El salario debe ser un número entero de 0 en adelante, sin puntos.";
  if (!v.horario) errores.horario = "Elige el horario.";

  var ordenados = {};
  ["tipoDoc", "documento", "nombres", "apellidos", "correo", "telefono", "direccion", "ciudad",
    "salario", "horario", "contrasena"].forEach(function (k) { if (errores[k]) ordenados[k] = errores[k]; });
  return ordenados;
}

export function guardarPerfil(datos) {
  return llamarApi("/agente/perfil", {
    method: "PUT",
    body: JSON.stringify(datos)
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo guardar el perfil.");
    }
    return resultado.datos;
  });
}

/* ¿Esta persona es la cuenta con la que se entró al panel? (un administrador no puede eliminarse a sí mismo) */
export function esMiCuenta(persona) {
  var yo = obtenerUsuario();
  return persona.correo.toLowerCase() === ((yo && yo.correo) || "").toLowerCase();
}

/* Revisa el perfil del agente (campos ya sin espacios sobrantes): [campo, mensaje], o null si está bien */
export function errorDePerfil(v) {
  if (v.nombre.length < 3) return ["nombre", "Escribe el nombre comercial de la empresa."];
  if (v.descripcion.length < 30) return ["descripcion", "La descripción debe tener al menos 30 caracteres."];
  if (errorCorreo(v.correo)) return ["correo", errorCorreo(v.correo)];
  if (errorTelefono(v.telefono, true)) return ["telefono", errorTelefono(v.telefono, true)];
  if (!v.ciudad) return ["ciudad", "Elige la ciudad de la empresa."];
  if (!/^\d+$/.test(v.experiencia) || Number(v.experiencia) > 80) return ["experiencia", "Los años de experiencia deben ser un número entre 0 y 80."];
  return null;
}
