/* ==========================================================================
   controladores/inicioControlador.js
   Página de inicio: carrusel, buscador y filtros de la portada.
   ========================================================================== */

import { parametro } from "../lib/dom.js";
import { TIPOS_PARCHE } from "../modelos/catalogos.js";
import { CIUDADES, DEPARTAMENTOS, filtrarEventosInicio, paisesDelCatalogo } from "../modelos/eventoModelo.js";
import { prepararCarrusel } from "../vistas/carruselVista.js";
import { avisarResultados, pintarTarjetas } from "../vistas/eventoVista.js";
import { irAResultados, llenarLista, llenarPaises, marcarParche, paginarEventos } from "../vistas/inicioVista.js";

export function paginaInicio() {
  prepararCarrusel();

  var contenedor = document.getElementById("destacados");
  var busqueda = document.getElementById("busqueda");
  var pais = document.getElementById("pais");
  var departamento = document.getElementById("departamento");
  var ciudad = document.getElementById("ciudad");
  var botonesParche = document.querySelectorAll(".parche-filtro");
  var parcheElegido = "";

  llenarPaises(pais, paisesDelCatalogo());

  var POR_PAGINA = 8;
  var pagina = 1;

  /* Pinta la página actual de los eventos disponibles para reservar (según el texto, la ciudad y el tipo de plan) */
  function pintarPagina() {
    var encontrados = filtrarEventosInicio(busqueda.value, ciudad.value, parcheElegido);
    var mostrados = paginarEventos(contenedor, encontrados, pagina, POR_PAGINA, function (nueva) {
      pagina = nueva;
      pintarPagina();
    });
    pintarTarjetas(contenedor, mostrados);
    avisarResultados(encontrados.length);
  }

  /* Cada cambio de filtro vuelve a la primera página */
  function actualizar() {
    pagina = 1;
    pintarPagina();
  }

  /* Al elegir país se llenan los departamentos */
  pais.onchange = function () {
    llenarLista(departamento, DEPARTAMENTOS[pais.value] || [], "Departamento: todos");
    llenarLista(ciudad, [], "Ciudad: todas");
    actualizar();
  };

  /* Al elegir departamento se llenan las ciudades */
  departamento.onchange = function () {
    llenarLista(ciudad, CIUDADES[departamento.value] || [], "Ciudad: todas");
    actualizar();
  };

  ciudad.onchange = actualizar;
  busqueda.oninput = actualizar;

  function elegirParche(tipo) {
    parcheElegido = TIPOS_PARCHE[tipo] ? tipo : "";
    marcarParche(botonesParche, parcheElegido);
    actualizar();
  }

  for (var p = 0; p < botonesParche.length; p++) {
    botonesParche[p].onclick = function () {
      elegirParche(this.getAttribute("data-parche"));
    };
  }

  /* Los enlaces del pie llegan con ?parche=parchesote (o parche, parchesito) */
  if (parametro("parche")) {
    elegirParche(parametro("parche"));
  }

  /* El filtrado es instantáneo, así que al pulsar Enter dentro del
     buscador no hay que recargar la página: solo se vuelve a filtrar.
     Sin esto, quien navega con teclado perdería el sitio donde iba. */
  var formulario = busqueda.form;
  if (formulario) {
    formulario.onsubmit = function (evento) {
      evento.preventDefault();
      actualizar();
      irAResultados();
    };
  }

  actualizar();
}
