/* ==========================================================================
   modelos/eventoModelo.js
   Eventos: el catálogo en memoria, sus reglas y su acceso a la API (público, administrador y agente).
   ========================================================================== */

import { numero } from "../lib/formato.js";
import { errorLatitud, errorLongitud } from "../lib/validacion.js";
import { enviarCrud, llamarApi, revisarRespuesta } from "./clienteApi.js";
import { agentesConocidos } from "./personaModelo.js";
import { fechaTextoAIso } from "../lib/fechas.js";
import { normalizar } from "../lib/formato.js";

export var EVENTOS = [];

/* Ids de los eventos que salen en el carrusel de la portada (los elige usarCatalogo) */
export var DESTACADOS = [];

/* Países, departamentos y ciudades de los filtros de la portada: usarCatalogo
   los llena con los de los eventos publicados */
export var DEPARTAMENTOS = {};

export var CIUDADES = {};

/* El tipo de plan lo calcula el API para cada evento (campo "parche") */
export function parcheDe(evento) {
  return evento.parche || "";
}

/* Cupos que le quedan a un evento: el backend ya descuenta lo reservado */
export function cuposLibres(evento) {
  return Math.max(evento.disponibles, 0);
}

/* Dice si un evento se puede reservar */
export function sePuedeReservar(evento) {
  return evento.estado !== "Finalizado" && evento.estado !== "Cancelado";
}

/* Un evento que se puede reservar ahora mismo: no está finalizado ni cancelado, todavía no terminó y le quedan cupos.
   Es lo que muestra la portada (el listado completo, con los demás estados, está en eventos.html). */
export function estaDisponible(evento) {
  var terminado = evento.fin && new Date(evento.fin) <= new Date();
  return sePuedeReservar(evento) && cuposLibres(evento) > 0 && !terminado;
}

/* Busca un evento por su código ("EVT-2026-0001") */
export function buscarEvento(id) {
  for (var i = 0; i < EVENTOS.length; i++) {
    if (String(EVENTOS[i].id) === String(id)) {
      return EVENTOS[i];
    }
  }
  return null;
}

/* ¿El evento coincide con lo escrito en el buscador (en el título o en la ciudad)? */
function coincideTexto(evento, texto) {
  return texto === "" ||
    evento.titulo.toLowerCase().indexOf(texto) !== -1 ||
    evento.ciudad.toLowerCase().indexOf(texto) !== -1;
}

/* Eventos de la portada: los disponibles para reservar, por texto, ciudad ("" = todas) y tipo de plan ("" = todos) */
export function filtrarEventosInicio(texto, ciudad, parche) {
  var buscado = texto.toLowerCase();
  return EVENTOS.filter(function (evento) {
    return estaDisponible(evento) && coincideTexto(evento, buscado) &&
      (ciudad === "" || evento.ciudad === ciudad) &&
      (parche === "" || parcheDe(evento) === parche);
  });
}

/* Eventos del listado: por texto, país, departamento, ciudad y estado ("" = todos en cada uno) */
export function filtrarEventosListado(texto, pais, departamento, ciudad, estado) {
  var buscado = texto.toLowerCase();
  return EVENTOS.filter(function (evento) {
    return coincideTexto(evento, buscado) &&
      (pais === "" || evento.pais === pais) &&
      (departamento === "" || evento.departamento === departamento) &&
      (ciudad === "" || evento.ciudad === ciudad) &&
      (estado === "" || evento.estado === estado);
  });
}

/* Donde hay eventos (de cualquier estado), para los filtros del listado: { país: { departamento: [ciudades] } } */
export function ubicacionesDelCatalogo() {
  return ubicacionesDe(EVENTOS);
}

/* Países que tienen eventos, en orden alfabético */
export function paisesDelCatalogo() {
  return Object.keys(DEPARTAMENTOS).sort();
}

export function cargarCatalogo() {
  var todos = [];

  function pedir(numero) {
    return llamarApi("/eventos?limite=100&pagina=" + numero).then(function (resultado) {
      var datos = revisarRespuesta(resultado, 200, "No se pudieron cargar los eventos.");
      todos = todos.concat(datos.eventos);
      return numero < datos.paginacion.paginas ? pedir(numero + 1) : todos;
    });
  }

  return pedir(1).then(usarCatalogo);
}

export function usarCatalogo(eventos) {
  EVENTOS.splice(0, EVENTOS.length);
  eventos.forEach(function (evento) { EVENTOS.push(evento); });

  /* Carrusel de la portada: los próximos eventos que todavía se pueden reservar */
  DESTACADOS.splice(0, DESTACADOS.length);
  EVENTOS.filter(estaDisponible).slice(0, 10).forEach(function (evento) { DESTACADOS.push(evento.id); });

  /* Filtros de la portada: los países, departamentos y ciudades que tienen eventos */
  Object.keys(DEPARTAMENTOS).forEach(function (k) { delete DEPARTAMENTOS[k]; });
  Object.keys(CIUDADES).forEach(function (k) { delete CIUDADES[k]; });
  function agregar(lista, valor) {
    if (valor && lista.indexOf(valor) === -1) lista.push(valor);
  }
  EVENTOS.filter(estaDisponible).forEach(function (evento) {
    DEPARTAMENTOS[evento.pais] = DEPARTAMENTOS[evento.pais] || [];
    agregar(DEPARTAMENTOS[evento.pais], evento.departamento);
    CIUDADES[evento.departamento] = CIUDADES[evento.departamento] || [];
    agregar(CIUDADES[evento.departamento], evento.ciudad);
  });
  Object.keys(DEPARTAMENTOS).forEach(function (k) { DEPARTAMENTOS[k].sort(); });
  Object.keys(CIUDADES).forEach(function (k) { CIUDADES[k].sort(); });
}

/* Paneles de administración y de agente: llena EVENTOS con los eventos de la base que ve ese
   rol. Se pide una sola vez; "recargar" vuelve a pedirlos. */
var eventosDelPanel = null;

function cargarEventosPanel(ruta, recargar) {
  if (!eventosDelPanel || recargar) {
    eventosDelPanel = llamarApi(ruta).then(function (resultado) {
      var datos = revisarRespuesta(resultado, 200, "No se pudo cargar la lista de eventos.");
      EVENTOS.splice(0, EVENTOS.length);
      datos.eventos.forEach(function (evento) { EVENTOS.push(evento); });
      return EVENTOS;
    });
    eventosDelPanel.catch(function () { eventosDelPanel = null; });
  }
  return eventosDelPanel;
}

/* ¿El evento es de este agente? Manda el NIT guardado en el evento */
function esEventoDe(evento, agente) {
  return evento.nitAgente === agente.nit;
}

export function nitDelEvento(evento) {
  return evento.nitAgente || "";
}

/* Eventos publicados de un agente */
export function eventosDeAgente(a) {
  return EVENTOS.filter(function (e) { return esEventoDe(e, a); });
}

function capacidadNumero(evento) {
  return typeof evento.capacidad === "number"
    ? evento.capacidad
    : Number(String(evento.capacidad).replace(/\D/g, ""));
}

/* Añade los datos calculados que usa la tabla */
export function completarEvento(evento) {
  var capacidad = capacidadNumero(evento);
  var vendidas = Math.max(capacidad - evento.disponibles, 0);

  return Object.assign({}, evento, {
    capacidadTotal: capacidad,
    vendidas: vendidas,
    ocupacion: capacidad ? Math.round(vendidas / capacidad * 100) : 0,
    ingresos: vendidas * evento.precio,
    agente: evento.agente || (evento.nitAgente ? nombreAgente(evento.nitAgente) : "Sin agente")
  });
}

/* Llena EVENTOS con los eventos de la base de datos (el administrador ve todos los publicados) */
export function cargarEventosAdmin(recargar) {
  return cargarEventosPanel("/admin/eventos", recargar);
}

export function obtenerEventosAdmin() {
  return cargarEventosAdmin(true).then(function (lista) {
    return lista.map(completarEvento);
  });
}

/* actual = el evento que se edita (null al registrar) */
export function validarEvento(v, actual) {
  var errores = {};
  if (!v.titulo) errores.titulo = "Escribe el nombre del evento.";
  if (v.descripcion.length < 30) errores.descripcion = "La descripción debe tener al menos 30 caracteres.";
  if (!v.categoria) errores.categoria = "Elige la categoría.";
  if (!v.parche) errores.parche = "Elige el tipo de plan.";
  if (!v.nitAgente) errores.nitAgente = "Elige el agente que organiza el evento.";
  if (!v.estado) errores.estado = "Elige el estado.";
  if (!v.inicio) errores.inicio = "Escribe cuándo empieza.";
  if (!v.fin) errores.fin = "Escribe cuándo termina.";
  else if (v.inicio && v.fin <= v.inicio) errores.fin = "El evento debe terminar después de empezar.";
  if (!v.ciudad) errores.ciudad = "Elige la ciudad.";
  if (!v.teatro) errores.teatro = "Escribe el nombre del teatro o del sitio del evento.";
  if (!v.direccion) errores.direccion = "Escribe la dirección.";

  /* Mismos límites que UBICACION en la base de datos (cualquier punto del planeta) */
  var errorLat = errorLatitud(v.lat);
  var errorLon = errorLongitud(v.lon);
  if (errorLat) errores.lat = errorLat;
  if (errorLon) errores.lon = errorLon;

  if (!/^[0-9]+$/.test(String(v.capacidad)) || Number(v.capacidad) < 1) {
    errores.capacidad = "La capacidad debe ser un número entero mayor que 0.";
  } else if (actual && Number(v.capacidad) < actual.vendidas) {
    errores.capacidad = "Ya se vendieron " + numero.format(actual.vendidas) + " entradas: la capacidad no puede ser menor.";
  }
  if (!/^[0-9]+$/.test(String(v.precio))) errores.precio = "El precio debe ser un número entero de 0 en adelante, sin puntos.";
  if (!/^[0-9]+$/.test(String(v.edad)) || Number(v.edad) > 21) errores.edad = "La edad mínima debe ser un número entre 0 y 21.";
  if (v.imagen && !/^image\//.test(v.imagen.type)) errores.imagen = "El archivo debe ser una imagen.";
  return errores;
}

/* Lo que se manda al API para registrar o modificar un evento, con los nombres que
   valida el backend. El código, el estado inicial, los cupos y el agente dueño los fija el servidor. */
export function cuerpoEvento(v, imagen) {
  return {
    nombre: v.titulo, categoria: v.categoria, descripcion: v.descripcion, inicio: v.inicio, fin: v.fin,
    ciudad: v.ciudad, teatro: v.teatro, direccion: v.direccion,
    capacidad: Number(v.capacidad), precio: Number(v.precio), edad: Number(v.edad),
    observaciones: v.observaciones, imagen: imagen,
    lat: String(v.lat).replace(",", "."), lon: String(v.lon).replace(",", "."),
    nit: v.nitAgente
  };
}

/* id = null para registrar uno nuevo. Devuelve el evento como lo dejó el servidor (con su código real) */
export function guardarEvento(cuerpo, id) {
  var guardado = id === null
    ? enviarCrud("/admin/eventos", "POST", cuerpo, "No se pudo registrar el evento.")
    : enviarCrud("/admin/eventos/" + encodeURIComponent(id), "PUT", cuerpo, "No se pudieron guardar los cambios.");
  return guardado.then(function (respuesta) { return respuesta.evento; });
}

export function eliminarEvento(id) {
  return enviarCrud("/admin/eventos/" + encodeURIComponent(id), "DELETE", null, "No se pudo eliminar el evento.");
}

/* "observaciones" solo cambia al cancelar (lleva la causa).
   Devuelve el evento como lo dejó el servidor. */
export function cambiarEstadoEvento(id, estado, observaciones) {
  return llamarApi("/admin/eventos/" + encodeURIComponent(id) + "/estado", {
    method: "PATCH",
    body: JSON.stringify(observaciones === undefined ? { estado: estado } : { estado: estado, observaciones: observaciones })
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cambiar el estado del evento.");
    }
    return resultado.datos.evento;
  });
}

/* ===== EVENTOS POR REVISAR =====
   Los crea un agente en agente.html?seccion=eventos y quedan "En revisión".
   - GET   /api/admin/eventos/solicitudes       -> { solicitudes: [ en revisión ] }
   - PATCH /api/admin/eventos/solicitudes/:id   cuerpo { estado: "Aprobado" | "Rechazado", motivo }
     Al aprobar, el backend crea la fila de EVENTO como "Programado". */


/* Nombre comercial del agente con ese NIT, entre los que cargó obtenerAgentes */
function nombreAgente(nit) {
  var agente = agentesConocidos.filter(function (a) { return a.nit === nit; })[0];
  return agente ? agente.nombre : "Agente " + nit;
}

export function obtenerSolicitudesEventos() {
  return llamarApi("/admin/eventos/solicitudes").then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudieron cargar los eventos por revisar.");
    }
    return resultado.datos.solicitudes;
  });
}

/* Devuelve la solicitud como la dejó el servidor: al aprobar trae "idEvento", el código real del evento */
export function resolverSolicitudEvento(id, estado, motivo) {
  return llamarApi("/admin/eventos/solicitudes/" + encodeURIComponent(id), {
    method: "PATCH",
    body: JSON.stringify({ estado: estado, motivo: motivo || null })
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo guardar la decisión.");
    }
    return resultado.datos;
  });
}

/* Todo evento debe tener su punto en el mapa para poder publicarse */
export function tieneUbicacion(s) {
  return s.lat !== undefined && s.lat !== "" && s.lat !== null && !isNaN(Number(s.lat)) &&
    s.lon !== undefined && s.lon !== "" && s.lon !== null && !isNaN(Number(s.lon));
}

export function obtenerEventosDelAgente() {
  return llamarApi("/agente/eventos").then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudieron cargar tus eventos.");
    }
    return {
      agente: resultado.datos.agente,
      eventos: resultado.datos.eventos.map(completarEvento),
      solicitudes: resultado.datos.solicitudes
    };
  });
}

/* Crea o corrige una solicitud: siempre vuelve a quedar "En revisión" */
export function enviarSolicitud(datos, id) {
  return llamarApi("/agente/eventos" + (id ? "/" + encodeURIComponent(id) : ""), {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(datos)
  }).then(function (resultado) {
    if (resultado.estado !== 200 && resultado.estado !== 201) {
      throw new Error(resultado.datos.error || "No se pudo enviar el evento a revisión.");
    }
    return resultado.datos;
  });
}

export function retirarSolicitud(id) {
  return llamarApi("/agente/eventos/" + encodeURIComponent(id), {
    method: "DELETE"
  }).then(function (resultado) {
    if (resultado.estado !== 200 && resultado.estado !== 204) {
      throw new Error(resultado.datos.error || "No se pudo retirar la solicitud.");
    }
  });
}

/* ----- Eventos del panel del administrador ----- */

/* Valores iniciales del formulario al editar un evento */
export function valoresEvento(e) {
  return {
    titulo: e.titulo, descripcion: e.descripcion, categoria: e.categoria || "", parche: parcheDe(e),
    nitAgente: nitDelEvento(e), estado: e.estado,
    inicio: e.inicio || fechaTextoAIso(e.fechaInicio), fin: e.fin || fechaTextoAIso(e.fechaFin),
    ciudad: e.ciudad, teatro: e.teatro, direccion: e.direccion || "",
    lat: e.lat !== undefined ? String(e.lat).replace(".", ",") : "", lon: e.lon !== undefined ? String(e.lon).replace(".", ",") : "",
    capacidad: e.capacidadTotal, precio: e.precio, edad: e.edad || 0,
    observaciones: e.observaciones === "Sin observaciones." ? "" : e.observaciones
  };
}

/* filtros = { texto, estado, pais, departamento, ciudad, orden }; vacío = sin filtrar */
export function filtrarEventosAdmin(eventos, filtros) {
  var texto = normalizar((filtros.texto || "").trim());
  var lista = eventos.filter(function (e) {
    var coincide = texto === "" ||
      normalizar(e.titulo + " " + e.teatro + " " + e.ciudad + " " + e.agente).indexOf(texto) !== -1;
    return coincide &&
      (!filtros.estado || e.estado === filtros.estado) &&
      (!filtros.pais || e.pais === filtros.pais) &&
      (!filtros.departamento || e.departamento === filtros.departamento) &&
      (!filtros.ciudad || e.ciudad === filtros.ciudad);
  });
  lista.sort(function (a, b) {
    if (filtros.orden === "nombre") return a.titulo.localeCompare(b.titulo, "es");
    if (filtros.orden === "precio") return b.precio - a.precio;
    if (filtros.orden === "ingresos") return b.ingresos - a.ingresos;
    return b.ocupacion - a.ocupacion;
  });
  return lista;
}

/* Dónde hay eventos en una lista: { país: { departamento: [ciudades] } } */
export function ubicacionesDe(eventos) {
  var mapa = {};
  eventos.forEach(function (e) {
    var departamentos = mapa[e.pais] = mapa[e.pais] || {};
    var ciudades = departamentos[e.departamento] = departamentos[e.departamento] || [];
    if (ciudades.indexOf(e.ciudad) === -1) ciudades.push(e.ciudad);
  });
  return mapa;
}

/* ----- Mis eventos (panel del agente) ----- */

/* datos = { eventos, solicitudes }. Devuelve lo que coincide con el texto y el estado elegidos */
export function filtrarMisEventos(datos, texto, estado) {
  texto = normalizar(texto);
  function coincide(nombre, teatro, ciudad, estadoItem) {
    return (!estado || estadoItem === estado) &&
      (!texto || normalizar(nombre + " " + teatro + " " + ciudad).indexOf(texto) !== -1);
  }
  return {
    solicitudes: datos.solicitudes.filter(function (s) { return coincide(s.nombre, s.teatro, s.ciudad, s.estado); }),
    eventos: datos.eventos.filter(function (e) { return coincide(e.titulo, e.teatro, e.ciudad, e.estado); })
  };
}

/* Revisa los campos de la solicitud (ya sin espacios sobrantes) y devuelve el primer problema:
   [campo, mensaje], o null si todo está bien */
export function errorDeSolicitud(v) {
  var entero = function (texto) { return /^\d+$/.test(texto); };

  if (v.nombre.length < 3) return ["nombre", "Escribe el nombre del evento."];
  if (!v.categoria) return ["categoria", "Elige la categoría del evento."];
  if (!v.plan) return ["plan", "Elige el tipo de plan."];
  if (v.descripcion.length < 30) return ["descripcion", "La descripción debe tener al menos 30 caracteres."];
  if (!v.inicio) return ["inicio", "Escribe la fecha y la hora en que empieza el evento."];
  if (new Date(v.inicio) <= new Date()) return ["inicio", "El evento debe empezar en una fecha futura."];
  if (!v.fin) return ["fin", "Escribe la fecha y la hora en que termina el evento."];
  if (new Date(v.fin) <= new Date(v.inicio)) return ["fin", "El evento debe terminar después de empezar."];
  if (!v.ciudad) return ["ciudad", "Elige la ciudad del evento."];
  if (v.teatro.length < 3) return ["teatro", "Escribe el nombre del teatro o del sitio del evento."];
  if (v.direccion.length < 5) return ["direccion", "Escribe la dirección del teatro."];
  if (!entero(v.capacidad) || Number(v.capacidad) < 1) return ["capacidad", "La capacidad debe ser un número entero mayor que 0."];
  if (v.precio === "" || isNaN(Number(v.precio)) || Number(v.precio) < 0) return ["precio", "El precio debe ser 0 (gratis) o mayor."];
  if (!entero(v.edad) || Number(v.edad) > 21) return ["edad", "La edad mínima debe ser un número entre 0 y 21."];
  if (v.lat === "" || v.lon === "") return ["lat", "Marca en el mapa dónde es el evento (o escribe la latitud y la longitud)."];
  /* Mismos límites que el administrador y la base de datos */
  if (errorLatitud(v.lat)) return ["lat", errorLatitud(v.lat)];
  if (errorLongitud(v.lon)) return ["lon", errorLongitud(v.lon)];
  return null;
}

/* ----- Eventos ya publicados del agente ----- */

/* Lo que no toca a las reservas: descripción, observaciones e imagen (null = se conserva). Devuelve el evento. */
export function editarEventoPublicado(id, datos) {
  return enviarCrud("/agente/eventos/" + encodeURIComponent(id) + "/publicado", "PUT", datos, "No se pudo guardar el evento.")
    .then(function (resultado) { return resultado.evento; });
}

/* Cancela un evento publicado suyo (y sus reservas). Devuelve el evento con el estado y las observaciones nuevas. */
export function cancelarEventoAgente(id, causa, detalle) {
  return enviarCrud("/agente/eventos/" + encodeURIComponent(id) + "/cancelar", "PATCH", { causa: causa, detalle: detalle }, "No se pudo cancelar el evento.")
    .then(function (resultado) { return resultado.evento; });
}

/* Revisa la descripción de un evento publicado (misma regla del servidor). Devuelve el error o "". */
export function errorDeEdicionPublicada(descripcion, observaciones) {
  if (descripcion.length < 30) return "La descripción debe tener al menos 30 caracteres.";
  if (descripcion.length > 3000) return "La descripción no puede superar los 3000 caracteres.";
  if (observaciones.length > 1000) return "Las observaciones no pueden superar los 1000 caracteres.";
  return "";
}
