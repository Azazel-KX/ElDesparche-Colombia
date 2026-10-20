// Pruebas unitarias de la validación de eventos (no necesitan base de datos).
process.env.NODE_ENV = "test";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  validarEventoNuevo, validarEventoEdicion, validarCambioEstado, validarFiltros, textoCancelacion, TRANSICIONES,
} = require("../src/utils/validacionEvento");

// "Ahora" fijo: así las pruebas dan el mismo resultado hoy y dentro de un año
const AHORA = new Date(2026, 9, 17, 10, 0, 0); // 17 de octubre de 2026, 10:00

const eventoValido = () => ({
  nombre: "Festival de Jazz",
  descripcion: "Una noche de jazz",
  categoria: "musica",
  teatro: "Teatro Municipal",
  fecha_hora_inicio: "2026-11-20T19:00",
  fecha_hora_fin: "2026-11-20T23:00",
  capacidad_total: 300,
  precio: 45000,
  edad_minima: 0,
  ubicacion: { direccion: "Calle 5 # 10-20", latitud: 3.45, longitud: -76.53, id_ciudad: 1 },
});

test("evento válido: devuelve datos normalizados y ningún error", () => {
  const { datos, errores } = validarEventoNuevo(eventoValido(), AHORA);
  assert.equal(errores, undefined);
  assert.equal(datos.fecha_hora_inicio, "2026-11-20 19:00:00");
  assert.equal(datos.precio, 45000);
  assert.equal(datos.teatro, "Teatro Municipal");
  assert.equal(datos.ubicacion.id_ciudad, 1);
});

test("evento: el precio y la edad mínima son opcionales (valen 0)", () => {
  const e = eventoValido();
  delete e.precio;
  delete e.edad_minima;
  const { datos } = validarEventoNuevo(e, AHORA);
  assert.equal(datos.precio, 0);
  assert.equal(datos.edad_minima, 0);
});

test("evento: categoría fuera de la lista se rechaza", () => {
  const { errores } = validarEventoNuevo({ ...eventoValido(), categoria: "deportes" }, AHORA);
  assert.ok(errores.categoria);
});

test("evento: el teatro es obligatorio y admite máximo 150 caracteres", () => {
  for (const teatro of [undefined, "", "   ", "x".repeat(151)]) {
    const { errores } = validarEventoNuevo({ ...eventoValido(), teatro }, AHORA);
    assert.ok(errores?.teatro, `debería rechazar ${JSON.stringify(teatro)}`);
  }
  assert.equal(validarEventoNuevo({ ...eventoValido(), teatro: "x".repeat(150) }, AHORA).errores, undefined);
});

test("evento: la capacidad debe ser entera y mayor que 0 (0, negativa, decimal, vacía y texto fallan)", () => {
  for (const capacidad of [0, -5, 10.5, "", null, "mucha"]) {
    const { errores } = validarEventoNuevo({ ...eventoValido(), capacidad_total: capacidad }, AHORA);
    assert.ok(errores?.capacidad_total, `debería rechazar ${JSON.stringify(capacidad)}`);
  }
});

test("evento: el precio no puede ser negativo ni tener más de 2 decimales, pero 0 y 19999.99 sí", () => {
  assert.ok(validarEventoNuevo({ ...eventoValido(), precio: -1 }, AHORA).errores.precio);
  assert.ok(validarEventoNuevo({ ...eventoValido(), precio: 10.555 }, AHORA).errores.precio);
  assert.equal(validarEventoNuevo({ ...eventoValido(), precio: 0 }, AHORA).errores, undefined);
  assert.equal(validarEventoNuevo({ ...eventoValido(), precio: 19999.99 }, AHORA).errores, undefined);
});

test("evento: fechas — fin antes del inicio, inicio en el pasado, formato malo y día inexistente", () => {
  const caso = (cambios) => validarEventoNuevo({ ...eventoValido(), ...cambios }, AHORA).errores;

  assert.ok(caso({ fecha_hora_fin: "2026-11-20T18:00" }).fecha_hora_fin, "fin antes del inicio");
  assert.ok(caso({ fecha_hora_fin: "2026-11-20T19:00" }).fecha_hora_fin, "fin igual al inicio");
  assert.ok(caso({ fecha_hora_inicio: "2026-10-01T19:00", fecha_hora_fin: "2026-10-01T22:00" }).fecha_hora_inicio, "pasado");
  assert.ok(caso({ fecha_hora_inicio: "20/11/2026 7pm" }).fecha_hora_inicio, "formato libre");
  assert.ok(caso({ fecha_hora_inicio: "2026-02-31T19:00", fecha_hora_fin: "2026-03-05T19:00" }).fecha_hora_inicio, "31 de febrero");
});

test("evento: la ubicación es obligatoria y debe estar en Colombia", () => {
  const sinUbicacion = eventoValido();
  delete sinUbicacion.ubicacion;
  assert.ok(validarEventoNuevo(sinUbicacion, AHORA).errores.ubicacion);

  const enMadrid = { ...eventoValido(), ubicacion: { direccion: "Gran Vía 1", latitud: 40.4, longitud: -3.7, id_ciudad: 1 } };
  const { errores } = validarEventoNuevo(enMadrid, AHORA);
  assert.ok(errores.ubicacion.latitud);
  assert.ok(errores.ubicacion.longitud);
});

test("evento: la URL de la imagen debe ser http(s)", () => {
  assert.ok(validarEventoNuevo({ ...eventoValido(), url_imagen: "javascript:alert(1)" }, AHORA).errores.url_imagen);
  assert.equal(validarEventoNuevo({ ...eventoValido(), url_imagen: "https://sitio.co/foto.png" }, AHORA).errores, undefined);
});

test("evento: un body vacío o ausente no revienta, devuelve errores", () => {
  assert.ok(validarEventoNuevo(undefined, AHORA).errores.nombre);
  assert.ok(validarEventoNuevo({}, AHORA).errores.ubicacion);
});

test("edición: la ubicación es opcional", () => {
  const e = eventoValido();
  delete e.ubicacion;
  const { datos, errores } = validarEventoEdicion(e, AHORA);
  assert.equal(errores, undefined);
  assert.equal(datos.ubicacion, undefined);
});

test("estado: cancelar exige causa; los demás estados no la admiten", () => {
  assert.ok(validarCambioEstado({ estado: "Cancelado" }).errores.causa);
  assert.ok(validarCambioEstado({ estado: "Cancelado", causa: "   " }).errores.causa);
  assert.ok(validarCambioEstado({ estado: "Cancelado", causa: "x".repeat(101) }).errores.causa);
  assert.ok(validarCambioEstado({ estado: "Cancelado", causa: "Fuerza mayor", detalle: "x".repeat(301) }).errores.detalle);
  assert.deepEqual(
    validarCambioEstado({ estado: "Cancelado", causa: " Fuerza mayor o clima ", detalle: "Tormenta" }).datos,
    { estado: "Cancelado", causa: "Fuerza mayor o clima", detalle: "Tormenta" }
  );
  assert.deepEqual(
    validarCambioEstado({ estado: "Cancelado", causa: "Otra causa" }).datos,
    { estado: "Cancelado", causa: "Otra causa", detalle: null }
  );
  assert.ok(validarCambioEstado({ estado: "En Vivo", causa: "Fuerza mayor" }).errores.causa);
  assert.deepEqual(validarCambioEstado({ estado: "En Boletería" }).datos, { estado: "En Boletería", causa: null, detalle: null });
  assert.ok(validarCambioEstado({ estado: "Inventado" }).errores.estado);
});

test("cancelación: el texto de observaciones tiene el formato que escribe la web", () => {
  assert.equal(
    textoCancelacion("AGENTE", { causa: "Fuerza mayor o clima", detalle: "tormenta eléctrica en la ciudad" }),
    "Cancelado por el agente. Causa: Fuerza mayor o clima. Detalle: tormenta eléctrica en la ciudad."
  );
  assert.equal(textoCancelacion("ADMIN", { causa: "Otra causa", detalle: null }), "Cancelado por el administrador. Causa: Otra causa.");
  // Si el texto ya termina en punto no se duplica
  assert.equal(textoCancelacion("AGENTE", { causa: "Sin aforo.", detalle: null }), "Cancelado por el agente. Causa: Sin aforo.");
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
});
