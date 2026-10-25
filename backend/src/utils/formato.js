// Utilidades de formato compartidas por los modelos y controladores.
// Todo aquí es puro (no toca la base de datos ni req/res), así que se puede probar sin servidor.

// ---------------------------------------------------------------------------------------------
// Nombres: la base guarda USUARIO.nombre_completo, pero los paneles de la web piden nombres y apellidos por separado.
// ---------------------------------------------------------------------------------------------

// "Valentina Ríos Castaño" -> { nombres: "Valentina", apellidos: "Ríos Castaño" }
// La base no guarda dónde termina el nombre, así que se reparte con una regla: con 3 palabras, 1 nombre y 2 apellidos;
// con 4, 2 y 2; con 5, 2 y 3. Es solo para mostrar y editar; el nombre completo nunca se pierde.
function separarNombre(completo) {
  const p = String(completo || "").trim().split(/\s+/).filter(Boolean);
  if (p.length <= 1) return { nombres: p[0] || "", apellidos: "" };
  const n = p.length <= 3 ? 1 : Math.floor(p.length / 2);
  return { nombres: p.slice(0, n).join(" "), apellidos: p.slice(n).join(" ") };
}

const unirNombre = (nombres, apellidos) => `${nombres} ${apellidos}`.replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------------------------------------
// Estado de la cuenta. La base guarda estado_usuario (Activo, Pendiente, Suspendido, Bloqueado). Los agentes usan
// Activo / Pendiente / Suspendido tal cual; los clientes ven "Activa" y "Bloqueada".
// ---------------------------------------------------------------------------------------------
const CUENTA_DE_ESTADO = { Activo: "Activa", Bloqueado: "Bloqueada" };
const ESTADO_DE_CUENTA = { Activa: "Activo", Bloqueada: "Bloqueado" };

// ---------------------------------------------------------------------------------------------
// Notas de cancelación y rechazo. Igual que frontend/js/script.js (notaCancelacion, agregarNota, leerCancelacion):
// la causa va como texto en "observaciones", en una línea nueva después de lo que ya hubiera.
// ---------------------------------------------------------------------------------------------
const RE_CANCELACION = /Cancelad[oa] por ([^.\n]+)\. Causa: ([^.\n]+)\.(?: Detalle: ([^\n]*))?/;
const RE_RECHAZO = /^Rechazado por el administrador\. Motivo: (.*)$/m;

function notaCancelacion(tipo, quien, causa, detalle) {
  const nota = `${tipo === "evento" ? "Cancelado" : "Cancelada"} por ${quien}. Causa: ${causa}.`;
  return detalle ? `${nota} Detalle: ${detalle}` : nota;
}

const agregarNota = (observaciones, nota) => (observaciones ? `${observaciones}\n${nota}` : nota);

function leerCancelacion(observaciones) {
  const m = RE_CANCELACION.exec(observaciones || "");
  return m ? { quien: m[1], causa: m[2], detalle: m[3] || "" } : null;
}

const notaRechazo = (motivo) => `Rechazado por el administrador. Motivo: ${motivo}`;
const leerRechazo = (observaciones) => (RE_RECHAZO.exec(observaciones || "") || [])[1] || "";

// Observaciones sin la nota de rechazo (null si no queda nada): así el agente corrige su solicitud sin arrastrar el motivo viejo
function quitarRechazo(observaciones) {
  const resto = String(observaciones || "").split("\n").filter((l) => !RE_RECHAZO.test(l)).join("\n").trim();
  return resto || null;
}

// ---------------------------------------------------------------------------------------------
// Fechas. La base guarda TIMESTAMP sin zona horaria (hora de Colombia). Se leen como texto "2027-03-20T16:00" y aquí
// se dan formato con Intl usando UTC solo como reloj neutro, para que el servidor no corra la hora según su zona.
// ---------------------------------------------------------------------------------------------
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function partesFecha(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(texto || "");
  return m ? { a: +m[1], m: +m[2], d: +m[3], h: +m[4], min: +m[5] } : null;
}

const enUtc = (p) => new Date(Date.UTC(p.a, p.m - 1, p.d, p.h, p.min));
const FECHA_LARGA = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const HORA = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });

// "20 de marzo de 2027 - 4:00 p. m."
function fechaLarga(texto) {
  const p = partesFecha(texto);
  return p ? `${FECHA_LARGA.format(enUtc(p))} - ${HORA.format(enUtc(p))}` : "";
}

// "18 oct 2026" (un día), "20-23 mar 2027" (mismo mes) o "30 oct - 2 nov 2026"
function fechaCorta(inicio, fin) {
  const a = partesFecha(inicio);
  let b = partesFecha(fin);
  if (!a) return "";
  if (b && b.h === 0 && b.min === 0) {
    const ayer = new Date(Date.UTC(b.a, b.m - 1, b.d - 1));
    b = { ...b, a: ayer.getUTCFullYear(), m: ayer.getUTCMonth() + 1, d: ayer.getUTCDate() };
  }
  if (!b || (a.a === b.a && a.m === b.m && a.d === b.d)) return `${a.d} ${MESES_CORTOS[a.m - 1]} ${a.a}`;
  if (a.a === b.a && a.m === b.m) return `${a.d}-${b.d} ${MESES_CORTOS[a.m - 1]} ${a.a}`;
  return `${a.d} ${MESES_CORTOS[a.m - 1]} - ${b.d} ${MESES_CORTOS[b.m - 1]} ${b.a}`;
}

// Los últimos "cantidad" meses hasta hoy como [{ anio, mes (1-12), etiqueta: "oct 26" }]
function ultimosMeses(cantidad, hoy = new Date()) {
  const lista = [];
  for (let i = cantidad - 1; i >= 0; i--) {
    const f = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    lista.push({ anio: f.getFullYear(), mes: f.getMonth() + 1, etiqueta: `${MESES_CORTOS[f.getMonth()]} ${String(f.getFullYear()).slice(2)}` });
  }
  return lista;
}

// "Hace 4 min", "Hace 3 h", "Hace 2 días" a partir de los segundos transcurridos
function haceCuanto(segundos) {
  const s = Math.max(0, Math.round(Number(segundos) || 0));
  if (s < 60) return "Hace un momento";
  if (s < 3600) return `Hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Hace ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "Hace 1 día" : `Hace ${d} días`;
}

// ---------------------------------------------------------------------------------------------
// Códigos. La web identifica las reservas con "DES-####". La base solo
// tiene id_reserva, así que el código se deriva de él: DES-1001, DES-1002...
// ---------------------------------------------------------------------------------------------
const BASE_CODIGO_RESERVA = 1000;
const codigoReserva = (id) => `DES-${BASE_CODIGO_RESERVA + Number(id)}`;

function idDeCodigoReserva(codigo) {
  const m = /^DES-(\d{1,9})$/.exec(String(codigo || "").trim().toUpperCase());
  const id = m ? Number(m[1]) - BASE_CODIGO_RESERVA : 0;
  return id > 0 ? id : null;
}

// El plan de un evento (parchesote, parche, parchesito) no existe en la base: la web lo usa para destacar. Se deduce:
// gratis o familiar -> parchesito, música -> parchesote y el resto -> parche.
function planDeEvento(categoria, precio) {
  if (Number(precio) === 0) return "parchesito";
  return categoria === "musica" ? "parchesote" : "parche";
}

module.exports = {
  separarNombre, unirNombre, CUENTA_DE_ESTADO, ESTADO_DE_CUENTA,
  notaCancelacion, agregarNota, leerCancelacion, notaRechazo, leerRechazo, quitarRechazo, RE_CANCELACION,
  fechaLarga, fechaCorta, ultimosMeses, haceCuanto,
  codigoReserva, idDeCodigoReserva, planDeEvento,
};
