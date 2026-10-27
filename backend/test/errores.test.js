// Pruebas unitarias del manejo de errores, de las imágenes y de las validaciones de personas (no necesitan base de datos).
// Cubren las ramas a las que no llegan las pruebas de integración: errores de PostgreSQL poco frecuentes, el 500
// genérico, una "imagen" que no lo es y los documentos o contraseñas inválidos en los paneles.
process.env.NODE_ENV = "test";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { errorHandler, noEncontrado } = require("../src/middlewares/errorHandler");
const { ErrorHttp } = require("../src/utils/errores");
const { guardarImagen, urlPublica } = require("../src/utils/imagenes");
const { publicUrl } = require("../src/config/env");
const { validarCliente, validarAdministrador } = require("../src/utils/validacionPersonas");

// Una respuesta de Express de mentiras: guarda el estado y el cuerpo
function respuesta() {
  return {
    estado: null,
    cuerpo: null,
    status(c) { this.estado = c; return this; },
    json(b) { this.cuerpo = b; return this; },
  };
}

// Pasa un error por el errorHandler y devuelve { estado, cuerpo }
function manejar(err) {
  const res = respuesta();
  errorHandler(err, {}, res, () => {});
  return res;
}

// Un error con la forma de los de node-postgres
const pg = (code, extra = {}) => Object.assign(new Error(extra.message || "error de pg"), { code, ...extra });

// ---------------------------------------------------------------------------------------------
// errorHandler
// ---------------------------------------------------------------------------------------------

test("errorHandler: cuerpo que no es JSON (400) y cuerpo demasiado grande (413)", () => {
  assert.equal(manejar({ type: "entity.parse.failed" }).estado, 400);
  const grande = manejar({ type: "entity.too.large" });
  assert.equal(grande.estado, 413);
  assert.match(grande.cuerpo.error, /demasiado grande/);
});

test("errorHandler: un ErrorHttp sale tal cual, con sus detalles", () => {
  const r = manejar(new ErrorHttp(422, "No se puede.", { campo: "motivo" }));
  assert.equal(r.estado, 422);
  assert.deepEqual(r.cuerpo, { error: "No se puede.", detalles: { campo: "motivo" } });
  assert.deepEqual(manejar(new ErrorHttp(404, "No existe.")).cuerpo, { error: "No existe." }, "sin detalles no hay campo detalles");
});

test("errorHandler: 23505 (repetido) dice qué campo, y los nombres de ubicaciones", () => {
  assert.deepEqual(Object.keys(manejar(pg("23505", { constraint: "usuario_correo_key" })).cuerpo.detalles), ["correo"]);
  assert.deepEqual(Object.keys(manejar(pg("23505", { constraint: "agente_nit_key" })).cuerpo.detalles), ["nit"]);
  assert.deepEqual(Object.keys(manejar(pg("23505", { constraint: "cliente_alias_key" })).cuerpo.detalles), ["alias"]);
  assert.deepEqual(Object.keys(manejar(pg("23505", { constraint: "usuario_pkey" })).cuerpo.detalles), ["numero_identificacion"]);
  const ciudad = manejar(pg("23505", { constraint: "ciudad_id_departamento_nombre_key" }));
  assert.equal(ciudad.estado, 409);
  assert.match(ciudad.cuerpo.error, /Ya existe uno con ese nombre/);
});

test("errorHandler: 23503 al borrar algo que se usa es 409; una referencia que no existe es 400", () => {
  // Las FK ON DELETE RESTRICT de la base responden 23503 (no 23001) al borrar
  const borrar = manejar(pg("23503", {
    constraint: "usuario_id_ciudad_fkey",
    message: 'update or delete on table "ciudad" violates foreign key constraint "usuario_id_ciudad_fkey" on table "usuario"',
  }));
  assert.equal(borrar.estado, 409);
  assert.match(borrar.cuerpo.error, /No se puede eliminar/);

  const ciudad = manejar(pg("23503", {
    constraint: "usuario_id_ciudad_fkey",
    message: 'insert or update on table "usuario" violates foreign key constraint "usuario_id_ciudad_fkey"',
  }));
  assert.equal(ciudad.estado, 400);
  assert.ok(ciudad.cuerpo.detalles.id_ciudad);

  const otra = manejar(pg("23503", { constraint: "evento_id_ubicacion_fkey", message: 'insert or update on table "evento" violates ...' }));
  assert.equal(otra.estado, 400);
  assert.equal(manejar(pg("23001")).estado, 409);
});

test("errorHandler: 23514 con restricción conocida dice el campo; desconocida dice cuál", () => {
  const doc = manejar(pg("23514", { constraint: "ck_usuario_documento_normalizado" }));
  assert.equal(doc.estado, 400);
  assert.match(doc.cuerpo.detalles.numero_identificacion, /mayúsculas y dígitos/);
  const otra = manejar(pg("23514", { constraint: "evento_precio_check" }));
  assert.equal(otra.estado, 400);
  assert.deepEqual(otra.cuerpo.detalles, { restriccion: "evento_precio_check" });
});

test("errorHandler: formato inválido (22P02, 22007) es 400 y un trigger (P0001) es 422 con su mensaje", () => {
  assert.equal(manejar(pg("22P02")).estado, 400);
  assert.equal(manejar(pg("22007")).estado, 400);
  const trigger = manejar(pg("P0001", { message: "El evento EVT-2026-0001 no tiene cupo para 5 entradas" }));
  assert.equal(trigger.estado, 422);
  assert.equal(trigger.cuerpo.error, "El evento EVT-2026-0001 no tiene cupo para 5 entradas");
});

test("errorHandler: un error desconocido es 500 y no muestra el detalle técnico", (t) => {
  const log = t.mock.method(console, "error", () => {});
  const r = manejar(new TypeError("Cannot read properties of undefined (reading 'x') at /src/secreto.js"));
  assert.equal(r.estado, 500);
  assert.deepEqual(r.cuerpo, { error: "Error interno del servidor." });
  assert.equal(log.mock.callCount(), 1, "el detalle queda en el log del servidor");
});

test("noEncontrado: 404", () => {
  const res = respuesta();
  noEncontrado({}, res);
  assert.equal(res.estado, 404);
});

// ---------------------------------------------------------------------------------------------
// Imágenes (solo los casos que no escriben archivos)
// ---------------------------------------------------------------------------------------------

const atrapar = (fn) => { try { fn(); } catch (e) { return e; } return null; };

test("guardarImagen: vacío, URLs y rutas válidas se guardan tal cual", () => {
  assert.equal(guardarImagen("", "eventos", "x"), null);
  assert.equal(guardarImagen(null, "eventos", "x"), null);
  assert.equal(guardarImagen("https://ejemplo.com/a.jpg", "eventos", "x"), "https://ejemplo.com/a.jpg");
  assert.equal(guardarImagen("img/27459.png", "eventos", "x"), "img/27459.png");
  // Al editar, la web reenvía la URL completa de una imagen subida: se guarda la ruta relativa
  assert.equal(guardarImagen(`${publicUrl}/uploads/eventos/a-1.jpg`, "eventos", "x"), "/uploads/eventos/a-1.jpg");
});

test("guardarImagen: rechaza URLs raras, tipos no permitidos, archivos que no son imagen y más de 2 MB", () => {
  for (const mala of ["javascript:alert(1)", "../../etc/passwd", "https://x.com/" + "a".repeat(260)]) {
    const e = atrapar(() => guardarImagen(mala, "eventos", "x", "imagen"));
    assert.equal(e && e.estado, 400, mala.slice(0, 30));
  }
  const gif = atrapar(() => guardarImagen("data:image/gif;base64,R0lGODlh", "eventos", "x"));
  assert.equal(gif.estado, 400);
  assert.match(gif.detalles.imagen, /JPG, PNG o WEBP/);

  // Dice ser PNG pero sus bytes no lo son (un texto renombrado)
  const falsa = "data:image/png;base64," + Buffer.from("esto no es una imagen").toString("base64");
  const e = atrapar(() => guardarImagen(falsa, "eventos", "x"));
  assert.equal(e.estado, 400);
  assert.match(e.detalles.imagen, /no es una imagen/);

  const enorme = "data:image/png;base64," + Buffer.alloc(2 * 1024 * 1024 + 1).toString("base64");
  assert.equal(atrapar(() => guardarImagen(enorme, "eventos", "x")).estado, 413);
});

test("urlPublica: completa las rutas subidas y deja las demás", () => {
  assert.equal(urlPublica("/uploads/eventos/a.jpg"), `${publicUrl}/uploads/eventos/a.jpg`);
  assert.equal(urlPublica("https://ejemplo.com/a.jpg"), "https://ejemplo.com/a.jpg");
  assert.equal(urlPublica(null), "");
});

// ---------------------------------------------------------------------------------------------
// Validación de personas en los paneles (alta)
// ---------------------------------------------------------------------------------------------

const clienteNuevo = (cambios = {}) => ({
  tipoDoc: "CC", documento: "1.234.567.890", contrasena: "Clave-segura-1", nombres: "Ana", apellidos: "Pérez",
  correo: "ana@correo.com", telefono: "3001234567", direccion: "Calle 1", ciudad: "Cali", nacimiento: "1999-04-20",
  ...cambios,
});

test("validarCliente (alta): el documento se normaliza; tipo o número inválidos y contraseñas fuera de 8 a 72", () => {
  const ok = validarCliente(clienteNuevo(), { nuevo: true });
  assert.equal(ok.errores, undefined, JSON.stringify(ok.errores));
  assert.equal(ok.datos.documento, "1234567890");

  assert.ok(validarCliente(clienteNuevo({ tipoDoc: "DNI" }), { nuevo: true }).errores.tipoDoc);
  assert.ok(validarCliente(clienteNuevo({ documento: "12AB" }), { nuevo: true }).errores.documento);
  assert.ok(validarCliente(clienteNuevo({ contrasena: "corta" }), { nuevo: true }).errores.contrasena);
  const larga = validarCliente(clienteNuevo({ contrasena: "a".repeat(73) }), { nuevo: true });
  assert.match(larga.errores.contrasena, /72/);
});

test("validarCliente: fecha de nacimiento, alias, puntos y publicidad", () => {
  const ahora = new Date("2026-10-21T12:00:00");
  const e = (cambios) => validarCliente(clienteNuevo(cambios), { nuevo: true, ahora }).errores || {};
  assert.ok(e({ nacimiento: "20-04-1999" }).nacimiento, "formato");
  assert.ok(e({ nacimiento: "2027-01-01" }).nacimiento, "futura");
  assert.ok(e({ alias: "a".repeat(41) }).alias);
  assert.ok(e({ puntos: -1 }).puntos);
  assert.ok(e({ puntos: 1.5 }).puntos);
  assert.ok(e({ publicidad: "sí" }).publicidad);
  assert.equal(validarCliente(clienteNuevo(), { nuevo: true, ahora }).datos.publicidad, true, "por defecto acepta publicidad");
});

test("validarAdministrador: al modificar no pide documento ni contraseña", () => {
  const cambio = validarAdministrador(
    { nombres: "Ana", apellidos: "Pérez", correo: "ana@correo.com", direccion: "Calle 1", ciudad: "Cali", salario: 1000, horario: "Mañana" },
    { nuevo: false });
  assert.equal(cambio.errores?.documento, undefined);
  assert.equal(cambio.errores?.contrasena, undefined);
});

test("PUBLIC_URL: por defecto las imágenes salen con ruta relativa; con valor, con la dirección del API", () => {
  assert.equal(urlPublica("/uploads/eventos/a.jpg"), `${publicUrl}/uploads/eventos/a.jpg`);

  // Se cargan de nuevo env.js e imagenes.js con PUBLIC_URL definida (la API en otro dominio)
  const anterior = process.env.PUBLIC_URL;
  const modulos = ["../src/config/env", "../src/utils/imagenes"].map((m) => require.resolve(m));
  process.env.PUBLIC_URL = "https://api.ejemplo.test/";
  modulos.forEach((m) => delete require.cache[m]);
  try {
    const imagenes = require("../src/utils/imagenes");
    assert.equal(imagenes.urlPublica("/uploads/eventos/a.jpg"), "https://api.ejemplo.test/uploads/eventos/a.jpg");
    // Al editar, la web reenvía la URL completa: en la base vuelve a quedar la ruta corta
    assert.equal(imagenes.guardarImagen("https://api.ejemplo.test/uploads/eventos/a-1.jpg", "eventos", "x"), "/uploads/eventos/a-1.jpg");
  } finally {
    if (anterior === undefined) delete process.env.PUBLIC_URL; else process.env.PUBLIC_URL = anterior;
    modulos.forEach((m) => delete require.cache[m]);
  }
});
