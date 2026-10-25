const db = require("../config/db");
const { ErrorHttp } = require("../utils/errores");
const ciudadModel = require("./ciudadModel");
const { guardarImagen, urlPublica } = require("../utils/imagenes");
const { ES_VALIDA } = require("../utils/sql");
const { separarNombre, unirNombre, CUENTA_DE_ESTADO, ultimosMeses } = require("../utils/formato");

// Modelo de PERSONAS para los paneles: agentes, clientes y administradores (USUARIO + su subtipo).
// Aquí vive el SQL de las listas y del alta, la edición y el borrado. Las formas de respuesta son las de
// AGENTES_DEMO, CLIENTES_DEMO y ADMINISTRADORES_DEMO en frontend/js/admin.js.

const FECHA = (c) => `to_char(${c}, 'YYYY-MM-DD')`;

// Columnas comunes de cualquier persona. Se usa con: FROM USUARIO u JOIN CIUDAD c ON c.id_ciudad = u.id_ciudad
// El teléfono de los paneles es uno solo; si la persona tiene varios, se muestra el primero.
const BASE = `
  u.numero_identificacion AS documento, u.tipo_identificacion AS tipo_doc, u.nombre_completo, u.correo, u.direccion,
  c.nombre AS ciudad, ${FECHA("u.fecha_registro")} AS registro, u.estado_usuario,
  (SELECT t.telefono FROM USUARIO_TELEFONO t WHERE t.numero_identificacion = u.numero_identificacion
    ORDER BY t.telefono LIMIT 1) AS telefono`;

// Los datos de persona con la forma de la web. El nombre completo se reparte en nombres y apellidos (ver separarNombre).
function aPersona(f) {
  const { nombres, apellidos } = separarNombre(f.nombre_completo);
  return {
    documento: f.documento, tipoDoc: f.tipo_doc, nombres, apellidos, nombre: f.nombre_completo,
    correo: f.correo, telefono: f.telefono || "", direccion: f.direccion, ciudad: f.ciudad, registro: f.registro,
  };
}

// ---------------------------------------------------------------------------------------------
// Alta y edición (comunes a los tres perfiles)
// ---------------------------------------------------------------------------------------------

// Inserta el USUARIO y su teléfono dentro de la transacción "cliente". El subtipo lo inserta quien llama, antes del COMMIT.
async function insertarUsuario(cliente, d, estado) {
  const idCiudad = await ciudadModel.idObligatorio(d.ciudad, cliente);
  await cliente.query(
    `INSERT INTO USUARIO (numero_identificacion, tipo_identificacion, nombre_completo, correo, contrasena_hash,
                          direccion, id_ciudad, estado_usuario)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::estado_usuario_t)`,
    [d.documento, d.tipoDoc, unirNombre(d.nombres, d.apellidos), d.correo, d.contrasenaHash, d.direccion, idCiudad, estado]
  );
  if (d.telefono) {
    await cliente.query("INSERT INTO USUARIO_TELEFONO (numero_identificacion, telefono) VALUES ($1, $2)", [d.documento, d.telefono]);
  }
}

// Modifica los datos de persona. El documento, el tipo de documento y el estado no cambian por aquí.
// Teléfono: el panel maneja uno solo, así que se cambia el que se mostraba y los demás (si hubiera) se conservan.
async function actualizarUsuario(cliente, documento, d) {
  const idCiudad = await ciudadModel.idObligatorio(d.ciudad, cliente);
  await cliente.query(
    `UPDATE USUARIO SET nombre_completo = $2, correo = $3, direccion = $4, id_ciudad = $5 WHERE numero_identificacion = $1`,
    [documento, unirNombre(d.nombres, d.apellidos), d.correo, d.direccion, idCiudad]
  );
  const { rows } = await cliente.query(
    "SELECT telefono FROM USUARIO_TELEFONO WHERE numero_identificacion = $1 ORDER BY telefono LIMIT 1", [documento]);
  const actual = rows[0] ? rows[0].telefono : "";
  if (actual !== d.telefono) {
    if (actual) await cliente.query("DELETE FROM USUARIO_TELEFONO WHERE numero_identificacion = $1 AND telefono = $2", [documento, actual]);
    if (d.telefono) {
      await cliente.query(
        "INSERT INTO USUARIO_TELEFONO (numero_identificacion, telefono) VALUES ($1, $2) ON CONFLICT DO NOTHING", [documento, d.telefono]);
    }
  }
}

// Borra al usuario (y en cascada su subtipo, teléfonos y reservas). "tabla" es ADMIN, CLIENTE o AGENTE y
// "columna" por qué se busca (numero_identificacion o nit). Devuelve false si no existe. Si algo todavía lo usa con
// RESTRICT (eventos de un agente), PostgreSQL lanza 23001 y el controlador lo vuelve un 409.
async function borrarUsuario(tabla, columna, valor) {
  const { rowCount } = await db.query(
    `DELETE FROM USUARIO u USING ${tabla} s WHERE s.${columna} = $1 AND u.numero_identificacion = s.numero_identificacion`,
    [valor]
  );
  return rowCount > 0;
}

// ---------------------------------------------------------------------------------------------
// Ventas por mes: de un agente (sus eventos) o de un cliente (sus compras)
// ---------------------------------------------------------------------------------------------

// Entradas e ingresos de cada agente: totales y por mes. Una consulta para todos. Cuentan las entradas válidas
// (ES_VALIDA): gratis o confirmadas por un administrador. Devuelve Map(documento -> { entradas, ingresos, porMes }).
async function ventasPorAgente() {
  const { rows } = await db.query(
    `SELECT e.numero_identificacion AS doc, to_char(r.fecha_hora, 'YYYY-MM') AS mes,
            SUM(r.numero_entradas)::int AS entradas, SUM(r.valor_total)::float8 AS ingresos
       FROM RESERVA r
       JOIN EVENTO e ON e.codigo = r.codigo_evento
      WHERE ${ES_VALIDA}
      GROUP BY 1, 2`
  );
  const mapa = new Map();
  for (const f of rows) {
    const v = mapa.get(f.doc) || { entradas: 0, ingresos: 0, porMes: {} };
    v.entradas += f.entradas;
    v.ingresos += f.ingresos;
    v.porMes[f.mes] = { entradas: f.entradas, ingresos: f.ingresos };
    mapa.set(f.doc, v);
  }
  return mapa;
}

const claveMes = (m) => `${m.anio}-${String(m.mes).padStart(2, "0")}`;

// ---------------------------------------------------------------------------------------------
// AGENTES
// ---------------------------------------------------------------------------------------------

const SELECT_AGENTE = `
  SELECT ${BASE}, ag.nit, ag.razon_social, ag.nombre_comercial, ag.descripcion, ag.logo_url,
         ag.comision::float8 AS comision, ag.experiencia,
         COALESCE((SELECT array_agg(e.codigo ORDER BY e.fecha_hora_inicio, e.codigo) FROM EVENTO e
                    WHERE e.numero_identificacion = u.numero_identificacion
                      AND e.estado NOT IN ('En revisión', 'Rechazado')), '{}') AS eventos
    FROM USUARIO u
    JOIN AGENTE ag ON ag.numero_identificacion = u.numero_identificacion
    JOIN CIUDAD c  ON c.id_ciudad = u.id_ciudad`;

// Un agente con la forma de AGENTES_DEMO. "ventas" son las entradas vendidas en cada uno de los últimos 6 meses.
function aAgente(f, ventas) {
  const v = ventas.get(f.documento) || { entradas: 0, ingresos: 0, porMes: {} };
  return {
    ...aPersona(f),
    nit: f.nit,
    nombre: f.nombre_comercial || f.razon_social,   // el nombre que ve el público, no el del representante
    razon: f.razon_social,
    comision: f.comision,
    experiencia: f.experiencia,
    estado: f.estado_usuario,
    descripcion: f.descripcion || "",
    logo: urlPublica(f.logo_url),
    eventos: f.eventos,
    entradas: v.entradas,
    ingresos: v.ingresos,
    ventas: ultimosMeses(6).map((m) => (v.porMes[claveMes(m)] || { entradas: 0 }).entradas),
  };
}

async function listarAgentes({ nit } = {}) {
  const [{ rows }, ventas] = await Promise.all([
    db.query(`${SELECT_AGENTE} WHERE ($1::text IS NULL OR ag.nit = $1) ORDER BY COALESCE(ag.nombre_comercial, ag.razon_social)`, [nit || null]),
    ventasPorAgente(),
  ]);
  return rows.map((f) => aAgente(f, ventas));
}

const obtenerAgente = async (nit) => (await listarAgentes({ nit }))[0] || null;

// El agente dueño de un documento (para el panel del agente: el token trae el documento, no el NIT)
async function obtenerAgentePorDocumento(documento) {
  const { rows } = await db.query("SELECT nit FROM AGENTE WHERE numero_identificacion = $1", [documento]);
  return rows[0] ? obtenerAgente(rows[0].nit) : null;
}

async function crearAgente(d) {
  return db.conTransaccion(async (cliente) => {
    await insertarUsuario(cliente, d, d.estado);
    await cliente.query(
      `INSERT INTO AGENTE (numero_identificacion, nit, razon_social, nombre_comercial, descripcion, comision, experiencia)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [d.documento, d.nit, d.razon, d.nombre, d.descripcion, d.comision, d.experiencia]
    );
  });
}

// Modifica los datos del agente por su NIT (el NIT, el documento y el estado no cambian). false si no existe.
async function actualizarAgente(nit, d) {
  return db.conTransaccion(async (cliente) => {
    const { rows } = await cliente.query("SELECT numero_identificacion FROM AGENTE WHERE nit = $1 FOR UPDATE", [nit]);
    if (!rows[0]) return false;
    const documento = rows[0].numero_identificacion;
    await actualizarUsuario(cliente, documento, d);
    await cliente.query(
      `UPDATE AGENTE SET razon_social = $2, nombre_comercial = $3, descripcion = $4, comision = $5, experiencia = $6
        WHERE numero_identificacion = $1`,
      [documento, d.razon, d.nombre, d.descripcion, d.comision, d.experiencia]
    );
    return true;
  });
}

// El propio agente edita el perfil de su empresa (PUT /agente/perfil): nombre comercial, descripción, logo, correo,
// teléfono, ciudad y experiencia. La razón social, el NIT y la comisión no se cambian aquí.
async function actualizarPerfilAgente(documento, d) {
  const logo = d.logo === null ? undefined : guardarImagen(d.logo, "logos", "logo", "logo");
  return db.conTransaccion(async (cliente) => {
    const idCiudad = await ciudadModel.idObligatorio(d.ciudad, cliente);
    await cliente.query("UPDATE USUARIO SET correo = $2, id_ciudad = $3 WHERE numero_identificacion = $1", [documento, d.correo, idCiudad]);
    await cliente.query(
      `UPDATE AGENTE SET nombre_comercial = $2, descripcion = $3, experiencia = $4,
                         logo_url = CASE WHEN $5::boolean THEN logo_url ELSE $6 END
        WHERE numero_identificacion = $1`,
      [documento, d.nombre, d.descripcion, d.experiencia, logo === undefined, logo === undefined ? null : logo]
    );
    const { rows } = await cliente.query(
      "SELECT telefono FROM USUARIO_TELEFONO WHERE numero_identificacion = $1 ORDER BY telefono LIMIT 1", [documento]);
    const actual = rows[0] ? rows[0].telefono : "";
    if (actual !== d.telefono) {
      if (actual) await cliente.query("DELETE FROM USUARIO_TELEFONO WHERE numero_identificacion = $1 AND telefono = $2", [documento, actual]);
      if (d.telefono) {
        await cliente.query("INSERT INTO USUARIO_TELEFONO (numero_identificacion, telefono) VALUES ($1, $2) ON CONFLICT DO NOTHING", [documento, d.telefono]);
      }
    }
  });
}

const cambiarEstadoAgente = async (nit, estado) => {
  const { rowCount } = await db.query(
    `UPDATE USUARIO u SET estado_usuario = $2::estado_usuario_t FROM AGENTE ag
      WHERE ag.nit = $1 AND u.numero_identificacion = ag.numero_identificacion`, [nit, estado]);
  return rowCount > 0;
};

const eliminarAgente = (nit) => borrarUsuario("AGENTE", "nit", nit);

// ---------------------------------------------------------------------------------------------
// CLIENTES
// ---------------------------------------------------------------------------------------------

const SELECT_CLIENTE = `
  SELECT ${BASE}, cl.alias, ${FECHA("cl.fecha_nacimiento")} AS nacimiento, cl.puntos, cl.publicidad, cl.foto_perfil
    FROM USUARIO u
    JOIN CLIENTE cl ON cl.numero_identificacion = u.numero_identificacion
    JOIN CIUDAD c   ON c.id_ciudad = u.id_ciudad`;

// "Usada" es un estado interno de la reserva (la entrada ya se validó): la web solo conoce Reservada, Confirmada y Cancelada
const estadoWeb = (estado) => (estado === "Usada" ? "Confirmada" : estado);

async function listarClientes({ documento } = {}) {
  const [{ rows }, reservas] = await Promise.all([
    db.query(`${SELECT_CLIENTE} WHERE ($1::text IS NULL OR u.numero_identificacion = $1) ORDER BY u.nombre_completo`, [documento || null]),
    db.query(
      `SELECT numero_identificacion AS doc, codigo_evento, numero_entradas, estado,
              ${FECHA("fecha_hora")} AS fecha, to_char(fecha_hora, 'YYYY-MM') AS mes
         FROM RESERVA WHERE ($1::text IS NULL OR numero_identificacion = $1) ORDER BY fecha_hora DESC, id_reserva DESC`,
      [documento || null]),
  ]);

  const porCliente = new Map();
  for (const r of reservas.rows) (porCliente.get(r.doc) || porCliente.set(r.doc, []).get(r.doc)).push(r);
  const meses = ultimosMeses(6);

  return rows.map((f) => {
    const suyas = porCliente.get(f.documento) || [];
    return {
      ...aPersona(f),
      alias: f.alias || "",
      nacimiento: f.nacimiento,
      puntos: f.puntos,
      publicidad: f.publicidad,
      cuenta: CUENTA_DE_ESTADO[f.estado_usuario] || f.estado_usuario,
      // entradas compradas en cada uno de los últimos 6 meses (las canceladas no cuentan)
      compras: meses.map((m) => suyas.filter((r) => r.mes === claveMes(m) && r.estado !== "Cancelada")
        .reduce((s, r) => s + r.numero_entradas, 0)),
      // [id del evento, entradas, estado, fecha]
      reservas: suyas.map((r) => [r.codigo_evento, r.numero_entradas, estadoWeb(r.estado), r.fecha]),
    };
  });
}

const obtenerCliente = async (documento) => (await listarClientes({ documento }))[0] || null;

async function crearCliente(d) {
  return db.conTransaccion(async (cliente) => {
    await insertarUsuario(cliente, d, "Activo");
    await cliente.query(
      `INSERT INTO CLIENTE (numero_identificacion, fecha_nacimiento, alias, puntos, publicidad) VALUES ($1, $2, $3, $4, $5)`,
      [d.documento, d.nacimiento, d.alias, d.puntos, d.publicidad]
    );
  });
}

async function actualizarCliente(documento, d) {
  return db.conTransaccion(async (cliente) => {
    const { rows } = await cliente.query("SELECT 1 FROM CLIENTE WHERE numero_identificacion = $1 FOR UPDATE", [documento]);
    if (!rows[0]) return false;
    await actualizarUsuario(cliente, documento, d);
    await cliente.query(
      `UPDATE CLIENTE SET fecha_nacimiento = $2, alias = $3, puntos = $4, publicidad = $5 WHERE numero_identificacion = $1`,
      [documento, d.nacimiento, d.alias, d.puntos, d.publicidad]
    );
    return true;
  });
}

const cambiarEstadoCliente = async (documento, estado) => {
  const { rowCount } = await db.query(
    `UPDATE USUARIO u SET estado_usuario = $2::estado_usuario_t FROM CLIENTE cl
      WHERE cl.numero_identificacion = $1 AND u.numero_identificacion = cl.numero_identificacion`, [documento, estado]);
  return rowCount > 0;
};

const eliminarCliente = (documento) => borrarUsuario("CLIENTE", "numero_identificacion", documento);

// ---------------------------------------------------------------------------------------------
// ADMINISTRADORES
// ---------------------------------------------------------------------------------------------

const SELECT_ADMIN = `
  SELECT ${BASE}, ad.salario::float8 AS salario, ad.horario
    FROM USUARIO u
    JOIN ADMIN ad ON ad.numero_identificacion = u.numero_identificacion
    JOIN CIUDAD c ON c.id_ciudad = u.id_ciudad`;

async function listarAdministradores({ documento } = {}) {
  const { rows } = await db.query(
    `${SELECT_ADMIN} WHERE ($1::text IS NULL OR u.numero_identificacion = $1) ORDER BY u.fecha_registro, u.nombre_completo`, [documento || null]);
  return rows.map((f) => ({ ...aPersona(f), salario: f.salario, horario: f.horario }));
}

const obtenerAdministrador = async (documento) => (await listarAdministradores({ documento }))[0] || null;

async function crearAdministrador(d) {
  return db.conTransaccion(async (cliente) => {
    await insertarUsuario(cliente, d, "Activo");
    await cliente.query("INSERT INTO ADMIN (numero_identificacion, salario, horario) VALUES ($1, $2, $3::jornada_t)", [d.documento, d.salario, d.horario]);
  });
}

async function actualizarAdministrador(documento, d) {
  return db.conTransaccion(async (cliente) => {
    const { rows } = await cliente.query("SELECT 1 FROM ADMIN WHERE numero_identificacion = $1 FOR UPDATE", [documento]);
    if (!rows[0]) return false;
    await actualizarUsuario(cliente, documento, d);
    await cliente.query("UPDATE ADMIN SET salario = $2, horario = $3::jornada_t WHERE numero_identificacion = $1", [documento, d.salario, d.horario]);
    return true;
  });
}

// Elimina un administrador. La regla "no se borra la cuenta propia ni al último" se comprueba dentro de la transacción,
// con las filas de ADMIN bloqueadas, para que dos peticiones a la vez no dejen el sistema sin administradores.
async function eliminarAdministrador(documento, documentoQuienBorra) {
  return db.conTransaccion(async (cliente) => {
    const { rows } = await cliente.query("SELECT numero_identificacion FROM ADMIN FOR UPDATE");
    if (!rows.some((r) => r.numero_identificacion === documento)) return false;
    if (documento === documentoQuienBorra) throw new ErrorHttp(409, "No puedes eliminar tu propia cuenta.");
    if (rows.length <= 1) throw new ErrorHttp(409, "No se puede eliminar al único administrador.");
    await cliente.query("DELETE FROM USUARIO WHERE numero_identificacion = $1", [documento]);
    return true;
  });
}

module.exports = {
  aPersona, estadoWeb, ventasPorAgente,
  listarAgentes, obtenerAgente, obtenerAgentePorDocumento, crearAgente, actualizarAgente, actualizarPerfilAgente,
  cambiarEstadoAgente, eliminarAgente,
  listarClientes, obtenerCliente, crearCliente, actualizarCliente, cambiarEstadoCliente, eliminarCliente,
  listarAdministradores, obtenerAdministrador, crearAdministrador, actualizarAdministrador, eliminarAdministrador,
};
