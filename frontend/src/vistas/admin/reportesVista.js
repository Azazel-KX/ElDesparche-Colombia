/* ==========================================================================
   vistas/admin/reportesVista.js
   Reportes del administrador (admin.html?seccion=reportes): tablas, cifras y gráficas de barras.
   ========================================================================== */

import { escapar, numero, pesos, pesosCompacto, textoPrecio } from "../../lib/formato.js";
import { pintarTarjetasResumen } from "../graficasVista.js";
import { NOMBRES_MESES } from "../../modelos/reporteModelo.js";
import { animarAlVer } from "../../lib/dom.js";
import { fechaHora } from "../../lib/fechas.js";
import { CLASE_RESERVA, etiqueta } from "../etiquetasVista.js";
import { leerCancelacion } from "../../modelos/cancelacionModelo.js";

function caja(id) { return document.getElementById(id); }

/* Tabla de reporte. columnas: [{ titulo, numero? }]; filas: arreglos de celdas
   ya escapadas. La primera celda de cada fila es su encabezado. */
export function tablaReporte(titulo, columnas, filas, pie) {
  if (filas.length === 0) {
    return '<p class="reporte-vacio">No hay datos para este reporte.</p>';
  }
  return '<div class="reporte-marco" role="region" aria-label="' + escapar(titulo) + '" tabindex="0">' +
    '<table class="reporte-tabla">' +
      '<caption class="oculto">' + escapar(titulo) + '</caption>' +
      '<thead><tr>' + columnas.map(function (c) {
        return '<th scope="col"' + (c.numero ? ' class="numero"' : '') + '>' + c.titulo + '</th>';
      }).join("") + '</tr></thead>' +
      '<tbody>' + filas.map(function (fila) {
        return '<tr>' + fila.map(function (celda, i) {
          if (i === 0) return '<th scope="row">' + celda + '</th>';
          return '<td' + (columnas[i].numero ? ' class="numero"' : '') + '>' + celda + '</td>';
        }).join("") + '</tr>';
      }).join("") + '</tbody>' +
      (pie ? '<tfoot><tr>' + pie.map(function (celda, i) {
        return i === 0 ? '<th scope="row">' + celda + '</th>'
          : '<td' + (columnas[i].numero ? ' class="numero"' : '') + '>' + celda + '</td>';
      }).join("") + '</tr></tfoot>' : '') +
    '</table>' +
  '</div>';
}

/* Un cero se ve tenue para que resalten los meses con movimiento */
export function cifra(n, formato) {
  return n === 0 ? '<span class="reporte-cero">0</span>' : (formato || numero.format)(n);
}

/* Barras horizontales con su valor: [{ nombre, valor }] */
export function barrasReporte(items, formato, descripcion) {
  var maximo = Math.max.apply(null, items.map(function (i) { return i.valor; }).concat([1]));
  return '<figure class="admin-figura">' +
    '<figcaption class="oculto">' + escapar(descripcion) + '</figcaption>' +
    '<ul class="barras">' + items.map(function (item, i) {
      return '<li style="--orden:' + i + '">' +
        '<div class="barra-texto"><span>' + escapar(item.nombre) + '</span><strong>' + formato(item.valor) + '</strong></div>' +
        '<div class="barra-pista" aria-hidden="true"><span class="barra" style="--ancho:' + (item.valor / maximo * 100).toFixed(1) + '%"></span></div>' +
      '</li>';
    }).join("") + '</ul>' +
  '</figure>';
}

export function pintarGenerales(datos) {
  var t = datos.totales;
  pintarTarjetasResumen([
    { titulo: "Clientes registrados", valor: t.clientes, formato: numero.format },
    { titulo: "Agentes registrados", valor: t.agentes, formato: numero.format },
    { titulo: "Administradores registrados", valor: t.administradores, formato: numero.format },
    { titulo: "Reservas registradas", valor: t.reservas, formato: numero.format },
    { titulo: "Eventos registrados", valor: t.eventos, formato: numero.format }
  ], "reporte-generales");

  pintarTarjetasResumen([
    { titulo: "Promedio de ingresos por agente", valor: datos.promedios.porAgente, formato: pesosCompacto.format, completo: pesos.format },
    { titulo: "Promedio de ingresos por cliente", valor: datos.promedios.porCliente, formato: pesosCompacto.format, completo: pesos.format }
  ], "reporte-promedios");
}

export function pintarComerciales(datos) {
  var porAgente = datos.ingresosPorAgente.slice().sort(function (a, b) { return b.ingresos - a.ingresos; });
  caja("reporte-ingresos-agente").innerHTML = tablaReporte(
    "Ingresos de cada agente comparados con el promedio",
    [{ titulo: "Agente" }, { titulo: "Ingresos", numero: true }, { titulo: "Frente al promedio", numero: true }],
    porAgente.map(function (a) {
      var dif = a.ingresos - datos.promedios.porAgente;
      return [escapar(a.nombre), cifra(a.ingresos, pesos.format),
        (dif >= 0 ? "+" : "−") + pesos.format(Math.abs(dif))];
    }));

  var porCliente = datos.ingresosPorCliente.slice().sort(function (a, b) { return b.ingresos - a.ingresos; });
  caja("reporte-ingresos-cliente").innerHTML = tablaReporte(
    "Ingresos de cada cliente comparados con el promedio",
    [{ titulo: "Cliente" }, { titulo: "Ingresos", numero: true }, { titulo: "Frente al promedio", numero: true }],
    porCliente.map(function (c) {
      var dif = c.ingresos - datos.promedios.porCliente;
      return [escapar(c.nombre), cifra(c.ingresos, pesos.format),
        (dif >= 0 ? "+" : "−") + pesos.format(Math.abs(dif))];
    }));

  var totalAnio = datos.ingresosPorMes.reduce(function (s, v) { return s + v; }, 0);
  caja("reporte-ingresos-mes").innerHTML =
    '<p class="reporte-total">Total del ' + datos.anio + ': <strong>' + pesos.format(totalAnio) + '</strong></p>' +
    barrasReporte(NOMBRES_MESES.map(function (m, i) { return { nombre: m, valor: datos.ingresosPorMes[i] }; }),
      pesos.format, "Ingresos de todos los eventos en cada mes del " + datos.anio + ".");
  animarAlVer(caja("reporte-ingresos-mes").querySelector(".admin-figura"));

  var filas = datos.reservasPorEventoMes.slice().sort(function (a, b) { return a.evento.localeCompare(b.evento, "es"); });
  var totalesMes = NOMBRES_MESES.map(function (m, i) {
    return filas.reduce(function (s, f) { return s + f.meses[i]; }, 0);
  });
  caja("reporte-reservas-evento-mes").innerHTML = tablaReporte(
    "Número de reservas por evento y por mes en " + datos.anio,
    [{ titulo: "Evento" }].concat(NOMBRES_MESES.map(function (m) {
      return { titulo: '<span aria-hidden="true">' + m.slice(0, 3) + '</span><span class="oculto">' + m + '</span>', numero: true };
    })).concat([{ titulo: "Total", numero: true }]),
    filas.map(function (f) {
      return [escapar(f.evento)].concat(f.meses.map(function (n) { return cifra(n); }))
        .concat(['<strong>' + f.meses.reduce(function (s, n) { return s + n; }, 0) + '</strong>']);
    }),
    ["Total"].concat(totalesMes.map(function (n) { return cifra(n); }))
      .concat(['<strong>' + totalesMes.reduce(function (s, n) { return s + n; }, 0) + '</strong>']));

  var agentesLista = [];
  var ciudades = [];
  datos.eventosPorAgenteCiudad.forEach(function (x) {
    if (agentesLista.indexOf(x.agente) === -1) agentesLista.push(x.agente);
    if (ciudades.indexOf(x.ciudad) === -1) ciudades.push(x.ciudad);
  });
  agentesLista.sort(function (a, b) { return a.localeCompare(b, "es"); });
  ciudades.sort(function (a, b) { return a.localeCompare(b, "es"); });
  function cuantos(agente, ciudad) {
    var x = datos.eventosPorAgenteCiudad.filter(function (y) { return y.agente === agente && y.ciudad === ciudad; })[0];
    return x ? x.eventos : 0;
  }
  caja("reporte-agente-ciudad").innerHTML = tablaReporte(
    "Número de eventos creados por cada agente y por ciudad",
    [{ titulo: "Agente" }].concat(ciudades.map(function (c) { return { titulo: escapar(c), numero: true }; }))
      .concat([{ titulo: "Total", numero: true }]),
    agentesLista.map(function (a) {
      var fila = ciudades.map(function (c) { return cuantos(a, c); });
      return [escapar(a)].concat(fila.map(function (n) { return cifra(n); }))
        .concat(['<strong>' + fila.reduce(function (s, n) { return s + n; }, 0) + '</strong>']);
    }));
}

export function pintarCobertura(datos) {
  var filas = datos.eventosPorUbicacion.slice().sort(function (a, b) {
    return a.pais.localeCompare(b.pais, "es") || a.departamento.localeCompare(b.departamento, "es") ||
      a.ciudad.localeCompare(b.ciudad, "es");
  });
  caja("reporte-ubicacion").innerHTML = tablaReporte(
    "Listado de eventos por país, departamento y ciudad de realización",
    [{ titulo: "Ciudad" }, { titulo: "Departamento" }, { titulo: "País" }, { titulo: "Eventos", numero: true }, { titulo: "Nombres" }],
    filas.map(function (f) {
      return [escapar(f.ciudad), escapar(f.departamento), escapar(f.pais), String(f.eventos.length),
        '<ul class="reporte-nombres">' + f.eventos.map(function (n) { return '<li>' + escapar(n) + '</li>'; }).join("") + '</ul>'];
    }));
}

export function pintarHistorial(datos) {
  var elegido = caja("reporte-cliente").value;
  var lista = datos.reservas.filter(function (r) { return r.cliente === elegido; })
    .sort(function (a, b) { return b.fecha.localeCompare(a.fecha); });
  caja("reporte-historial").innerHTML = tablaReporte(
    "Historial de reservas de " + elegido,
    [{ titulo: "Reserva" }, { titulo: "Fecha" }, { titulo: "Evento" }, { titulo: "Entradas", numero: true },
      { titulo: "Valor", numero: true }, { titulo: "Estado" }],
    lista.map(function (r) {
      return [escapar(r.codigo), fechaHora(r.fecha), escapar(r.evento), String(r.entradas), textoPrecio(r.valor),
        etiqueta(r.estado, CLASE_RESERVA[r.estado] || "", "Estado")];
    }));
}

export function pintarOperacion(datos) {
  var clientes = [];
  datos.reservas.forEach(function (r) { if (clientes.indexOf(r.cliente) === -1) clientes.push(r.cliente); });
  clientes.sort(function (a, b) { return a.localeCompare(b, "es"); });
  caja("reporte-cliente").innerHTML = clientes.map(function (c) {
    var n = datos.reservas.filter(function (r) { return r.cliente === c; }).length;
    return '<option value="' + escapar(c) + '">' + escapar(c) + ' (' + n + (n === 1 ? ' reserva' : ' reservas') + ')</option>';
  }).join("");
  pintarHistorial(datos);

  /* Reservas canceladas: la causa sale de sus observaciones */
  var canceladas = datos.reservas.filter(function (r) { return r.estado === "Cancelada"; })
    .sort(function (a, b) { return b.fecha.localeCompare(a.fecha); });
  var porCausa = {};
  canceladas.forEach(function (r) {
    var c = leerCancelacion(r.observaciones);
    var causa = c ? c.causa : "Sin causa registrada";
    porCausa[causa] = (porCausa[causa] || 0) + 1;
  });
  caja("reporte-causas-reservas").innerHTML = canceladas.length
    ? barrasReporte(Object.keys(porCausa).sort(function (a, b) { return porCausa[b] - porCausa[a]; })
        .map(function (c) { return { nombre: c, valor: porCausa[c] }; }),
        numero.format, "Número de reservas canceladas por cada causa.")
    : "";
  var figura = caja("reporte-causas-reservas").querySelector(".admin-figura");
  if (figura) animarAlVer(figura);

  caja("reporte-reservas-canceladas").innerHTML = tablaReporte(
    "Reservas canceladas y su causa",
    [{ titulo: "Reserva" }, { titulo: "Cliente" }, { titulo: "Evento" }, { titulo: "Causa" }, { titulo: "La canceló" }],
    canceladas.map(function (r) {
      var c = leerCancelacion(r.observaciones);
      return [escapar(r.codigo), escapar(r.cliente), escapar(r.evento),
        c ? escapar(c.causa) + (c.detalle ? '<span class="reporte-detalle">' + escapar(c.detalle) + '</span>' : '')
          : '<span class="texto-gris">Sin causa registrada</span>',
        c ? escapar(c.quien) : "—"];
    }));

  caja("reporte-eventos-cancelados").innerHTML = tablaReporte(
    "Eventos cancelados y su causa",
    [{ titulo: "Evento" }, { titulo: "Ciudad" }, { titulo: "Agente" }, { titulo: "Causa" }, { titulo: "Lo canceló" }],
    datos.eventosCancelados.map(function (e) {
      var c = leerCancelacion(e.observaciones);
      return [escapar(e.evento), escapar(e.ciudad), escapar(e.agente),
        c ? escapar(c.causa) + (c.detalle ? '<span class="reporte-detalle">' + escapar(c.detalle) + '</span>' : '')
          : '<span class="texto-gris">' + escapar(e.observaciones || "Sin causa registrada") + '</span>',
        c ? escapar(c.quien) : "—"];
    }));
}
