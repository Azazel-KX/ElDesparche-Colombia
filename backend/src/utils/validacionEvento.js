// Validación de datos de EVENTOS (crear, editar, cambiar de estado, decidir una solicitud y filtros del catálogo)
//
// Sigue el mismo patrón que validacion.js:
// - Cada función recibe el body de la petición.
// - Devuelve { datos } si todo está bien, o { errores: { campo: "mensaje" } } si algo falla.
// - Los campos se llaman como los manda la web (frontend/js/agente.js, datosFormulario): nombre, inicio, fin, ciudad,
//   teatro, capacidad, edad... Las reglas espejan los CHECK de EVENTO y UBICACION en database/schema_ElDesparche.sql.
//   La base de datos sigue siendo la última barrera.

const { texto } = require("./validacion");
const { RE_CANCELACION } = require("./formato");

// Mismos valores que el CHECK de categoria y los ENUM estado_evento_t / estado_reserva_t del esquema
const CATEGORIAS = ["musica", "teatro", "danza", "circo", "comedia"];
const ESTADOS = ["En revisión", "Rechazado", "Programado", "En Boletería", "En Vivo", "Finalizado", "Cancelado"];
// Los estados de un evento ya publicado. "En revisión" y "Rechazado" son de las solicitudes de los agentes.
const ESTADOS_OPERATIVOS = ["Programado", "En Boletería", "En Vivo", "Finalizado", "Cancelado"];
const ESTADOS_SOLICITUD = ["En revisión", "Rechazado"];
// Estados en los que todavía se pueden vender entradas (igual que la web: todo menos Finalizado y Cancelado)
const ESTADOS_RESERVABLES = ["Programado", "En Boletería", "En Vivo"];

// Máquina de estados: desde cada estado, a cuáles se puede pasar.
// "Finalizado" y "Cancelado" son estados finales: de ahí no se sale.
const TRANSICIONES = {
  "Programado": ["En Boletería", "Cancelado"],
  "En Boletería": ["En Vivo", "Cancelado"],
  "En Vivo": ["Finalizado", "Cancelado"],
  "Finalizado": [],
  "Cancelado": [],
};

// Causas de cancelación de un evento y de una reserva: las mismas listas de CAUSAS_CANCELACION en frontend/js/script.js.
// No hay tabla de causas; se valida contra estas listas para que los reportes puedan agrupar por causa.
const CAUSAS_EVENTO = [
  "Baja venta de entradas", "Fuerza mayor o clima", "Problemas técnicos o logísticos",
  "Cambio de fecha del evento", "Otra causa",
];
const CAUSAS_RESERVA = [
  "No puede asistir", "Error en el evento o en la cantidad", "Pago no realizado a tiempo",
  "Cambio de fecha del evento", "Otra causa",
];

// Acepta "2026-11-15T19:00", "2026-11-15 19:00" o con segundos. Sin zona horaria: la BD usa TIMESTAMP
// (hora local de Colombia), así que no convertimos nada.
const RE_FECHA_HORA = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

// Convierte el texto en un objeto Date solo para COMPARAR (¿fin > inicio? ¿está en el futuro?).
// Devuelve null si el formato es inválido o la fecha no existe (por ejemplo 2026-02-31).
function leerFechaHora(valor) {
  const m = RE_FECHA_HORA.exec(texto(valor));
  if (!m) return null;
  const [, a, mes, d, h, min, s = "00"] = m;
  const fecha = new Date(Number(a), Number(mes) - 1, Number(d), Number(h), Number(min), Number(s));
  // Si el día no existe, JavaScript "corrige" la fecha (31 de feb → 3 de mar). Lo detectamos comparando.
  const coincide = fecha.getFullYear() === Number(a) && fecha.getMonth() === Number(mes) - 1 && fecha.getDate() === Number(d);
  return coincide ? { fecha, texto: `${a}-${mes}-${d} ${h}:${min}:${s}` } : null;
}

const vacio = (v) => v === undefined || v === null || v === "";

// Valida un evento tal como lo manda la web (solicitud del agente o formulario del administrador).
//   exigirFuturo: el inicio debe ser futuro (un agente que envía o corrige una solicitud). El administrador puede
//                 corregir datos de un evento que ya empezó.
//   conAgente:    el administrador indica el agente con su "nit"; un agente no (sale de su token).
//   ahora:        se inyecta para poder probar la función sin depender del reloj.
function validarEvento(body, { exigirFuturo = true, conAgente = false, ahora = new Date() } = {}) {
  const b = body && typeof body === "object" ? body : {};
  const errores = {};

  const nombre = texto(b.nombre);
  if (!nombre || nombre.length > 150) errores.nombre = "Escribe el nombre del evento (máximo 150 caracteres).";

  const categoria = texto(b.categoria).toLowerCase();
  if (!CATEGORIAS.includes(categoria)) errores.categoria = `La categoría debe ser una de: ${CATEGORIAS.join(", ")}.`;

  const inicio = leerFechaHora(b.inicio);
  const fin = leerFechaHora(b.fin);
  if (!inicio) errores.inicio = "Escribe la fecha de inicio con formato AAAA-MM-DDTHH:MM.";
  if (!fin) errores.fin = "Escribe la fecha de fin con formato AAAA-MM-DDTHH:MM.";
  if (inicio && fin && fin.fecha <= inicio.fecha) errores.fin = "El evento debe terminar después de empezar.";
  if (exigirFuturo && inicio && inicio.fecha <= ahora) errores.inicio = "La fecha de inicio debe ser futura.";

  // Teatro o sitio donde se hace el evento; la dirección exacta va aparte
  const teatro = texto(b.teatro);
  if (!teatro || teatro.length > 150) errores.teatro = "Escribe el teatro o sitio del evento (máximo 150 caracteres).";
  const direccion = texto(b.direccion);
  if (!direccion || direccion.length > 200) errores.direccion = "Escribe la dirección (máximo 200 caracteres).";

  // La ciudad llega por su nombre (así la elige el formulario); el servidor la busca en CIUDAD
  const ciudad = texto(b.ciudad);
  if (!ciudad) errores.ciudad = "Elige la ciudad.";

  // Number("") es 0 y Number(null) es 0: exigimos que lleguen de verdad
  const capacidad = vacio(b.capacidad) ? NaN : Number(b.capacidad);
  if (!Number.isInteger(capacidad) || capacidad <= 0) errores.capacidad = "La capacidad debe ser un número entero mayor que 0.";

  // El precio puede ser 0 (evento gratuito). Si no llega, queda en 0.
  const precio = vacio(b.precio) ? 0 : Number(b.precio);
  if (!Number.isFinite(precio) || precio < 0) errores.precio = "El precio debe ser un número mayor o igual a 0.";
  else if (Math.abs(precio * 100 - Math.round(precio * 100)) > 1e-6) errores.precio = "El precio admite máximo 2 decimales.";

  const edad = vacio(b.edad) ? 0 : Number(b.edad);
  if (!Number.isInteger(edad) || edad < 0 || edad > 120) errores.edad = "La edad mínima debe ser un entero entre 0 y 120.";

  // Ubicación en el mapa: cualquier punto del planeta (mismos CHECK de UBICACION)
  const lat = Number(b.lat);
  const lon = Number(b.lon);
  if (vacio(b.lat) || !Number.isFinite(lat) || lat < -90 || lat > 90) errores.lat = "La latitud debe estar entre -90 y 90.";
  if (vacio(b.lon) || !Number.isFinite(lon) || lon < -180 || lon > 180) errores.lon = "La longitud debe estar entre -180 y 180.";

  const observaciones = texto(b.observaciones);
  if (observaciones.length > 1000) errores.observaciones = "Las observaciones no pueden superar los 1000 caracteres.";

  const descripcion = texto(b.descripcion);
  if (descripcion.length > 3000) errores.descripcion = "La descripción no puede superar los 3000 caracteres.";

  const datos = {
    nombre, categoria, descripcion: descripcion || null, inicio: inicio ? inicio.texto : null, fin: fin ? fin.texto : null,
    ciudad, teatro, direccion, capacidad, precio, edad, observaciones: observaciones || null,
    imagen: typeof b.imagen === "string" ? b.imagen : null, lat, lon,
  };

  if (conAgente) {
    const nit = texto(b.nit);
    if (!/^[0-9]{9}-[0-9]$/.test(nit)) errores.nit = "Elige el agente del evento.";
    datos.nit = nit;
  }

  return Object.keys(errores).length ? { errores } : { datos };
}

// Valida el cambio de estado de un evento ya publicado: { estado, observaciones? }.
// Al CANCELAR, "observaciones" lleva el texto completo con la nota de causa (la web ya la arma con agregarNota y
// notaCancelacion). También se acepta { causa, detalle }: el servidor arma la nota. En los demás estados no se envía.
function validarCambioEstado(body) {
  const b = body && typeof body === "object" ? body : {};
  const errores = {};

  const estado = texto(b.estado);
  if (!ESTADOS_OPERATIVOS.includes(estado)) errores.estado = `El estado debe ser uno de: ${ESTADOS_OPERATIVOS.join(", ")}.`;

  let observaciones = null;
  let causa = null;
  let detalle = null;

  if (estado === "Cancelado") {
    if (typeof b.observaciones === "string" && b.observaciones.trim()) {
      observaciones = b.observaciones.trim();
      if (observaciones.length > 2000) errores.observaciones = "Las observaciones no pueden superar los 2000 caracteres.";
      else if (!RE_CANCELACION.test(observaciones)) errores.observaciones = "Falta la causa de la cancelación (Cancelado por ... Causa: ...).";
    } else {
      causa = texto(b.causa);
      if (!CAUSAS_EVENTO.includes(causa)) errores.causa = `Elige la causa de la cancelación: ${CAUSAS_EVENTO.join(", ")}.`;
      detalle = texto(b.detalle).replace(/\s+/g, " ") || null;
      if (detalle && detalle.length > 300) errores.detalle = "El detalle no puede superar los 300 caracteres.";
      else if (causa === "Otra causa" && !detalle) errores.detalle = "Escribe el detalle de la causa.";
      if (!errores.causa && !errores.detalle) observaciones = null; // el controlador arma la nota con causa y detalle
    }
  } else if (!vacio(b.observaciones) || !vacio(b.causa) || !vacio(b.detalle)) {
    errores.observaciones = "Solo se envía una causa cuando el estado es Cancelado.";
  }

  return Object.keys(errores).length ? { errores } : { datos: { estado, observaciones, causa, detalle } };
}

// Valida lo que un agente puede cambiar de un evento ya publicado: { descripcion, observaciones, imagen }
function validarEdicionPublicada(body) {
  const b = body && typeof body === "object" ? body : {};
  const errores = {};

  const descripcion = texto(b.descripcion);
  if (descripcion.length < 30) errores.descripcion = "La descripción debe tener al menos 30 caracteres.";
  else if (descripcion.length > 3000) errores.descripcion = "La descripción no puede superar los 3000 caracteres.";

  const observaciones = texto(b.observaciones);
  if (observaciones.length > 1000) errores.observaciones = "Las observaciones no pueden superar los 1000 caracteres.";

  return Object.keys(errores).length ? { errores } : {
    datos: { descripcion, observaciones: observaciones || null, imagen: typeof b.imagen === "string" ? b.imagen : null },
  };
}

// Valida la decisión del administrador sobre una solicitud: { estado: "Aprobado" | "Rechazado", motivo }
function validarDecision(body) {
  const b = body && typeof body === "object" ? body : {};
  const errores = {};
  const estado = texto(b.estado);
  if (!["Aprobado", "Rechazado"].includes(estado)) errores.estado = "La decisión debe ser Aprobado o Rechazado.";
  const motivo = texto(b.motivo).replace(/\s+/g, " ");
  if (estado === "Rechazado" && !motivo) errores.motivo = "Escribe el motivo del rechazo.";
  if (motivo.length > 300) errores.motivo = "El motivo no puede superar los 300 caracteres.";
  return Object.keys(errores).length ? { errores } : { datos: { estado, motivo: estado === "Rechazado" ? motivo : null } };
}

// Valida los filtros del catálogo (GET /api/eventos?ciudad=1&categoria=teatro&estado=Programado&limite=20&pagina=1)
// Todos son opcionales. Los valores inválidos se rechazan (mejor un 400 claro que ignorar el filtro en silencio).
// Un evento "En revisión" o "Rechazado" nunca se muestra al público, así que no se puede filtrar por ellos.
function validarFiltros(query) {
  const q = query || {};
  const errores = {};
  const filtros = {};

  if (q.ciudad !== undefined) {
    const ciudad = Number(q.ciudad);
    if (!Number.isInteger(ciudad) || ciudad <= 0) errores.ciudad = "La ciudad debe ser un id numérico válido.";
    else filtros.ciudad = ciudad;
  }
  if (q.categoria !== undefined) {
    const categoria = texto(q.categoria).toLowerCase();
    if (!CATEGORIAS.includes(categoria)) errores.categoria = `La categoría debe ser una de: ${CATEGORIAS.join(", ")}.`;
    else filtros.categoria = categoria;
  }
  if (q.estado !== undefined) {
    const estado = texto(q.estado);
    if (!ESTADOS_OPERATIVOS.includes(estado)) errores.estado = `El estado debe ser uno de: ${ESTADOS_OPERATIVOS.join(", ")}.`;
    else filtros.estado = estado;
  }

  // Paginación: nunca devolvemos la tabla entera. Por defecto 20 por página, máximo 100.
  const limite = q.limite === undefined ? 20 : Number(q.limite);
  const pagina = q.pagina === undefined ? 1 : Number(q.pagina);
  if (!Number.isInteger(limite) || limite < 1 || limite > 100) errores.limite = "El límite debe ser un entero entre 1 y 100.";
  if (!Number.isInteger(pagina) || pagina < 1) errores.pagina = "La página debe ser un entero mayor o igual a 1.";
  filtros.limite = limite;
  filtros.pagina = pagina;

  return Object.keys(errores).length ? { errores } : { filtros };
}

module.exports = {
  CATEGORIAS, ESTADOS, ESTADOS_OPERATIVOS, ESTADOS_SOLICITUD, ESTADOS_RESERVABLES, TRANSICIONES, CAUSAS_EVENTO, CAUSAS_RESERVA,
  validarEvento, validarEdicionPublicada, validarCambioEstado, validarDecision, validarFiltros,
};
