// Pruebas de integración: al eliminar un evento, cambiarle el lugar o la imagen, retirar una solicitud, cambiar el logo
// o eliminar un agente, no quedan ubicaciones huérfanas en la base ni archivos sin uso en backend/uploads.
// Necesita la base del .env con schema + seed.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const t = require("./ayudas");
const { llamar, pool, eventoBase, crearEventoAdmin } = t;
const { CARPETA_UPLOADS, borrarArchivoSubido } = require("../src/utils/imagenes");

let tokenAdmin;
let tokenAgente1;

before(async () => {
  await t.iniciar();
  tokenAdmin = await t.entrar("admin@eldesparche.test");
  tokenAgente1 = await t.entrar("agente1@eldesparche.test");
});
after(() => t.terminar());

const admin = (ruta, metodo = "GET", cuerpo) => llamar(`/api/admin${ruta}`, { metodo, token: tokenAdmin, cuerpo });

// Un PNG distinto en cada llamada: el mismo PNG de 1x1 con bytes de más al final (guardarImagen solo revisa la firma),
// así cada imagen tiene otro hash y otro archivo
function pngUnico() {
  const bytes = Buffer.concat([Buffer.from(t.PNG_1X1.split(",")[1], "base64"), crypto.randomBytes(8)]);
  return "data:image/png;base64," + bytes.toString("base64");
}

// "/uploads/eventos/x.png" (o la URL completa) -> ruta del archivo en disco
const archivo = (url) => path.join(CARPETA_UPLOADS, /\/uploads\/(.+)$/.exec(url)[1]);
const existeArchivo = (url) => fs.existsSync(archivo(url));
const ubicacionDe = async (codigo) =>
  (await pool.query("SELECT id_ubicacion FROM EVENTO WHERE codigo = $1", [codigo])).rows[0].id_ubicacion;
const existeUbicacion = async (id) =>
  (await pool.query("SELECT 1 FROM UBICACION WHERE id_ubicacion = $1", [id])).rowCount === 1;

test("DELETE /api/admin/eventos/:id borra también su ubicación y su imagen", async () => {
  const ev = await crearEventoAdmin({ imagen: pngUnico() });
  const idUbicacion = await ubicacionDe(ev.id);
  assert.ok(existeArchivo(ev.imagen), "la imagen se guardó");

  assert.equal((await admin(`/eventos/${ev.id}`, "DELETE")).estado, 204);
  assert.equal(await existeUbicacion(idUbicacion), false, "la ubicación no queda huérfana");
  assert.equal(existeArchivo(ev.imagen), false, "el archivo de la imagen se borró");
});

test("una imagen compartida por dos eventos no se borra hasta que se elimina el último", async () => {
  const imagen = pngUnico();
  const a = await crearEventoAdmin({ imagen });
  const b = await crearEventoAdmin({ imagen });
  assert.equal(a.imagen, b.imagen, "la misma foto es el mismo archivo");

  assert.equal((await admin(`/eventos/${a.id}`, "DELETE")).estado, 204);
  assert.ok(existeArchivo(b.imagen), "el otro evento todavía la usa");
  assert.equal((await admin(`/eventos/${b.id}`, "DELETE")).estado, 204);
  assert.equal(existeArchivo(b.imagen), false);
});

test("PUT /api/admin/eventos/:id: cambiar el lugar y la imagen borra la ubicación y la imagen anteriores", async () => {
  const ev = await crearEventoAdmin({ imagen: pngUnico() });
  const ubicacionAnterior = await ubicacionDe(ev.id);

  const { estado, json } = await admin(`/eventos/${ev.id}`, "PUT",
    eventoBase({ direccion: "Calle de Prueba # 99-1", lat: 3.46, imagen: pngUnico() }));
  assert.equal(estado, 200, JSON.stringify(json));
  t.registrarImagen(json.evento.imagen);
  assert.notEqual(json.evento.imagen, ev.imagen);
  assert.ok(existeArchivo(json.evento.imagen), "la imagen nueva está");
  assert.equal(existeArchivo(ev.imagen), false, "la anterior se borró");
  assert.equal(await existeUbicacion(ubicacionAnterior), false, "la ubicación anterior se borró");
  assert.notEqual(await ubicacionDe(ev.id), ubicacionAnterior);

  // Mismo lugar y sin imagen en el cuerpo (null): la ubicación y la imagen se conservan
  const ubicacionActual = await ubicacionDe(ev.id);
  const igual = await admin(`/eventos/${ev.id}`, "PUT",
    eventoBase({ direccion: "Calle de Prueba # 99-1", lat: 3.46, imagen: null, nombre: "Solo cambia el nombre" }));
  assert.equal(igual.estado, 200, JSON.stringify(igual.json));
  assert.equal(await ubicacionDe(ev.id), ubicacionActual);
  assert.ok(existeArchivo(json.evento.imagen));
});

test("si la escritura falla, la imagen recién subida no queda en uploads/", async () => {
  const imagen = pngUnico();
  const hash = crypto.createHash("sha1").update(Buffer.from(imagen.split(",")[1], "base64")).digest("hex").slice(0, 10);
  const res = await admin("/eventos", "POST", eventoBase({ nit: "900111222-1", ciudad: "Ciudad Que No Existe", imagen }));
  assert.equal(res.estado, 400, JSON.stringify(res.json));
  assert.equal(fs.existsSync(path.join(CARPETA_UPLOADS, "eventos", `evento-${hash}.png`)), false);
});

test("DELETE /api/agente/eventos/:id: retirar una solicitud borra su ubicación y su imagen", async () => {
  const sol = await llamar("/api/agente/eventos", { metodo: "POST", token: tokenAgente1, cuerpo: eventoBase({ imagen: pngUnico() }) });
  assert.equal(sol.estado, 201, JSON.stringify(sol.json));
  t.registrarEvento(sol.json.id);
  const idUbicacion = await ubicacionDe(sol.json.id);

  const res = await llamar(`/api/agente/eventos/${sol.json.id}`, { metodo: "DELETE", token: tokenAgente1 });
  assert.equal(res.estado, 204);
  assert.equal(await existeUbicacion(idUbicacion), false);
  assert.equal(existeArchivo(sol.json.imagen), false);
});

test("logo del agente: el anterior se borra al cambiarlo y el último al eliminar al agente", async () => {
  const sufijo = String(Date.now()).slice(-6);
  const cuerpo = {
    nit: `7${sufijo}0`.padEnd(9, "0") + "-3", razon: "Logo Eventos S.A.S.", nombre: "Logo Eventos", experiencia: 1, comision: 5, estado: "Activo",
    tipoDoc: "CC", documento: `5${sufijo}1`, nombres: "Lola", apellidos: "Logo Prueba", correo: `logo${sufijo}@eldesparche.test`,
    telefono: "3001112233", direccion: "Calle 1 # 2-3", ciudad: "Cali", contrasena: "Clave-nueva-123",
  };
  assert.equal((await admin("/agentes", "POST", cuerpo)).estado, 201);
  try {
    const token = await t.entrar(cuerpo.correo, "Clave-nueva-123");
    const perfil = (logo) => llamar("/api/agente/perfil", { metodo: "PUT", token,
      cuerpo: { nombre: "Logo Eventos", correo: cuerpo.correo, telefono: "", ciudad: "Cali", experiencia: 1, logo } });

    const primero = (await perfil(pngUnico())).json.logo;
    const segundo = (await perfil(pngUnico())).json.logo;
    assert.notEqual(primero, segundo);
    assert.equal(existeArchivo(primero), false, "el logo anterior se borró");
    assert.ok(existeArchivo(segundo));

    assert.equal((await admin(`/agentes/${cuerpo.nit}`, "DELETE")).estado, 204);
    assert.equal(existeArchivo(segundo), false, "al eliminar al agente se borra su logo");
  } finally {
    await pool.query("DELETE FROM USUARIO WHERE numero_identificacion = $1", [cuerpo.documento]);
  }
});

test("borrarArchivoSubido solo acepta rutas de uploads/ con la forma de guardarImagen", () => {
  for (const mala of ["", null, "img/27459.png", "/uploads/../server.js", "/uploads/eventos/..", "/uploads/eventos/../../x.png",
    "/uploads/eventos/a.svg", "https://ejemplo.com/uploads/eventos/a.png"]) {
    assert.equal(borrarArchivoSubido(mala), false, String(mala));
  }
  assert.equal(borrarArchivoSubido("/uploads/eventos/no-existe-0000000000.png"), true, "un archivo que ya no está no es error");
});
