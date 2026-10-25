const db = require("../config/db");
const eventoModel = require("./eventoModel");
const personaModel = require("./personaModel");
const { ES_VALIDA } = require("../utils/sql");
const { ultimosMeses, haceCuanto, codigoReserva } = require("../utils/formato");

// Modelo de RESUMEN y REPORTES: solo lee (agrega) lo que ya guardan EVENTO, RESERVA y las personas.
// Las formas son las de resumenLocal() y reportesLocal() en frontend/js/admin.js y resumenAgenteLocal() en agente.js.
//
// Qué cuenta como INGRESO: el valor_total de las reservas "válidas" (ES_VALIDA en utils/sql.js): no canceladas y
// gratis o confirmadas por un administrador (que aprueba la reserva y el pago). Igual que entradaValida() en la web.

const ESTADOS_PUBLICADOS = ["Programado", "En Boletería", "En Vivo", "Finalizado", "Cancelado"];
const NOMBRE_CATEGORIA = { musica: "Música", teatro: "Teatro", danza: "Danza", circo: "Circo", comedia: "Comedia" };

const FECHA = (c) => `to_char(${c}, 'YYYY-MM-DD"T"HH24:MI:SS')`;
const claveMes = (m) => `${m.anio}-${String(m.mes).padStart(2, "0")}`;

// Inicio de la ventana de N meses como "AAAA-MM-01" (el primer mes de ultimosMeses)
const desde = (meses) => `${claveMes(meses[0])}-01`;

// ---------------------------------------------------------------------------------------------
// Resumen del administrador
// ---------------------------------------------------------------------------------------------

async function resumenAdmin(cantidad) {
  const meses = ultimosMeses(cantidad);
  const inicio = desde(meses);

  const [indicadores, porMes, estados, categorias, agentes, actividad] = await Promise.all([
    db.query(
      `SELECT
         (SELECT COUNT(*) FROM EVENTO WHERE estado NOT IN ('En revisión', 'Rechazado', 'Finalizado', 'Cancelado'))::int AS eventos_activos,
         (SELECT COUNT(*) FROM AGENTE ag JOIN USUARIO u ON u.numero_identificacion = ag.numero_identificacion
            WHERE u.estado_usuario = 'Activo')::int AS agentes,
         (SELECT COUNT(*) FROM CLIENTE cl JOIN USUARIO u ON u.numero_identificacion = cl.numero_identificacion
            WHERE u.estado_usuario = 'Activo')::int AS clientes,
         (SELECT COUNT(*) FROM EVENTO WHERE estado = 'En revisión')::int AS por_revisar`),
    db.query(
      `SELECT to_char(r.fecha_hora, 'YYYY-MM') AS mes, COUNT(*)::int AS reservas, COALESCE(SUM(r.valor_total), 0)::float8 AS ingresos
         FROM RESERVA r
        WHERE ${ES_VALIDA} AND r.fecha_hora >= $1::date
        GROUP BY 1`, [inicio]),
    db.query("SELECT estado::text AS estado, COUNT(*)::int AS total FROM EVENTO WHERE estado::text = ANY($1) GROUP BY 1", [ESTADOS_PUBLICADOS]),
    db.query(
      `SELECT e.categoria, COALESCE(SUM(r.valor_total), 0)::float8 AS ingresos
         FROM EVENTO e
         LEFT JOIN (SELECT r.* FROM RESERVA r WHERE ${ES_VALIDA} AND r.fecha_hora >= $1::date) r ON r.codigo_evento = e.codigo
        WHERE e.estado NOT IN ('En revisión', 'Rechazado')
        GROUP BY 1 ORDER BY 2 DESC, 1`, [inicio]),
    db.query(
      `SELECT COALESCE(ag.nombre_comercial, ag.razon_social) AS nombre,
              (SELECT COUNT(*) FROM EVENTO e WHERE e.numero_identificacion = ag.numero_identificacion
                 AND e.estado NOT IN ('En revisión', 'Rechazado'))::int AS eventos,
              COALESCE(SUM(r.numero_entradas) FILTER (WHERE r.id_reserva IS NOT NULL AND ${ES_VALIDA}), 0)::int AS entradas,
              COALESCE(SUM(r.valor_total) FILTER (WHERE r.id_reserva IS NOT NULL AND ${ES_VALIDA}), 0)::float8 AS ingresos
         FROM AGENTE ag
         JOIN USUARIO u ON u.numero_identificacion = ag.numero_identificacion AND u.estado_usuario = 'Activo'
         LEFT JOIN EVENTO e ON e.numero_identificacion = ag.numero_identificacion
         LEFT JOIN LATERAL (SELECT r.* FROM RESERVA r WHERE r.codigo_evento = e.codigo AND r.fecha_hora >= $1::date) r ON TRUE
        GROUP BY ag.numero_identificacion, ag.nombre_comercial, ag.razon_social
        ORDER BY ingresos DESC, nombre LIMIT 5`, [inicio]),
    actividadReciente(null, 6),
  ]);

  const mensual = new Map(porMes.rows.map((f) => [f.mes, f]));
  const serie = meses.map((m) => ({ mes: m.etiqueta, reservas: (mensual.get(claveMes(m)) || {}).reservas || 0, ingresos: (mensual.get(claveMes(m)) || {}).ingresos || 0 }));
  const conteo = new Map(estados.rows.map((f) => [f.estado, f.total]));
  const i = indicadores.rows[0];

  return {
    indicadores: {
      eventosActivos: i.eventos_activos,
      reservas: serie.reduce((s, m) => s + m.reservas, 0),
      ingresos: serie.reduce((s, m) => s + m.ingresos, 0),
      agentes: i.agentes,
      clientes: i.clientes,
      eventosPorRevisar: i.por_revisar,
    },
    meses: serie,
    estados: ESTADOS_PUBLICADOS.map((estado) => ({ estado, total: conteo.get(estado) || 0 })),
    categorias: categorias.rows.map((c) => ({ categoria: NOMBRE_CATEGORIA[c.categoria] || c.categoria, ingresos: c.ingresos })),
    agentes: agentes.rows,
    actividad,
  };
}

// Lo último que pasó: reservas (nuevas y canceladas) y eventos que los agentes enviaron o se publicaron.
// docAgente = solo lo de los eventos de ese agente (panel del agente); null = todo (panel del administrador).
async function actividadReciente(docAgente, limite) {
  const { rows } = await db.query(
    `SELECT * FROM (
       SELECT r.fecha_hora AS cuando, EXTRACT(EPOCH FROM (NOW() - r.fecha_hora))::int AS segundos,
              CASE WHEN r.estado = 'Cancelada' THEN 'cancelada' WHEN r.estado = 'Reservada' AND r.valor_total > 0 THEN 'pendiente' ELSE 'compra' END AS tipo,
              split_part(u.nombre_completo, ' ', 1) AS quien, r.numero_entradas AS entradas, e.nombre AS evento
         FROM RESERVA r
         JOIN EVENTO e ON e.codigo = r.codigo_evento
         JOIN USUARIO u ON u.numero_identificacion = r.numero_identificacion
        WHERE ($1::text IS NULL OR e.numero_identificacion = $1)
       UNION ALL
       SELECT e.fecha_creacion, EXTRACT(EPOCH FROM (NOW() - e.fecha_creacion))::int,
              CASE WHEN e.estado = 'En revisión' THEN 'solicitud' ELSE 'evento' END,
              COALESCE(ag.nombre_comercial, ag.razon_social), 0, e.nombre
         FROM EVENTO e JOIN AGENTE ag ON ag.numero_identificacion = e.numero_identificacion
        WHERE $1::text IS NULL
     ) a ORDER BY cuando DESC LIMIT $2`,
    [docAgente, limite]
  );

  return rows.map((f) => {
    const entradas = f.entradas === 1 ? "1 entrada" : `${f.entradas} entradas`;
    const texto = {
      cancelada: docAgente ? `${f.quien} canceló ${entradas} para ${f.evento}.` : `Se canceló una reserva de ${entradas} para ${f.evento}.`,
      pendiente: `${f.quien} reservó ${entradas} para ${f.evento} y está por aprobar.`,
      compra: docAgente ? `${f.quien} compró ${entradas} para ${f.evento}.` : `Nueva reserva de ${entradas} para ${f.evento}.`,
      solicitud: `${f.quien} envió «${f.evento}» a revisión.`,
      evento: `${f.quien} registró el evento «${f.evento}».`,
    }[f.tipo];
    return { cuando: haceCuanto(f.segundos), texto };
  });
}

// ---------------------------------------------------------------------------------------------
// Resumen del agente
// ---------------------------------------------------------------------------------------------

async function resumenAgente(documento) {
  const agente = await personaModel.obtenerAgentePorDocumento(documento);
  if (!agente) return null;

  const [eventos, pendientes, actividad] = await Promise.all([
    eventoModel.listarPublicados({ docAgente: documento }),
    db.query(
      `SELECT COUNT(*)::int AS n FROM RESERVA r JOIN EVENTO e ON e.codigo = r.codigo_evento
        WHERE e.numero_identificacion = $1 AND r.estado <> 'Cancelada' AND r.estado = 'Reservada' AND r.valor_total > 0`, [documento]),
    actividadReciente(documento, 6),
  ]);

  const meses = ultimosMeses(6);
  const ventas = (await personaModel.ventasPorAgente()).get(documento) || { entradas: 0, ingresos: 0, porMes: {} };
  const vigentes = eventos.filter((e) => e.estado !== "Cancelado");
  const ocupacion = (e) => {
    const capacidad = Number(String(e.capacidad).replace(/\D/g, ""));
    return capacidad ? Math.round(((capacidad - e.disponibles) / capacidad) * 100) : 0;
  };
  const conteo = {};
  eventos.forEach((e) => { conteo[e.estado] = (conteo[e.estado] || 0) + 1; });

  return {
    agente: { nombre: agente.nombre, estado: agente.estado, comision: agente.comision },
    indicadores: {
      eventosActivos: eventos.filter((e) => e.estado !== "Finalizado" && e.estado !== "Cancelado").length,
      entradas: ventas.entradas,
      ingresos: ventas.ingresos,
      ganancia: Math.round(ventas.ingresos * (1 - agente.comision / 100)),
      ocupacion: vigentes.length ? Math.round(vigentes.reduce((s, e) => s + ocupacion(e), 0) / vigentes.length) : 0,
      porAprobar: pendientes.rows[0].n,
    },
    // "reservas" de cada mes = entradas vendidas ese mes
    meses: meses.map((m) => {
      const v = ventas.porMes[claveMes(m)] || { entradas: 0, ingresos: 0 };
      return { mes: m.etiqueta, reservas: v.entradas, ingresos: v.ingresos };
    }),
    estados: ESTADOS_PUBLICADOS.map((estado) => ({ estado, total: conteo[estado] || 0 })),
    eventos,
    actividad,
  };
}

// ---------------------------------------------------------------------------------------------
// Reportes del administrador (GET /api/admin/reportes?anio=2026)
// ---------------------------------------------------------------------------------------------

async function reportes(anio) {
  const [totales, porAgente, porCliente, porMes, porEventoMes, agenteCiudad, ubicaciones, reservas, cancelados] = await Promise.all([
    db.query(
      `SELECT (SELECT COUNT(*) FROM CLIENTE)::int AS clientes, (SELECT COUNT(*) FROM AGENTE)::int AS agentes,
              (SELECT COUNT(*) FROM ADMIN)::int AS administradores, (SELECT COUNT(*) FROM RESERVA)::int AS reservas,
              (SELECT COUNT(*) FROM EVENTO WHERE estado NOT IN ('En revisión', 'Rechazado'))::int AS eventos`),
    db.query(
      `SELECT COALESCE(ag.nombre_comercial, ag.razon_social) AS nombre, COALESCE(v.ingresos, 0)::float8 AS ingresos
         FROM AGENTE ag
         LEFT JOIN (SELECT e.numero_identificacion AS doc, SUM(r.valor_total) AS ingresos
                      FROM RESERVA r JOIN EVENTO e ON e.codigo = r.codigo_evento
                     WHERE ${ES_VALIDA} GROUP BY 1) v ON v.doc = ag.numero_identificacion
        ORDER BY ingresos DESC, nombre`),
    db.query(
      `SELECT u.nombre_completo AS nombre, COALESCE(v.ingresos, 0)::float8 AS ingresos
         FROM CLIENTE cl JOIN USUARIO u ON u.numero_identificacion = cl.numero_identificacion
         LEFT JOIN (SELECT r.numero_identificacion AS doc, SUM(r.valor_total) AS ingresos
                      FROM RESERVA r WHERE ${ES_VALIDA} GROUP BY 1) v ON v.doc = cl.numero_identificacion
        ORDER BY ingresos DESC, nombre`),
    db.query(
      `SELECT EXTRACT(MONTH FROM r.fecha_hora)::int AS mes, COALESCE(SUM(r.valor_total), 0)::float8 AS ingresos
         FROM RESERVA r WHERE ${ES_VALIDA} AND EXTRACT(YEAR FROM r.fecha_hora) = $1 GROUP BY 1`, [anio]),
    db.query(
      `SELECT e.nombre AS evento, EXTRACT(MONTH FROM r.fecha_hora)::int AS mes, COUNT(*)::int AS reservas
         FROM RESERVA r JOIN EVENTO e ON e.codigo = r.codigo_evento
        WHERE EXTRACT(YEAR FROM r.fecha_hora) = $1 GROUP BY e.codigo, e.nombre, 2 ORDER BY e.nombre`, [anio]),
    db.query(
      `SELECT COALESCE(ag.nombre_comercial, ag.razon_social) AS agente, c.nombre AS ciudad, COUNT(*)::int AS eventos
         FROM EVENTO e
         JOIN AGENTE ag ON ag.numero_identificacion = e.numero_identificacion
         JOIN UBICACION ub ON ub.id_ubicacion = e.id_ubicacion JOIN CIUDAD c ON c.id_ciudad = ub.id_ciudad
        WHERE e.estado NOT IN ('En revisión', 'Rechazado')
        GROUP BY 1, 2 ORDER BY 1, 2`),
    db.query(
      `SELECT p.nombre AS pais, d.nombre AS departamento, c.nombre AS ciudad, array_agg(e.nombre ORDER BY e.nombre) AS eventos
         FROM EVENTO e
         JOIN UBICACION ub ON ub.id_ubicacion = e.id_ubicacion JOIN CIUDAD c ON c.id_ciudad = ub.id_ciudad
         JOIN DEPARTAMENTO d ON d.id_departamento = c.id_departamento JOIN PAIS p ON p.id_pais = d.id_pais
        WHERE e.estado NOT IN ('En revisión', 'Rechazado')
        GROUP BY 1, 2, 3 ORDER BY 1, 2, 3`),
    db.query(
      `SELECT r.id_reserva, ${FECHA("r.fecha_hora")} AS fecha, u.nombre_completo AS cliente,
              u.tipo_identificacion || ' ' || u.numero_identificacion AS documento, e.nombre AS evento,
              r.numero_entradas AS entradas, r.valor_total::float8 AS valor, r.estado, r.observaciones
         FROM RESERVA r JOIN USUARIO u ON u.numero_identificacion = r.numero_identificacion JOIN EVENTO e ON e.codigo = r.codigo_evento
        ORDER BY r.fecha_hora DESC, r.id_reserva DESC`),
    db.query(
      `SELECT e.nombre AS evento, c.nombre AS ciudad, COALESCE(ag.nombre_comercial, ag.razon_social) AS agente, e.observaciones
         FROM EVENTO e
         JOIN AGENTE ag ON ag.numero_identificacion = e.numero_identificacion
         JOIN UBICACION ub ON ub.id_ubicacion = e.id_ubicacion JOIN CIUDAD c ON c.id_ciudad = ub.id_ciudad
        WHERE e.estado = 'Cancelado' ORDER BY e.nombre`),
  ]);

  const t = totales.rows[0];
  const sumar = (filas) => filas.reduce((s, f) => s + f.ingresos, 0);
  const total = sumar(porAgente.rows);
  const meses12 = Array(12).fill(0);
  porMes.rows.forEach((f) => { meses12[f.mes - 1] = f.ingresos; });

  const eventoMes = new Map();
  porEventoMes.rows.forEach((f) => {
    if (!eventoMes.has(f.evento)) eventoMes.set(f.evento, Array(12).fill(0));
    eventoMes.get(f.evento)[f.mes - 1] += f.reservas;
  });

  return {
    anio,
    totales: { clientes: t.clientes, agentes: t.agentes, administradores: t.administradores, reservas: t.reservas, eventos: t.eventos },
    promedios: {
      porAgente: t.agentes ? Math.round(total / t.agentes) : 0,
      porCliente: t.clientes ? Math.round(sumar(porCliente.rows) / t.clientes) : 0,
    },
    ingresosPorAgente: porAgente.rows,
    ingresosPorCliente: porCliente.rows,
    ingresosPorMes: meses12,
    reservasPorEventoMes: [...eventoMes].map(([evento, meses]) => ({ evento, meses })),
    eventosPorAgenteCiudad: agenteCiudad.rows,
    eventosPorUbicacion: ubicaciones.rows,
    reservas: reservas.rows.map((r) => ({
      codigo: codigoReserva(r.id_reserva), fecha: r.fecha, cliente: r.cliente, documento: r.documento, evento: r.evento,
      entradas: r.entradas, valor: r.valor, estado: r.estado === "Usada" ? "Confirmada" : r.estado, observaciones: r.observaciones || "",
    })),
    eventosCancelados: cancelados.rows.map((e) => ({ ...e, observaciones: e.observaciones || "" })),
  };
}

module.exports = { resumenAdmin, resumenAgente, reportes };
