// Pruebas de integración del panel del agente (/api/agente): sus eventos y solicitudes, las reservas de SUS eventos,
// la validación de entradas y el perfil de su empresa. Incluye el flujo completo de revisión con el administrador.
// Necesitan la base con database/schema_ElDesparche.sql + database/seed.sql cargados y el .env.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const t = require("./ayudas");
const { llamar, pool, eventoBase, crearEventoAdmin } = t;

let tokenAdmin;
let tokenAgente1; // Pacífico Producciones (900111222-1), Activo
let tokenAgente2; // Capital Eventos (900333444-5), Activo
let tokenAgente3; // Luna Llena Teatro (900555666-3), Pendiente
let tokenCliente;
const solicitudes = []; // códigos de solicitudes creadas por las pruebas

before(async () => {
  await t.iniciar();
  tokenAdmin = await t.entrar("admin@eldesparche.test");
  tokenAgente1 = await t.entrar("agente1@eldesparche.test");
  tokenAgente2 = await t.entrar("agente2@eldesparche.test");
  tokenAgente3 = await t.entrar("agente3@eldesparche.test");
  tokenCliente = await t.entrar("cliente2@eldesparche.test");
});

after(async () => {
  await t.limpiarEventos(solicitudes);
  await t.terminar();
});

const agente = (token, ruta, metodo = "GET", cuerpo) => llamar(`/api/agente${ruta}`, { metodo, token, cuerpo });
const admin = (ruta, metodo = "GET", cuerpo) => llamar(`/api/admin${ruta}`, { metodo, token: tokenAdmin, cuerpo });

// El agente envía una solicitud y la deja registrada para limpiarla al final
async function enviar(token, cambios) {
  const res = await agente(token, "/eventos", "POST", eventoBase(cambios));
  if (res.estado === 201) solicitudes.push(res.json.id);
  return res;
}

// ---------------------------------------------------------------------------------------------
// Acceso
// ---------------------------------------------------------------------------------------------

test("/api/agente: sin token 401; un cliente o un administrador 403", async () => {
  for (const ruta of ["/eventos", "/reservas"]) {
    assert.equal((await llamar(`/api/agente${ruta}`)).estado, 401, ruta);
    assert.equal((await agente(tokenCliente, ruta)).estado, 403, ruta);
    assert.equal((await agente(tokenAdmin, ruta)).estado, 403, ruta);
  }
  // Un token de un agente sin "Bearer" o mal formado
  assert.equal((await llamar("/api/agente/eventos", { token: "abc.def.ghi" })).estado, 401);
});

// ---------------------------------------------------------------------------------------------
// Eventos y solicitudes
// ---------------------------------------------------------------------------------------------

test("GET /api/agente/eventos: su empresa, sus eventos publicados y sus solicitudes (solo lo suyo)", async () => {
  const { estado, json } = await agente(tokenAgente1, "/eventos");
  assert.equal(estado, 200);
  assert.equal(json.agente.nit, "900111222-1");
  assert.equal(json.agente.nombre, "Pacífico Producciones");
  assert.equal(json.agente.estado, "Activo");
  assert.equal(json.agente.comision, 10);

  // (otras pruebas crean eventos de este agente a la vez, por eso se comprueba "incluye" y no una lista exacta)
  const ids = json.eventos.map((e) => e.id);
  assert.ok(ids.includes("EVT-2026-0001") && ids.includes("EVT-2026-0003"));
  assert.ok(!ids.includes("EVT-2026-0006"), "la solicitud en revisión no es un evento publicado");
  assert.ok(json.eventos.every((e) => e.nitAgente === "900111222-1"));
  assert.deepEqual(json.solicitudes.filter((s) => s.id.startsWith("EVT-2026-")).map((s) => s.id), ["EVT-2026-0006"]);
  assert.equal(json.solicitudes[0].estado, "En revisión");

  const otro = await agente(tokenAgente2, "/eventos");
  assert.ok(otro.json.eventos.every((e) => e.nitAgente === "900333444-5"), "el otro agente no ve los eventos de Pacífico");
  assert.deepEqual(otro.json.solicitudes.map((s) => s.id).filter((id) => id.startsWith("EVT-2026-")), ["EVT-2026-0007"]);
  assert.equal(otro.json.solicitudes[0].estado, "Rechazado");
  assert.equal(otro.json.solicitudes[0].motivo, "Falta el permiso de la alcaldía.");
  assert.equal(otro.json.solicitudes[0].observaciones, "Solo para mayores de edad.", "el motivo no se mezcla con las observaciones del agente");
});

test("POST /api/agente/eventos: envía una solicitud que queda En revisión, no se publica y la ve su agente", async () => {
  const { estado, json } = await enviar(tokenAgente1, { nombre: "Noche de Trova", observaciones: "Puertas a las 6 p. m." });
  assert.equal(estado, 201, JSON.stringify(json));
  assert.match(json.id, /^EVT-\d{4}-\d{4}$/);
  assert.equal(json.estado, "En revisión");
  assert.equal(json.nombre, "Noche de Trova");
  assert.equal(json.nit, "900111222-1", "el agente dueño sale del token, no del body");
  assert.equal(json.motivo, "");
  assert.equal(json.observaciones, "Puertas a las 6 p. m.");
  assert.equal(json.capacidad, 100);
  assert.equal(json.ciudad, "Cali");
  assert.equal(json.plan, "parchesote", "música de pago: el plan se deduce de la categoría y el precio");

  assert.equal((await llamar(`/api/eventos/${json.id}`)).estado, 404, "no es público hasta que se apruebe");
  const lista = (await agente(tokenAgente1, "/eventos")).json;
  assert.ok(lista.solicitudes.some((s) => s.id === json.id));
  assert.ok(!lista.eventos.some((e) => e.id === json.id));
  assert.ok(!(await agente(tokenAgente2, "/eventos")).json.solicitudes.some((s) => s.id === json.id), "otro agente no la ve");
  assert.ok((await admin("/eventos/solicitudes")).json.solicitudes.some((s) => s.id === json.id), "el administrador sí");
});

test("POST /api/agente/eventos: el body no puede cambiar el dueño ni el estado; datos inválidos 400; fecha pasada 400", async () => {
  const { json } = await enviar(tokenAgente1, { nit: "900333444-5", estado: "Programado", id: "HACK-1", numero_identificacion: "900333444" });
  assert.equal(json.nit, "900111222-1");
  assert.equal(json.estado, "En revisión");
  assert.match(json.id, /^EVT-/);

  const mal = await agente(tokenAgente1, "/eventos", "POST", eventoBase({ nombre: "", capacidad: 0, teatro: "", lat: "" }));
  assert.equal(mal.estado, 400);
  for (const campo of ["nombre", "capacidad", "teatro", "lat"]) assert.ok(mal.json.detalles[campo], campo);
  const pasado = await agente(tokenAgente1, "/eventos", "POST", eventoBase({ inicio: "2020-01-01T19:00", fin: "2020-01-01T22:00" }));
  assert.equal(pasado.estado, 400);
  assert.ok(pasado.json.detalles.inicio);
  assert.equal((await agente(tokenAgente1, "/eventos", "POST", eventoBase({ ciudad: "Ciudad Inventada" }))).estado, 400);
});

test("POST /api/agente/eventos: un agente Pendiente (no aprobado) todavía no puede enviar eventos", async () => {
  const res = await agente(tokenAgente3, "/eventos", "POST", eventoBase());
  assert.equal(res.estado, 403);
  assert.match(res.json.error, /no está aprobada/);
  assert.equal((await agente(tokenAgente3, "/eventos")).estado, 200, "pero sí ve su panel");
});

test("POST /api/agente/eventos: sube la imagen reducida como archivo y devuelve su URL", async () => {
  const { json } = await enviar(tokenAgente1, { imagen: t.PNG_1X1 });
  t.registrarImagen(json.imagen);
  assert.match(json.imagen, /\/uploads\/eventos\/evento-[0-9a-f]{10}\.png$/);
  const { rows } = await pool.query("SELECT url_imagen FROM EVENTO WHERE codigo = $1", [json.id]);
  assert.ok(rows[0].url_imagen.startsWith("/uploads/eventos/") && rows[0].url_imagen.length < 255);
  // Un body de más de 100 KB (una imagen) pasa en este panel, que admite hasta 3 MB
  const grande = "data:image/png;base64," + Buffer.concat([Buffer.from(t.PNG_1X1.split(",")[1], "base64"), Buffer.alloc(300 * 1024)]).toString("base64");
  const res = await agente(tokenAgente1, "/eventos", "POST", eventoBase({ imagen: grande }));
  if (res.estado === 201) { solicitudes.push(res.json.id); t.registrarImagen(res.json.imagen); }
  assert.equal(res.estado, 201, "un body de 400 KB no se rechaza por tamaño");
});

test("flujo completo: el agente envía, el administrador rechaza con motivo, el agente corrige y el administrador aprueba", async () => {
  // 1. El agente envía
  const { json: enviada } = await enviar(tokenAgente2, { nombre: "Recital de Flamenco", observaciones: "Apto para todo público" });
  const id = enviada.id;

  // 2. El administrador la rechaza con un motivo
  const rechazo = await admin(`/eventos/solicitudes/${id}`, "PATCH", { estado: "Rechazado", motivo: "Falta el permiso de la alcaldía" });
  assert.equal(rechazo.estado, 200);

  // 3. El agente la ve Rechazada con el motivo, y sus observaciones intactas
  let suya = (await agente(tokenAgente2, "/eventos")).json.solicitudes.find((s) => s.id === id);
  assert.equal(suya.estado, "Rechazado");
  assert.equal(suya.motivo, "Falta el permiso de la alcaldía");
  assert.equal(suya.observaciones, "Apto para todo público");
  assert.ok(!(await admin("/eventos/solicitudes")).json.solicitudes.some((s) => s.id === id), "ya no está por revisar");

  // 4. El agente la corrige: vuelve a En revisión y el motivo viejo desaparece
  const corregida = await agente(tokenAgente2, `/eventos/${id}`, "PUT", eventoBase({ nombre: "Recital de Flamenco (con permiso)", observaciones: "Apto para todo público" }));
  assert.equal(corregida.estado, 200, JSON.stringify(corregida.json));
  assert.equal(corregida.json.estado, "En revisión");
  assert.equal(corregida.json.motivo, "");
  assert.equal(corregida.json.nombre, "Recital de Flamenco (con permiso)");
  const { rows } = await pool.query("SELECT observaciones FROM EVENTO WHERE codigo = $1", [id]);
  assert.equal(rows[0].observaciones, "Apto para todo público", "el motivo del rechazo ya no está en la base");

  // 5. El administrador la aprueba: se publica
  const ok = await admin(`/eventos/solicitudes/${id}`, "PATCH", { estado: "Aprobado" });
  assert.equal(ok.estado, 200);
  assert.equal(ok.json.estado, "Aprobado");
  assert.equal(ok.json.idEvento, id);
  const publico = await llamar(`/api/eventos/${id}`);
  assert.equal(publico.estado, 200);
  assert.equal(publico.json.evento.estado, "Programado");
  assert.equal(publico.json.evento.titulo, "Recital de Flamenco (con permiso)");
  const lista = (await agente(tokenAgente2, "/eventos")).json;
  assert.ok(lista.eventos.some((e) => e.id === id), "ahora es uno de sus eventos publicados");
  assert.ok(!lista.solicitudes.some((s) => s.id === id));
});

test("PUT /api/agente/eventos/:id: corrige solo SUS solicitudes; un evento ya publicado no; 404 si es de otro agente", async () => {
  const { json } = await enviar(tokenAgente1, {});
  const id = json.id;
  assert.equal((await agente(tokenAgente2, `/eventos/${id}`, "PUT", eventoBase())).estado, 404, "es de otro agente");
  assert.equal((await agente(tokenAgente1, "/eventos/EVT-2026-0001", "PUT", eventoBase())).estado, 422, "ya está publicado");
  assert.equal((await agente(tokenAgente1, "/eventos/EVT-0000-0000", "PUT", eventoBase())).estado, 404);
  assert.equal((await agente(tokenAgente1, `/eventos/${id}`, "PUT", eventoBase({ capacidad: 0 }))).estado, 400);
  // Una corrección sin cambiar la ubicación conserva la misma ubicación (no crea otra)
  const ubicacion = async () => (await pool.query("SELECT id_ubicacion FROM EVENTO WHERE codigo = $1", [id])).rows[0].id_ubicacion;
  const antes = await ubicacion();
  await agente(tokenAgente1, `/eventos/${id}`, "PUT", eventoBase({ nombre: "Solo el nombre" }));
  assert.equal(await ubicacion(), antes);
});

test("DELETE /api/agente/eventos/:id: retira una solicitud suya; no una publicada ni de otro agente", async () => {
  const { json } = await enviar(tokenAgente1, {});
  const id = json.id;
  assert.equal((await agente(tokenAgente2, `/eventos/${id}`, "DELETE")).estado, 404, "es de otro agente");
  assert.equal((await agente(tokenAgente1, "/eventos/EVT-2026-0001", "DELETE")).estado, 422, "ya está publicado");
  assert.equal((await agente(tokenAgente1, `/eventos/${id}`, "DELETE")).estado, 204);
  assert.equal((await pool.query("SELECT 1 FROM EVENTO WHERE codigo = $1", [id])).rowCount, 0);
  assert.equal((await agente(tokenAgente1, `/eventos/${id}`, "DELETE")).estado, 404);
});

// ---------------------------------------------------------------------------------------------
// Reservas y entradas de SUS eventos
// ---------------------------------------------------------------------------------------------

test("GET /api/agente/reservas: solo las reservas de los eventos del agente", async () => {
  const { json } = await agente(tokenAgente1, "/reservas");
  assert.ok(json.reservas.length >= 2);
  assert.ok(json.reservas.every((r) => ["EVT-2026-0001", "EVT-2026-0003"].includes(r.eventoId) || r.eventoId.startsWith("EVT-20")), "todas son de eventos suyos");
  const codigos = json.reservas.map((r) => r.codigo);
  assert.ok(codigos.includes("DES-1001"));
  assert.ok(!codigos.includes("DES-1003"), "DES-1003 es de un evento de Capital Eventos");

  const otro = (await agente(tokenAgente2, "/reservas")).json;
  assert.ok(otro.reservas.some((r) => r.codigo === "DES-1003"));
  assert.ok(!otro.reservas.some((r) => r.codigo === "DES-1001"));
});

test("PATCH /api/agente/reservas/:codigo/estado: cancela una reserva de su evento; de otro organizador 403", async () => {
  const ev = await crearEventoAdmin({ precio: 0 }); // evento de Pacífico (agente 1)
  const { json } = await llamar("/api/reservas", { metodo: "POST", token: tokenCliente, cuerpo: { idEvento: ev.id, entradas: 1 } });
  const codigo = json.reserva.codigo;
  const nota = "Cancelada por el agente. Causa: Error en el evento o en la cantidad. Detalle: se duplicó";

  const ajena = await agente(tokenAgente2, `/reservas/${codigo}/estado`, "PATCH", { estado: "Cancelada", observaciones: nota });
  assert.equal(ajena.estado, 403);
  assert.equal((await agente(tokenAgente1, `/reservas/${codigo}/estado`, "PATCH", { estado: "Cancelada", observaciones: "sin causa" })).estado, 400);

  const ok = await agente(tokenAgente1, `/reservas/${codigo}/estado`, "PATCH", { estado: "Cancelada", observaciones: nota });
  assert.equal(ok.estado, 200);
  assert.equal(ok.json.reserva.estado, "Cancelada");
  assert.equal(ok.json.reserva.observaciones, nota);
  assert.equal((await agente(tokenAgente1, `/reservas/${codigo}/estado`, "PATCH", { estado: "Cancelada", observaciones: nota })).estado, 409);
  assert.equal((await agente(tokenAgente1, "/reservas/DES-9999/estado", "PATCH", { estado: "Cancelada", observaciones: nota })).estado, 404);
});

test("POST /api/agente/entradas/:codigo/ingreso: valida entradas de SUS eventos y rechaza las de otro organizador", async () => {
  const ev = await crearEventoAdmin({ precio: 0 });
  const { json } = await llamar("/api/reservas", { metodo: "POST", token: tokenCliente, cuerpo: { idEvento: ev.id, entradas: 2 } });
  const codigo = json.reserva.codigo;

  const ajena = await agente(tokenAgente2, `/entradas/${codigo}/ingreso`, "POST");
  assert.equal(ajena.estado, 403);
  assert.match(ajena.json.error, /otro organizador/);
  assert.equal((await pool.query("SELECT estado FROM RESERVA WHERE id_reserva = $1", [Number(codigo.slice(4)) - 1000])).rows[0].estado, "Confirmada", "la entrada no se gastó");

  const ok = await agente(tokenAgente1, `/entradas/${codigo}/ingreso`, "POST");
  assert.equal(ok.estado, 201, JSON.stringify(ok.json));
  assert.equal(ok.json.ingreso.revisadoPor, "Pacífico Producciones");
  assert.equal(ok.json.ingreso.entradas, 2);
  assert.equal((await agente(tokenAgente1, `/entradas/${codigo}/ingreso`, "POST")).estado, 409);
  assert.equal((await agente(tokenAgente1, "/entradas/DES-9999/ingreso", "POST")).estado, 404);
});

// ---------------------------------------------------------------------------------------------
// Perfil de la empresa
// ---------------------------------------------------------------------------------------------

test("PUT /api/agente/perfil: el agente edita el perfil de su empresa (no el NIT, la razón social ni la comisión)", async () => {
  // Se usa un agente creado para la prueba, así no se modifican las cuentas del seed
  const sufijo = String(Date.now()).slice(-6);
  const cuerpo = {
    nit: `8${sufijo}0`.padEnd(9, "0") + "-5", razon: "Perfil Eventos S.A.S.", nombre: "Perfil Eventos", experiencia: 2, comision: 6, estado: "Activo",
    tipoDoc: "CC", documento: `6${sufijo}1`, nombres: "Marta", apellidos: "Perfil Prueba", correo: `perfil${sufijo}@eldesparche.test`,
    telefono: "3001112233", direccion: "Calle 1 # 2-3", ciudad: "Cali", contrasena: "Clave-nueva-123",
  };
  assert.equal((await admin("/agentes", "POST", cuerpo)).estado, 201);
  try {
    const token = await t.entrar(cuerpo.correo, "Clave-nueva-123");

    const { estado, json } = await agente(token, "/perfil", "PUT", {
      nombre: "Perfil Eventos Renovado", descripcion: "Una empresa nueva", logo: t.PNG_1X1, correo: `nuevo${sufijo}@eldesparche.test`,
      telefono: "3109998877", ciudad: "Medellín", experiencia: 5, nit: "999999999-9", razon: "Hackeada", comision: 99,
    });
    assert.equal(estado, 200, JSON.stringify(json));
    t.registrarImagen(json.logo);
    assert.equal(json.nombre, "Perfil Eventos Renovado");
    assert.equal(json.descripcion, "Una empresa nueva");
    assert.match(json.logo, /\/uploads\/logos\/logo-[0-9a-f]{10}\.png$/);
    assert.equal(json.correo, `nuevo${sufijo}@eldesparche.test`);
    assert.equal(json.telefono, "3109998877");
    assert.equal(json.ciudad, "Medellín");
    assert.equal(json.experiencia, 5);

    const a = (await admin("/agentes")).json.agentes.find((x) => x.nit === cuerpo.nit);
    assert.equal(a.razon, "Perfil Eventos S.A.S.", "la razón social no cambia desde el perfil");
    assert.equal(a.comision, 6, "la comisión tampoco");
    assert.equal(a.nit, cuerpo.nit);

    // Sin logo en el cuerpo se conserva el que ya tenía
    const sinLogo = await agente(token, "/perfil", "PUT", { nombre: "Otro nombre", correo: `nuevo${sufijo}@eldesparche.test`, telefono: "", ciudad: "Cali", experiencia: 5 });
    assert.equal(sinLogo.estado, 200);
    assert.equal(sinLogo.json.logo, json.logo);
    assert.equal(sinLogo.json.telefono, "");

    assert.equal((await agente(token, "/perfil", "PUT", { nombre: "", correo: "mal", ciudad: "", experiencia: -1 })).estado, 400);
  } finally {
    await pool.query("DELETE FROM USUARIO WHERE numero_identificacion = $1", [cuerpo.documento]);
  }
});

// ---------------------------------------------------------------------------------------------
// Aprobar reservas y cambiar un evento ya publicado
// ---------------------------------------------------------------------------------------------

async function reservaPorAprobar(codigoEvento) {
  const { rows } = await pool.query(
    "INSERT INTO RESERVA (numero_entradas, estado, numero_identificacion, codigo_evento) VALUES (1, 'Reservada', '1000000003', $1) RETURNING id_reserva",
    [codigoEvento]);
  return `DES-${1000 + rows[0].id_reserva}`;
}

test("PATCH /api/agente/reservas/:codigo/confirmar: aprueba una reserva de SU evento; de otro organizador 403; ya confirmada 409", async () => {
  const ev = await crearEventoAdmin({ precio: 10000 });
  const codigo = await reservaPorAprobar(ev.id);

  assert.equal((await agente(tokenAgente2, `/reservas/${codigo}/confirmar`, "PATCH")).estado, 403, "es de un evento de otro agente");
  assert.equal((await agente(tokenCliente, `/reservas/${codigo}/confirmar`, "PATCH")).estado, 403, "un cliente no aprueba");
  const ok = await agente(tokenAgente1, `/reservas/${codigo}/confirmar`, "PATCH");
  assert.equal(ok.estado, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.reserva.estado, "Confirmada");
  assert.equal((await agente(tokenAgente1, `/reservas/${codigo}/confirmar`, "PATCH")).estado, 409, "ya está confirmada");
  assert.equal((await agente(tokenAgente1, "/reservas/DES-9999/confirmar", "PATCH")).estado, 404);
});

test("PUT /api/agente/eventos/:id/publicado: edita descripción y observaciones de SU evento publicado; no de otro ni uno cancelado", async () => {
  const ev = await crearEventoAdmin({ precio: 10000 });
  const cuerpo = { descripcion: "Una descripción nueva y bien larga para el evento publicado.", observaciones: "Llegar temprano" };

  assert.equal((await agente(tokenAgente2, `/eventos/${ev.id}/publicado`, "PUT", cuerpo)).estado, 404, "es de otro agente");
  assert.equal((await agente(tokenAgente1, `/eventos/${ev.id}/publicado`, "PUT", { ...cuerpo, descripcion: "corta" })).estado, 400);
  const ok = await agente(tokenAgente1, `/eventos/${ev.id}/publicado`, "PUT", cuerpo);
  assert.equal(ok.estado, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.evento.descripcion, cuerpo.descripcion);
  assert.equal(ok.json.evento.observaciones, "Llegar temprano");
  assert.equal(ok.json.evento.titulo, ev.titulo, "no cambia lo demás");

  const sol = (await enviar(tokenAgente1, {})).json.id;
  assert.equal((await agente(tokenAgente1, `/eventos/${sol}/publicado`, "PUT", cuerpo)).estado, 422, "una solicitud se corrige aparte");

  await agente(tokenAgente1, `/eventos/${ev.id}/cancelar`, "PATCH", { causa: "Fuerza mayor o clima" });
  assert.equal((await agente(tokenAgente1, `/eventos/${ev.id}/publicado`, "PUT", cuerpo)).estado, 422, "uno cancelado no se edita");
});

test("PATCH /api/agente/eventos/:id/cancelar: cancela SU evento con la causa y sus reservas; de otro agente 404; sin causa 400", async () => {
  const ev = await crearEventoAdmin({ precio: 10000 });
  const codigo = await reservaPorAprobar(ev.id);

  assert.equal((await agente(tokenAgente2, `/eventos/${ev.id}/cancelar`, "PATCH", { causa: "Fuerza mayor o clima" })).estado, 404, "es de otro agente");
  assert.equal((await agente(tokenAgente1, `/eventos/${ev.id}/cancelar`, "PATCH", {})).estado, 400, "sin causa");
  assert.equal((await agente(tokenAgente1, `/eventos/${ev.id}/cancelar`, "PATCH", { causa: "Otra causa" })).estado, 400, "Otra causa pide detalle");

  const ok = await agente(tokenAgente1, `/eventos/${ev.id}/cancelar`, "PATCH", { causa: "Otra causa", detalle: "el lugar se cerró" });
  assert.equal(ok.estado, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.evento.estado, "Cancelado");
  assert.match(ok.json.evento.observaciones, /Cancelado por el agente\. Causa: Otra causa/);
  const reserva = (await agente(tokenAgente1, "/reservas")).json.reservas.find((r) => r.codigo === codigo);
  assert.equal(reserva.estado, "Cancelada", "sus reservas se cancelan con él");
  assert.equal((await agente(tokenAgente1, `/eventos/${ev.id}/cancelar`, "PATCH", { causa: "Otra causa", detalle: "x" })).estado, 409, "ya está cancelado");
});
