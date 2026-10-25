// Pruebas de integración de las ubicaciones (/api/admin/paises, /departamentos, /ciudades), del resumen del panel
// (/api/admin/resumen, /api/agente/resumen) y de los reportes (/api/admin/reportes).
// Necesitan la base con database/schema_ElDesparche.sql + database/seed.sql cargados y el .env.
// Como las pruebas de otros archivos corren a la vez y crean datos, los totales se comprueban con "al menos".
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const t = require("./ayudas");
const { llamar, pool, crearEventoAdmin } = t;

let tokenAdmin;
let tokenAgente1;
let tokenAgente2;
let tokenCliente;

before(async () => {
  await t.iniciar();
  tokenAdmin = await t.entrar("admin@eldesparche.test");
  tokenAgente1 = await t.entrar("agente1@eldesparche.test");
  tokenAgente2 = await t.entrar("agente2@eldesparche.test");
  tokenCliente = await t.entrar("cliente1@eldesparche.test");
});

after(t.terminar);

const admin = (ruta, metodo = "GET", cuerpo) => llamar(`/api/admin${ruta}`, { metodo, token: tokenAdmin, cuerpo });
const sufijo = String(Date.now()).slice(-6);

// ---------------------------------------------------------------------------------------------
// Ubicaciones
// ---------------------------------------------------------------------------------------------

test("GET /api/admin/ubicaciones: países, departamentos y ciudades con la forma de leerUbicaciones()", async () => {
  const { estado, json } = await admin("/ubicaciones");
  assert.equal(estado, 200);
  const colombia = json.paises.find((p) => p.nombre === "Colombia");
  assert.ok(colombia.id);
  const valle = json.departamentos.find((d) => d.nombre === "Valle del Cauca");
  assert.equal(valle.idPais, colombia.id);
  const cali = json.ciudades.find((c) => c.nombre === "Cali");
  assert.equal(cali.idDepartamento, valle.id);
  assert.ok(json.ciudades.length >= 7);

  assert.equal((await llamar("/api/admin/ubicaciones")).estado, 401);
  assert.equal((await llamar("/api/admin/ubicaciones", { token: tokenCliente })).estado, 403);
  assert.equal((await llamar("/api/admin/ubicaciones", { token: tokenAgente1 })).estado, 403);
});

test("país, departamento y ciudad: se registran, se renombran y se eliminan", async () => {
  const pais = await admin("/paises", "POST", { nombre: `País de prueba ${sufijo}` });
  assert.equal(pais.estado, 201, JSON.stringify(pais.json));
  assert.equal(pais.json.nombre, `País de prueba ${sufijo}`);
  const idPais = pais.json.id;
  try {
    const dep = await admin("/departamentos", "POST", { nombre: `Dep ${sufijo}`, idPais });
    assert.equal(dep.estado, 201, JSON.stringify(dep.json));
    assert.equal(dep.json.idPais, idPais);
    const ciu = await admin("/ciudades", "POST", { nombre: `Ciudad ${sufijo}`, idDepartamento: dep.json.id });
    assert.equal(ciu.estado, 201);
    assert.equal(ciu.json.idDepartamento, dep.json.id);

    // Aparecen en la lista y en el selector público de ciudades
    const lista = (await admin("/ubicaciones")).json;
    assert.ok(lista.ciudades.some((c) => c.id === ciu.json.id));
    assert.ok((await llamar("/api/ciudades")).json.ciudades.some((c) => c.nombre === `Ciudad ${sufijo}`));

    const nuevoNombre = await admin(`/ciudades/${ciu.json.id}`, "PUT", { nombre: `Ciudad renombrada ${sufijo}` });
    assert.equal(nuevoNombre.estado, 200);
    assert.equal(nuevoNombre.json.nombre, `Ciudad renombrada ${sufijo}`);
    assert.equal((await admin(`/departamentos/${dep.json.id}`, "PUT", { nombre: `Dep renombrado ${sufijo}` })).estado, 200);
    assert.equal((await admin(`/paises/${idPais}`, "PUT", { nombre: `País renombrado ${sufijo}` })).estado, 200);

    // Con hijos no se puede eliminar (RESTRICT): primero la ciudad, luego el departamento, luego el país
    const conHijos = await admin(`/paises/${idPais}`, "DELETE");
    assert.equal(conHijos.estado, 409);
    assert.match(conHijos.json.error, /departamentos/);
    assert.match((await admin(`/departamentos/${dep.json.id}`, "DELETE")).json.error, /ciudades/);
    assert.equal((await admin(`/ciudades/${ciu.json.id}`, "DELETE")).estado, 204);
    assert.equal((await admin(`/departamentos/${dep.json.id}`, "DELETE")).estado, 204);
  } finally {
    assert.equal((await admin(`/paises/${idPais}`, "DELETE")).estado, 204);
  }
  assert.equal((await admin(`/paises/${idPais}`, "DELETE")).estado, 404);
});

test("ubicaciones: nombres repetidos 409; datos inválidos 400; padre inexistente 400; no se borra lo que se usa", async () => {
  const repetido = await admin("/paises", "POST", { nombre: "Colombia" });
  assert.equal(repetido.estado, 409);
  assert.ok(repetido.json.detalles.nombre);
  const { json: ubi } = await admin("/ubicaciones");
  const idColombia = ubi.paises.find((p) => p.nombre === "Colombia").id;
  assert.equal((await admin("/departamentos", "POST", { nombre: "Valle del Cauca", idPais: idColombia })).estado, 409, "en el mismo país");

  assert.equal((await admin("/paises", "POST", { nombre: "" })).estado, 400);
  assert.equal((await admin("/paises", "POST", { nombre: "x".repeat(61) })).estado, 400);
  assert.equal((await admin("/departamentos", "POST", { nombre: "Sin país" })).estado, 400);
  assert.equal((await admin("/departamentos", "POST", { nombre: "País inexistente", idPais: 999999 })).estado, 400);
  assert.equal((await admin("/ciudades", "PUT", { nombre: "x" })).estado, 404);
  assert.equal((await admin("/ciudades/999999", "PUT", { nombre: "No existe" })).estado, 404);
  assert.equal((await admin("/ciudades/abc", "DELETE")).estado, 404);

  // Cali la usan personas, eventos y ubicaciones: no se puede eliminar
  const idCali = ubi.ciudades.find((c) => c.nombre === "Cali").id;
  const enUso = await admin(`/ciudades/${idCali}`, "DELETE");
  assert.equal(enUso.estado, 409);
  assert.match(enUso.json.error, /personas/);
  assert.equal((await admin(`/departamentos/${ubi.departamentos.find((d) => d.nombre === "Valle del Cauca").id}`, "DELETE")).estado, 409);
});

// ---------------------------------------------------------------------------------------------
// Resumen del administrador
// ---------------------------------------------------------------------------------------------

test("GET /api/admin/resumen: la forma de resumenLocal() con los datos del seed", async () => {
  const { estado, json } = await admin("/resumen?meses=6");
  assert.equal(estado, 200);

  const i = json.indicadores;
  assert.ok(i.eventosActivos >= 4, "Programado ×3 y En Boletería; las solicitudes y los cancelados no cuentan");
  assert.ok(i.reservas >= 2, "las reservas válidas (pagadas) de los últimos meses");
  assert.ok(i.ingresos >= 100000 + 30000);
  assert.ok(i.agentes >= 2, "el agente pendiente no cuenta");
  assert.ok(i.clientes >= 2, "el cliente bloqueado no cuenta");
  assert.ok(i.eventosPorRevisar >= 1);

  assert.equal(json.meses.length, 6);
  assert.deepEqual(Object.keys(json.meses[0]), ["mes", "reservas", "ingresos"]);
  assert.match(json.meses[5].mes, /^[a-z]{3} \d{2}$/);
  assert.ok(json.meses[5].reservas >= 2, "las reservas del seed son de este mes");

  assert.deepEqual(json.estados.map((e) => e.estado), ["Programado", "En Boletería", "En Vivo", "Finalizado", "Cancelado"]);
  assert.ok(json.estados.find((e) => e.estado === "Cancelado").total >= 1);
  assert.ok(json.categorias.length >= 3);
  assert.ok(json.categorias.some((c) => c.categoria === "Música"));
  assert.equal(json.agentes[0].nombre, "Pacífico Producciones");
  assert.ok(json.agentes[0].ingresos >= 100000 && json.agentes[0].entradas >= 2 && json.agentes[0].eventos >= 2);
  assert.ok(json.agentes.length <= 5);
  assert.ok(json.actividad.length >= 1);
  assert.ok(json.actividad.every((a) => typeof a.cuando === "string" && typeof a.texto === "string"));
  assert.match(json.actividad[0].cuando, /^Hace /);
});

test("GET /api/admin/resumen: el número de meses cambia la serie; valores inválidos 400; solo administrador", async () => {
  assert.equal((await admin("/resumen?meses=3")).json.meses.length, 3);
  assert.equal((await admin("/resumen?meses=12")).json.meses.length, 12);
  assert.equal((await admin("/resumen")).json.meses.length, 6, "por defecto 6");
  for (const mal of ["0", "25", "abc", "1.5"]) assert.equal((await admin(`/resumen?meses=${mal}`)).estado, 400, mal);
  assert.equal((await llamar("/api/admin/resumen")).estado, 401);
  assert.equal((await llamar("/api/admin/resumen", { token: tokenAgente1 })).estado, 403);
});

// ---------------------------------------------------------------------------------------------
// Reportes
// ---------------------------------------------------------------------------------------------

test("GET /api/admin/reportes: la forma de reportesLocal() con los datos del seed", async () => {
  const anio = new Date().getFullYear();
  const { estado, json } = await admin(`/reportes?anio=${anio}`);
  assert.equal(estado, 200);
  assert.equal(json.anio, anio);

  assert.ok(json.totales.clientes >= 3 && json.totales.agentes >= 3 && json.totales.administradores >= 1);
  assert.ok(json.totales.reservas >= 5 && json.totales.eventos >= 5);
  assert.ok(json.promedios.porAgente > 0 && json.promedios.porCliente > 0);

  const pacifico = json.ingresosPorAgente.find((a) => a.nombre === "Pacífico Producciones");
  assert.ok(pacifico.ingresos >= 100000);
  assert.equal(json.ingresosPorAgente.find((a) => a.nombre === "Luna Llena Teatro").ingresos, 0, "un agente sin ventas aparece con 0");
  assert.equal(json.ingresosPorCliente.find((c) => c.nombre === "Camilo Rojas Prueba").ingresos >= 100000, true);
  assert.equal(json.ingresosPorMes.length, 12);
  assert.ok(json.ingresosPorMes[new Date().getMonth()] >= 100000 + 30000);

  const conciertos = json.reservasPorEventoMes.find((e) => e.evento === "Concierto Música Colombiana");
  assert.equal(conciertos.meses.length, 12);
  assert.ok(conciertos.meses[new Date().getMonth()] >= 1);
  assert.ok(json.eventosPorAgenteCiudad.some((x) => x.agente === "Pacífico Producciones" && x.ciudad === "Cali" && x.eventos >= 1));
  const cali = json.eventosPorUbicacion.find((u) => u.ciudad === "Cali");
  assert.equal(cali.pais, "Colombia");
  assert.equal(cali.departamento, "Valle del Cauca");
  assert.ok(cali.eventos.includes("Concierto Música Colombiana"));
  assert.ok(!json.eventosPorUbicacion.some((u) => u.eventos.includes("Festival de Títeres")), "las solicitudes no cuentan como eventos");

  const r = json.reservas.find((x) => x.codigo === "DES-1001");
  assert.deepEqual(Object.keys(r), ["codigo", "fecha", "cliente", "documento", "evento", "entradas", "valor", "estado", "observaciones"]);
  assert.equal(r.valor, 100000);
  assert.equal(json.reservas.find((x) => x.codigo === "DES-1004").observaciones, "Cancelada por el cliente. Causa: No puede asistir.");
  const cancelado = json.eventosCancelados.find((e) => e.evento === "Noche de Comedia en Medellín");
  assert.equal(cancelado.ciudad, "Medellín");
  assert.equal(cancelado.agente, "Capital Eventos");
  assert.match(cancelado.observaciones, /^Cancelado por el agente\. Causa: Fuerza mayor o clima\./);
});

test("GET /api/admin/reportes: un año sin datos da ceros; año inválido 400; solo administrador", async () => {
  const vacio = (await admin("/reportes?anio=2001")).json;
  assert.deepEqual(vacio.ingresosPorMes, Array(12).fill(0));
  assert.deepEqual(vacio.reservasPorEventoMes, []);
  assert.ok(vacio.reservas.length >= 5, "el historial de reservas no depende del año");
  for (const mal of ["1999", "2101", "abc"]) assert.equal((await admin(`/reportes?anio=${mal}`)).estado, 400, mal);
  assert.equal((await admin("/reportes")).json.anio, new Date().getFullYear(), "por defecto el año actual");
  assert.equal((await llamar("/api/admin/reportes", { token: tokenCliente })).estado, 403);
});

// ---------------------------------------------------------------------------------------------
// Resumen del agente
// ---------------------------------------------------------------------------------------------

test("GET /api/agente/resumen: la forma de resumenAgenteLocal() de ESE agente", async () => {
  const { estado, json } = await llamar("/api/agente/resumen", { token: tokenAgente1 });
  assert.equal(estado, 200);
  assert.deepEqual(json.agente, { nombre: "Pacífico Producciones", estado: "Activo", comision: 10 });

  const i = json.indicadores;
  assert.ok(i.eventosActivos >= 2);
  assert.ok(i.entradas >= 2);
  assert.ok(i.ingresos >= 100000);
  assert.equal(i.ganancia, Math.round(i.ingresos * 0.9), "ingresos menos la comisión del 10 %");
  assert.ok(Number.isInteger(i.ocupacion) && i.ocupacion >= 0 && i.ocupacion <= 100);
  assert.equal(typeof i.porAprobar, "number");

  assert.equal(json.meses.length, 6);
  assert.ok(json.meses[5].reservas >= 2, "entradas vendidas este mes");
  assert.ok(json.meses[5].ingresos >= 100000);
  assert.deepEqual(json.estados.map((e) => e.estado), ["Programado", "En Boletería", "En Vivo", "Finalizado", "Cancelado"]);
  assert.ok(json.eventos.every((e) => e.nitAgente === "900111222-1"), "solo sus eventos");
  assert.ok(json.eventos.some((e) => e.id === "EVT-2026-0001"));
  assert.ok(!json.eventos.some((e) => e.id === "EVT-2026-0002"), "ese evento es de otro agente");
  assert.ok(json.actividad.length >= 1);
  assert.match(json.actividad[0].texto, /(compró|canceló|reservó) \d+ entradas? para /);

  // Otro agente ve lo suyo
  const otro = (await llamar("/api/agente/resumen", { token: tokenAgente2 })).json;
  assert.equal(otro.agente.nombre, "Capital Eventos");
  assert.equal(otro.agente.comision, 8.5);
  assert.ok(otro.eventos.every((e) => e.nitAgente === "900333444-5"));

  assert.equal((await llamar("/api/agente/resumen")).estado, 401);
  assert.equal((await llamar("/api/agente/resumen", { token: tokenCliente })).estado, 403);
  assert.equal((await llamar("/api/agente/resumen", { token: tokenAdmin })).estado, 403);
});

test("resumen del agente: las reservas por aprobar de sus eventos se cuentan", async () => {
  const antes = (await llamar("/api/agente/resumen", { token: tokenAgente1 })).json.indicadores.porAprobar;
  const ev = await crearEventoAdmin({ precio: 10000 });
  await pool.query("INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento) VALUES (1, '1000000002', $1)", [ev.id]);

  const despues = (await llamar("/api/agente/resumen", { token: tokenAgente1 })).json;
  assert.equal(despues.indicadores.porAprobar, antes + 1);
  assert.match(despues.actividad[0].texto, /y está por aprobar\.$/);
  const otro = (await llamar("/api/agente/resumen", { token: tokenAgente2 })).json;
  assert.ok(otro.indicadores.porAprobar >= 0);
});

// ---------------------------------------------------------------------------------------------
// Límite del cuerpo: 100 KB en el API, 3 MB en los paneles (y solo si hay sesión)
// ---------------------------------------------------------------------------------------------
test("cuerpo grande: los paneles admiten hasta 3 MB, el resto 100 KB, y sin sesión no se lee", async () => {
  const de = (kb) => ({ relleno: "a".repeat(kb * 1024) });

  const login = await llamar("/api/auth/login", { metodo: "POST", cuerpo: de(200) });
  assert.equal(login.estado, 413);

  // Con sesión, 200 KB pasa el límite del panel y llega a la validación (400), no al límite (413)
  const conSesion = await admin("/eventos", "POST", de(200));
  assert.equal(conSesion.estado, 400);
  assert.equal((await admin("/eventos", "POST", de(4 * 1024))).estado, 413);

  // Sin sesión, ni siquiera se lee el cuerpo: 401
  const anonimo = await llamar("/api/admin/eventos", { metodo: "POST", cuerpo: de(200) });
  assert.equal(anonimo.estado, 401);
});
