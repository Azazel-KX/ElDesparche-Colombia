/* ==========================================================================
   vistas/prensaVista.js
   Sala de prensa: el planeta con las fotos de los eventos y los botones de copiar.
   ========================================================================== */

import { geoOrthographic, geoEquirectangular, geoPath, geoDistance, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import tierraTopo from "world-atlas/land-110m.json";
import { reducirMovimiento } from "../lib/dom.js";
import { escapar, urlSegura } from "../lib/formato.js";
import { EVENTOS } from "../modelos/eventoModelo.js";

var GIRO_POR_SEGUNDO = 8;

/* grados por segundo: una vuelta cada 45 s */

/* Las fotos grandes de los eventos pesan casi 2 MB; para el planeta se usan
   las miniaturas de la cinta de Nosotros, que son la misma foto */
function miniatura(imagen) {
  var nombre = /^img\/([0-9a-f]{5})\.png$/.exec(imagen || "");
  return nombre ? "img/nosotros/cinta-" + nombre[1] + ".webp" : (imagen || "img/evento-sin-foto.svg");
}

/* Puntos de tierra repartidos por el globo, calculados una sola vez.
   En vez de preguntar punto por punto si cae en tierra (geoContains, muy
   lento), se pinta el mapa plano en un lienzo oculto y se leen sus píxeles. */
function puntosDeTierra(tierra) {
  var ancho = 720;
  var alto = 360;
  var oculto = document.createElement("canvas");
  oculto.width = ancho;
  oculto.height = alto;
  var pincel = oculto.getContext("2d", { willReadFrequently: true });
  var plano = geoEquirectangular().translate([ancho / 2, alto / 2]).scale(ancho / (2 * Math.PI));

  pincel.beginPath();
  geoPath(plano, pincel)(tierra);
  pincel.fillStyle = "#000";
  pincel.fill();
  var pixeles = pincel.getImageData(0, 0, ancho, alto).data;

  var puntos = [];
  for (var lat = -84; lat <= 84; lat += 2.2) {
    var paso = 2.2 / Math.max(Math.cos(lat * Math.PI / 180), 0.2);
    for (var lon = -180; lon < 180; lon += paso) {
      var x = Math.min(ancho - 1, Math.round((lon + 180) / 360 * ancho));
      var y = Math.min(alto - 1, Math.round((90 - lat) / 180 * alto));
      if (pixeles[(y * ancho + x) * 4 + 3] > 128) puntos.push([lon, lat]);
    }
  }
  return puntos;
}

/* Los eventos de una misma ciudad se reparten en un círculo pequeño
   alrededor de ella para que las fotos no queden una encima de otra */
function pinesDeEventos(eventos) {
  var porCiudad = {};
  return eventos.filter(function (e) { return typeof e.lat === "number" && typeof e.lon === "number"; })
    .map(function (e) {
      var clave = e.lat.toFixed(1) + "," + e.lon.toFixed(1);
      var n = porCiudad[clave] = (porCiudad[clave] || 0) + 1;
      var angulo = n * 2.4;
      var radio = n === 1 ? 0 : 1.6 + n * 0.5;
      return {
        titulo: e.titulo,
        ciudad: e.ciudad,
        imagen: miniatura(e.imagen),
        punto: [e.lon + Math.cos(angulo) * radio, e.lat + Math.sin(angulo) * radio]
      };
    });
}

export function prepararGlobo() {
  var figura = document.getElementById("prensa-globo");
  var lienzo = document.getElementById("prensa-lienzo");
  var capaPines = document.getElementById("prensa-pines");
  var botonPausa = document.getElementById("prensa-pausa");
  if (!figura || !lienzo) return;

  var contexto = lienzo.getContext("2d");
  var tierra = feature(tierraTopo, tierraTopo.objects.land);
  var puntos = puntosDeTierra(tierra);
  var reticula = geoGraticule10();
  var pines = pinesDeEventos(EVENTOS);

  var proyeccion = geoOrthographic().clipAngle(90).precision(0.6);
  var camino = geoPath(proyeccion, contexto);

  /* Empieza mirando a Colombia, un poco inclinado */
  var giro = [76, -8, 0];
  var pausado = reducirMovimiento;
  var arrastrando = null;
  var visible = true;
  var anterior = null;
  var tamano = 0;
  var corriendo = false;    /* evita dos animaciones a la vez */

  /* Lista accesible de lo que muestra el planeta */
  document.getElementById("prensa-lista").innerHTML = pines.map(function (p) {
    return "<li>" + escapar(p.titulo) + " — " + escapar(p.ciudad) + "</li>";
  }).join("");

  /* Una foto por evento, que se mueve con el planeta */
  capaPines.innerHTML = pines.map(function (p, i) {
    return '<span class="prensa-pin" style="--giro:' + ((i * 37) % 14 - 7) + 'deg">' +
      '<img src="' + escapar(urlSegura(p.imagen)) + '" alt="" decoding="async"></span>';
  }).join("");
  var elementos = capaPines.querySelectorAll(".prensa-pin");

  function medir() {
    var ancho = figura.querySelector(".prensa-globo-lienzo").clientWidth;
    var escala = window.devicePixelRatio || 1;
    tamano = ancho;
    lienzo.width = Math.round(ancho * escala);
    lienzo.height = Math.round(ancho * escala);
    lienzo.style.width = ancho + "px";
    lienzo.style.height = ancho + "px";
    contexto.setTransform(escala, 0, 0, escala, 0, 0);
    /* El planeta ocupa el centro; alrededor queda la órbita de las fotos */
    proyeccion.translate([ancho / 2, ancho / 2]).scale(ancho / 2 * 0.62);
  }

  function dibujar() {
    var r = tamano / 2;
    proyeccion.rotate(giro);
    contexto.clearRect(0, 0, tamano, tamano);

    /* Esfera con luz desde arriba a la izquierda */
    var luz = contexto.createRadialGradient(r * 0.7, r * 0.6, r * 0.1, r, r, r);
    luz.addColorStop(0, "#3b2470");
    luz.addColorStop(0.55, "#1d1140");
    luz.addColorStop(1, "#0b061a");
    contexto.beginPath();
    camino({ type: "Sphere" });
    contexto.fillStyle = luz;
    contexto.fill();

    /* Meridianos y paralelos */
    contexto.beginPath();
    camino(reticula);
    contexto.strokeStyle = "rgba(196, 181, 253, 0.08)";
    contexto.lineWidth = 1;
    contexto.stroke();

    /* La tierra, en puntos: más brillantes los que miran de frente */
    var centro = [-giro[0], -giro[1]];
    for (var i = 0; i < puntos.length; i++) {
      var distancia = geoDistance(puntos[i], centro);
      if (distancia > 1.5) continue;
      var xy = proyeccion(puntos[i]);
      var cercania = 1 - distancia / 1.57;
      contexto.fillStyle = "rgba(196, 181, 253, " + (0.25 + cercania * 0.6).toFixed(2) + ")";
      contexto.fillRect(xy[0] - 1, xy[1] - 1, 1.8 + cercania, 1.8 + cercania);
    }

    /* Borde con brillo */
    contexto.beginPath();
    camino({ type: "Sphere" });
    contexto.strokeStyle = "rgba(196, 181, 253, 0.35)";
    contexto.lineWidth = 1.5;
    contexto.stroke();

    pintarOrbita(centro, r);
  }

  /* Las fotos giran en una órbita alrededor del planeta, cada una unida
     con una línea a su ciudad. Se separan para que no se tapen. */
  function pintarOrbita(centro, r) {
    var orbita = r * 0.84;
    var separacion = 2 * Math.asin(Math.min(1, 38 / orbita));
    var visibles = [];

    for (var j = 0; j < pines.length; j++) {
      var d = geoDistance(pines[j].punto, centro);
      if (d > 1.45) {
        elementos[j].style.opacity = "0";
        continue;
      }
      var p = proyeccion(pines[j].punto);
      visibles.push({ i: j, p: p, frente: 1 - d / 1.45, angulo: Math.atan2(p[1] - r, p[0] - r) });
    }
    if (!visibles.length) return;

    /* En pantallas pequeñas no caben todas: quedan las que miran más de frente */
    var caben = Math.max(1, Math.floor(2 * Math.PI / separacion) - 1);
    if (visibles.length > caben) {
      visibles.sort(function (a, b) { return b.frente - a.frente; });
      visibles.slice(caben).forEach(function (v) { elementos[v.i].style.opacity = "0"; });
      visibles = visibles.slice(0, caben);
    }

    /* Ángulos respecto al promedio, para que el grupo no se parta en ±180° */
    var sx = 0, sy = 0;
    visibles.forEach(function (v) { sx += Math.cos(v.angulo); sy += Math.sin(v.angulo); });
    var medio = Math.atan2(sy, sx);
    visibles.forEach(function (v) {
      v.relativo = Math.atan2(Math.sin(v.angulo - medio), Math.cos(v.angulo - medio));
    });
    visibles.sort(function (a, b) { return a.relativo - b.relativo; });

    /* Se empujan las vecinas hasta que haya espacio entre todas */
    for (var vuelta = 0; vuelta < 30; vuelta++) {
      for (var k = 1; k < visibles.length; k++) {
        var falta = separacion - (visibles[k].relativo - visibles[k - 1].relativo);
        if (falta > 0) {
          visibles[k].relativo += falta / 2;
          visibles[k - 1].relativo -= falta / 2;
        }
      }
    }

    contexto.lineWidth = 1.2;
    visibles.forEach(function (v) {
      var angulo = medio + v.relativo;
      var x = r + Math.cos(angulo) * orbita;
      var y = r + Math.sin(angulo) * orbita;
      var alfa = Math.min(1, v.frente * 2.2);

      /* Línea desde la ciudad hasta el borde de la foto, y el punto de la ciudad */
      contexto.beginPath();
      contexto.moveTo(v.p[0], v.p[1]);
      contexto.lineTo(x - Math.cos(angulo) * 30, y - Math.sin(angulo) * 30);
      contexto.strokeStyle = "rgba(255, 191, 71, " + (alfa * 0.7).toFixed(2) + ")";
      contexto.stroke();
      contexto.beginPath();
      contexto.arc(v.p[0], v.p[1], 3, 0, Math.PI * 2);
      contexto.fillStyle = "rgba(255, 191, 71, " + alfa.toFixed(2) + ")";
      contexto.fill();

      var el = elementos[v.i];
      el.style.opacity = String(alfa);
      el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) translate(-50%, -50%) " +
        "scale(" + (0.75 + v.frente * 0.25).toFixed(3) + ")";
      el.style.zIndex = String(Math.round(v.frente * 100));
    });
  }

  function cuadro(tiempo) {
    if (anterior !== null && !pausado && !arrastrando) {
      giro[0] = (giro[0] + (tiempo - anterior) / 1000 * GIRO_POR_SEGUNDO) % 360;
    }
    anterior = tiempo;
    dibujar();
    if (visible && !pausado || arrastrando) {
      requestAnimationFrame(cuadro);
    } else {
      anterior = null;
      corriendo = false;
    }
  }

  function arrancar() {
    if (corriendo) return;
    corriendo = true;
    anterior = null;
    requestAnimationFrame(cuadro);
  }

  /* ----- Pausa (WCAG 2.2.2: lo que se mueve solo se puede detener) ----- */
  function ponerPausa(valor) {
    pausado = valor;
    botonPausa.setAttribute("aria-pressed", pausado ? "true" : "false");
    botonPausa.textContent = pausado ? "Reanudar el giro del planeta" : "Pausar el giro del planeta";
    if (!pausado) arrancar();
  }

  botonPausa.addEventListener("click", function () { ponerPausa(!pausado); });
  if (reducirMovimiento) ponerPausa(true);

  /* ----- Arrastrar para girar ----- */
  lienzo.addEventListener("pointerdown", function (e) {
    arrastrando = { x: e.clientX, y: e.clientY, giro: giro.slice() };
    lienzo.setPointerCapture(e.pointerId);
    figura.classList.add("prensa-arrastrando");
    arrancar();
  });

  lienzo.addEventListener("pointermove", function (e) {
    if (!arrastrando) return;
    var sensibilidad = 180 / tamano;
    giro[0] = arrastrando.giro[0] + (e.clientX - arrastrando.x) * sensibilidad;
    giro[1] = Math.max(-60, Math.min(60, arrastrando.giro[1] - (e.clientY - arrastrando.y) * sensibilidad));
  });

  function soltar() {
    arrastrando = null;
    figura.classList.remove("prensa-arrastrando");
  }
  lienzo.addEventListener("pointerup", soltar);
  lienzo.addEventListener("pointercancel", soltar);

  /* ----- No gastar batería cuando no se ve ----- */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entradas) {
      visible = entradas[0].isIntersecting;
      if (visible) arrancar();
    }).observe(figura);
  }

  document.addEventListener("visibilitychange", function () {
    visible = !document.hidden;
    if (visible) arrancar();
  });

  var espera = null;
  window.addEventListener("resize", function () {
    clearTimeout(espera);
    espera = setTimeout(function () { medir(); dibujar(); }, 120);
  });

  medir();
  dibujar();
  arrancar();
}

/* ----- Kit de prensa: copiar colores y el texto "Sobre El Desparche" ----- */
export function prepararCopiar() {
  var aviso = document.getElementById("aviso-copiado");

  document.addEventListener("click", function (evento) {
    var boton = evento.target.closest("[data-copiar], [data-copiar-de]");
    if (!boton) return;

    var texto = boton.hasAttribute("data-copiar")
      ? boton.getAttribute("data-copiar")
      : document.getElementById(boton.getAttribute("data-copiar-de")).textContent.replace(/\s+/g, " ").trim();

    navigator.clipboard.writeText(texto).then(function () {
      aviso.textContent = "";
      setTimeout(function () {
        aviso.textContent = boton.hasAttribute("data-copiar") ? "Copiaste el color " + texto + "." : "Copiaste el texto.";
      }, 50);
      boton.classList.add("prensa-copiado");
      setTimeout(function () { boton.classList.remove("prensa-copiado"); }, 1500);
    }).catch(function () {
      aviso.textContent = "No se pudo copiar. Selecciona el texto y cópialo a mano.";
    });
  });
}
