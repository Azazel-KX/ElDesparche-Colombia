// Pruebas de integración de agentes, clientes y administradores (/api/admin/agentes, /clientes, /administradores)
// y del estado de la cuenta (Activo, Pendiente, Suspendido, Bloqueado).
// Necesitan la base con database/schema_ElDesparche.sql + database/seed.sql cargados y el .env.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const t = require("./ayudas");
const { llamar, pool } = t;

let tokenAdmin;
let tokenAgente;
let tokenCliente;
const creados = []; // documentos creados por las pruebas, para limpiarlos al final

const sufijo = String(Date.now()).slice(-6);
const doc = (n) => `7${sufijo}${n}`; // 8 dígitos: válido para CC
const nitDe = (n) => `8${sufijo}${n}`.padEnd(9, "0"); // 9 dígitos

const CLAVE_NUEVA = "Clave-nueva-123";

const agenteBase = (n, cambios = {}) => ({
  nit: `${nitDe(n)}-5`, razon: "Prueba Eventos S.A.S.", nombre: "Prueba Eventos", experiencia: 4, comision: 7.5,
  descripcion: "Agente creado por las pruebas", estado: "Activo",
  tipoDoc: "CC", documento: doc(n), nombres: "Laura Marcela", apellidos: "Prueba Agente", correo: `agente${sufijo}${n}@eldesparche.test`,
  telefono: "3001112233", direccion: "Calle 1 # 2-3", ciudad: "Cali", contrasena: CLAVE_NUEVA, ...cambios,
});

const clienteBase = (n, cambios = {}) => ({
  tipoDoc: "CC", documento: doc(n), nombres: "Pedro José", apellidos: "Prueba Cliente", correo: `cliente${sufijo}${n}@eldesparche.test`,
  telefono: "3109998877", nacimiento: "1999-04-20", direccion: "Carrera 5 # 6-7", ciudad: "Tuluá", alias: `alias${sufijo}${n}`,
  puntos: 10, publicidad: true, contrasena: CLAVE_NUEVA, ...cambios,
});

const adminBase = (n, cambios = {}) => ({
  tipoDoc: "CC", documento: doc(n), nombres: "Natalia", apellidos: "Cárdenas Ruiz", correo: `admin${sufijo}${n}@eldesparche.test`,
  telefono: "", direccion: "Calle 28 # 24-40", ciudad: "Bogotá D.C.", salario: 3200000, horario: "Mañana", contrasena: CLAVE_NUEVA, ...cambios,
});

const entrarNuevo = (correo) => llamar("/api/auth/login", { metodo: "POST", cuerpo: { correo, contrasena: CLAVE_NUEVA } });
const con = (token) => ({ token });

before(async () => {
  await t.iniciar();
  tokenAdmin = await t.entrar("admin@eldesparche.test");
  tokenAgente = await t.entrar("agente1@eldesparche.test");
  tokenCliente = await t.entrar("cliente1@eldesparche.test");
});

after(async () => {
  for (const d of creados) {
    await pool.query("DELETE FROM PAGO WHERE id_reserva IN (SELECT id_reserva FROM RESERVA WHERE numero_identificacion = $1)", [d]);
    await pool.query("DELETE FROM USUARIO WHERE numero_identificacion = $1", [d]);
  }
  await t.terminar();
});

const registrar = (cuerpo) => { creados.push(cuerpo.documento); return cuerpo; };

// ---------------------------------------------------------------------------------------------
// Acceso
// ---------------------------------------------------------------------------------------------

test("agentes, clientes y administradores: solo el administrador (sin token 401, cliente o agente 403)", async () => {
  for (const ruta of ["/api/admin/agentes", "/api/admin/clientes", "/api/admin/administradores"]) {
    assert.equal((await llamar(ruta)).estado, 401, ruta);
    assert.equal((await llamar(ruta, con(tokenCliente))).estado, 403, ruta);
    assert.equal((await llamar(ruta, con(tokenAgente))).estado, 403, ruta);
    assert.equal((await llamar(ruta, con(tokenAdmin))).estado, 200, ruta);
  }
});

// ---------------------------------------------------------------------------------------------
// Agentes
// ---------------------------------------------------------------------------------------------

test("GET agentes: la forma de AGENTES_DEMO con sus eventos, entradas e ingresos", async () => {
  const { json } = await llamar("/api/admin/agentes", con(tokenAdmin));
  const a = json.agentes.find((x) => x.nit === "900111222-1");
  assert.equal(a.documento, "900111222");
  assert.equal(a.tipoDoc, "NIT");
  assert.equal(a.nombre, "Pacífico Producciones", "nombre = nombre comercial");
  assert.equal(a.razon, "Pacífico Producciones S.A.S.");
  assert.equal(a.correo, "agente1@eldesparche.test");
  assert.equal(a.telefono, "3157778899");
  assert.equal(a.ciudad, "Cali");
  assert.equal(a.comision, 10);
  assert.equal(a.experiencia, 8);
  assert.equal(a.estado, "Activo");
  assert.match(a.registro, /^\d{4}-\d{2}-\d{2}$/);
  // (otras pruebas crean eventos y reservas de este agente a la vez, por eso se comprueba "al menos")
  assert.ok(a.eventos.includes("EVT-2026-0001") && a.eventos.includes("EVT-2026-0003"));
  assert.ok(!a.eventos.includes("EVT-2026-0006"), "la solicitud en revisión no cuenta");
  assert.ok(a.entradas >= 2, "solo cuentan las entradas válidas: la reserva 2 no está pagada");
  assert.ok(a.ingresos >= 100000);
  assert.equal(a.ventas.length, 6);
  assert.ok(a.ventas[5] >= 2, "las entradas vendidas son de este mes");
  assert.equal(typeof a.nombres, "string");
  assert.equal(a.contrasena_hash, undefined);

  assert.equal(json.agentes.find((x) => x.nit === "900555666-3").estado, "Pendiente");
});

test("POST agente: se registra, aparece en la lista y puede entrar con su contraseña", async () => {
  const cuerpo = registrar(agenteBase(1));
  const { estado, json } = await llamar("/api/admin/agentes", { metodo: "POST", token: tokenAdmin, cuerpo });
  assert.equal(estado, 201, JSON.stringify(json));
  assert.equal(json.agente.nit, cuerpo.nit);
  assert.equal(json.agente.nombre, "Prueba Eventos");
  assert.equal(json.agente.nombres, "Laura Marcela");
  assert.equal(json.agente.apellidos, "Prueba Agente");
  assert.equal(json.agente.telefono, "3001112233");
  assert.equal(json.agente.comision, 7.5);

  const login = await entrarNuevo(cuerpo.correo);
  assert.equal(login.estado, 200);
  assert.equal(login.json.usuario.tipo_usuario, "AGENTE");
  assert.equal(login.json.usuario.nit, cuerpo.nit);
});

test("POST agente: nit, documento y correo repetidos dan 409; datos inválidos 400; ciudad inexistente 400", async () => {
  const base = registrar(agenteBase(2));
  assert.equal((await llamar("/api/admin/agentes", { metodo: "POST", token: tokenAdmin, cuerpo: base })).estado, 201);

  const nit = await llamar("/api/admin/agentes", { metodo: "POST", token: tokenAdmin, cuerpo: agenteBase(3, { nit: base.nit }) });
  assert.equal(nit.estado, 409);
  assert.ok(nit.json.detalles.nit);
  const documento = await llamar("/api/admin/agentes", { metodo: "POST", token: tokenAdmin, cuerpo: agenteBase(3, { documento: base.documento }) });
  assert.equal(documento.estado, 409);
  assert.ok(documento.json.detalles.numero_identificacion);
  const correo = await llamar("/api/admin/agentes", { metodo: "POST", token: tokenAdmin, cuerpo: agenteBase(3, { correo: base.correo }) });
  assert.equal(correo.estado, 409);
  assert.ok(correo.json.detalles.correo);
  assert.equal((await pool.query("SELECT 1 FROM USUARIO WHERE numero_identificacion = $1", [doc(3)])).rowCount, 0, "no quedó nada a medias");

  const mal = await llamar("/api/admin/agentes", {
    metodo: "POST", token: tokenAdmin, cuerpo: agenteBase(3, { nit: "123", comision: 150, contrasena: "corta", correo: "no-es-correo", experiencia: -1 }),
  });
  assert.equal(mal.estado, 400);
  for (const campo of ["nit", "comision", "contrasena", "correo", "experiencia"]) assert.ok(mal.json.detalles[campo], campo);

  const ciudad = await llamar("/api/admin/agentes", { metodo: "POST", token: tokenAdmin, cuerpo: agenteBase(3, { ciudad: "Ciudad Inventada" }) });
  assert.equal(ciudad.estado, 400);
  assert.ok(ciudad.json.detalles.ciudad);
});

test("PUT agente: cambia empresa y representante; el NIT y el documento no cambian; 404 si no existe", async () => {
  const cuerpo = registrar(agenteBase(4));
  await llamar("/api/admin/agentes", { metodo: "POST", token: tokenAdmin, cuerpo });

  const { estado, json } = await llamar(`/api/admin/agentes/${cuerpo.nit}`, {
    metodo: "PUT", token: tokenAdmin,
    cuerpo: { ...cuerpo, nit: "999999999-9", documento: "1", razon: "Razón Nueva S.A.S.", nombre: "Nombre Nuevo", comision: 9, experiencia: 6, telefono: "", ciudad: "Medellín" },
  });
  assert.equal(estado, 200, JSON.stringify(json));
  assert.equal(json.agente.nit, cuerpo.nit);
  assert.equal(json.agente.documento, cuerpo.documento);
  assert.equal(json.agente.razon, "Razón Nueva S.A.S.");
  assert.equal(json.agente.nombre, "Nombre Nuevo");
  assert.equal(json.agente.comision, 9);
  assert.equal(json.agente.ciudad, "Medellín");
  assert.equal(json.agente.telefono, "", "un teléfono vacío lo quita");

  assert.equal((await llamar("/api/admin/agentes/999999999-9", { metodo: "PUT", token: tokenAdmin, cuerpo })).estado, 404);
});

test("PATCH estado de agente: Suspendido corta el acceso al instante (también con el token que ya tenía); Activo lo devuelve", async () => {
  const cuerpo = registrar(agenteBase(5));
  await llamar("/api/admin/agentes", { metodo: "POST", token: tokenAdmin, cuerpo });
  const sesion = await entrarNuevo(cuerpo.correo);
  assert.equal((await llamar("/api/auth/me", con(sesion.json.token))).estado, 200);

  const url = `/api/admin/agentes/${cuerpo.nit}/estado`;
  const susp = await llamar(url, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Suspendido" } });
  assert.equal(susp.estado, 200);
  assert.equal(susp.json.agente.estado, "Suspendido");

  const login = await entrarNuevo(cuerpo.correo);
  assert.equal(login.estado, 403);
  assert.match(login.json.error, /suspendida/);
  const conToken = await llamar("/api/auth/me", con(sesion.json.token));
  assert.equal(conToken.estado, 403, "el token viejo deja de servir en cuanto se suspende la cuenta");

  await llamar(url, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Activo" } });
  assert.equal((await entrarNuevo(cuerpo.correo)).estado, 200);

  assert.equal((await llamar(url, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Bloqueada" } })).estado, 400, "los agentes no se 'bloquean'");
  assert.equal((await llamar("/api/admin/agentes/999999999-9/estado", { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Activo" } })).estado, 404);
});

test("un agente Pendiente puede entrar (para ver su panel); uno nuevo que se registra solo queda Pendiente", async () => {
  const login = await t.entrar("agente3@eldesparche.test");
  assert.ok(login, "el agente pendiente del seed entra");
  const me = await llamar("/api/auth/me", con(login));
  assert.equal(me.json.usuario.estado_usuario, "Pendiente");

  const n = 6;
  const cuerpo = {
    tipo_cuenta: "AGENTE", tipo_identificacion: "CC", numero_identificacion: doc(n), nombre: "Registro", apellidos: "Propio",
    correo: `propio${sufijo}@eldesparche.test`, contrasena: CLAVE_NUEVA, direccion: "Calle 1", id_ciudad: 1,
    nit: `${nitDe(n)}-1`, razon_social: "Propio S.A.S.", nombre_comercial: "Propio",
  };
  creados.push(doc(n));
  const reg = await llamar("/api/auth/register", { metodo: "POST", cuerpo });
  assert.equal(reg.estado, 201, JSON.stringify(reg.json));
  assert.equal(reg.json.usuario.estado_usuario, "Pendiente");
  const { json } = await llamar("/api/admin/agentes", con(tokenAdmin));
  assert.equal(json.agentes.find((a) => a.nit === cuerpo.nit).estado, "Pendiente");
});

test("DELETE agente: 409 si tiene eventos; si no, se elimina; 404 si no existe", async () => {
  const conEventos = await llamar("/api/admin/agentes/900111222-1", { metodo: "DELETE", token: tokenAdmin });
  assert.equal(conEventos.estado, 409);
  assert.match(conEventos.json.error, /eventos/);
  assert.equal((await pool.query("SELECT 1 FROM AGENTE WHERE nit = '900111222-1'")).rowCount, 1, "el agente sigue ahí");

  const cuerpo = registrar(agenteBase(7));
  await llamar("/api/admin/agentes", { metodo: "POST", token: tokenAdmin, cuerpo });
  assert.equal((await llamar(`/api/admin/agentes/${cuerpo.nit}`, { metodo: "DELETE", token: tokenAdmin })).estado, 204);
  assert.equal((await pool.query("SELECT 1 FROM USUARIO WHERE numero_identificacion = $1", [cuerpo.documento])).rowCount, 0, "se borra también su USUARIO");
  assert.equal((await llamar(`/api/admin/agentes/${cuerpo.nit}`, { metodo: "DELETE", token: tokenAdmin })).estado, 404);
});

// ---------------------------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------------------------

test("GET clientes: la forma de CLIENTES_DEMO con cuenta, compras por mes y reservas", async () => {
  const { json } = await llamar("/api/admin/clientes", con(tokenAdmin));
  const c = json.clientes.find((x) => x.documento === "1000000002");
  assert.equal(c.tipoDoc, "CC");
  assert.equal(c.nombre, "Camilo Rojas Prueba");
  assert.equal(c.nombres, "Camilo");
  assert.equal(c.apellidos, "Rojas Prueba");
  assert.equal(c.alias, "camilo_r");
  assert.equal(c.nacimiento, "1995-03-12");
  assert.equal(c.puntos, 120);
  assert.equal(c.publicidad, true);
  assert.equal(c.cuenta, "Activa");
  assert.equal(c.ciudad, "Cali");
  assert.equal(c.compras.length, 6);
  assert.ok(c.compras[5] >= 5, "2 + 3 entradas de este mes; la cancelada no cuenta");
  const [idEvento, entradas, estado, fecha] = c.reservas.find((r) => r[0] === "EVT-2026-0003");
  assert.deepEqual([idEvento, entradas, estado], ["EVT-2026-0003", 3, "Reservada"]);
  assert.match(fecha, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(json.clientes.find((x) => x.documento === "1000000004").cuenta, "Bloqueada");
});

test("POST cliente: se registra con teléfono y alias; duplicados 409; datos inválidos 400", async () => {
  const cuerpo = registrar(clienteBase(11));
  const { estado, json } = await llamar("/api/admin/clientes", { metodo: "POST", token: tokenAdmin, cuerpo });
  assert.equal(estado, 201, JSON.stringify(json));
  assert.equal(json.cliente.cuenta, "Activa");
  assert.equal(json.cliente.alias, cuerpo.alias);
  assert.equal(json.cliente.ciudad, "Tuluá");
  assert.equal((await entrarNuevo(cuerpo.correo)).json.usuario.tipo_usuario, "CLIENTE");

  assert.equal((await llamar("/api/admin/clientes", { metodo: "POST", token: tokenAdmin, cuerpo: clienteBase(12, { alias: cuerpo.alias }) })).json.detalles.alias.length > 0, true);
  assert.equal((await llamar("/api/admin/clientes", { metodo: "POST", token: tokenAdmin, cuerpo: clienteBase(12, { documento: cuerpo.documento }) })).estado, 409);
  const mal = await llamar("/api/admin/clientes", { metodo: "POST", token: tokenAdmin, cuerpo: clienteBase(12, { nacimiento: "2999-01-01", telefono: "123", puntos: -4 }) });
  assert.equal(mal.estado, 400);
  for (const campo of ["nacimiento", "telefono", "puntos"]) assert.ok(mal.json.detalles[campo], campo);
});

test("PUT cliente: cambia sus datos (el documento no cambia); PATCH estado Bloqueada le quita el acceso al instante", async () => {
  const cuerpo = registrar(clienteBase(13));
  await llamar("/api/admin/clientes", { metodo: "POST", token: tokenAdmin, cuerpo });
  const sesion = await entrarNuevo(cuerpo.correo);

  const put = await llamar(`/api/admin/clientes/${cuerpo.documento}`, {
    metodo: "PUT", token: tokenAdmin, cuerpo: { ...cuerpo, documento: "1", alias: "otro_alias_" + sufijo, puntos: 500, publicidad: false, telefono: "" },
  });
  assert.equal(put.estado, 200, JSON.stringify(put.json));
  assert.equal(put.json.cliente.documento, cuerpo.documento);
  assert.equal(put.json.cliente.puntos, 500);
  assert.equal(put.json.cliente.publicidad, false);
  assert.equal(put.json.cliente.telefono, "");

  const bloq = await llamar(`/api/admin/clientes/${cuerpo.documento}/estado`, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Bloqueada" } });
  assert.equal(bloq.estado, 200);
  assert.equal(bloq.json.cliente.cuenta, "Bloqueada");
  assert.equal((await pool.query("SELECT estado_usuario FROM USUARIO WHERE numero_identificacion = $1", [cuerpo.documento])).rows[0].estado_usuario, "Bloqueado");

  const login = await entrarNuevo(cuerpo.correo);
  assert.equal(login.estado, 403);
  assert.match(login.json.error, /bloqueada/);
  assert.equal((await llamar("/api/auth/me", con(sesion.json.token))).estado, 403);

  await llamar(`/api/admin/clientes/${cuerpo.documento}/estado`, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Activa" } });
  assert.equal((await entrarNuevo(cuerpo.correo)).estado, 200);
  assert.equal((await llamar(`/api/admin/clientes/${cuerpo.documento}/estado`, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Suspendido" } })).estado, 400);
});

test("un cliente bloqueado del seed no puede entrar", async () => {
  const login = await llamar("/api/auth/login", { metodo: "POST", cuerpo: { correo: "cliente3@eldesparche.test", contrasena: t.CLAVE } });
  assert.equal(login.estado, 403);
  // Con una contraseña equivocada no se revela el estado de la cuenta
  const mala = await llamar("/api/auth/login", { metodo: "POST", cuerpo: { correo: "cliente3@eldesparche.test", contrasena: "otra-clave-xx" } });
  assert.equal(mala.estado, 401);
});

test("DELETE cliente: 409 si alguna reserva tiene un pago; si no, se elimina con sus reservas", async () => {
  const conPago = await llamar("/api/admin/clientes/1000000002", { metodo: "DELETE", token: tokenAdmin });
  assert.equal(conPago.estado, 409);
  assert.match(conPago.json.error, /pagos/);
  assert.equal((await pool.query("SELECT 1 FROM CLIENTE WHERE numero_identificacion = '1000000002'")).rowCount, 1);

  const cuerpo = registrar(clienteBase(14));
  await llamar("/api/admin/clientes", { metodo: "POST", token: tokenAdmin, cuerpo });
  const ev = await t.crearEventoAdmin(); // un evento propio: no se tocan los cupos de los del seed
  await pool.query("INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento) VALUES (1, $1, $2)", [cuerpo.documento, ev.id]);
  assert.equal((await llamar(`/api/admin/clientes/${cuerpo.documento}`, { metodo: "DELETE", token: tokenAdmin })).estado, 204);
  assert.equal((await pool.query("SELECT 1 FROM RESERVA WHERE numero_identificacion = $1", [cuerpo.documento])).rowCount, 0, "sus reservas se borran en cascada");
  assert.equal((await llamar(`/api/admin/clientes/${cuerpo.documento}`, { metodo: "DELETE", token: tokenAdmin })).estado, 404);
});

// ---------------------------------------------------------------------------------------------
// Administradores
// ---------------------------------------------------------------------------------------------

test("GET administradores: la forma de ADMINISTRADORES_DEMO", async () => {
  const { json } = await llamar("/api/admin/administradores", con(tokenAdmin));
  const a = json.administradores.find((x) => x.documento === "1000000001");
  assert.equal(a.nombre, "Ana María Administradora Prueba");
  assert.equal(a.salario, 4500000);
  assert.equal(a.horario, "Completa");
  assert.equal(a.ciudad, "Bogotá D.C.");
  assert.equal(a.telefono, "3001112233");
});

test("POST administrador, PUT y DELETE; no se borra la cuenta propia", async () => {
  const cuerpo = registrar(adminBase(21));
  const post = await llamar("/api/admin/administradores", { metodo: "POST", token: tokenAdmin, cuerpo });
  assert.equal(post.estado, 201, JSON.stringify(post.json));
  assert.equal(post.json.administrador.horario, "Mañana");
  const login = await entrarNuevo(cuerpo.correo);
  assert.equal(login.json.usuario.tipo_usuario, "ADMIN");

  const put = await llamar(`/api/admin/administradores/${cuerpo.documento}`, {
    metodo: "PUT", token: tokenAdmin, cuerpo: { ...cuerpo, salario: 4000000, horario: "Noche", telefono: "3001239988" },
  });
  assert.equal(put.estado, 200);
  assert.equal(put.json.administrador.salario, 4000000);
  assert.equal(put.json.administrador.horario, "Noche");
  assert.equal(put.json.administrador.telefono, "3001239988");

  assert.equal((await llamar("/api/admin/administradores", { metodo: "POST", token: tokenAdmin, cuerpo: adminBase(22, { horario: "Madrugada", salario: -1 }) })).estado, 400);

  // El nuevo administrador intenta borrarse a sí mismo: 409
  const propio = await llamar(`/api/admin/administradores/${cuerpo.documento}`, { metodo: "DELETE", token: login.json.token });
  assert.equal(propio.estado, 409);
  assert.match(propio.json.error, /propia cuenta/);

  // El administrador del seed sí puede borrar al nuevo
  assert.equal((await llamar(`/api/admin/administradores/${cuerpo.documento}`, { metodo: "DELETE", token: tokenAdmin })).estado, 204);
  assert.equal((await llamar(`/api/admin/administradores/${cuerpo.documento}`, { metodo: "DELETE", token: tokenAdmin })).estado, 404);
});
