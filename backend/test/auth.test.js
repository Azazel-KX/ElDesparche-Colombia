// Pruebas de integración de /api/auth y /api/ciudades.
// Necesitan la base de datos con database/schema_ElDesparche.sql + database/seed.sql cargados
// y el archivo backend/.env configurado. Ejecutar:  npm test
process.env.NODE_ENV = "test";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");
const { pool } = require("../src/config/db");

let servidor;
let base;
let idCali; // id de la ciudad "Cali" en el seed
const creados = []; // documentos creados por las pruebas, para limpiarlos al final

const sufijo = String(Date.now()).slice(-7);
const unico = (n) => `9${sufijo}${n}`; // documento de 9 dígitos
const nitBase = (n) => `8${sufijo}${n}`; // 9 dígitos, válido para tipo NIT

const clienteBase = (n) => ({
  tipo_cuenta: "CLIENTE",
  tipo_identificacion: "CC",
  numero_identificacion: unico(n),
  nombre: "Prueba",
  apellidos: "Automática",
  correo: `prueba${sufijo}${n}@eldesparche.test`,
  contrasena: "Clave-segura-123",
  direccion: "Calle 1 # 2-3",
  id_ciudad: idCali,
  fecha_nacimiento: "1999-04-20",
});

const agenteBase = (n) => ({
  tipo_cuenta: "AGENTE",
  tipo_identificacion: "NIT",
  numero_identificacion: nitBase(n),
  nombre: "Agente",
  apellidos: "Automático",
  correo: `agente${sufijo}${n}@eldesparche.test`,
  contrasena: "Clave-segura-123",
  direccion: "Carrera 5 # 6-7",
  id_ciudad: idCali,
  nit: `${nitBase(n)}-3`,
  razon_social: "Prueba Eventos S.A.S.",
  nombre_comercial: "Prueba Eventos",
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

const registrar = async (datos) => {
  const res = await llamar("/api/auth/register", { metodo: "POST", cuerpo: datos });
  creados.push(datos.numero_identificacion);
  return res;
};

const existe = async (documento) => {
  const { rowCount } = await pool.query("SELECT 1 FROM USUARIO WHERE numero_identificacion = $1", [documento]);
  return rowCount === 1;
};

before(async () => {
  servidor = app.listen(0);
  base = `http://127.0.0.1:${servidor.address().port}`;
  const { json } = await llamar("/api/ciudades");
  idCali = json.ciudades.find((c) => c.nombre === "Cali").id_ciudad;
});

after(async () => {
  // Borrar el USUARIO elimina en cascada su subtipo, teléfonos, reservas y métodos de pago
  for (const id of creados) {
    await pool.query("DELETE FROM USUARIO WHERE numero_identificacion = $1", [id]);
  }
  await new Promise((r) => servidor.close(r));
  await pool.end();
});

// ---------------------------------------------------------------------------------------------
// Servicio y catálogo
// ---------------------------------------------------------------------------------------------

test("health responde ok", async () => {
  const { estado, json } = await llamar("/api/health");
  assert.equal(estado, 200);
  assert.equal(json.estado, "ok");
});

test("ciudades lista las del seed con su departamento", async () => {
  const { estado, json } = await llamar("/api/ciudades");
  assert.equal(estado, 200);
  const bogota = json.ciudades.find((c) => c.nombre === "Bogotá D.C.");
  assert.ok(bogota);
  assert.equal(bogota.departamento, "Cundinamarca");
  assert.equal(json.ciudades.find((c) => c.nombre === "Cali").departamento, "Valle del Cauca");
});

test("una ruta inexistente responde 404", async () => {
  const { estado } = await llamar("/api/no-existe");
  assert.equal(estado, 404);
});

// ---------------------------------------------------------------------------------------------
// Registro
// ---------------------------------------------------------------------------------------------

test("registro de cliente devuelve token y /me muestra su perfil", async () => {
  const datos = { ...clienteBase(1), telefono: "3001234567", alias: `alias${sufijo}1` };
  const reg = await registrar(datos);
  assert.equal(reg.estado, 201, JSON.stringify(reg.json));
  assert.ok(reg.json.token);
  assert.equal(reg.json.usuario.tipo_usuario, "CLIENTE");
  assert.equal(reg.json.usuario.nombre_completo, "Prueba Automática", "nombre y apellidos se guardan como nombre_completo");
  assert.equal(reg.json.usuario.contrasena_hash, undefined);

  const me = await llamar("/api/auth/me", { token: reg.json.token });
  assert.equal(me.estado, 200);
  const u = me.json.usuario;
  assert.equal(u.correo, datos.correo);
  assert.equal(u.ciudad, "Cali");
  assert.equal(u.departamento, "Valle del Cauca");
  assert.equal(u.pais, "Colombia");
  assert.equal(u.direccion, datos.direccion);
  assert.deepEqual(u.telefonos, ["3001234567"]);
  assert.equal(u.puntos, 0, "los puntos arrancan en 0");
  assert.equal(u.publicidad, true, "la publicidad arranca activada");
  assert.ok(Number.isInteger(u.edad) && u.edad >= 20, "la edad se deriva de la fecha de nacimiento");
  assert.equal(u.nit, null, "un cliente no tiene datos de agente");
  assert.equal(u.contrasena_hash, undefined);
  // Las fechas salen tal como se guardaron, sin desfase de zona horaria ni "T...Z" en las DATE
  assert.equal(u.fecha_nacimiento, "1999-04-20");
  assert.match(u.fecha_registro, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
});

test("registro de agente guarda los datos de su empresa", async () => {
  const datos = agenteBase(2);
  const reg = await registrar(datos);
  assert.equal(reg.estado, 201, JSON.stringify(reg.json));
  assert.equal(reg.json.usuario.tipo_usuario, "AGENTE");

  const me = await llamar("/api/auth/me", { token: reg.json.token });
  assert.equal(me.estado, 200);
  const u = me.json.usuario;
  assert.equal(u.nit, datos.nit);
  assert.equal(u.razon_social, datos.razon_social);
  assert.equal(u.nombre_comercial, datos.nombre_comercial);
  assert.equal(Number(u.comision), 0, "la comisión la fija un administrador");
  assert.equal(u.experiencia, 0);
  assert.equal(u.fecha_nacimiento, null, "un agente no tiene datos de cliente");
});

test("el documento se normaliza antes de guardarse", async () => {
  const limpio = unico(3);
  const conPuntos = `${limpio.slice(0, 3)}.${limpio.slice(3, 6)}.${limpio.slice(6)}`;
  const reg = await registrar({ ...clienteBase(3), numero_identificacion: conPuntos });
  assert.equal(reg.estado, 201, JSON.stringify(reg.json));
  assert.equal(reg.json.usuario.numero_identificacion, limpio);
  creados.push(limpio);
});

test("registro de AGENTE no acepta el tipo antiguo EMPRESA ni ADMIN", async () => {
  for (const tipo of ["EMPRESA", "ADMIN"]) {
    const res = await llamar("/api/auth/register", { metodo: "POST", cuerpo: { ...clienteBase(4), tipo_cuenta: tipo } });
    assert.equal(res.estado, 400);
    assert.ok(res.json.detalles.tipo_cuenta, `${tipo} no puede auto-registrarse`);
  }
});

test("registro rechaza correo duplicado con 409", async () => {
  const datos = clienteBase(5);
  assert.equal((await registrar(datos)).estado, 201);

  const repetido = await registrar({ ...datos, numero_identificacion: unico(6) });
  assert.equal(repetido.estado, 409);
  assert.ok(repetido.json.detalles.correo);
  assert.equal(await existe(unico(6)), false, "no debe quedar el usuario a medias");
});

test("registro rechaza documento duplicado con 409 aunque cambie el tipo", async () => {
  const datos = clienteBase(7);
  assert.equal((await registrar(datos)).estado, 201);

  const mismoNumero = await registrar({
    ...datos,
    tipo_identificacion: "CE",
    correo: `otro${sufijo}7@eldesparche.test`,
  });
  assert.equal(mismoNumero.estado, 409, "la PK es el número: no importa el tipo de documento");
  assert.ok(mismoNumero.json.detalles.numero_identificacion);
});

test("registro de agente con NIT repetido da 409 y no deja datos a medias", async () => {
  const primero = agenteBase(8);
  assert.equal((await registrar(primero)).estado, 201);

  const segundo = { ...agenteBase(9), nit: primero.nit };
  const res = await registrar(segundo);
  assert.equal(res.estado, 409);
  assert.ok(res.json.detalles.nit);
  assert.equal(await existe(segundo.numero_identificacion), false, "la transacción debe deshacerse completa");
});

test("registro rechaza alias repetido con 409", async () => {
  const alias = `repe${sufijo}`;
  assert.equal((await registrar({ ...clienteBase(10), alias })).estado, 201);
  const res = await registrar({ ...clienteBase(11), alias });
  assert.equal(res.estado, 409);
  assert.ok(res.json.detalles.alias);
});

test("registro valida los datos y no crea nada si fallan", async () => {
  const mal = { ...clienteBase(12), correo: "no-es-correo", contrasena: "corta", telefono: "123" };
  const res = await registrar(mal);
  assert.equal(res.estado, 400);
  assert.ok(res.json.detalles.correo);
  assert.ok(res.json.detalles.contrasena);
  assert.ok(res.json.detalles.telefono);
  assert.equal(await existe(mal.numero_identificacion), false);
});

test("registro valida el formato del documento según su tipo", async () => {
  const casos = [
    { tipo_identificacion: "CC", numero_identificacion: "ABC12345" },
    { tipo_identificacion: "NIT", numero_identificacion: "12345678" }, // 8 dígitos
    { tipo_identificacion: "PAS", numero_identificacion: "AB1" },
  ];
  for (const c of casos) {
    const res = await registrar({ ...clienteBase(13), ...c });
    assert.equal(res.estado, 400, JSON.stringify(c));
    assert.ok(res.json.detalles.numero_identificacion, JSON.stringify(c));
  }
});

test("registro con una ciudad que no existe responde 400", async () => {
  const res = await registrar({ ...clienteBase(14), id_ciudad: 999999 });
  assert.equal(res.estado, 400);
  assert.ok(res.json.detalles.id_ciudad);
  assert.equal(await existe(clienteBase(14).numero_identificacion), false);
});

test("un cliente recién registrado ya puede reservar (no hay verificación de contacto)", async () => {
  const datos = clienteBase(15);
  assert.equal((await registrar(datos)).estado, 201);
  const { rows } = await pool.query(
    `INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento)
     VALUES (1, $1, 'EVT-2026-0004') RETURNING valor_total::float8 AS valor_total`,
    [datos.numero_identificacion]
  );
  // 1 entrada de $20.000 = $20.000
  assert.equal(rows[0].valor_total, 20000);
});

test("la base exige que todo usuario esté en exactamente un subtipo", async () => {
  const sin = unico(16);
  creados.push(sin);
  // Solo el USUARIO, sin fila en ADMIN, CLIENTE ni AGENTE: el trigger diferido lo rechaza al COMMIT
  await assert.rejects(
    pool.query(
      `INSERT INTO USUARIO (numero_identificacion, tipo_identificacion, nombre_completo, correo, contrasena_hash, direccion, id_ciudad)
       VALUES ($1, 'CC', 'Sin Subtipo', $2, 'x', 'Calle 1', $3)`,
      [sin, `sin${sufijo}@eldesparche.test`, idCali]
    ),
    /subtipo/
  );
  assert.equal(await existe(sin), false);

  // Un usuario en dos subtipos a la vez (la herencia es disjunta) tampoco pasa
  const doble = unico(17);
  creados.push(doble);
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query(
      `INSERT INTO USUARIO (numero_identificacion, tipo_identificacion, nombre_completo, correo, contrasena_hash, direccion, id_ciudad)
       VALUES ($1, 'CC', 'Doble Subtipo', $2, 'x', 'Calle 1', $3)`,
      [doble, `doble${sufijo}@eldesparche.test`, idCali]
    );
    await cliente.query("INSERT INTO CLIENTE (numero_identificacion, fecha_nacimiento) VALUES ($1, '1990-01-01')", [doble]);
    await cliente.query("INSERT INTO ADMIN (numero_identificacion, salario, horario) VALUES ($1, 1000000, 'Tarde')", [doble]);
    await assert.rejects(cliente.query("COMMIT"), /más de un subtipo/);
  } finally {
    await cliente.query("ROLLBACK").catch(() => {});
    cliente.release();
  }
  assert.equal(await existe(doble), false);
});

// ---------------------------------------------------------------------------------------------
// Inicio de sesión y perfil
// ---------------------------------------------------------------------------------------------

test("login correcto con cada perfil del seed", async () => {
  const casos = [
    ["admin@eldesparche.test", "ADMIN"],
    ["cliente1@eldesparche.test", "CLIENTE"],
    ["agente1@eldesparche.test", "AGENTE"],
  ];
  for (const [correo, rol] of casos) {
    const res = await llamar("/api/auth/login", {
      metodo: "POST",
      cuerpo: { correo, contrasena: "Desparche2026!" },
    });
    assert.equal(res.estado, 200, correo);
    assert.equal(res.json.usuario.tipo_usuario, rol);
    assert.ok(res.json.token);

    const me = await llamar("/api/auth/me", { token: res.json.token });
    assert.equal(me.estado, 200);
    assert.equal(me.json.usuario.correo, correo);
  }
});

test("el login devuelve los datos que la web guarda en la sesión (documento, nacimiento, NIT)", async () => {
  const entrar = (correo) =>
    llamar("/api/auth/login", { metodo: "POST", cuerpo: { correo, contrasena: "Desparche2026!" } });

  const cliente = (await entrar("cliente1@eldesparche.test")).json.usuario;
  assert.equal(cliente.tipo_identificacion, "CC");
  assert.equal(cliente.fecha_nacimiento, "1995-03-12");
  assert.equal(cliente.nit, null);

  const agente = (await entrar("agente1@eldesparche.test")).json.usuario;
  assert.equal(agente.tipo_identificacion, "NIT");
  assert.equal(agente.nit, "900111222-1");
  assert.equal(agente.fecha_nacimiento, null);
  assert.equal(agente.contrasena_hash, undefined);
});

test("el perfil devuelve la comisión y el salario como números", async () => {
  const entrar = async (correo) =>
    (await llamar("/api/auth/login", { metodo: "POST", cuerpo: { correo, contrasena: "Desparche2026!" } })).json.token;

  const agente = (await llamar("/api/auth/me", { token: await entrar("agente1@eldesparche.test") })).json.usuario;
  assert.equal(agente.comision, 10);
  const admin = (await llamar("/api/auth/me", { token: await entrar("admin@eldesparche.test") })).json.usuario;
  assert.equal(admin.salario, 4500000);
});

test("el perfil del administrador del seed incluye su horario", async () => {
  const login = await llamar("/api/auth/login", {
    metodo: "POST",
    cuerpo: { correo: "admin@eldesparche.test", contrasena: "Desparche2026!" },
  });
  const me = await llamar("/api/auth/me", { token: login.json.token });
  assert.equal(me.json.usuario.horario, "Completa");
});

test("login acepta el correo en mayúsculas", async () => {
  const res = await llamar("/api/auth/login", {
    metodo: "POST",
    cuerpo: { correo: "ADMIN@ELDESPARCHE.TEST", contrasena: "Desparche2026!" },
  });
  assert.equal(res.estado, 200);
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

test("login sin datos responde 400", async () => {
  const res = await llamar("/api/auth/login", { metodo: "POST", cuerpo: {} });
  assert.equal(res.estado, 400);
  assert.ok(res.json.detalles.correo);
  assert.ok(res.json.detalles.contrasena);
});

test("/me exige token válido", async () => {
  assert.equal((await llamar("/api/auth/me")).estado, 401);
  assert.equal((await llamar("/api/auth/me", { token: "abc.def.ghi" })).estado, 401);
});
