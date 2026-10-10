// Pruebas de integración de /api/auth. Necesitan la base de datos con schema.sql + seed.sql cargados
// y el archivo backend/.env configurado. Ejecutar:  npm test
process.env.NODE_ENV = "test";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");
const { pool } = require("../src/config/db");

let servidor;
let base;
const creados = []; // números de identificación creados por las pruebas, para limpiarlos al final

const sufijo = String(Date.now()).slice(-7);
const unico = (n) => `9${sufijo}${n}`.slice(0, 10); // identificación de 10 dígitos

const clienteBase = (n) => ({
  tipo_cuenta: "CLIENTE",
  tipo_identificacion: "CC",
  numero_identificacion: unico(n),
  nombres: "Prueba",
  apellidos: "Automática",
  correo: `prueba${sufijo}${n}@eldesparche.test`,
  contrasena: "Clave-segura-123",
  direccion: "Calle 1 # 2-3",
  id_ciudad: 1,
  fecha_nacimiento: "1999-04-20",
});

async function llamar(ruta, { metodo = "GET", cuerpo, token } = {}) {
  const res = await fetch(base + ruta, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return { estado: res.status, json: await res.json() };
}

before(async () => {
  servidor = app.listen(0);
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  for (const id of creados) {
    const { rows } = await pool.query("SELECT id_ubicacion FROM USUARIO WHERE numero_identificacion = $1", [id]);
    await pool.query("DELETE FROM TELEFONO_USUARIO WHERE numero_identificacion = $1", [id]);
    await pool.query("DELETE FROM CLIENTE WHERE numero_identificacion = $1", [id]);
    await pool.query("DELETE FROM EMPRESA WHERE numero_identificacion = $1", [id]);
    await pool.query("DELETE FROM USUARIO WHERE numero_identificacion = $1", [id]);
    if (rows[0]) await pool.query("DELETE FROM UBICACION WHERE id_ubicacion = $1", [rows[0].id_ubicacion]);
  }
  await new Promise((r) => servidor.close(r));
  await pool.end();
});

test("health responde ok", async () => {
  const { estado, json } = await llamar("/api/health");
  assert.equal(estado, 200);
  assert.equal(json.estado, "ok");
});

test("ciudades lista las del seed con su departamento", async () => {
  const { estado, json } = await llamar("/api/ciudades");
  assert.equal(estado, 200);
  const bogota = json.ciudades.find((c) => c.nombre === "Bogotá");
  assert.ok(bogota);
  assert.equal(bogota.departamento, "Bogotá D.C.");
});

test("registro de cliente devuelve token y /me lo acepta", async () => {
  const datos = clienteBase(1);
  const reg = await llamar("/api/auth/register", { metodo: "POST", cuerpo: datos });
  creados.push(datos.numero_identificacion);
  assert.equal(reg.estado, 201);
  assert.ok(reg.json.token);
  assert.equal(reg.json.usuario.tipo_usuario, "CLIENTE");
  assert.equal(reg.json.usuario.contrasena_hash, undefined);

  const me = await llamar("/api/auth/me", { token: reg.json.token });
  assert.equal(me.estado, 200);
  assert.equal(me.json.usuario.correo, datos.correo);
  assert.equal(me.json.usuario.ciudad, "Bogotá");
  assert.equal(me.json.usuario.contrasena_hash, undefined);
});

test("registro de empresa", async () => {
  const datos = {
    ...clienteBase(2),
    tipo_cuenta: "EMPRESA",
    tipo_identificacion: "NIT",
    numero_identificacion: `8${sufijo}12`.slice(0, 9),
    nit: `8${sufijo}12`.slice(0, 9) + "-3",
    razon_social: "Prueba S.A.S.",
    nombre_comercial: "Prueba",
  };
  delete datos.fecha_nacimiento;
  const reg = await llamar("/api/auth/register", { metodo: "POST", cuerpo: datos });
  creados.push(datos.numero_identificacion);
  assert.equal(reg.estado, 201, JSON.stringify(reg.json));
  assert.equal(reg.json.usuario.tipo_usuario, "EMPRESA");
});

test("registro rechaza correo duplicado con 409", async () => {
  const datos = clienteBase(3);
  const primero = await llamar("/api/auth/register", { metodo: "POST", cuerpo: datos });
  creados.push(datos.numero_identificacion);
  assert.equal(primero.estado, 201);

  const repetido = await llamar("/api/auth/register", {
    metodo: "POST",
    cuerpo: { ...datos, numero_identificacion: unico(4) },
  });
  assert.equal(repetido.estado, 409);
  assert.ok(repetido.json.detalles.correo);
});

test("registro valida los datos y no crea nada si fallan", async () => {
  const mal = { ...clienteBase(5), correo: "no-es-correo", contrasena: "corta", tipo_cuenta: "ADMIN" };
  const res = await llamar("/api/auth/register", { metodo: "POST", cuerpo: mal });
  assert.equal(res.estado, 400);
  assert.ok(res.json.detalles.correo);
  assert.ok(res.json.detalles.contrasena);
  assert.ok(res.json.detalles.tipo_cuenta, "ADMIN no puede auto-registrarse");
});

test("registro rechaza HTML en nombres, apellidos, alias y dirección (XSS)", async () => {
  const veneno = '<img src=x onerror=alert(1)>';
  const res = await llamar("/api/auth/register", {
    metodo: "POST",
    cuerpo: { ...clienteBase(6), nombres: veneno, apellidos: "<script>x</script>", alias: veneno, direccion: veneno },
  });
  assert.equal(res.estado, 400);
  for (const campo of ["nombres", "apellidos", "alias", "direccion"]) {
    assert.ok(res.json.detalles[campo], `${campo} debe rechazarse`);
  }
});

test("registro acepta nombres con tildes, apóstrofe y guion", async () => {
  const datos = { ...clienteBase(7), nombres: "María José", apellidos: "O'Neill-Núñez" };
  const res = await llamar("/api/auth/register", { metodo: "POST", cuerpo: datos });
  creados.push(datos.numero_identificacion);
  assert.equal(res.estado, 201, JSON.stringify(res.json));
});

test("login correcto con usuario del seed", async () => {
  const res = await llamar("/api/auth/login", {
    metodo: "POST",
    cuerpo: { correo: "admin@eldesparche.test", contrasena: "Desparche2026!" },
  });
  assert.equal(res.estado, 200);
  assert.equal(res.json.usuario.tipo_usuario, "ADMIN");
  assert.ok(res.json.token);
});

test("login falla igual con contraseña errónea y con correo inexistente", async () => {
  const mala = await llamar("/api/auth/login", {
    metodo: "POST",
    cuerpo: { correo: "admin@eldesparche.test", contrasena: "otra-clave" },
  });
  const noExiste = await llamar("/api/auth/login", {
    metodo: "POST",
    cuerpo: { correo: "nadie@eldesparche.test", contrasena: "otra-clave" },
  });
  assert.equal(mala.estado, 401);
  assert.equal(noExiste.estado, 401);
  assert.equal(mala.json.error, noExiste.json.error);
});

test("/me exige token válido", async () => {
  assert.equal((await llamar("/api/auth/me")).estado, 401);
  assert.equal((await llamar("/api/auth/me", { token: "abc.def.ghi" })).estado, 401);
});
