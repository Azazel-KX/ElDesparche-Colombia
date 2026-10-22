// Ayudas compartidas por las pruebas de integración (necesitan la base con schema + seed cargados y el .env).
// Cada archivo de prueba corre en su propio proceso: arma su servidor con iniciar() y lo cierra con terminar().
process.env.NODE_ENV = "test";

const fs = require("fs");
const path = require("path");
const app = require("../src/app");
const { pool } = require("../src/config/db");
const { CARPETA_UPLOADS } = require("../src/utils/imagenes");

let servidor;
let base;

const CLAVE = "Desparche2026!"; // contraseña de las cuentas del seed

async function iniciar() {
  servidor = app.listen(0);
  base = `http://127.0.0.1:${servidor.address().port}`;
}

async function terminar() {
  await limpiar();
  await new Promise((r) => servidor.close(r));
  await pool.end();
}

// Lo que crean las pruebas con crearEventoAdmin() se borra al terminar
const eventosCreados = [];
const imagenesCreadas = [];
const registrarEvento = (codigo) => { eventosCreados.push(codigo); return codigo; };
const registrarImagen = (url) => { imagenesCreadas.push(url); return url; };

async function limpiar() {
  await limpiarEventos(eventosCreados.splice(0));
  imagenesCreadas.splice(0).forEach(borrarImagen);
}

// Crea un evento publicado con el administrador (agente dueño: Pacífico Producciones, NIT 900111222-1) y lo deja
// registrado para borrarlo al terminar. Devuelve el evento con la forma de la web.
async function crearEventoAdmin(cambios = {}) {
  const token = await entrar("admin@eldesparche.test");
  const res = await llamar("/api/admin/eventos", { metodo: "POST", token, cuerpo: eventoBase({ nit: "900111222-1", ...cambios }) });
  if (res.estado !== 201) throw new Error("No se pudo crear el evento de prueba: " + JSON.stringify(res.json));
  registrarEvento(res.json.evento.id);
  return res.json.evento;
}

// Llama al API y devuelve { estado, json }. Una respuesta sin cuerpo (204) devuelve json = null.
async function llamar(ruta, { metodo = "GET", cuerpo, token } = {}) {
  const res = await fetch(base + ruta, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await res.text();
  return { estado: res.status, json: texto ? JSON.parse(texto) : null, cabeceras: res.headers };
}

// Inicia sesión con una cuenta del seed y devuelve su token
async function entrar(correo, clave = CLAVE) {
  const { json } = await llamar("/api/auth/login", { metodo: "POST", cuerpo: { correo, contrasena: clave } });
  return json.token;
}

// Fecha "AAAA-MM-DDTHH:00" siempre en el futuro, sin importar cuándo se ejecuten las pruebas
function enDias(dias, hora = 19) {
  const f = new Date(Date.now() + dias * 86400000);
  const p = (n) => String(n).padStart(2, "0");
  return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}T${p(hora)}:00`;
}

// Un evento válido con los campos que manda la web (agente.js, datosFormulario)
const eventoBase = (cambios = {}) => ({
  nombre: "Evento de prueba automática",
  categoria: "musica",
  plan: "parche",
  descripcion: "Creado por las pruebas",
  inicio: enDias(60, 19),
  fin: enDias(60, 22),
  ciudad: "Cali",
  departamento: "Valle del Cauca",
  teatro: "Teatro de Prueba",
  direccion: "Calle de Prueba # 1-2",
  capacidad: 100,
  precio: 25000,
  edad: 0,
  observaciones: "",
  imagen: "",
  lat: 3.4516,
  lon: -76.532,
  ...cambios,
});

// Un PNG de 1x1 píxel como data URL, para probar la subida de imágenes
const PNG_1X1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

// Borra del disco una imagen subida durante la prueba (recibe la URL que devolvió el API o la ruta guardada)
function borrarImagen(url) {
  const m = /\/uploads\/(.+)$/.exec(url || "");
  if (m) fs.rmSync(path.join(CARPETA_UPLOADS, m[1]), { force: true });
}

// Inserta una solicitud (evento "En revisión") directo en la base, sin pasar por el API
async function crearSolicitudSql({ doc = "900111222", estado = "En revisión", observaciones = null, nombre = "Solicitud de prueba" } = {}) {
  const ub = await pool.query(
    "INSERT INTO UBICACION (direccion, latitud, longitud, id_ciudad) VALUES ('Calle de Prueba # 7-7', 3.45, -76.53, 1) RETURNING id_ubicacion"
  );
  const { rows } = await pool.query(
    `INSERT INTO EVENTO (codigo, nombre, categoria, teatro, fecha_hora_inicio, fecha_hora_fin, capacidad_total, estado,
                         observaciones, precio, id_ubicacion, numero_identificacion)
     VALUES ('EVT-TEST-' || LPAD((FLOOR(RANDOM() * 900000) + 100000)::int::text, 6, '0'), $1, 'musica', 'Teatro de Prueba',
             NOW() + INTERVAL '60 days', NOW() + INTERVAL '60 days 3 hours', 100, $2::estado_evento_t, $3, 25000, $4, $5)
     RETURNING codigo`,
    [nombre, estado, observaciones, ub.rows[0].id_ubicacion, doc]
  );
  return rows[0].codigo;
}

// Borra eventos de prueba y las ubicaciones de prueba que quedaron sin ningún evento
async function limpiarEventos(codigos) {
  if (codigos.length) {
    await pool.query("DELETE FROM PAGO WHERE id_reserva IN (SELECT id_reserva FROM RESERVA WHERE codigo_evento = ANY($1))", [codigos]);
    await pool.query("DELETE FROM EVENTO WHERE codigo = ANY($1)", [codigos]);
  }
  await pool.query(
    "DELETE FROM UBICACION WHERE direccion LIKE 'Calle de Prueba%' AND id_ubicacion NOT IN (SELECT id_ubicacion FROM EVENTO)"
  );
}

module.exports = {
  pool, iniciar, terminar, urlBase: () => base, crearEventoAdmin, registrarEvento, registrarImagen, limpiar, llamar, entrar, enDias, eventoBase, PNG_1X1, borrarImagen, crearSolicitudSql, limpiarEventos, CLAVE,
};
