// Pruebas de integración del catálogo público (/api/eventos) y de la administración de eventos y solicitudes
// (/api/admin/eventos...). Necesitan la base con database/schema_ElDesparche.sql + database/seed.sql cargados y el .env.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const t = require("./ayudas");
const { llamar, eventoBase, pool } = t;

let tokenAdmin;
let tokenAgente;
let tokenCliente;
const eventosCreados = []; // códigos creados por las pruebas, para limpiarlos al final
const imagenes = []; // imágenes subidas por las pruebas

before(async () => {
  await t.iniciar();
  tokenAdmin = await t.entrar("admin@eldesparche.test");
  tokenAgente = await t.entrar("agente1@eldesparche.test");
  tokenCliente = await t.entrar("cliente1@eldesparche.test");
});

after(async () => {
  await t.limpiarEventos(eventosCreados);
  imagenes.forEach(t.borrarImagen);
  await t.terminar();
});

// Crea un evento publicado con el administrador (agente dueño: Pacífico Producciones) y lo registra para limpiarlo
async function crearEvento(cambios) {
  const res = await llamar("/api/admin/eventos", {
    metodo: "POST", token: tokenAdmin, cuerpo: eventoBase({ nit: "900111222-1", ...cambios }),
  });
  if (res.estado === 201) eventosCreados.push(res.json.evento.id);
  return res;
}

// ---------------------------------------------------------------------------------------------
// Catálogo público
// ---------------------------------------------------------------------------------------------

test("GET /api/eventos: público, con la forma de EVENTOS de la web", async () => {
  const { estado, json } = await llamar("/api/eventos");
  assert.equal(estado, 200);
  assert.equal(json.paginacion.pagina, 1);
  assert.equal(json.paginacion.limite, 20);

  const e = json.eventos.find((x) => x.id === "EVT-2026-0001");
  assert.equal(e.titulo, "Concierto Música Colombiana");
  assert.equal(e.teatro, "Teatro Municipal Enrique Buenaventura");
  assert.equal(e.categoria, "musica");
  assert.equal(e.precio, 50000, "el precio llega como número, no como texto");
  assert.equal(typeof e.lat, "number");
  assert.equal(e.ciudad, "Cali");
  assert.equal(e.departamento, "Valle del Cauca");
  assert.equal(e.pais, "Colombia", "los filtros de la portada necesitan el país");
  assert.equal(e.direccion, "Carrera 5 #6-05, Centro");
  // Las fechas del seed son relativas al día en que se cargó: se comparan con lo que guarda la base
  const { rows } = await pool.query(
    `SELECT to_char(fecha_hora_inicio, 'YYYY-MM-DD"T"HH24:MI') AS inicio, EXTRACT(DAY FROM fecha_hora_inicio)::int AS d,
            EXTRACT(MONTH FROM fecha_hora_inicio)::int AS m, EXTRACT(YEAR FROM fecha_hora_inicio)::int AS a
       FROM EVENTO WHERE codigo = 'EVT-2026-0001'`);
  const { d, m, a } = rows[0];
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  assert.equal(e.inicio, rows[0].inicio);
  assert.match(e.inicio, /T19:00$/, "la hora no debe correrse por zona horaria");
  assert.equal(e.fechaCorta, `${d} ${MESES[m - 1].slice(0, 3)} ${a}`);
  assert.match(e.fechaInicio, new RegExp(`^${d} de ${MESES[m - 1]} de ${a} - 7:00\\s+p\\.\\s?m\\.`));
  assert.equal(e.capacidad, "500 personas");
  assert.equal(e.disponibles, 498, "500 de capacidad menos 2 entradas reservadas");
  assert.equal(e.edad, 0);
  assert.equal(e.estado, "Programado");
  assert.equal(e.imagen, "img/6554e.png", "una imagen de la propia web (img/...) se devuelve tal cual");
  assert.equal(e.agente, "Pacífico Producciones");
  assert.equal(e.nitAgente, "900111222-1");
  assert.equal(e.parche, "parchesote");
});

test("GET /api/eventos: nunca muestra las solicitudes (En revisión ni Rechazado)", async () => {
  const { json } = await llamar("/api/eventos?limite=100");
  const codigos = json.eventos.map((e) => e.id);
  assert.ok(!codigos.includes("EVT-2026-0006"), "En revisión");
  assert.ok(!codigos.includes("EVT-2026-0007"), "Rechazado");
  assert.ok(json.eventos.every((e) => !["En revisión", "Rechazado"].includes(e.estado)));
  assert.equal((await llamar("/api/eventos/EVT-2026-0006")).estado, 404);
  assert.equal((await llamar("/api/eventos/EVT-2026-0007")).estado, 404);
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
  assert.ok(enCali.json.eventos.every((e) => e.ciudad === "Cali"));
});

test("GET /api/eventos: paginación y filtros inválidos", async () => {
  const p1 = await llamar("/api/eventos?limite=2&pagina=1");
  const p2 = await llamar("/api/eventos?limite=2&pagina=2");
  assert.equal(p1.json.eventos.length, 2);
  assert.notEqual(p1.json.eventos[0].id, p2.json.eventos[0].id);
  assert.ok(p1.json.paginacion.total >= 5);
  assert.equal(p1.json.paginacion.paginas, Math.ceil(p1.json.paginacion.total / 2));

  assert.equal((await llamar("/api/eventos?limite=5000")).estado, 400);
  assert.equal((await llamar("/api/eventos?categoria=deportes")).estado, 400);
  assert.equal((await llamar("/api/eventos?ciudad=abc")).estado, 400);
  assert.equal((await llamar("/api/eventos?estado=En%20revisi%C3%B3n")).estado, 400);
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
  assert.equal(ok.json.evento.disponibles, 197);
  assert.equal((await llamar("/api/eventos/EVT-0000-0000")).estado, 404);
});

test("GET /api/eventos/:codigo: un evento sin imagen usa la imagen por defecto de la web", async () => {
  const evento = await t.crearEventoAdmin({ imagen: "" });
  const { json } = await llamar(`/api/eventos/${evento.id}`);
  assert.equal(json.evento.imagen, "img/evento-sin-foto.svg");
});

test("el catálogo ya no permite crear ni editar eventos: eso se hace desde los paneles", async () => {
  assert.equal((await llamar("/api/eventos", { metodo: "POST", token: tokenAgente, cuerpo: eventoBase() })).estado, 404);
});

// ---------------------------------------------------------------------------------------------
// Administración: acceso
// ---------------------------------------------------------------------------------------------

test("/api/admin/eventos: sin token 401; un cliente o un agente 403", async () => {
  assert.equal((await llamar("/api/admin/eventos")).estado, 401);
  assert.equal((await llamar("/api/admin/eventos", { token: tokenCliente })).estado, 403);
  assert.equal((await llamar("/api/admin/eventos", { token: tokenAgente })).estado, 403);
  assert.equal((await llamar("/api/admin/eventos/solicitudes", { token: tokenAgente })).estado, 403);
});

test("GET /api/admin/eventos: lista los publicados y deja fuera las solicitudes", async () => {
  const { estado, json } = await llamar("/api/admin/eventos", { token: tokenAdmin });
  assert.equal(estado, 200);
  assert.ok(json.eventos.length >= 5);
  assert.ok(json.eventos.every((e) => !["En revisión", "Rechazado"].includes(e.estado)));
  assert.equal(json.eventos.find((e) => e.id === "EVT-2026-0002").agente, "Capital Eventos");
});

// ---------------------------------------------------------------------------------------------
// Administración: crear, editar, eliminar
// ---------------------------------------------------------------------------------------------

test("POST /api/admin/eventos: crea el evento ya publicado (Programado) para el agente indicado", async () => {
  const { estado, json } = await crearEvento({ nombre: "Gran Noche de Salsa" });
  assert.equal(estado, 201);
  const e = json.evento;
  assert.match(e.id, /^EVT-\d{4}-\d{4}$/);
  assert.equal(e.estado, "Programado");
  assert.equal(e.titulo, "Gran Noche de Salsa");
  assert.equal(e.teatro, "Teatro de Prueba");
  assert.equal(e.disponibles, 100);
  assert.equal(e.nitAgente, "900111222-1");
  assert.equal(e.ciudad, "Cali");
  assert.match(e.inicio, /T19:00$/);
  assert.equal((await llamar(`/api/eventos/${e.id}`)).estado, 200, "aparece en el catálogo público");
});

test("POST /api/admin/eventos: el body no puede fijar el estado ni el código", async () => {
  const { json } = await crearEvento({ estado: "Finalizado", codigo: "HACK-1", id: "HACK-2" });
  assert.equal(json.evento.estado, "Programado");
  assert.match(json.evento.id, /^EVT-/);
});

test("POST /api/admin/eventos: dos creaciones simultáneas obtienen códigos distintos", async () => {
  const [a, b, c] = await Promise.all([crearEvento(), crearEvento(), crearEvento()]);
  assert.deepEqual([a.estado, b.estado, c.estado], [201, 201, 201]);
  assert.equal(new Set([a, b, c].map((r) => r.json.evento.id)).size, 3);
});

test("POST /api/admin/eventos: el código de un evento borrado no se vuelve a usar", async () => {
  const { json: a } = await crearEvento();
  assert.equal((await llamar(`/api/admin/eventos/${a.evento.id}`, { metodo: "DELETE", token: tokenAdmin })).estado, 204);
  const { json: b } = await crearEvento();
  assert.notEqual(b.evento.id, a.evento.id, "el nuevo evento no hereda el código del que se borró");
  const numero = (codigo) => Number(codigo.slice(-4));
  assert.ok(numero(b.evento.id) > numero(a.evento.id));
});

test("POST /api/admin/eventos: el primer código después del seed es el 0008", async () => {
  const { rows } = await pool.query("SELECT last_value::int AS n FROM evento_numero_seq");
  assert.ok(rows[0].n >= 7, "setval del seed: la secuencia arranca después del EVT-2026-0007");
});

test("POST /api/admin/eventos: datos inválidos → 400 con el detalle de cada campo", async () => {
  const { estado, json } = await crearEvento({ nombre: "", capacidad: 0, categoria: "x", teatro: "", lat: 40 });
  assert.equal(estado, 400);
  for (const campo of ["nombre", "capacidad", "categoria", "teatro", "lat"]) assert.ok(json.detalles[campo], campo);
});

test("POST /api/admin/eventos: un agente inexistente o una ciudad inexistente → 400 y no queda nada a medias", async () => {
  assert.ok((await crearEvento({ nit: "999999999-9" })).json.detalles.nit);

  const marca = `Calle de Prueba huerfana ${Date.now()}`;
  const res = await crearEvento({ ciudad: "Ciudad Inventada", direccion: marca });
  assert.equal(res.estado, 400);
  assert.ok(res.json.detalles.ciudad);
  const { rowCount } = await pool.query("SELECT 1 FROM UBICACION WHERE direccion = $1", [marca]);
  assert.equal(rowCount, 0, "no debe quedar una ubicación huérfana");
});

test("POST /api/admin/eventos: sube la imagen como archivo y la sirve desde /uploads", async () => {
  const { estado, json } = await crearEvento({ imagen: t.PNG_1X1 });
  assert.equal(estado, 201);
  imagenes.push(json.evento.imagen);
  assert.match(json.evento.imagen, /^http:\/\/localhost:\d+\/uploads\/eventos\/evento-[0-9a-f]{10}\.png$/);

  const ruta = new URL(json.evento.imagen).pathname;
  // El servidor de pruebas escucha en otro puerto que el de PUBLIC_URL: se pide la ruta relativa
  const archivo = await fetch(t.urlBase() + ruta);
  assert.equal(archivo.status, 200);
  assert.equal(archivo.headers.get("cross-origin-resource-policy"), "cross-origin");
  assert.equal(archivo.headers.get("content-type"), "image/png");
  const { rows } = await pool.query("SELECT url_imagen FROM EVENTO WHERE codigo = $1", [json.evento.id]);
  assert.match(rows[0].url_imagen, /^\/uploads\/eventos\//, "en la base solo va la ruta corta");
  assert.ok(rows[0].url_imagen.length < 255);
});

test("POST /api/admin/eventos: rechaza una imagen que no es una imagen", async () => {
  const falsa = "data:image/png;base64," + Buffer.from("esto no es un png").toString("base64");
  const res = await crearEvento({ imagen: falsa });
  assert.equal(res.estado, 400);
  assert.ok(res.json.detalles.imagen);
  assert.equal((await crearEvento({ imagen: "javascript:alert(1)" })).estado, 400);
});

test("PUT /api/admin/eventos/:id: edita los datos y puede cambiar la ubicación sin tocar la de otros eventos", async () => {
  const { json: creado } = await crearEvento();
  const id = creado.evento.id;
  const { rows: antes } = await pool.query("SELECT id_ubicacion FROM EVENTO WHERE codigo = $1", [id]);

  const { estado, json } = await llamar(`/api/admin/eventos/${id}`, {
    metodo: "PUT", token: tokenAdmin,
    cuerpo: eventoBase({ nombre: "Nombre corregido", teatro: "Teatro Corregido", precio: 30000, capacidad: 150, ciudad: "Bogotá D.C.", direccion: "Calle de Prueba # 9-9", lat: 4.5979, lon: -74.0758 }),
  });
  assert.equal(estado, 200);
  assert.equal(json.evento.titulo, "Nombre corregido");
  assert.equal(json.evento.teatro, "Teatro Corregido");
  assert.equal(json.evento.precio, 30000);
  assert.equal(json.evento.ciudad, "Bogotá D.C.");
  assert.equal(json.evento.id, id);
  const { rows: despues } = await pool.query("SELECT id_ubicacion FROM EVENTO WHERE codigo = $1", [id]);
  assert.notEqual(despues[0].id_ubicacion, antes[0].id_ubicacion);
  const { rowCount } = await pool.query("SELECT 1 FROM UBICACION WHERE id_ubicacion = $1", [antes[0].id_ubicacion]);
  assert.equal(rowCount, 1, "la ubicación anterior sigue existiendo (podría estar compartida)");
});

test("PUT /api/admin/eventos/:id: una edición sin cambiar la ubicación no crea ubicaciones nuevas", async () => {
  const { json: creado } = await crearEvento();
  const id = creado.evento.id;
  const ubicacion = async () => (await pool.query("SELECT id_ubicacion FROM EVENTO WHERE codigo = $1", [id])).rows[0].id_ubicacion;
  const antes = await ubicacion();
  await llamar(`/api/admin/eventos/${id}`, { metodo: "PUT", token: tokenAdmin, cuerpo: eventoBase({ nombre: "Solo cambia el nombre" }) });
  assert.equal(await ubicacion(), antes, "conserva la misma ubicación");
});

test("PUT /api/admin/eventos/:id: no baja la capacidad por debajo de las entradas reservadas; sin token 401; inexistente 404", async () => {
  const { json: creado } = await crearEvento({ capacidad: 50 });
  const id = creado.evento.id;
  await pool.query("INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento) VALUES (3, '1000000002', $1)", [id]);

  const bajo = await llamar(`/api/admin/eventos/${id}`, { metodo: "PUT", token: tokenAdmin, cuerpo: eventoBase({ capacidad: 2 }) });
  assert.equal(bajo.estado, 422);
  assert.match(bajo.json.error, /3 entradas/);
  const ok = await llamar(`/api/admin/eventos/${id}`, { metodo: "PUT", token: tokenAdmin, cuerpo: eventoBase({ capacidad: 3 }) });
  assert.equal(ok.estado, 200);
  assert.equal(ok.json.evento.disponibles, 0);

  assert.equal((await llamar(`/api/admin/eventos/${id}`, { metodo: "PUT", cuerpo: eventoBase() })).estado, 401);
  assert.equal((await llamar("/api/admin/eventos/EVT-0000-0000", { metodo: "PUT", token: tokenAdmin, cuerpo: eventoBase() })).estado, 404);
});

test("PUT /api/admin/eventos/:id: un evento que ya empezó se puede corregir, pero uno cancelado no", async () => {
  const { json: creado } = await crearEvento();
  const id = creado.evento.id;
  const pasado = await llamar(`/api/admin/eventos/${id}`, {
    metodo: "PUT", token: tokenAdmin, cuerpo: eventoBase({ inicio: "2020-01-01T19:00", fin: "2020-01-01T22:00" }),
  });
  assert.equal(pasado.estado, 200, "el administrador puede corregir fechas pasadas");

  await llamar(`/api/admin/eventos/${id}/estado`, {
    metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Cancelado", causa: "Baja venta de entradas" },
  });
  const cancelado = await llamar(`/api/admin/eventos/${id}`, { metodo: "PUT", token: tokenAdmin, cuerpo: eventoBase({ nombre: "Reabierto" }) });
  assert.equal(cancelado.estado, 422);
  assert.match(cancelado.json.error, /Cancelado/);
});

test("DELETE /api/admin/eventos/:id: elimina el evento y sus reservas; 404 si no existe", async () => {
  const { json: creado } = await crearEvento();
  const id = creado.evento.id;
  await pool.query("INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento) VALUES (1, '1000000002', $1)", [id]);
  assert.equal((await llamar(`/api/admin/eventos/${id}`, { metodo: "DELETE", token: tokenAdmin })).estado, 204);
  assert.equal((await llamar(`/api/eventos/${id}`)).estado, 404);
  const { rowCount } = await pool.query("SELECT 1 FROM RESERVA WHERE codigo_evento = $1", [id]);
  assert.equal(rowCount, 0, "las reservas se borran en cascada");
  assert.equal((await llamar(`/api/admin/eventos/${id}`, { metodo: "DELETE", token: tokenAdmin })).estado, 404);
});

test("DELETE /api/admin/eventos/:id: 409 si alguna reserva ya tiene un pago (PAGO.id_reserva es RESTRICT)", async () => {
  const { json: creado } = await crearEvento({ precio: 10000 });
  const id = creado.evento.id;
  const { rows } = await pool.query(
    "INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento) VALUES (1, '1000000002', $1) RETURNING id_reserva", [id]);
  await pool.query(
    "INSERT INTO PAGO (monto, referencia_transaccion, estado, id_reserva, id_metodo) VALUES (10000, $1, 'Aprobado', $2, 1)",
    [`TX-TEST-${Date.now()}`, rows[0].id_reserva]);

  const res = await llamar(`/api/admin/eventos/${id}`, { metodo: "DELETE", token: tokenAdmin });
  assert.equal(res.estado, 409);
  assert.match(res.json.error, /pagos/);
  assert.equal((await llamar(`/api/eventos/${id}`)).estado, 200, "el evento sigue ahí");
});

// ---------------------------------------------------------------------------------------------
// Administración: estado y cancelación
// ---------------------------------------------------------------------------------------------

test("PATCH estado: recorre el ciclo Programado → En Boletería → En Vivo → Finalizado y no permite saltos ni volver", async () => {
  const { json: creado } = await crearEvento();
  const url = `/api/admin/eventos/${creado.evento.id}/estado`;

  const salto = await llamar(url, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "En Vivo" } });
  assert.equal(salto.estado, 422);

  for (const estadoNuevo of ["En Boletería", "En Vivo", "Finalizado"]) {
    const { estado, json } = await llamar(url, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: estadoNuevo } });
    assert.equal(estado, 200);
    assert.equal(json.evento.estado, estadoNuevo);
  }
  assert.equal((await llamar(url, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "En Vivo" } })).estado, 422, "Finalizado es final");
  assert.equal((await llamar(url, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "En revisión" } })).estado, 400);
});

test("PATCH estado: la web manda el texto completo en observaciones y el servidor lo guarda tal cual", async () => {
  const { json: creado } = await crearEvento({ observaciones: "Apertura de puertas a las 6 p. m." });
  const id = creado.evento.id;
  const nota = "Cancelado por el administrador. Causa: Fuerza mayor o clima. Detalle: tormenta eléctrica";

  const ok = await llamar(`/api/admin/eventos/${id}/estado`, {
    metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Cancelado", observaciones: `Apertura de puertas a las 6 p. m.\n${nota}` },
  });
  assert.equal(ok.estado, 200);
  assert.equal(ok.json.evento.estado, "Cancelado");
  assert.equal(ok.json.evento.observaciones, `Apertura de puertas a las 6 p. m.\n${nota}`);

  // Un evento cancelado no se reactiva
  assert.equal((await llamar(`/api/admin/eventos/${id}/estado`, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Programado" } })).estado, 422);
});

test("PATCH estado: también acepta causa y detalle, y agrega la nota sin borrar las observaciones", async () => {
  const { json: creado } = await crearEvento({ observaciones: "Observación original" });
  const id = creado.evento.id;
  const url = `/api/admin/eventos/${id}/estado`;

  assert.equal((await llamar(url, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Cancelado" } })).estado, 400, "sin causa");
  assert.equal((await llamar(url, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Cancelado", observaciones: "sin causa" } })).estado, 400);
  assert.equal((await llamar(url, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Cancelado", causa: "Porque sí" } })).estado, 400);
  assert.equal((await llamar(url, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "En Boletería", causa: "Baja venta de entradas" } })).estado, 400);

  const ok = await llamar(url, {
    metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Cancelado", causa: "Fuerza mayor o clima", detalle: "tormenta" },
  });
  assert.equal(ok.estado, 200);
  assert.equal(ok.json.evento.observaciones,
    "Observación original\nCancelado por el administrador. Causa: Fuerza mayor o clima. Detalle: tormenta");
});

test("PATCH estado: cancelar un evento cancela también sus reservas Reservada y Confirmada, no las Usadas", async () => {
  const { json: creado } = await crearEvento({ precio: 0 });
  const id = creado.evento.id;
  await pool.query(
    `INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento, estado) VALUES
       (1, '1000000002', $1, 'Reservada'), (1, '1000000003', $1, 'Confirmada'), (1, '1000000002', $1, 'Usada')`, [id]);

  await llamar(`/api/admin/eventos/${id}/estado`, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Cancelado", causa: "Baja venta de entradas" } });
  const { rows } = await pool.query("SELECT estado, observaciones FROM RESERVA WHERE codigo_evento = $1 ORDER BY id_reserva", [id]);
  assert.deepEqual(rows.map((r) => r.estado), ["Cancelada", "Cancelada", "Usada"]);
  assert.equal(rows[0].observaciones, "Cancelada por el administrador. Causa: Otra causa. Detalle: el evento se canceló");
  assert.equal(rows[2].observaciones, null);
});

test("PATCH estado: evento inexistente 404; cliente 403", async () => {
  assert.equal((await llamar("/api/admin/eventos/EVT-0000-0000/estado", { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "En Boletería" } })).estado, 404);
  assert.equal((await llamar("/api/admin/eventos/EVT-0000-0000/estado", { metodo: "PATCH", token: tokenCliente, cuerpo: { estado: "En Boletería" } })).estado, 403);
});

// ---------------------------------------------------------------------------------------------
// Administración: solicitudes de los agentes
// ---------------------------------------------------------------------------------------------

test("GET /api/admin/eventos/solicitudes: solo las que están En revisión, con la forma de SOLICITUDES_DEMO", async () => {
  const { estado, json } = await llamar("/api/admin/eventos/solicitudes", { token: tokenAdmin });
  assert.equal(estado, 200);
  const s = json.solicitudes.find((x) => x.id === "EVT-2026-0006");
  assert.ok(s, "la solicitud en revisión del seed");
  assert.ok(json.solicitudes.every((x) => x.estado === "En revisión"));
  assert.ok(!json.solicitudes.some((x) => x.id === "EVT-2026-0007"), "la rechazada no sale");
  assert.equal(s.nit, "900111222-1");
  assert.equal(s.agente, "Pacífico Producciones");
  assert.equal(s.nombre, "Festival de Títeres");
  const { rows } = await pool.query(
    `SELECT to_char(fecha_hora_inicio, 'YYYY-MM-DD"T"HH24:MI') AS inicio FROM EVENTO WHERE codigo = 'EVT-2026-0006'`);
  assert.equal(s.inicio, rows[0].inicio);
  assert.match(s.inicio, /T10:00$/, "la hora no debe correrse por zona horaria");
  assert.equal(s.capacidad, 180);
  assert.equal(s.precio, 18000);
  assert.equal(s.ciudad, "Cali");
  assert.equal(s.observaciones, "Apertura de puertas a las 9:30 a. m.");
  assert.equal(s.motivo, "");
  assert.equal(typeof s.lat, "number");
});

test("PATCH solicitud: aprobar publica el evento como Programado y sale del catálogo de pendientes", async () => {
  const codigo = await t.crearSolicitudSql();
  eventosCreados.push(codigo);
  assert.equal((await llamar(`/api/eventos/${codigo}`)).estado, 404, "antes de aprobar no es público");

  const ok = await llamar(`/api/admin/eventos/solicitudes/${codigo}`, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Aprobado" } });
  assert.equal(ok.estado, 200);
  assert.equal(ok.json.idEvento, codigo);
  assert.equal((await llamar(`/api/eventos/${codigo}`)).json.evento.estado, "Programado");
  const { json } = await llamar("/api/admin/eventos/solicitudes", { token: tokenAdmin });
  assert.ok(!json.solicitudes.some((x) => x.id === codigo));

  // Ya no es una solicitud: no se puede decidir otra vez
  assert.equal((await llamar(`/api/admin/eventos/solicitudes/${codigo}`, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Aprobado" } })).estado, 409);
});

test("PATCH solicitud: rechazar exige motivo y lo guarda en observaciones, sin borrar las del agente", async () => {
  const codigo = await t.crearSolicitudSql({ observaciones: "Solo adultos" });
  eventosCreados.push(codigo);
  const url = `/api/admin/eventos/solicitudes/${codigo}`;

  assert.equal((await llamar(url, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Rechazado" } })).estado, 400);

  const ok = await llamar(url, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Rechazado", motivo: "Falta el permiso de la alcaldía" } });
  assert.equal(ok.estado, 200);
  assert.equal(ok.json.estado, "Rechazado");
  assert.equal(ok.json.motivo, "Falta el permiso de la alcaldía");
  assert.equal(ok.json.observaciones, "Solo adultos", "la forma de solicitud separa las observaciones del motivo");
  const { rows } = await pool.query("SELECT estado, observaciones FROM EVENTO WHERE codigo = $1", [codigo]);
  assert.equal(rows[0].estado, "Rechazado");
  assert.equal(rows[0].observaciones, "Solo adultos\nRechazado por el administrador. Motivo: Falta el permiso de la alcaldía");

  // Una rechazada no vuelve a decidirse hasta que el agente la corrija; y no es pública
  assert.equal((await llamar(url, { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Aprobado" } })).estado, 409);
  assert.equal((await llamar(`/api/eventos/${codigo}`)).estado, 404);
});

test("PATCH solicitud: decisión inválida 400; solicitud inexistente 404; un agente no decide", async () => {
  assert.equal((await llamar("/api/admin/eventos/solicitudes/EVT-2026-0006", { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Quizá" } })).estado, 400);
  assert.equal((await llamar("/api/admin/eventos/solicitudes/EVT-0000-0000", { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Aprobado" } })).estado, 404);
  assert.equal((await llamar("/api/admin/eventos/solicitudes/EVT-2026-0006", { metodo: "PATCH", token: tokenAgente, cuerpo: { estado: "Aprobado" } })).estado, 403);
});

test("PUT y PATCH estado de un evento que aún es solicitud: se rechazan (se decide desde solicitudes)", async () => {
  assert.equal((await llamar("/api/admin/eventos/EVT-2026-0006", { metodo: "PUT", token: tokenAdmin, cuerpo: eventoBase() })).estado, 422);
  assert.equal((await llamar("/api/admin/eventos/EVT-2026-0006/estado", { metodo: "PATCH", token: tokenAdmin, cuerpo: { estado: "Programado" } })).estado, 422);
});
