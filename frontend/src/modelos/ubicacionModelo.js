/* ==========================================================================
   modelos/ubicacionModelo.js
   Ubicaciones: ciudades, departamentos y países.
   ========================================================================== */

import { NIVELES_UBICACION } from "./catalogos.js";
import { enviarCrud, llamarApi } from "./clienteApi.js";
import { EVENTOS, cargarEventosAdmin } from "./eventoModelo.js";
import { normalizar } from "../lib/formato.js";
import { obtenerAdministradores, obtenerAgentes, obtenerClientes } from "./personaModelo.js";

/* Ciudades para las listas: [["Cali", "Cali (Valle del Cauca)"], ...] */
export function obtenerCiudadesLista() {
  return llamarApi("/ciudades").then(function (resultado) {
    return ((resultado.datos && resultado.datos.ciudades) || [])
      .slice()
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); })
      .map(function (c) { return [c.nombre, c.nombre + " (" + c.departamento + ")"]; });
  });
}

export function obtenerUbicaciones() {
  return llamarApi("/admin/ubicaciones").then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudieron cargar las ubicaciones.");
    }
    return resultado.datos;
  });
}

/* Registra (id = null), renombra o elimina (nombre = null) un país, departamento o ciudad.
   Renombrar una ciudad actualiza personas y eventos por sí solo: usan la llave foránea id_ciudad. */
export function cambiarUbicacion(nivel, id, nombre, idPadre) {
  var n = NIVELES_UBICACION[nivel];
  var ruta = "/admin/" + n.lista + (id === null ? "" : "/" + encodeURIComponent(id));
  var metodo = id === null ? "POST" : (nombre === null ? "DELETE" : "PUT");
  var cuerpo = nombre === null ? null : { nombre: nombre };
  if (id === null && n.padre) cuerpo[n.padre] = idPadre;
  return enviarCrud(ruta, metodo, cuerpo, "No se pudo guardar el cambio.");
}

/* Departamentos de un país, o ciudades de un departamento (nivel = "pais" | "departamento") */
export function hijosDe(datos, nivel, id) {
  if (nivel === "pais") return datos.departamentos.filter(function (d) { return d.idPais === id; });
  if (nivel === "departamento") return datos.ciudades.filter(function (c) { return c.idDepartamento === id; });
  return [];
}

/* Personas (USUARIO.id_ciudad) y eventos (UBICACION.id_ciudad) que usan una ciudad */
export function usosDeCiudad(personas, ciudad) {
  var es = function (x) { return x.ciudad === ciudad.nombre; };
  return {
    clientes: personas.clientes.filter(es),
    agentes: personas.agentes.filter(es),
    administradores: personas.administradores.filter(es),
    eventos: EVENTOS.filter(es)
  };
}

export function ordenarPorNombre(lista) {
  return lista.slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); });
}

export function nombreDeUbicacion(datos, nivel, id) {
  var x = datos[NIVELES_UBICACION[nivel].lista].filter(function (y) { return y.id === id; })[0];
  return x ? x.nombre : "";
}

/* Nombre obligatorio y que no se repita entre hermanos (UNIQUE de la base de datos).
   Devuelve el texto del error, o "" si está bien. */
export function validarNombreUbicacion(datos, nivel, nombre, idPadre, idPropio) {
  var n = NIVELES_UBICACION[nivel];
  if (!nombre) return "Escribe el nombre.";
  if (nombre.length > n.max) return "El nombre puede tener hasta " + n.max + " caracteres.";
  var hermanos = datos[n.lista].filter(function (x) {
    return x.id !== idPropio && (!n.padre || x[n.padre] === idPadre);
  });
  if (hermanos.some(function (x) { return normalizar(x.nombre) === normalizar(nombre); })) {
    return "Ya existe " + (nivel === "ciudad" ? "una ciudad" : (nivel === "pais" ? "un país" : "un departamento")) +
      " con ese nombre" + (n.padre ? " aquí." : ".");
  }
  return "";
}

/* Todo lo que necesita la página de ubicaciones: las ubicaciones, las personas y los eventos
   (para saber cuántos usan cada ciudad) */
export function cargarDatosDeUbicaciones() {
  return Promise.all([
    obtenerUbicaciones(),
    obtenerClientes().catch(function () { return []; }),
    obtenerAgentes().catch(function () { return []; }),
    obtenerAdministradores().catch(function () { return []; }),
    cargarEventosAdmin().catch(function () { return []; })
  ]).then(function (r) {
    return { datos: r[0], personas: { clientes: r[1], agentes: r[2], administradores: r[3] } };
  });
}

/* Nombres de las ciudades agrupados por departamento: { "Antioquia": ["Medellín", ...] } */
export function ciudadesPorDepartamento() {
  return llamarApi("/ciudades").then(function (resultado) {
    var ciudades = (resultado.datos && resultado.datos.ciudades) || [];
    var grupos = {};
    ciudades.forEach(function (c) {
      (grupos[c.departamento] = grupos[c.departamento] || []).push(c.nombre);
    });
    return grupos;
  });
}
