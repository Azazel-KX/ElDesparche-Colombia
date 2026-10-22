// Pruebas de integración de las reservas: las del cliente (/api/reservas), las del administrador
// (/api/admin/reservas) y la validación de entradas (/api/admin/entradas/:codigo/ingreso).
// Necesitan la base con database/schema_ElDesparche.sql + database/seed.sql cargados y el .env.
// Cada prueba crea su propio evento para no tocar los cupos de los eventos del seed.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const t = require("./ayudas");
const { llamar, pool, crearEventoAdmin } = t;

let tokenAdmin;
let tokenAgente;
let tokenCliente1; // Camilo (CC 1000000002)
let tokenCliente2; // Laura (CC 1000000003)

before(async () => {
  await t.iniciar();
  tokenAdmin = await t.entrar("admin@eldesparche.test");
  tokenAgente = await t.entrar("agente1@eldesparche.test");
  tokenCliente1 = await t.entrar("cliente1@eldesparche.test");
  tokenCliente2 = await t.entrar("cliente2@eldesparche.test");
});

after(t.terminar);

const reservar = (token, idEvento, entradas = 1, extra = {}) =>
  llamar("/api/reservas", { metodo: "POST", token, cuerpo: { idEvento, entradas, ...extra } });

const admin = (ruta, metodo = "GET", cuerpo) => llamar(`/api/admin${ruta}`, { metodo, token: tokenAdmin, cuerpo });

// Cantidad de pesos de una reserva: entradas × precio + tarifa de Wompi (2,65 % + $700, más IVA)
const conTarifa = (subtotal) => subtotal + Math.round((subtotal * 0.0265 + 700) * 1.19);

// Inserta una reserva (y, si se pide, su pago) directo en la base para probar un estado concreto
async function reservaSql(codigoEvento, { doc = "1000000002", estado = "Confirmada", pago = null, entradas = 1 } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO RESERVA (numero_entradas, estado, numero_identificacion, codigo_evento)
     VALUES ($1, $2::estado_reserva_t, $3, $4) RETURNING id_reserva, valor_total::float8 AS valor`, [entradas, estado, doc, codigoEvento]);
  if (pago) {
    await pool.query(
      `INSERT INTO PAGO (monto, referencia_transaccion, estado, id_reserva, id_metodo)
       VALUES ($1, $2, $3::estado_pago_t, $4, 1)`, [Math.max(rows[0].valor, 1), `TX-T-${Date.now()}-${rows[0].id_reserva}`, pago, rows[0].id_reserva]);
  }
  return `DES-${1000 + rows[0].id_reserva}`;
}

// ---------------------------------------------------------------------------------------------
// Cliente: reservar
// ---------------------------------------------------------------------------------------------

test("POST /api/reservas: un cliente reserva en un evento de pago; queda Reservada con valor = entradas × precio + tarifa", async () => {
  const ev = await crearEventoAdmin({ precio: 50000 });
  const { estado, json } = await reservar(tokenCliente2, ev.id, 2, { observaciones: "Cerca del escenario" });
  assert.equal(estado, 201, JSON.stringify(json));
  const r = json.reserva;
  assert.match(r.codigo, /^DES-\d{4,}$/);
  assert.equal(r.estado, "Reservada");
  assert.equal(r.usada, false);
  assert.equal(r.entradas, 2);
  assert.equal(r.precio, 50000);
  assert.equal(r.valor, conTarifa(100000), "el trigger de la base suma la tarifa de Wompi");
  assert.equal(r.cliente, "Laura Gómez Prueba");
  assert.equal(r.documento, "CC 1000000003");
  assert.equal(r.eventoId, ev.id);
  assert.equal(r.observaciones, "Cerca del escenario");
  assert.equal(r.pago, null);
  assert.match(r.fecha, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  assert.equal((await llamar(`/api/eventos/${ev.id}`)).json.evento.disponibles, 98, "los cupos bajan");
});

test("POST /api/reservas: en un evento gratis queda Confirmada con valor 0 y sin pago", async () => {
  const ev = await crearEventoAdmin({ precio: 0 });
  const { json } = await reservar(tokenCliente1, ev.id, 3);
  assert.equal(json.reserva.estado, "Confirmada");
  assert.equal(json.reserva.valor, 0);
  assert.equal(json.reserva.pago, null);
});

test("POST /api/reservas: la base rechaza la edad mínima y el cupo; el servidor rechaza eventos que no se pueden reservar", async () => {
  const mayores = await crearEventoAdmin({ edad: 30 });
  const edad = await reservar(tokenCliente2, mayores.id);
  assert.equal(edad.estado, 422);
  assert.match(edad.json.error, /edad mínima/);

  const pequeno = await crearEventoAdmin({ capacidad: 2 });
  assert.equal((await reservar(tokenCliente1, pequeno.id, 2)).estado, 201);
  const lleno = await reservar(tokenCliente2, pequeno.id, 1);
  assert.equal(lleno.estado, 422);
  assert.match(lleno.json.error, /no tiene cupo/);

  const cancelado = await reservar(tokenCliente1, "EVT-2026-0005");
  assert.equal(cancelado.estado, 409);
  assert.match(cancelado.json.error, /Cancelado/);
  assert.equal((await reservar(tokenCliente1, "EVT-2026-0006")).estado, 409, "una solicitud en revisión no se reserva");
  assert.equal((await reservar(tokenCliente1, "EVT-0000-0000")).estado, 400);
});

test("POST /api/reservas: datos inválidos 400; solo un cliente reserva; sin sesión 401; un cliente bloqueado no entra", async () => {
  const ev = await crearEventoAdmin();
  for (const entradas of [0, 11, -1, 1.5, "mucho", null]) {
    assert.equal((await reservar(tokenCliente1, ev.id, entradas)).estado, 400, JSON.stringify(entradas));
  }
  assert.equal((await reservar(tokenCliente1, "")).estado, 400);

  assert.equal((await reservar(tokenAgente, ev.id)).estado, 403);
  assert.equal((await reservar(tokenAdmin, ev.id)).estado, 403);
  assert.equal((await reservar(null, ev.id)).estado, 401);
  assert.equal((await llamar("/api/auth/login", { metodo: "POST", cuerpo: { correo: "cliente3@eldesparche.test", contrasena: t.CLAVE } })).estado, 403);
});

test("GET /api/reservas/mias: cada cliente ve solo las suyas", async () => {
  const ev = await crearEventoAdmin();
  const { json: creada } = await reservar(tokenCliente2, ev.id);

  const suyas = await llamar("/api/reservas/mias", { token: tokenCliente2 });
  assert.equal(suyas.estado, 200);
  assert.ok(suyas.json.reservas.some((r) => r.codigo === creada.reserva.codigo));
  assert.ok(suyas.json.reservas.every((r) => r.documento === "CC 1000000003"));
  const ajenas = await llamar("/api/reservas/mias", { token: tokenCliente1 });
  assert.ok(!ajenas.json.reservas.some((r) => r.codigo === creada.reserva.codigo));
  assert.equal((await llamar("/api/reservas/mias")).estado, 401);
  assert.equal((await llamar("/api/reservas/mias", { token: tokenAgente })).estado, 403);
});

// ---------------------------------------------------------------------------------------------
// Cliente: cancelar
// ---------------------------------------------------------------------------------------------

test("PATCH /api/reservas/:codigo/cancelar: el cliente cancela la suya y la causa se agrega a las observaciones", async () => {
  const ev = await crearEventoAdmin();
  const { json } = await reservar(tokenCliente2, ev.id, 2, { observaciones: "Asientos preferidos" });
  const codigo = json.reserva.codigo;
  const url = `/api/reservas/${codigo}/cancelar`;

  assert.equal((await llamar(url, { metodo: "PATCH", token: tokenCliente2, cuerpo: {} })).estado, 400, "sin causa");
  assert.equal((await llamar(url, { metodo: "PATCH", token: tokenCliente2, cuerpo: { causa: "Porque sí" } })).estado, 400);
  assert.equal((await llamar(url, { metodo: "PATCH", token: tokenCliente2, cuerpo: { causa: "Otra causa" } })).estado, 400, "Otra causa pide detalle");
  assert.equal((await llamar(url, { metodo: "PATCH", token: tokenCliente2, cuerpo: { causa: "Pago no realizado a tiempo" } })).estado, 400, "esa causa la pone el agente o el administrador");

  const ok = await llamar(url, { metodo: "PATCH", token: tokenCliente2, cuerpo: { causa: "No puede asistir", detalle: "me enfermé" } });
  assert.equal(ok.estado, 200);
  assert.equal(ok.json.reserva.estado, "Cancelada");
  assert.equal(ok.json.reserva.observaciones, "Asientos preferidos\nCancelada por el cliente. Causa: No puede asistir. Detalle: me enfermé");
  assert.equal((await llamar(`/api/eventos/${ev.id}`)).json.evento.disponibles, 100, "el cupo se libera");
  assert.equal((await llamar(url, { metodo: "PATCH", token: tokenCliente2, cuerpo: { causa: "No puede asistir" } })).estado, 409, "ya cancelada");
});

test("PATCH /api/reservas/:codigo/cancelar: una reserva ajena responde 404 y no se toca", async () => {
  const ev = await crearEventoAdmin();
  const { json } = await reservar(tokenCliente2, ev.id);
  const ajena = await llamar(`/api/reservas/${json.reserva.codigo}/cancelar`, { metodo: "PATCH", token: tokenCliente1, cuerpo: { causa: "No puede asistir" } });
  assert.equal(ajena.estado, 404);
  const { rows } = await pool.query("SELECT estado FROM RESERVA WHERE id_reserva = $1", [Number(json.reserva.codigo.slice(4)) - 1000]);
  assert.equal(rows[0].estado, "Reservada");
  assert.equal((await llamar("/api/reservas/DES-9999/cancelar", { metodo: "PATCH", token: tokenCliente1, cuerpo: { causa: "No puede asistir" } })).estado, 404);
});

// ---------------------------------------------------------------------------------------------
// Administrador: lista y forma
// ---------------------------------------------------------------------------------------------

test("/api/admin/reservas: sin token 401; cliente o agente 403", async () => {
  assert.equal((await llamar("/api/admin/reservas")).estado, 401);
  assert.equal((await llamar("/api/admin/reservas", { token: tokenCliente1 })).estado, 403);
  assert.equal((await llamar("/api/admin/reservas", { token: tokenAgente })).estado, 403);
});

test("GET /api/admin/reservas: la forma de reservasLocales() con el pago estilo Wompi", async () => {
  const { estado, json } = await admin("/reservas");
  assert.equal(estado, 200);

  const r1 = json.reservas.find((r) => r.codigo === "DES-1001");
  assert.equal(r1.estado, "Confirmada");
  assert.equal(r1.cliente, "Camilo Rojas Prueba");
  assert.equal(r1.documento, "CC 1000000002");
  assert.equal(r1.correo, "cliente1@eldesparche.test");
  assert.equal(r1.eventoId, "EVT-2026-0001");
  assert.equal(r1.evento, "Concierto Música Colombiana");
  assert.equal(r1.entradas, 2);
  assert.equal(r1.precio, 50000);
  assert.equal(r1.valor, 103987);
  assert.deepEqual(r1.pago, { id: "TX-2026-000001", metodo: "CARD", estado: "APPROVED", montoCentavos: 10398700, moneda: "COP" });

  assert.equal(json.reservas.find((r) => r.codigo === "DES-1002").pago, null, "una reserva sin pago");
  assert.equal(json.reservas.find((r) => r.codigo === "DES-1003").pago.metodo, "NEQUI");
  const cancelada = json.reservas.find((r) => r.codigo === "DES-1004");
  assert.equal(cancelada.estado, "Cancelada");
  assert.equal(cancelada.observaciones, "Cancelada por el cliente. Causa: No puede asistir.");
});

// ---------------------------------------------------------------------------------------------
// Administrador: registrar, modificar, cancelar y eliminar
// ---------------------------------------------------------------------------------------------

test("POST /api/admin/reservas: registra una reserva (venta en taquilla) e ignora el valor y el código que mande el formulario", async () => {
  const ev = await crearEventoAdmin({ precio: 40000 });
  const { estado, json } = await admin("/reservas", "POST", {
    documento: "CC 1000000003", eventoId: ev.id, entradas: 2, estado: "Confirmada", observaciones: "Pagó en taquilla",
    valor: 1, codigo: "DES-1", fecha: "2000-01-01T00:00:00", cliente: "Otro Nombre", precio: 1,
  });
  assert.equal(estado, 201, JSON.stringify(json));
  assert.notEqual(json.reserva.codigo, "DES-1");
  assert.equal(json.reserva.valor, conTarifa(80000));
  assert.equal(json.reserva.estado, "Confirmada");
  assert.equal(json.reserva.cliente, "Laura Gómez Prueba");
  assert.notEqual(json.reserva.fecha, "2000-01-01T00:00:00");
  assert.equal(json.reserva.observaciones, "Pagó en taquilla");
});

test("POST /api/admin/reservas: cliente inexistente o bloqueado, evento inexistente o cancelado, datos inválidos", async () => {
  const ev = await crearEventoAdmin();
  const base = { documento: "CC 1000000003", eventoId: ev.id, entradas: 1, estado: "Reservada" };
  assert.ok((await admin("/reservas", "POST", { ...base, documento: "CC 999" })).json.detalles.cliente);
  const bloqueado = await admin("/reservas", "POST", { ...base, documento: "CC 1000000004" });
  assert.equal(bloqueado.estado, 409);
  assert.ok(bloqueado.json.detalles.cliente);
  assert.ok((await admin("/reservas", "POST", { ...base, eventoId: "EVT-0000-0000" })).json.detalles.evento);
  assert.equal((await admin("/reservas", "POST", { ...base, eventoId: "EVT-2026-0005" })).estado, 409);
  assert.equal((await admin("/reservas", "POST", { ...base, entradas: 50 })).estado, 400);
  assert.equal((await admin("/reservas", "POST", { ...base, estado: "Cancelada" })).estado, 400);
  assert.equal((await admin("/reservas", "POST", {})).estado, 400);
});

test("PUT /api/admin/reservas/:codigo: cambia entradas y estado (el valor se recalcula) y las observaciones", async () => {
  const ev = await crearEventoAdmin({ precio: 20000 });
  const { json } = await reservar(tokenCliente2, ev.id, 2);
  const codigo = json.reserva.codigo;
  assert.equal(json.reserva.valor, conTarifa(40000));

  const ok = await admin(`/reservas/${codigo}`, "PUT", { entradas: 3, estado: "Confirmada", observaciones: "Corregida", valor: 1 });
  assert.equal(ok.estado, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.reserva.entradas, 3);
  assert.equal(ok.json.reserva.estado, "Confirmada");
  assert.equal(ok.json.reserva.valor, conTarifa(60000), "se conserva el precio con que se reservó");
  assert.equal(ok.json.reserva.observaciones, "Corregida");

  assert.equal((await admin(`/reservas/${codigo}`, "PUT", { entradas: 99 })).estado, 400);
  assert.equal((await admin(`/reservas/${codigo}`, "PUT", { estado: "Usada" })).estado, 400);
  assert.equal((await admin("/reservas/DES-9999", "PUT", { entradas: 1 })).estado, 404);
});

test("PUT /api/admin/reservas/:codigo: con un pago solo cambian las observaciones; una cancelada no se edita", async () => {
  const ev = await crearEventoAdmin({ precio: 10000 });
  const codigo = await reservaSql(ev.id, { estado: "Confirmada", pago: "Aprobado" });

  const cambio = await admin(`/reservas/${codigo}`, "PUT", { entradas: 2, estado: "Confirmada" });
  assert.equal(cambio.estado, 422);
  assert.match(cambio.json.error, /pago/);
  const obs = await admin(`/reservas/${codigo}`, "PUT", { observaciones: "Solo la nota" });
  assert.equal(obs.estado, 200);
  assert.equal(obs.json.reserva.observaciones, "Solo la nota");
  assert.equal(obs.json.reserva.pago.estado, "APPROVED");

  const nota = "Cancelada por el administrador. Causa: Otra causa. Detalle: prueba";
  await admin(`/reservas/${codigo}/estado`, "PATCH", { estado: "Cancelada", observaciones: nota });
  assert.equal((await admin(`/reservas/${codigo}`, "PUT", { observaciones: "x" })).estado, 422);
});

test("PATCH /api/admin/reservas/:codigo/estado: cancela con la causa que manda la web; sin causa 400; ya cancelada 409", async () => {
  const ev = await crearEventoAdmin();
  const { json } = await reservar(tokenCliente2, ev.id, 2, { observaciones: "Asientos preferidos" });
  const codigo = json.reserva.codigo;
  const url = `/reservas/${codigo}/estado`;

  assert.equal((await admin(url, "PATCH", { estado: "Cancelada", observaciones: "sin ninguna causa" })).estado, 400);
  assert.equal((await admin(url, "PATCH", { estado: "Confirmada", observaciones: "x" })).estado, 400, "desde aquí solo se cancela");
  assert.equal((await admin(url, "PATCH", { estado: "Cancelada" })).estado, 400);

  const nota = "Cancelada por el administrador. Causa: Otra causa. Detalle: el evento se canceló";
  const ok = await admin(url, "PATCH", { estado: "Cancelada", observaciones: `Asientos preferidos\n${nota}` });
  assert.equal(ok.estado, 200);
  assert.equal(ok.json.reserva.estado, "Cancelada");
  assert.equal(ok.json.reserva.observaciones, `Asientos preferidos\n${nota}`);
  assert.equal((await admin(url, "PATCH", { estado: "Cancelada", observaciones: nota })).estado, 409);
  assert.equal((await admin("/reservas/DES-9999/estado", "PATCH", { estado: "Cancelada", observaciones: nota })).estado, 404);
});

test("DELETE /api/admin/reservas/:codigo: elimina la reserva; 409 si tiene un pago; 404 si no existe", async () => {
  const ev = await crearEventoAdmin();
  const { json } = await reservar(tokenCliente2, ev.id);
  assert.equal((await admin(`/reservas/${json.reserva.codigo}`, "DELETE")).estado, 204);
  assert.equal((await admin(`/reservas/${json.reserva.codigo}`, "DELETE")).estado, 404);

  const conPago = await reservaSql(ev.id, { pago: "Aprobado" });
  const res = await admin(`/reservas/${conPago}`, "DELETE");
  assert.equal(res.estado, 409);
  assert.match(res.json.error, /pago/);
  assert.equal((await admin("/reservas")).json.reservas.some((r) => r.codigo === conPago), true, "la reserva sigue ahí");
});

// ---------------------------------------------------------------------------------------------
// Validación de entradas (ingreso)
// ---------------------------------------------------------------------------------------------

test("POST /api/admin/entradas/:codigo/ingreso: marca la entrada como usada (201) y no deja usarla dos veces", async () => {
  const ev = await crearEventoAdmin({ precio: 0 });
  const { json } = await reservar(tokenCliente2, ev.id, 2);
  const codigo = json.reserva.codigo;

  const ok = await admin(`/entradas/${codigo}/ingreso`, "POST");
  assert.equal(ok.estado, 201, JSON.stringify(ok.json));
  assert.equal(ok.json.ingreso.eventoId, ev.id);
  assert.equal(ok.json.ingreso.evento, ev.titulo);
  assert.equal(ok.json.ingreso.cliente, "Laura Gómez Prueba");
  assert.equal(ok.json.ingreso.entradas, 2);
  assert.equal(ok.json.ingreso.revisadoPor, "Ana María Administradora Prueba");
  assert.match(ok.json.ingreso.fecha, /^\d{4}-\d{2}-\d{2}T/);

  // La base guarda Usada; la web sigue viendo Confirmada y la marca como usada
  const { rows } = await pool.query("SELECT estado FROM RESERVA WHERE id_reserva = $1", [Number(codigo.slice(4)) - 1000]);
  assert.equal(rows[0].estado, "Usada");
  const vista = (await admin("/reservas")).json.reservas.find((r) => r.codigo === codigo);
  assert.equal(vista.estado, "Confirmada");
  assert.equal(vista.usada, true);

  const otra = await admin(`/entradas/${codigo}/ingreso`, "POST");
  assert.equal(otra.estado, 409);
  assert.match(otra.json.error, /ya se usó/);
  assert.equal((await admin(`/reservas/${codigo}/estado`, "PATCH", { estado: "Cancelada", observaciones: "Cancelada por el administrador. Causa: Otra causa. Detalle: x" })).estado, 409, "una entrada usada no se cancela");
});

test("ingreso: rechaza una reserva sin pagar, con el pago pendiente, cancelada o de un evento terminado; 404 si no existe", async () => {
  const ev = await crearEventoAdmin({ precio: 10000 });

  const sinPagar = await reservaSql(ev.id, { estado: "Reservada" });
  const a = await admin(`/entradas/${sinPagar}/ingreso`, "POST");
  assert.equal(a.estado, 409);
  assert.match(a.json.error, /pagada/);

  const pendiente = await reservaSql(ev.id, { estado: "Reservada", pago: "Pendiente" });
  assert.equal((await admin(`/entradas/${pendiente}/ingreso`, "POST")).estado, 409);
  const rechazado = await reservaSql(ev.id, { estado: "Confirmada", pago: "Rechazado" });
  assert.match((await admin(`/entradas/${rechazado}/ingreso`, "POST")).json.error, /pago/);

  const cancelada = await reservaSql(ev.id, { estado: "Cancelada" });
  assert.match((await admin(`/entradas/${cancelada}/ingreso`, "POST")).json.error, /cancelada/);

  const aprobada = await reservaSql(ev.id, { estado: "Confirmada", pago: "Aprobado" });
  await pool.query("UPDATE EVENTO SET estado = 'Finalizado' WHERE codigo = $1", [ev.id]);
  const terminado = await admin(`/entradas/${aprobada}/ingreso`, "POST");
  assert.equal(terminado.estado, 409);
  assert.match(terminado.json.error, /finalizado/);

  assert.equal((await admin("/entradas/DES-9999/ingreso", "POST")).estado, 404);
  assert.equal((await admin("/entradas/no-es-un-codigo/ingreso", "POST")).estado, 404);
  assert.equal((await llamar("/api/admin/entradas/DES-1001/ingreso", { metodo: "POST", token: tokenCliente1 })).estado, 403);
});

test("un evento que sigue Programado pero cuya fecha ya pasó: no se reserva ni se entra", async () => {
  const ev = await crearEventoAdmin({ precio: 0 });
  const { json } = await reservar(tokenCliente1, ev.id);
  // Nadie lo pasó a Finalizado: solo se movió su fecha al pasado
  await pool.query(
    `UPDATE EVENTO SET fecha_hora_inicio = NOW() - INTERVAL '3 hours', fecha_hora_fin = NOW() - INTERVAL '1 hour'
      WHERE codigo = $1`, [ev.id]);

  const cliente = await reservar(tokenCliente2, ev.id);
  assert.equal(cliente.estado, 409);
  assert.match(cliente.json.error, /ya terminó/);
  const taquilla = await admin("/reservas", "POST", { documento: "1000000003", eventoId: ev.id, entradas: 1 });
  assert.equal(taquilla.estado, 409, "tampoco en taquilla");

  const ingreso = await admin(`/entradas/${json.reserva.codigo}/ingreso`, "POST");
  assert.equal(ingreso.estado, 409);
  assert.match(ingreso.json.error, /ya terminó/);
});

test("ingreso: dos lectores del mismo QR a la vez, solo uno entra", async () => {
  const ev = await crearEventoAdmin({ precio: 0 });
  const { json } = await reservar(tokenCliente1, ev.id);
  const [a, b] = await Promise.all([
    admin(`/entradas/${json.reserva.codigo}/ingreso`, "POST"),
    admin(`/entradas/${json.reserva.codigo}/ingreso`, "POST"),
  ]);
  assert.deepEqual([a.estado, b.estado].sort(), [201, 409]);
});

test("cancelar un evento cancela sus reservas por el servidor y deja la causa en cada una", async () => {
  const ev = await crearEventoAdmin({ precio: 0 });
  const { json } = await reservar(tokenCliente2, ev.id);
  await admin(`/eventos/${ev.id}/estado`, "PATCH", { estado: "Cancelado", causa: "Baja venta de entradas" });
  const r = (await admin("/reservas")).json.reservas.find((x) => x.codigo === json.reserva.codigo);
  assert.equal(r.estado, "Cancelada");
  assert.equal(r.observaciones, "Cancelada por el administrador. Causa: Otra causa. Detalle: el evento se canceló");
});
