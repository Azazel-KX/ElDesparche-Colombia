// Pruebas de integración de /api/eventos.
// Necesitan la base de datos con database/schema_ElDesparche.sql + database/seed.sql cargados
// y el archivo backend/.env configurado. Ejecutar:  npm test
process.env.NODE_ENV = "test";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");
const { pool } = require("../src/config/db");

let servidor;
let base;
let tokenAgente1; // dueño de EVT-2026-0001 y EVT-2026-0003 en el seed
let tokenAgente2; // otro agente: NO es dueño de esos eventos
let tokenAdmin;
let tokenCliente;
const eventosCreados = []; // códigos creados por las pruebas, para limpiarlos al final

const CLAVE = "Desparche2026!"; // contraseña de las cuentas del seed

// Fechas siempre en el futuro, sin importar cuándo se ejecuten las pruebas
function enDias(dias, hora = 19) {
  const f = new Date(Date.now() + dias * 86400000);
  const p = (n) => String(n).padStart(2, "0");
  return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}T${p(hora)}:00`;
}

const eventoBase = (cambios = {}) => ({
  nombre: "Evento de prueba automática",
  descripcion: "Creado por eventos.test.js",
  categoria: "musica",
  teatro: "Teatro de Prueba",
  fecha_hora_inicio: enDias(60, 19),
  fecha_hora_fin: enDias(60, 22),
  capacidad_total: 100,
  precio: 25000,
  edad_minima: 0,
  ubicacion: { direccion: "Calle de Prueba # 1-2", latitud: 3.4516, longitud: -76.532, id_ciudad: 1 },
  ...cambios,
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

const entrar = async (correo) => {
  const { json } = await llamar("/api/auth/login", { metodo: "POST", cuerpo: { correo, contrasena: CLAVE } });
  return json.token;
};

// Crea un evento con el agente 1 y lo registra para limpiarlo al final
async function crearEvento(cambios, token = tokenAgente1) {
  const res = await llamar("/api/eventos", { metodo: "POST", cuerpo: eventoBase(cambios), token });
  if (res.estado === 201) eventosCreados.push(res.json.evento.codigo);
  return res;
}

before(async () => {
  servidor = app.listen(0);
  base = `http://127.0.0.1:${servidor.address().port}`;
  tokenAgente1 = await entrar("agente1@eldesparche.test");
  tokenAgente2 = await entrar("agente2@eldesparche.test");
  tokenAdmin = await entrar("admin@eldesparche.test");
  tokenCliente = await entrar("cliente1@eldesparche.test");
});

after(async () => {
  // Borrar los eventos creados y las ubicaciones que quedaron sin ningún evento (las del seed tienen eventos)
  if (eventosCreados.length) {
    await pool.query("DELETE FROM EVENTO WHERE codigo = ANY($1)", [eventosCreados]);
  }
  await pool.query(
    "DELETE FROM UBICACION WHERE direccion LIKE 'Calle de Prueba%' AND id_ubicacion NOT IN (SELECT id_ubicacion FROM EVENTO)"
  );
  await new Promise((r) => servidor.close(r));
  await pool.end();
});

// ---------------------------------------------------------------------------------------------
// Consulta pública
// ---------------------------------------------------------------------------------------------

test("GET /api/eventos: público, trae los eventos del seed con su forma completa", async () => {
  const { estado, json } = await llamar("/api/eventos");
  assert.equal(estado, 200);
  assert.ok(json.eventos.length >= 5);
  assert.equal(json.paginacion.pagina, 1);
  assert.equal(json.paginacion.limite, 20);

  const e = json.eventos.find((x) => x.codigo === "EVT-2026-0001");
  assert.equal(e.nombre, "Concierto Música Colombiana");
  assert.equal(e.teatro, "Teatro Municipal Enrique Buenaventura");
  assert.equal(e.precio, 50000, "el precio llega como número, no como texto");
  assert.equal(typeof e.ubicacion.latitud, "number");
  assert.equal(e.ubicacion.ciudad, "Cali");
  assert.equal(e.fecha_hora_inicio, "2026-11-15T19:00:00", "la hora no debe correrse por zona horaria");
  assert.equal(e.capacidad_total, 500);
  assert.equal(e.cupos_disponibles, 498, "500 de capacidad menos 2 entradas reservadas");
  assert.equal(e.agente.numero_identificacion, "900111222");
});

test("GET /api/eventos: filtra por categoría, estado y ciudad", async () => {
  const comedia = await llamar("/api/eventos?categoria=comedia");
  assert.ok(comedia.json.eventos.length >= 1);
  assert.ok(comedia.json.eventos.every((e) => e.categoria === "comedia"));

  const cancelados = await llamar("/api/eventos?estado=Cancelado");
  assert.ok(cancelados.json.eventos.every((e) => e.estado === "Cancelado"));
  assert.match(cancelados.json.eventos[0].observaciones, /^Cancelado por el agente\. Causa: Fuerza mayor o clima\./, "la causa va en observaciones");

  const { json: ciudades } = await llamar("/api/ciudades");
  const idCali = ciudades.ciudades.find((c) => c.nombre === "Cali").id_ciudad;
  const enCali = await llamar(`/api/eventos?ciudad=${idCali}`);
  assert.ok(enCali.json.eventos.length >= 2);
  assert.ok(enCali.json.eventos.every((e) => e.ubicacion.id_ciudad === idCali));
});

test("GET /api/eventos: paginación y filtros inválidos", async () => {
  const p1 = await llamar("/api/eventos?limite=2&pagina=1");
  const p2 = await llamar("/api/eventos?limite=2&pagina=2");
  assert.equal(p1.json.eventos.length, 2);
  assert.notEqual(p1.json.eventos[0].codigo, p2.json.eventos[0].codigo);
  assert.ok(p1.json.paginacion.total >= 5);
  assert.equal(p1.json.paginacion.paginas, Math.ceil(p1.json.paginacion.total / 2));

  assert.equal((await llamar("/api/eventos?limite=5000")).estado, 400);
  assert.equal((await llamar("/api/eventos?categoria=deportes")).estado, 400);
  assert.equal((await llamar("/api/eventos?ciudad=abc")).estado, 400);
});

test("GET /api/eventos?categoria=...: una inyección SQL en el filtro no hace daño", async () => {
  const { estado } = await llamar("/api/eventos?categoria=" + encodeURIComponent("musica'; DROP TABLE EVENTO;--"));
  assert.equal(estado, 400);
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM EVENTO");
  assert.ok(rows[0].n >= 5, "la tabla EVENTO sigue existiendo");
});

test("GET /api/eventos/:codigo: devuelve el evento, o 404 si no existe", async () => {
  const ok = await llamar("/api/eventos/EVT-2026-0003");
  assert.equal(ok.estado, 200);
  assert.equal(ok.json.evento.estado, "En Boletería");
  assert.equal(ok.json.evento.cupos_disponibles, 197);

  const no = await llamar("/api/eventos/EVT-0000-0000");
  assert.equal(no.estado, 404);
});

// ---------------------------------------------------------------------------------------------
// Crear
// ---------------------------------------------------------------------------------------------

test("POST /api/eventos: sin token 401, un cliente 403", async () => {
  assert.equal((await llamar("/api/eventos", { metodo: "POST", cuerpo: eventoBase() })).estado, 401);
  assert.equal((await llamar("/api/eventos", { metodo: "POST", cuerpo: eventoBase(), token: tokenCliente })).estado, 403);
  // Un administrador tampoco crea eventos: la tabla exige un agente dueño
  assert.equal((await llamar("/api/eventos", { metodo: "POST", cuerpo: eventoBase(), token: tokenAdmin })).estado, 403);
});

test("POST /api/eventos: un agente crea un evento con código generado y estado Programado", async () => {
  const { estado, json } = await crearEvento({ nombre: "Gran Noche de Salsa", categoria: "musica" });
  assert.equal(estado, 201);
  const e = json.evento;
  assert.match(e.codigo, /^EVT-\d{4}-\d{4}$/);
  assert.equal(e.estado, "Programado");
  assert.equal(e.nombre, "Gran Noche de Salsa");
  assert.equal(e.cupos_disponibles, 100);
  assert.equal(e.teatro, "Teatro de Prueba");
  assert.equal(e.agente.numero_identificacion, "900111222", "el dueño sale del token, no del body");
  assert.equal(e.ubicacion.ciudad, "Cali");
  assert.match(e.fecha_hora_inicio, /T19:00:00$/);
});

test("POST /api/eventos: el body no puede cambiar el dueño ni el estado", async () => {
  const { json } = await crearEvento({ numero_identificacion: "900333444", id_agente: "900333444", estado: "Finalizado", codigo: "HACK-1" });
  assert.equal(json.evento.agente.numero_identificacion, "900111222");
  assert.equal(json.evento.estado, "Programado");
  assert.match(json.evento.codigo, /^EVT-/);
});

test("POST /api/eventos: dos creaciones simultáneas obtienen códigos distintos", async () => {
  const [a, b, c] = await Promise.all([crearEvento(), crearEvento(), crearEvento()]);
  const codigos = [a, b, c].map((r) => r.json.evento.codigo);
  assert.deepEqual([a.estado, b.estado, c.estado], [201, 201, 201]);
  assert.equal(new Set(codigos).size, 3);
});

test("POST /api/eventos: datos inválidos → 400 con el detalle de cada campo", async () => {
  const { estado, json } = await crearEvento({ nombre: "", capacidad_total: 0, categoria: "x", teatro: "" });
  assert.equal(estado, 400);
  assert.ok(json.detalles.nombre);
  assert.ok(json.detalles.teatro);
  assert.ok(json.detalles.capacidad_total);
  assert.ok(json.detalles.categoria);
});

test("POST /api/eventos: si falla el INSERT del evento, no queda una ubicación huérfana", async () => {
  const marca = `Calle de Prueba huerfana ${Date.now()}`;
  // La ciudad 99999 no existe → la FK de UBICACION falla y todo se deshace
  const { estado } = await crearEvento({ ubicacion: { direccion: marca, latitud: 3.4, longitud: -76.5, id_ciudad: 99999 } });
  assert.equal(estado, 400);
  const { rowCount } = await pool.query("SELECT 1 FROM UBICACION WHERE direccion = $1", [marca]);
  assert.equal(rowCount, 0);
});

// ---------------------------------------------------------------------------------------------
// Editar
// ---------------------------------------------------------------------------------------------

test("PUT /api/eventos/:codigo: el dueño edita su evento", async () => {
  const { json: creado } = await crearEvento();
  const codigo = creado.evento.codigo;

  const { estado, json } = await llamar(`/api/eventos/${codigo}`, {
    metodo: "PUT",
    token: tokenAgente1,
    cuerpo: eventoBase({ nombre: "Nombre corregido", teatro: "Teatro Corregido", precio: 30000, capacidad_total: 150 }),
  });
  assert.equal(estado, 200);
  assert.equal(json.evento.nombre, "Nombre corregido");
  assert.equal(json.evento.teatro, "Teatro Corregido");
  assert.equal(json.evento.precio, 30000);
  assert.equal(json.evento.capacidad_total, 150);
  assert.equal(json.evento.codigo, codigo);
});

test("PUT /api/eventos/:codigo: puede cambiar la ubicación sin tocar la de otros eventos", async () => {
  const { json: creado } = await crearEvento();
  const codigo = creado.evento.codigo;
  const ubicacionVieja = creado.evento.ubicacion.id_ubicacion;

  const nueva = { direccion: "Calle de Prueba # 9-9", latitud: 4.5979, longitud: -74.0758, id_ciudad: 4 };
  const { json } = await llamar(`/api/eventos/${codigo}`, {
    metodo: "PUT", token: tokenAgente1, cuerpo: eventoBase({ ubicacion: nueva }),
  });
  assert.equal(json.evento.ubicacion.id_ciudad, 4, "ahora está en la ciudad 4 (Bogotá)");
  assert.notEqual(json.evento.ubicacion.id_ubicacion, ubicacionVieja);
  // La ubicación anterior sigue existiendo (podría estar compartida con otros eventos)
  const { rowCount } = await pool.query("SELECT 1 FROM UBICACION WHERE id_ubicacion = $1", [ubicacionVieja]);
  assert.equal(rowCount, 1);
});

test("PUT /api/eventos/:codigo: otro agente recibe 403 (no es suyo) y el evento queda intacto", async () => {
  // Evento propio de la prueba: si la comprobación de dueño fallara, no dañaríamos los datos del seed
  const { json: creado } = await crearEvento({ nombre: "Evento del agente 1" });
  const codigo = creado.evento.codigo;

  const { estado } = await llamar(`/api/eventos/${codigo}`, {
    metodo: "PUT", token: tokenAgente2, cuerpo: eventoBase({ nombre: "Secuestrado" }),
  });
  assert.equal(estado, 403);
  const { json } = await llamar(`/api/eventos/${codigo}`);
  assert.equal(json.evento.nombre, "Evento del agente 1");
});

test("PUT /api/eventos/:codigo: un cliente 403, sin token 401, inexistente 404", async () => {
  const cuerpo = eventoBase();
  assert.equal((await llamar("/api/eventos/EVT-0000-0000", { metodo: "PUT", cuerpo, token: tokenCliente })).estado, 403);
  assert.equal((await llamar("/api/eventos/EVT-0000-0000", { metodo: "PUT", cuerpo })).estado, 401);
  assert.equal((await llamar("/api/eventos/EVT-0000-0000", { metodo: "PUT", cuerpo, token: tokenAdmin })).estado, 404);
});

test("PUT /api/eventos/:codigo: no se puede bajar la capacidad por debajo de las entradas ya reservadas", async () => {
  const { json: creado } = await crearEvento({ capacidad_total: 50 });
  const codigo = creado.evento.codigo;
  // Reserva de 3 entradas del cliente del seed (al borrar el evento, la reserva se borra en cascada)
  await pool.query(
    "INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento) VALUES (3, '1000000002', $1)",
    [codigo]
  );

  const { estado, json } = await llamar(`/api/eventos/${codigo}`, {
    metodo: "PUT", token: tokenAgente1, cuerpo: eventoBase({ capacidad_total: 2 }),
  });
  assert.equal(estado, 422);
  assert.match(json.error, /3 entradas/);
  const { json: intacto } = await llamar(`/api/eventos/${codigo}`);
  assert.equal(intacto.evento.capacidad_total, 50);
  assert.equal(intacto.evento.cupos_disponibles, 47);

  // Con una capacidad que sí alcanza (3 o más) se permite
  const ok = await llamar(`/api/eventos/${codigo}`, { metodo: "PUT", token: tokenAgente1, cuerpo: eventoBase({ capacidad_total: 3 }) });
  assert.equal(ok.estado, 200);
  assert.equal(ok.json.evento.cupos_disponibles, 0);
});

test("PUT /api/eventos/:codigo: un evento cancelado ya no se puede editar", async () => {
  const { json: creado } = await crearEvento();
  const codigo = creado.evento.codigo;
  await llamar(`/api/eventos/${codigo}/estado`, { metodo: "PATCH", token: tokenAgente1, cuerpo: { estado: "Cancelado", causa: "Fuerza mayor o clima" } });

  const { estado, json } = await llamar(`/api/eventos/${codigo}`, { metodo: "PUT", token: tokenAdmin, cuerpo: eventoBase({ nombre: "Reabierto" }) });
  assert.equal(estado, 422);
  assert.match(json.error, /Cancelado/);
});

// ---------------------------------------------------------------------------------------------
// Cambiar de estado
// ---------------------------------------------------------------------------------------------

test("PATCH estado: recorre el ciclo completo Programado → En Boletería → En Vivo → Finalizado", async () => {
  const { json: creado } = await crearEvento();
  const url = `/api/eventos/${creado.evento.codigo}/estado`;

  for (const estadoNuevo of ["En Boletería", "En Vivo", "Finalizado"]) {
    const { estado, json } = await llamar(url, { metodo: "PATCH", token: tokenAgente1, cuerpo: { estado: estadoNuevo } });
    assert.equal(estado, 200);
    assert.equal(json.evento.estado, estadoNuevo);
  }
  // Finalizado es un estado final
  const fin = await llamar(url, { metodo: "PATCH", token: tokenAgente1, cuerpo: { estado: "En Vivo" } });
  assert.equal(fin.estado, 422);
});

test("PATCH estado: no se permiten saltos (Programado → En Vivo) ni volver atrás", async () => {
  const { json: creado } = await crearEvento();
  const url = `/api/eventos/${creado.evento.codigo}/estado`;

  const salto = await llamar(url, { metodo: "PATCH", token: tokenAgente1, cuerpo: { estado: "En Vivo" } });
  assert.equal(salto.estado, 422);

  await llamar(url, { metodo: "PATCH", token: tokenAgente1, cuerpo: { estado: "En Boletería" } });
  const atras = await llamar(url, { metodo: "PATCH", token: tokenAgente1, cuerpo: { estado: "Programado" } });
  assert.equal(atras.estado, 422);
});

test("PATCH estado: cancelar exige una causa y la guarda en observaciones", async () => {
  const { json: creado } = await crearEvento({ observaciones: "Observación original" });
  const url = `/api/eventos/${creado.evento.codigo}/estado`;

  const sinCausa = await llamar(url, { metodo: "PATCH", token: tokenAgente1, cuerpo: { estado: "Cancelado" } });
  assert.equal(sinCausa.estado, 400);
  assert.ok(sinCausa.json.detalles.causa);

  // Una causa en un estado que no es Cancelado se rechaza
  const causaSuelta = await llamar(url, { metodo: "PATCH", token: tokenAgente1, cuerpo: { estado: "En Boletería", causa: "Fuerza mayor" } });
  assert.equal(causaSuelta.estado, 400);

  const ok = await llamar(url, {
    metodo: "PATCH", token: tokenAgente1,
    cuerpo: { estado: "Cancelado", causa: "Fuerza mayor o clima", detalle: "tormenta eléctrica en la ciudad" },
  });
  assert.equal(ok.estado, 200);
  assert.equal(ok.json.evento.estado, "Cancelado");
  assert.equal(
    ok.json.evento.observaciones,
    "Cancelado por el agente. Causa: Fuerza mayor o clima. Detalle: tormenta eléctrica en la ciudad.",
    "mismo formato que escribe la web"
  );

  // Un evento cancelado no se reactiva
  const reactivar = await llamar(url, { metodo: "PATCH", token: tokenAgente1, cuerpo: { estado: "Programado" } });
  assert.equal(reactivar.estado, 422);
});

test("PATCH estado: otro agente 403; el administrador sí puede cancelar cualquier evento", async () => {
  const { json: creado } = await crearEvento();
  const url = `/api/eventos/${creado.evento.codigo}/estado`;

  const ajeno = await llamar(url, { metodo: "PATCH", token: tokenAgente2, cuerpo: { estado: "En Boletería" } });
  assert.equal(ajeno.estado, 403);

  const admin = await llamar(url, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Cancelado", causa: "Otra causa" } });
  assert.equal(admin.estado, 200);
  assert.equal(admin.json.evento.estado, "Cancelado");
  assert.equal(admin.json.evento.observaciones, "Cancelado por el administrador. Causa: Otra causa.");
});

test("PATCH estado: evento inexistente 404, cliente 403", async () => {
  assert.equal((await llamar("/api/eventos/EVT-0000-0000/estado", { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "En Boletería" } })).estado, 404);
  assert.equal((await llamar("/api/eventos/EVT-0000-0000/estado", { metodo: "PATCH", token: tokenCliente, cuerpo: { estado: "Cancelado", causa: "Otra causa" } })).estado, 403);
});
