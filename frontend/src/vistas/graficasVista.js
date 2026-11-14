/* ==========================================================================
   vistas/graficasVista.js
   Tarjetas de indicadores y gráficas del panel de administración y del agente.
   ========================================================================== */

import { animarAlVer, contar } from "../lib/dom.js";
import { ultimosMeses } from "../lib/fechas.js";
import { compacto, escapar, numero, pesos, pesosCompacto } from "../lib/formato.js";
import { COLOR_ESTADO } from "./etiquetasVista.js";

function tablaDatos(titulo, columnas, filas) {
  return '<details class="admin-datos">' +
    '<summary>Ver los datos en una tabla</summary>' +
    '<table>' +
      '<caption class="oculto">' + escapar(titulo) + '</caption>' +
      '<thead><tr>' + columnas.map(function (c) { return '<th scope="col">' + c + '</th>'; }).join("") + '</tr></thead>' +
      '<tbody>' + filas.map(function (fila) {
        return '<tr><th scope="row">' + escapar(fila[0]) + '</th>' +
          fila.slice(1).map(function (v) { return '<td>' + v + '</td>'; }).join("") + '</tr>';
      }).join("") + '</tbody>' +
    '</table>' +
  '</details>';
}

/* Tarjetas de indicadores: { titulo, valor, formato, completo?, cambio?, alerta? }.
   "idLista" sirve para las páginas con más de un grupo de tarjetas. */
export function pintarTarjetasResumen(tarjetas, idLista) {
  var lista = document.getElementById(idLista || "admin-indicadores");

  lista.innerHTML = tarjetas.map(function (t, i) {
    var cambio = "";
    if (t.cambio !== undefined && t.cambio !== null) {
      var sube = t.cambio >= 0;
      cambio = '<p class="admin-cambio ' + (sube ? "sube" : "baja") + '">' +
        (sube ? "Sube " : "Baja ") + Math.abs(t.cambio) + "% frente al mes anterior</p>";
    }

    return '<li class="admin-indicador' + (t.alerta ? " admin-indicador-alerta" : "") + '" style="--orden:' + i + '">' +
      '<p class="admin-indicador-titulo">' + t.titulo + '</p>' +
      '<p class="admin-indicador-valor">' +
        '<span aria-hidden="true" data-valor="' + i + '">' + t.formato(0) + '</span>' +
        '<span class="oculto">' + (t.completo || t.formato)(t.valor) + '</span>' +
      '</p>' +
      cambio +
    '</li>';
  }).join("");

  tarjetas.forEach(function (t, i) {
    contar(lista.querySelector('[data-valor="' + i + '"]'), t.valor, t.formato);
  });

  lista.classList.remove("visible");
  animarAlVer(lista);
}

export function pintarIndicadores(datos) {
  var ind = datos.indicadores;
  var ultimo = datos.meses[datos.meses.length - 1];
  var anterior = datos.meses[datos.meses.length - 2];

  function variacion(clave) {
    if (!anterior || !anterior[clave]) return null;
    return Math.round((ultimo[clave] - anterior[clave]) / anterior[clave] * 100);
  }

  var tarjetas = [
    { titulo: "Eventos activos", valor: ind.eventosActivos, formato: numero.format },
    { titulo: "Reservas", valor: ind.reservas, formato: numero.format, cambio: variacion("reservas") },
    { titulo: "Ingresos", valor: ind.ingresos, formato: pesosCompacto.format, completo: pesos.format, cambio: variacion("ingresos") },
    { titulo: "Agentes", valor: ind.agentes, formato: numero.format },
    { titulo: "Clientes", valor: ind.clientes, formato: numero.format },
    { titulo: "Eventos por revisar", valor: ind.eventosPorRevisar, formato: numero.format, alerta: true }
  ];

  pintarTarjetasResumen(tarjetas);
}

var serieActual = "reservas";

export function pintarMeses(datos) {
  var caja = document.getElementById("grafica-meses");
  var ancho = Math.max(caja.clientWidth, 280);
  var alto = ancho < 600 ? 240 : 300;
  var izq = 64;
  var der = 16;
  var arriba = 20;
  var abajo = 36;

  var valores = datos.meses.map(function (m) { return m[serieActual]; });
  var maximo = Math.max.apply(null, valores) * 1.15;
  var formato = serieActual === "ingresos" ? compacto.format : numero.format;
  var nombre = serieActual === "ingresos" ? "Ingresos" : (datos.nombreCantidad || "Reservas");

  var paso = (ancho - izq - der) / (valores.length - 1);
  var saltoEtiqueta = Math.ceil(52 / paso);
  var x = function (i) { return izq + i * paso; };
  var y = function (v) { return arriba + (alto - arriba - abajo) * (1 - v / maximo); };

  var puntos = valores.map(function (v, i) { return x(i).toFixed(1) + "," + y(v).toFixed(1); });
  var linea = "M" + puntos.join(" L");
  var area = linea + " L" + x(valores.length - 1).toFixed(1) + "," + (alto - abajo) +
             " L" + izq + "," + (alto - abajo) + " Z";

  var guias = "";
  for (var g = 0; g <= 4; g++) {
    var valorGuia = maximo * g / 4;
    var yGuia = y(valorGuia).toFixed(1);
    guias += '<line class="guia" x1="' + izq + '" x2="' + (ancho - der) + '" y1="' + yGuia + '" y2="' + yGuia + '"/>' +
             '<text class="eje" x="' + (izq - 10) + '" y="' + yGuia + '" text-anchor="end" dominant-baseline="middle">' +
               (serieActual === "ingresos" ? "$" : "") + formato(Math.round(valorGuia)) + '</text>';
  }

  var marcas = datos.meses.map(function (m, i) {
    var v = valores[i];
    var texto = (serieActual === "ingresos" ? pesos.format(v) : numero.format(v));
    return '<g class="punto" style="--orden:' + i + '">' +
      '<rect class="zona" x="' + (x(i) - paso / 2).toFixed(1) + '" y="' + arriba + '" width="' + paso.toFixed(1) + '" height="' + (alto - arriba - abajo) + '"/>' +
      '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="5"/>' +
      '<text class="valor" x="' + x(i).toFixed(1) + '" y="' + (y(v) - 14).toFixed(1) + '" text-anchor="middle">' + texto + '</text>' +
      ((valores.length - 1 - i) % saltoEtiqueta === 0
        ? '<text class="eje" x="' + x(i).toFixed(1) + '" y="' + (alto - 12) + '" text-anchor="middle">' + escapar(m.mes) + '</text>'
        : '') +
    '</g>';
  }).join("");

  var primero = valores[0];
  var ultimo = valores[valores.length - 1];
  var descripcion = nombre + " por mes, de " + datos.meses[0].mes + " a " + datos.meses[datos.meses.length - 1].mes +
    ": pasa de " + formato(primero) + " a " + formato(ultimo) + ".";

  caja.innerHTML =
    '<figure class="admin-figura grafica-area">' +
      '<svg viewBox="0 0 ' + ancho + ' ' + alto + '" role="img" aria-labelledby="desc-meses">' +
        '<title id="desc-meses">' + escapar(descripcion) + '</title>' +
        '<defs><linearGradient id="relleno-area" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#5b36f2" stop-opacity="0.35"/>' +
          '<stop offset="1" stop-color="#5b36f2" stop-opacity="0"/>' +
        '</linearGradient></defs>' +
        guias +
        '<path class="area" d="' + area + '"/>' +
        '<path class="linea" d="' + linea + '" pathLength="1"/>' +
        marcas +
      '</svg>' +
    '</figure>' +
    tablaDatos(nombre + " por mes", ["Mes", nombre], datos.meses.map(function (m) {
      return [m.mes, serieActual === "ingresos" ? pesos.format(m[serieActual]) : numero.format(m[serieActual])];
    }));

  var figura = caja.querySelector(".admin-figura");
  animarAlVer(figura);
}

export function prepararSelectorSerie(obtenerDatos) {
  var botones = document.querySelectorAll(".admin-selector button");
  botones.forEach(function (boton) {
    boton.onclick = function () {
      serieActual = boton.getAttribute("data-serie");
      botones.forEach(function (b) {
        b.setAttribute("aria-pressed", b === boton ? "true" : "false");
      });
      pintarMeses(obtenerDatos());
    };
  });
}

export function pintarEstados(datos) {
  var caja = document.getElementById("grafica-estados");
  var total = datos.estados.reduce(function (s, e) { return s + e.total; }, 0);
  var acumulado = 0;
  var separacion = 0.8;

  var segmentos = datos.estados.filter(function (e) { return e.total > 0; }).map(function (e, i) {
    var parte = e.total / total * 100;
    var largo = Math.max(parte - separacion, 0.1);
    var segmento = '<circle class="segmento" cx="60" cy="60" r="46" pathLength="100" ' +
      'style="--largo:' + largo.toFixed(2) + ';--inicio:' + (-acumulado).toFixed(2) + ';--orden:' + i + ';stroke:' + COLOR_ESTADO[e.estado] + '"/>';
    acumulado += parte;
    return segmento;
  }).join("");

  var leyenda = datos.estados.map(function (e) {
    var porcentaje = total ? Math.round(e.total / total * 100) : 0;
    return '<li>' +
      '<span class="muestra" style="background:' + COLOR_ESTADO[e.estado] + '" aria-hidden="true"></span>' +
      '<span class="leyenda-nombre">' + escapar(e.estado) + '</span>' +
      '<span class="leyenda-valor">' + e.total + ' <span class="texto-gris">(' + porcentaje + '%)</span></span>' +
    '</li>';
  }).join("");

  caja.innerHTML =
    '<figure class="admin-figura grafica-anillo">' +
      '<div class="anillo">' +
        '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">' +
          '<circle class="fondo-anillo" cx="60" cy="60" r="46"/>' + segmentos +
        '</svg>' +
        '<p class="anillo-total"><strong>' + total + '</strong> eventos</p>' +
      '</div>' +
      '<figcaption class="oculto">Distribución de los ' + total + ' eventos según su estado.</figcaption>' +
      '<ul class="leyenda">' + leyenda + '</ul>' +
    '</figure>';

  animarAlVer(caja.querySelector(".admin-figura"));
}

export function pintarCategorias(datos) {
  var caja = document.getElementById("grafica-categorias");
  var maximo = Math.max.apply(null, datos.categorias.map(function (c) { return c.ingresos; }));

  caja.innerHTML =
    '<figure class="admin-figura">' +
      '<figcaption class="oculto">Ingresos de cada categoría en el periodo elegido.</figcaption>' +
      '<ul class="barras">' + datos.categorias.map(function (c, i) {
        return '<li style="--orden:' + i + '">' +
          '<div class="barra-texto"><span>' + escapar(c.categoria) + '</span><strong>' + pesos.format(c.ingresos) + '</strong></div>' +
          '<div class="barra-pista" aria-hidden="true"><span class="barra" style="--ancho:' + (c.ingresos / maximo * 100).toFixed(1) + '%"></span></div>' +
        '</li>';
      }).join("") + '</ul>' +
    '</figure>';

  animarAlVer(caja.querySelector(".admin-figura"));
}

export function pintarAgentes(datos) {
  var caja = document.getElementById("grafica-agentes");
  var maximo = Math.max.apply(null, datos.agentes.map(function (a) { return a.ingresos; }));

  caja.innerHTML =
    '<figure class="admin-figura">' +
      '<figcaption class="oculto">Agentes ordenados por ingresos en el periodo elegido.</figcaption>' +
      '<ol class="barras ranking">' + datos.agentes.map(function (a, i) {
        return '<li style="--orden:' + i + '">' +
          '<span class="ranking-puesto" aria-hidden="true">' + (i + 1) + '</span>' +
          '<div class="ranking-cuerpo">' +
            '<div class="barra-texto"><span>' + escapar(a.nombre) + '</span><strong>' + pesos.format(a.ingresos) + '</strong></div>' +
            '<div class="barra-pista" aria-hidden="true"><span class="barra" style="--ancho:' + (a.ingresos / maximo * 100).toFixed(1) + '%"></span></div>' +
            '<p class="ranking-detalle">' + a.eventos + ' eventos · ' + numero.format(a.entradas) + ' entradas vendidas</p>' +
          '</div>' +
        '</li>';
      }).join("") + '</ol>' +
    '</figure>';

  animarAlVer(caja.querySelector(".admin-figura"));
}

export function pintarActividad(datos) {
  var lista = document.getElementById("admin-actividad");
  lista.innerHTML = datos.actividad.map(function (a, i) {
    return '<li style="--orden:' + i + '">' +
      '<span class="actividad-cuando">' + escapar(a.cuando) + '</span>' +
      '<span>' + escapar(a.texto) + '</span>' +
    '</li>';
  }).join("");

  lista.classList.remove("visible");
  animarAlVer(lista);
}

/* Columnas con un valor por cada uno de los últimos meses */
export function graficaVentas(valores, titulo) {
  var agente = { ventas: valores };
  var meses = ultimosMeses(agente.ventas.length);
  var ancho = 360;
  var alto = 170;
  var abajo = 26;
  var arriba = 22;
  var maximo = Math.max.apply(null, agente.ventas.concat([1]));
  var paso = ancho / agente.ventas.length;
  var columna = Math.min(paso * 0.55, 34);

  var barras = agente.ventas.map(function (v, i) {
    var h = (alto - arriba - abajo) * v / maximo;
    var x = paso * i + (paso - columna) / 2;
    return '<g style="--orden:' + i + '">' +
      '<rect class="columna" x="' + x.toFixed(1) + '" y="' + (alto - abajo - h).toFixed(1) + '" width="' + columna.toFixed(1) + '" height="' + Math.max(h, 0).toFixed(1) + '" rx="6"/>' +
      '<text class="valor-columna" x="' + (x + columna / 2).toFixed(1) + '" y="' + (alto - abajo - h - 6).toFixed(1) + '" text-anchor="middle">' + numero.format(v) + '</text>' +
      '<text class="eje" x="' + (x + columna / 2).toFixed(1) + '" y="' + (alto - 6) + '" text-anchor="middle">' + meses[i] + '</text>' +
    '</g>';
  }).join("");

  return '<figure class="admin-figura grafica-columnas">' +
      '<svg viewBox="0 0 ' + ancho + ' ' + alto + '" aria-hidden="true" focusable="false">' +
        '<line class="guia" x1="0" x2="' + ancho + '" y1="' + (alto - abajo) + '" y2="' + (alto - abajo) + '"/>' +
        barras +
      '</svg>' +
    '</figure>' +
    tablaDatos(titulo, ["Mes", "Entradas"], agente.ventas.map(function (v, i) {
      return [meses[i], numero.format(v)];
    }));
}

/* Anillo con leyenda: [{ nombre, total, color }] */
export function graficaAnillo(items, nombreTotal, descripcion) {
  var total = items.reduce(function (s, i) { return s + i.total; }, 0);
  var acumulado = 0;

  var segmentos = items.filter(function (i) { return i.total > 0; }).map(function (item, i) {
    var parte = item.total / total * 100;
    var largo = Math.max(parte - 0.8, 0.1);
    var html = '<circle class="segmento" cx="60" cy="60" r="46" pathLength="100" ' +
      'style="--largo:' + largo.toFixed(2) + ';--inicio:' + (-acumulado).toFixed(2) + ';--orden:' + i + ';stroke:' + item.color + '"/>';
    acumulado += parte;
    return html;
  }).join("");

  return '<figure class="admin-figura grafica-anillo">' +
      '<div class="anillo">' +
        '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">' +
          '<circle class="fondo-anillo" cx="60" cy="60" r="46"/>' + segmentos +
        '</svg>' +
        '<p class="anillo-total"><strong>' + total + '</strong> ' + nombreTotal + '</p>' +
      '</div>' +
      '<figcaption class="oculto">' + escapar(descripcion) + '</figcaption>' +
      '<ul class="leyenda">' + items.map(function (item) {
        var porcentaje = total ? Math.round(item.total / total * 100) : 0;
        return '<li>' +
          '<span class="muestra" style="background:' + item.color + '" aria-hidden="true"></span>' +
          '<span class="leyenda-nombre">' + escapar(item.nombre) + '</span>' +
          '<span class="leyenda-valor">' + item.total + ' <span class="texto-gris">(' + porcentaje + '%)</span></span>' +
        '</li>';
      }).join("") + '</ul>' +
    '</figure>';
}

export function barraOcupacion(e, grande) {
  if (e.estado === "Cancelado") {
    return '<span class="ocupacion-nula">No aplica</span>';
  }
  return '<span class="ocupacion' + (grande ? " ocupacion-grande" : "") + '">' +
    '<span class="ocupacion-texto">' + e.ocupacion + ' %' +
      (grande ? '' : '<span class="oculto"> de ocupación</span>') + '</span>' +
    '<span class="barra-pista" aria-hidden="true"><span class="barra" style="--ancho:' + e.ocupacion + '%;--orden:0"></span></span>' +
  '</span>';
}
