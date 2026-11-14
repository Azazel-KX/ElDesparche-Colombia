// Pruebas unitarias de la validación de eventos y del formato (no necesitan base de datos).
process.env.NODE_ENV = "test";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  validarEvento, validarCambioEstado, validarDecision, validarFiltros, TRANSICIONES, CAUSAS_EVENTO,
} = require("../src/utils/validacionEvento");
const f = require("../src/utils/formato");

// "Ahora" fijo: así las pruebas dan el mismo resultado hoy y dentro de un año
const AHORA = new Date(2026, 9, 17, 10, 0, 0); // 17 de octubre de 2026, 10:00

const eventoValido = () => ({
  nombre: "Festival de Jazz",
  categoria: "musica",
  descripcion: "Una noche de jazz",
  inicio: "2026-11-20T19:00",
  fin: "2026-11-20T23:00",
  ciudad: "Cali",
  teatro: "Teatro Municipal",
  direccion: "Calle 5 # 10-20",
  capacidad: 300,
  precio: 45000,
  edad: 0,
  lat: 3.45,
  lon: -76.53,
});
const validar = (cambios, opciones) => validarEvento({ ...eventoValido(), ...cambios }, { ahora: AHORA, ...opciones });

// ---------------------------------------------------------------------------------------------
// validarEvento
// ---------------------------------------------------------------------------------------------

test("evento válido: devuelve datos normalizados y ningún error", () => {
  const { datos, errores } = validar({});
  assert.equal(errores, undefined);
  assert.equal(datos.inicio, "2026-11-20 19:00:00");
  assert.equal(datos.precio, 45000);
  assert.equal(datos.teatro, "Teatro Municipal");
  assert.equal(datos.ciudad, "Cali");
  assert.equal(datos.lat, 3.45);
});

test("evento: el precio y la edad son opcionales (valen 0) y la imagen también", () => {
  const e = eventoValido();
  delete e.precio;
  delete e.edad;
  const { datos } = validarEvento(e, { ahora: AHORA });
  assert.equal(datos.precio, 0);
  assert.equal(datos.edad, 0);
  assert.equal(datos.imagen, null);
});

test("evento: categoría fuera de la lista se rechaza", () => {
  assert.ok(validar({ categoria: "deportes" }).errores.categoria);
});

test("evento: el teatro y la dirección son obligatorios (máximo 150 y 200 caracteres)", () => {
  for (const teatro of [undefined, "", "   ", "x".repeat(151)]) assert.ok(validar({ teatro }).errores?.teatro, JSON.stringify(teatro));
  for (const direccion of [undefined, "", "x".repeat(201)]) assert.ok(validar({ direccion }).errores?.direccion, JSON.stringify(direccion));
  assert.equal(validar({ teatro: "x".repeat(150) }).errores, undefined);
});

test("evento: la capacidad debe ser entera y mayor que 0 (0, negativa, decimal, vacía y texto fallan)", () => {
  for (const capacidad of [0, -5, 10.5, "", null, "mucha"]) {
    assert.ok(validar({ capacidad }).errores?.capacidad, `debería rechazar ${JSON.stringify(capacidad)}`);
  }
});

test("evento: el precio no puede ser negativo ni tener más de 2 decimales, pero 0 y 19999.99 sí", () => {
  assert.ok(validar({ precio: -1 }).errores.precio);
  assert.ok(validar({ precio: 10.555 }).errores.precio);
  assert.equal(validar({ precio: 0 }).errores, undefined);
  assert.equal(validar({ precio: 19999.99 }).errores, undefined);
});

test("evento: fechas — fin antes del inicio, inicio en el pasado, formato malo y día inexistente", () => {
  assert.ok(validar({ fin: "2026-11-20T18:00" }).errores.fin, "fin antes del inicio");
  assert.ok(validar({ fin: "2026-11-20T19:00" }).errores.fin, "fin igual al inicio");
  assert.ok(validar({ inicio: "2026-10-01T19:00", fin: "2026-10-01T22:00" }).errores.inicio, "pasado");
  assert.ok(validar({ inicio: "20/11/2026 7pm" }).errores.inicio, "formato libre");
  assert.ok(validar({ inicio: "2026-02-31T19:00", fin: "2026-03-05T19:00" }).errores.inicio, "31 de febrero");
});

test("evento: el administrador puede corregir un evento que ya empezó (exigirFuturo: false)", () => {
  const pasado = { inicio: "2026-10-01T19:00", fin: "2026-10-01T22:00" };
  assert.ok(validar(pasado).errores.inicio);
  assert.equal(validar(pasado, { exigirFuturo: false }).errores, undefined);
});

test("evento: el punto del mapa es obligatorio, en cualquier país, y debe ser una coordenada posible", () => {
  assert.ok(validar({ lat: undefined }).errores.lat);
  assert.ok(validar({ lon: "" }).errores.lon);
  assert.equal(validar({ lat: 40.4, lon: -3.7 }).errores, undefined, "Madrid es válido");
  assert.equal(validar({ lat: -34.6, lon: -58.4 }).errores, undefined, "Buenos Aires es válido");
  const imposible = validar({ lat: 95, lon: 190 }).errores;
  assert.ok(imposible.lat);
  assert.ok(imposible.lon);
});

test("evento: el administrador debe indicar el agente por su NIT", () => {
  assert.ok(validar({}, { conAgente: true }).errores.nit);
  assert.ok(validar({ nit: "123" }, { conAgente: true }).errores.nit);
  assert.equal(validar({ nit: "900111222-1" }, { conAgente: true }).datos.nit, "900111222-1");
});

test("evento: un body vacío o ausente no revienta, devuelve errores", () => {
  assert.ok(validarEvento(undefined, { ahora: AHORA }).errores.nombre);
  assert.ok(validarEvento({}, { ahora: AHORA }).errores.lat);
});

// ---------------------------------------------------------------------------------------------
// Estados, decisiones y filtros
// ---------------------------------------------------------------------------------------------

test("estado: cancelar exige causa del catálogo; los demás estados no la admiten", () => {
  assert.ok(validarCambioEstado({ estado: "Cancelado" }).errores.causa);
  assert.ok(validarCambioEstado({ estado: "Cancelado", causa: "Una causa inventada" }).errores.causa);
  assert.ok(validarCambioEstado({ estado: "Cancelado", causa: "Fuerza mayor o clima", detalle: "x".repeat(301) }).errores.detalle);
  assert.ok(validarCambioEstado({ estado: "Cancelado", causa: "Otra causa" }).errores.detalle, "Otra causa exige detalle");
  assert.deepEqual(
    validarCambioEstado({ estado: "Cancelado", causa: " Fuerza mayor o clima ", detalle: "Tormenta" }).datos,
    { estado: "Cancelado", observaciones: null, causa: "Fuerza mayor o clima", detalle: "Tormenta" }
  );
  assert.ok(validarCambioEstado({ estado: "En Vivo", causa: "Fuerza mayor o clima" }).errores.observaciones);
  assert.deepEqual(validarCambioEstado({ estado: "En Boletería" }).datos, { estado: "En Boletería", observaciones: null, causa: null, detalle: null });
  assert.ok(validarCambioEstado({ estado: "Inventado" }).errores.estado);
  assert.ok(validarCambioEstado({ estado: "En revisión" }).errores.estado, "En revisión no es un estado operativo");
  assert.equal(CAUSAS_EVENTO.length, 5);
});

test("estado: al cancelar la web manda el texto completo en observaciones y debe traer la nota de causa", () => {
  const nota = f.notaCancelacion("evento", "el administrador", "Fuerza mayor o clima", "lluvia");
  const ok = validarCambioEstado({ estado: "Cancelado", observaciones: `Observación previa\n${nota}` });
  assert.equal(ok.datos.observaciones, `Observación previa\n${nota}`);
  assert.ok(validarCambioEstado({ estado: "Cancelado", observaciones: "sin ninguna causa" }).errores.observaciones);
});

test("decisión: aprobar o rechazar; rechazar exige motivo", () => {
  assert.deepEqual(validarDecision({ estado: "Aprobado" }).datos, { estado: "Aprobado", motivo: null });
  assert.deepEqual(validarDecision({ estado: "Aprobado", motivo: "ignorado" }).datos, { estado: "Aprobado", motivo: null });
  assert.ok(validarDecision({ estado: "Rechazado" }).errores.motivo);
  assert.deepEqual(validarDecision({ estado: "Rechazado", motivo: "  Falta  permiso " }).datos, { estado: "Rechazado", motivo: "Falta permiso" });
  assert.ok(validarDecision({ estado: "Quizá" }).errores.estado);
  assert.ok(validarDecision({ estado: "Rechazado", motivo: "x".repeat(301) }).errores.motivo);
});

test("transiciones: solo hacia adelante, y los estados finales no tienen salida", () => {
  assert.deepEqual(TRANSICIONES["Programado"], ["En Boletería", "Cancelado"]);
  assert.deepEqual(TRANSICIONES["Finalizado"], []);
  assert.deepEqual(TRANSICIONES["Cancelado"], []);
});

test("filtros: valores por defecto, límites de paginación y rechazo de valores inválidos", () => {
  assert.deepEqual(validarFiltros({}).filtros, { limite: 20, pagina: 1 });
  assert.deepEqual(validarFiltros({ ciudad: "3", categoria: "TEATRO" }).filtros, { ciudad: 3, categoria: "teatro", limite: 20, pagina: 1 });
  assert.ok(validarFiltros({ limite: "1000" }).errores.limite);
  assert.ok(validarFiltros({ pagina: "0" }).errores.pagina);
  assert.ok(validarFiltros({ ciudad: "abc" }).errores.ciudad);
  assert.ok(validarFiltros({ estado: "Raro" }).errores.estado);
  assert.ok(validarFiltros({ estado: "En revisión" }).errores.estado, "el público no filtra por solicitudes");
});

// ---------------------------------------------------------------------------------------------
// Formato (utils/formato.js)
// ---------------------------------------------------------------------------------------------

test("formato: nombres — se reparten en nombres y apellidos sin perder el nombre completo", () => {
  assert.deepEqual(f.separarNombre("Valentina Ríos Castaño"), { nombres: "Valentina", apellidos: "Ríos Castaño" });
  assert.deepEqual(f.separarNombre("Ana María Pérez Gómez"), { nombres: "Ana María", apellidos: "Pérez Gómez" });
  assert.deepEqual(f.separarNombre("Pacífico"), { nombres: "Pacífico", apellidos: "" });
  assert.deepEqual(f.separarNombre(""), { nombres: "", apellidos: "" });
  assert.equal(f.unirNombre("  Ana María ", " Pérez  Gómez"), "Ana María Pérez Gómez");
});

test("formato: la nota de cancelación es idéntica a notaCancelacion() de la web y se puede leer de vuelta", () => {
  assert.equal(
    f.notaCancelacion("evento", "el agente", "Fuerza mayor o clima", "tormenta"),
    "Cancelado por el agente. Causa: Fuerza mayor o clima. Detalle: tormenta"
  );
  assert.equal(f.notaCancelacion("reserva", "el cliente", "No puede asistir", ""), "Cancelada por el cliente. Causa: No puede asistir.");
  const nota = f.notaCancelacion("reserva", "el cliente", "Otra causa", "me enfermé");
  assert.deepEqual(f.leerCancelacion(f.agregarNota("Asientos preferidos", nota)), { quien: "el cliente", causa: "Otra causa", detalle: "me enfermé" });
  assert.equal(f.agregarNota("", nota), nota);
  assert.equal(f.agregarNota("Previa", nota), `Previa\n${nota}`);
  assert.equal(f.leerCancelacion("nada de nada"), null);
});

test("formato: el motivo de un rechazo se lee y se quita sin tocar las observaciones del agente", () => {
  const obs = f.agregarNota("Solo adultos", f.notaRechazo("Falta el permiso"));
  assert.equal(f.leerRechazo(obs), "Falta el permiso");
  assert.equal(f.quitarRechazo(obs), "Solo adultos");
  assert.equal(f.quitarRechazo(f.notaRechazo("x")), null);
  assert.equal(f.leerRechazo("sin rechazo"), "");
});

test("formato: fechas legibles sin depender de la zona horaria del servidor", () => {
  assert.equal(f.fechaCorta("2027-03-20T16:00", "2027-03-23T02:00"), "20-23 mar 2027");
  assert.equal(f.fechaCorta("2026-10-18T20:00", "2026-10-19T00:00"), "18 oct 2026", "terminar a medianoche cuenta como el mismo día");
  assert.equal(f.fechaCorta("2026-10-30T20:00", "2026-11-02T22:00"), "30 oct - 2 nov 2026");
  assert.match(f.fechaLarga("2027-03-20T16:00"), /^20 de marzo de 2027 - 4:00\s+p\.\s?m\./);
  assert.equal(f.ultimosMeses(3, new Date(2026, 9, 20)).map((m) => m.etiqueta).join(), "ago 26,sep 26,oct 26");
  assert.equal(f.haceCuanto(30), "Hace un momento");
  assert.equal(f.haceCuanto(240), "Hace 4 min");
  assert.equal(f.haceCuanto(7200), "Hace 2 h");
  assert.equal(f.haceCuanto(86400 * 3), "Hace 3 días");
});

test("formato: el código de la reserva se deriva del id y se puede volver al id", () => {
  assert.equal(f.codigoReserva(41), "DES-1041");
  assert.equal(f.idDeCodigoReserva("DES-1041"), 41);
  assert.equal(f.idDeCodigoReserva(" des-1041 "), 41);
  assert.equal(f.idDeCodigoReserva("DES-1000"), null);
  assert.equal(f.idDeCodigoReserva("EVT-2026-0001"), null);
  assert.equal(f.planDeEvento("musica", 100), "parchesote");
  assert.equal(f.planDeEvento("teatro", 100), "parche");
  assert.equal(f.planDeEvento("musica", 0), "parchesito");
});
