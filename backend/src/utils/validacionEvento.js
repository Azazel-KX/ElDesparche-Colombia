// Validación de datos de EVENTOS (crear, editar y cambiar de estado)
//
// Sigue el mismo patrón que validacion.js:
// - Cada función recibe el body de la petición.
// - Devuelve { datos } si todo está bien, o { errores: { campo: "mensaje" } } si algo falla.
// - Las reglas espejan los CHECK de la tabla EVENTO en database/schema_ElDesparche.sql.
//   La base de datos sigue siendo la última barrera.

const { texto } = require("./validacion");

// Mismos valores que el CHECK de categoria y el ENUM estado_evento_t del esquema
const CATEGORIAS = ["musica", "teatro", "danza", "circo", "comedia"];
const ESTADOS = ["Programado", "En Boletería", "En Vivo", "Finalizado", "Cancelado"];

// Máquina de estados: desde cada estado, a cuáles se puede pasar.
// "Finalizado" y "Cancelado" son estados finales: de ahí no se sale.
const TRANSICIONES = {
  "Programado": ["En Boletería", "Cancelado"],
  "En Boletería": ["En Vivo", "Cancelado"],
  "En Vivo": ["Finalizado", "Cancelado"],
  "Finalizado": [],
  "Cancelado": [],
};

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

// Valida el objeto "ubicacion" que viene dentro del evento: { direccion, latitud, longitud, id_ciudad }
// Los rangos de latitud/longitud son los mismos CHECK de la tabla UBICACION (territorio colombiano).
function validarUbicacion(u, errores) {
  const b = u && typeof u === "object" ? u : null;
  if (!b) {
    errores.ubicacion = "Envía la ubicación del evento (dirección, latitud, longitud y ciudad).";
    return null;
  }

  const direccion = texto(b.direccion);
  const latitud = Number(b.latitud);
  const longitud = Number(b.longitud);
  const id_ciudad = Number(b.id_ciudad);
  const detalle = {};

  if (!direccion || direccion.length > 200) detalle.direccion = "Escribe la dirección (máximo 200 caracteres).";
  if (!Number.isFinite(latitud) || latitud < -4.3 || latitud > 13.6) detalle.latitud = "La latitud debe estar entre -4.3 y 13.6 (Colombia).";
  if (!Number.isFinite(longitud) || longitud < -82.0 || longitud > -66.8) detalle.longitud = "La longitud debe estar entre -82.0 y -66.8 (Colombia).";
  if (!Number.isInteger(id_ciudad) || id_ciudad <= 0) detalle.id_ciudad = "Elige una ciudad válida.";

  if (Object.keys(detalle).length) {
    errores.ubicacion = detalle;
    return null;
  }
  return { direccion, latitud, longitud, id_ciudad };
}

// Campos que comparten crear y editar. `ahora` se inyecta para poder probar la función sin depender del reloj.
function validarCamposEvento(b, errores, ahora) {
  const nombre = texto(b.nombre);
  if (!nombre || nombre.length > 150) errores.nombre = "Escribe el nombre del evento (máximo 150 caracteres).";

  const categoria = texto(b.categoria).toLowerCase();
  if (!CATEGORIAS.includes(categoria)) errores.categoria = `La categoría debe ser una de: ${CATEGORIAS.join(", ")}.`;

  const inicio = leerFechaHora(b.fecha_hora_inicio);
  const fin = leerFechaHora(b.fecha_hora_fin);
  if (!inicio) errores.fecha_hora_inicio = "Escribe la fecha de inicio con formato AAAA-MM-DDTHH:MM.";
  if (!fin) errores.fecha_hora_fin = "Escribe la fecha de fin con formato AAAA-MM-DDTHH:MM.";
  if (inicio && fin && fin.fecha <= inicio.fecha) errores.fecha_hora_fin = "El evento debe terminar después de empezar.";
  if (inicio && inicio.fecha <= ahora) errores.fecha_hora_inicio = "La fecha de inicio debe ser futura.";

  // Number("") es 0 y Number(null) es 0: exigimos que lleguen de verdad
  const capacidad_total = b.capacidad_total === undefined || b.capacidad_total === null || b.capacidad_total === "" ? NaN : Number(b.capacidad_total);
  if (!Number.isInteger(capacidad_total) || capacidad_total <= 0) errores.capacidad_total = "La capacidad debe ser un número entero mayor que 0.";

  // El precio puede ser 0 (evento gratuito). Si no llega, queda en 0.
  const precio = b.precio === undefined || b.precio === null || b.precio === "" ? 0 : Number(b.precio);
  if (!Number.isFinite(precio) || precio < 0) errores.precio = "El precio debe ser un número mayor o igual a 0.";
  else if (Math.abs(precio * 100 - Math.round(precio * 100)) > 1e-6) errores.precio = "El precio admite máximo 2 decimales.";

  const edad_minima = b.edad_minima === undefined || b.edad_minima === null || b.edad_minima === "" ? 0 : Number(b.edad_minima);
  if (!Number.isInteger(edad_minima) || edad_minima < 0 || edad_minima > 120) errores.edad_minima = "La edad mínima debe ser un entero entre 0 y 120.";

  // Teatro o sitio donde se hace el evento (obligatorio; la dirección exacta va en la ubicación)
  const teatro = texto(b.teatro);
  if (!teatro || teatro.length > 150) errores.teatro = "Escribe el teatro o sitio del evento (máximo 150 caracteres).";

  const url_imagen = texto(b.url_imagen);
  if (url_imagen.length > 255) errores.url_imagen = "La URL de la imagen no puede superar los 255 caracteres.";
  else if (url_imagen && !/^https?:\/\//i.test(url_imagen)) errores.url_imagen = "La imagen debe ser una URL que empiece por http:// o https://.";

  return {
    nombre,
    descripcion: texto(b.descripcion) || null,
    categoria,
    url_imagen: url_imagen || null,
    teatro,
    fecha_hora_inicio: inicio ? inicio.texto : null,
    fecha_hora_fin: fin ? fin.texto : null,
    capacidad_total,
    edad_minima,
    observaciones: texto(b.observaciones) || null,
    precio,
  };
}

// Valida el body para CREAR un evento (POST /api/eventos)
// El código NO lo envía el cliente: lo genera el servidor (EVT-2026-0001...).
// El estado inicial siempre es "Programado" y el agente dueño sale del token, no del body.
function validarEventoNuevo(body, ahora = new Date()) {
  const b = body || {};
  const errores = {};
  const datos = validarCamposEvento(b, errores, ahora);
  const ubicacion = validarUbicacion(b.ubicacion, errores);
  if (ubicacion) datos.ubicacion = ubicacion;
  return Object.keys(errores).length ? { errores } : { datos };
}

// Valida el body para EDITAR un evento (PUT /api/eventos/:codigo)
// Es un reemplazo completo de los datos editables (PUT): se envían todos los campos.
// La ubicación es opcional: si no viene, el evento conserva la que tiene.
function validarEventoEdicion(body, ahora = new Date()) {
  const b = body || {};
  const errores = {};
  const datos = validarCamposEvento(b, errores, ahora);
  if (b.ubicacion !== undefined) {
    const ubicacion = validarUbicacion(b.ubicacion, errores);
    if (ubicacion) datos.ubicacion = ubicacion;
  }
  return Object.keys(errores).length ? { errores } : { datos };
}

// Valida el body para CAMBIAR EL ESTADO (PATCH /api/eventos/:codigo/estado)
// Body: { estado, causa?, detalle? }.  La causa es obligatoria solo al cancelar; el detalle es opcional.
// No hay tabla de causas: el texto se guarda en EVENTO.observaciones (ver textoCancelacion).
function validarCambioEstado(body) {
  const b = body || {};
  const errores = {};

  const estado = texto(b.estado);
  if (!ESTADOS.includes(estado)) errores.estado = `El estado debe ser uno de: ${ESTADOS.join(", ")}.`;

  let causa = null;
  let detalle = null;
  if (estado === "Cancelado") {
    causa = texto(b.causa);
    if (!causa || causa.length > 100) errores.causa = "Para cancelar un evento indica la causa de cancelación (máximo 100 caracteres).";
    detalle = texto(b.detalle) || null;
    if (detalle && detalle.length > 300) errores.detalle = "El detalle no puede superar los 300 caracteres.";
  } else if ((b.causa !== undefined && b.causa !== null && b.causa !== "") ||
             (b.detalle !== undefined && b.detalle !== null && b.detalle !== "")) {
    errores.causa = "Solo se envía una causa cuando el estado es Cancelado.";
  }

  return Object.keys(errores).length ? { errores } : { datos: { estado, causa, detalle } };
}

// Arma el texto que se guarda en EVENTO.observaciones al cancelar, con el formato que escribe la web:
// "Cancelado por el agente. Causa: Fuerza mayor o clima. Detalle: tormenta eléctrica."
// "quien" sale del rol del token: un administrador cancela "por el administrador", un agente "por el agente".
function textoCancelacion(rol, { causa, detalle }) {
  const quien = rol === "ADMIN" ? "el administrador" : "el agente";
  const final = (t) => (/[.!?]$/.test(t) ? t : t + ".");
  return `Cancelado por ${quien}. Causa: ${final(causa)}` + (detalle ? ` Detalle: ${final(detalle)}` : "");
}

// Valida los filtros del listado (GET /api/eventos?ciudad=1&categoria=teatro&estado=Programado&limite=20&pagina=1)
// Todos son opcionales. Los valores inválidos se rechazan (mejor un 400 claro que ignorar el filtro en silencio).
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
    if (!ESTADOS.includes(estado)) errores.estado = `El estado debe ser uno de: ${ESTADOS.join(", ")}.`;
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
  CATEGORIAS, ESTADOS, TRANSICIONES,
  validarEventoNuevo, validarEventoEdicion, validarCambioEstado, validarFiltros, textoCancelacion,
};
