// Pruebas unitarias de las reglas de validación (no necesitan base de datos).
process.env.NODE_ENV = "test";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validarRegistro, validarLogin, normalizarDocumento } = require("../src/utils/validacion");
const { requiereRol } = require("../src/middlewares/auth");

const cliente = () => ({
  tipo_cuenta: "CLIENTE",
  tipo_identificacion: "CC",
  numero_identificacion: "1234567890",
  nombre: "Ana",
  apellidos: "Pérez",
  correo: "Ana@Correo.com",
  contrasena: "Clave-segura-123",
  direccion: "Calle 1 # 2-3",
  id_ciudad: 1,
  fecha_nacimiento: "1999-04-20",
});

const agente = () => ({
  ...cliente(),
  tipo_cuenta: "AGENTE",
  tipo_identificacion: "NIT",
  numero_identificacion: "900111222",
  nit: "900111222-1",
  razon_social: "Pacífico Producciones S.A.S.",
  nombre_comercial: "Pacífico",
});

test("normalizarDocumento quita puntos, guiones y espacios y pasa a mayúsculas", () => {
  assert.equal(normalizarDocumento("1.234.567-890"), "1234567890");
  assert.equal(normalizarDocumento(" ab 12345 "), "AB12345");
  assert.equal(normalizarDocumento(undefined), "");
});

test("un cliente válido se acepta y el correo queda en minúsculas", () => {
  const { datos, errores } = validarRegistro(cliente());
  assert.equal(errores, undefined);
  assert.equal(datos.correo, "ana@correo.com");
  assert.equal(datos.publicidad, true);
});

test("un agente válido se acepta con los datos de su empresa", () => {
  const { datos, errores } = validarRegistro(agente());
  assert.equal(errores, undefined);
  assert.equal(datos.nit, "900111222-1");
  assert.equal(datos.razon_social, "Pacífico Producciones S.A.S.");
});

test("los tipos de cuenta válidos son CLIENTE y AGENTE", () => {
  assert.ok(validarRegistro({ ...cliente(), tipo_cuenta: "EMPRESA" }).errores.tipo_cuenta);
  assert.ok(validarRegistro({ ...cliente(), tipo_cuenta: "ADMIN" }).errores.tipo_cuenta);
});

test("el formato del documento depende del tipo (igual que en la base de datos)", () => {
  const caso = (tipo, numero) => validarRegistro({ ...cliente(), tipo_identificacion: tipo, numero_identificacion: numero });
  assert.equal(caso("CC", "12345").errores.numero_identificacion !== undefined, true, "CC de 5 dígitos");
  assert.equal(caso("CC", "123456").errores, undefined, "CC de 6 dígitos");
  assert.equal(caso("CE", "1234").errores, undefined, "CE de 4 dígitos");
  assert.equal(caso("PPT", "1234").errores.numero_identificacion !== undefined, true, "PPT de 4 dígitos");
  assert.equal(caso("PAS", "ab12345").errores, undefined, "el pasaporte se pasa a mayúsculas");
  assert.equal(caso("PAS", "AB12").errores.numero_identificacion !== undefined, true, "PAS de 4 caracteres");
});

test("el teléfono debe ser celular o fijo colombiano de 10 dígitos", () => {
  const tel = (t) => validarRegistro({ ...cliente(), telefono: t }).errores;
  assert.equal(tel("3001234567"), undefined);
  assert.equal(tel("6012345678"), undefined);
  assert.ok(tel("12345").telefono);
  assert.ok(tel("+573001234567").telefono);
});

test("la fecha de nacimiento del cliente debe ser válida y pasada", () => {
  const f = (v) => validarRegistro({ ...cliente(), fecha_nacimiento: v }).errores;
  assert.ok(f("20-04-1999").fecha_nacimiento);
  assert.ok(f("2999-01-01").fecha_nacimiento);
  assert.equal(f("1999-04-20"), undefined);
});

test("el agente necesita NIT con dígito de verificación y razón social", () => {
  assert.ok(validarRegistro({ ...agente(), nit: "900111222" }).errores.nit);
  assert.ok(validarRegistro({ ...agente(), razon_social: "" }).errores.razon_social);
});

test("la contraseña tiene entre 8 y 72 caracteres", () => {
  assert.ok(validarRegistro({ ...cliente(), contrasena: "corta" }).errores.contrasena);
  assert.ok(validarRegistro({ ...cliente(), contrasena: "x".repeat(73) }).errores.contrasena);
});

test("el registro ya no pide ni acepta coordenadas", () => {
  const { datos } = validarRegistro({ ...cliente(), latitud: 4.6, longitud: -74.1 });
  assert.equal(datos.latitud, undefined);
  assert.equal(datos.longitud, undefined);
});

test("la publicidad solo acepta verdadero o falso", () => {
  assert.equal(validarRegistro({ ...cliente(), publicidad: false }).datos.publicidad, false);
  assert.ok(validarRegistro({ ...cliente(), publicidad: "quizás" }).errores.publicidad);
});

test("el login pide correo y contraseña", () => {
  assert.ok(validarLogin({}).errores.correo);
  assert.ok(validarLogin({ correo: "a@b.co" }).errores.contrasena);
  assert.equal(validarLogin({ correo: " A@B.co ", contrasena: "x" }).datos.correo, "a@b.co");
});

test("requiereRol deja pasar solo a los roles indicados", () => {
  const llamar = (usuario, ...roles) => {
    let resultado;
    requiereRol(...roles)({ usuario }, null, (err) => { resultado = err; });
    return resultado;
  };
  assert.equal(llamar({ rol: "AGENTE" }, "AGENTE", "ADMIN"), undefined);
  assert.equal(llamar({ rol: "CLIENTE" }, "AGENTE", "ADMIN").estado, 403);
  assert.equal(llamar(undefined, "ADMIN").estado, 403);
});
