/* ==========================================================================
   controladores/eventosControlador.js
   Listado de eventos con filtros (eventos.html) y detalle de un evento (evento.html).
   ========================================================================== */

import { parametro } from "../lib/dom.js";
import { buscarEvento, filtrarEventosListado, ubicacionesDelCatalogo } from "../modelos/eventoModelo.js";
import { pintarFiltrosActivos, prepararMenuFiltros } from "../vistas/filtrosEventosVista.js";
import { llenarLista } from "../vistas/inicioVista.js";
import { pintarContador, pintarDetalleEvento, pintarTarjetas } from "../vistas/eventoVista.js";

export function paginaEventos() {
  var contenedor = document.getElementById("lista-eventos");
  var busqueda = document.getElementById("busqueda");
  var pais = document.getElementById("pais");
  var departamento = document.getElementById("departamento");
  var ciudad = document.getElementById("ciudad");
  var estado = document.getElementById("estado");

  var lugares = ubicacionesDelCatalogo();
  var nombres = function (objeto) { return Object.keys(objeto).sort(function (a, b) { return a.localeCompare(b, "es"); }); };

  llenarLista(pais, nombres(lugares), "Todos");
  prepararMenuFiltros();

  /* Los filtros aplicados, para las etiquetas de debajo del buscador */
  function filtrosActivos() {
    var chips = [];
    if (pais.value) chips.push({ clave: "pais", texto: pais.value });
    if (departamento.value) chips.push({ clave: "departamento", texto: departamento.value });
    if (ciudad.value) chips.push({ clave: "ciudad", texto: ciudad.value });
    if (estado.value) chips.push({ clave: "estado", texto: estado.value });
    return chips;
  }

  function actualizar() {
    var encontrados = filtrarEventosListado(busqueda.value, pais.value, departamento.value, ciudad.value, estado.value);
    pintarContador(encontrados.length);
    pintarTarjetas(contenedor, encontrados);
    pintarFiltrosActivos(filtrosActivos(), quitarFiltro);
  }

  function reiniciarDepartamento() { llenarLista(departamento, [], "Todos"); }
  function reiniciarCiudad() { llenarLista(ciudad, [], "Todas"); }

  /* Quitar una etiqueta: al quitar el país también se quitan su departamento y su ciudad */
  function quitarFiltro(clave) {
    if (clave === "pais") {
      pais.value = "";
      reiniciarDepartamento();
      reiniciarCiudad();
    } else if (clave === "departamento") {
      departamento.value = "";
      reiniciarCiudad();
    } else if (clave === "ciudad") {
      ciudad.value = "";
    } else if (clave === "estado") {
      estado.value = "";
    }
    actualizar();
    document.getElementById("abrir-filtros").focus();
  }

  /* País → departamentos de ese país → ciudades de ese departamento */
  pais.onchange = function () {
    llenarLista(departamento, pais.value ? nombres(lugares[pais.value]) : [], "Todos");
    reiniciarCiudad();
    actualizar();
  };

  departamento.onchange = function () {
    var ciudades = departamento.value ? lugares[pais.value][departamento.value].slice().sort(function (a, b) { return a.localeCompare(b, "es"); }) : [];
    llenarLista(ciudad, ciudades, "Todas");
    actualizar();
  };

  ciudad.onchange = actualizar;
  estado.onchange = actualizar;
  busqueda.oninput = actualizar;

  document.getElementById("limpiar-filtros").onclick = function () {
    pais.value = "";
    estado.value = "";
    reiniciarDepartamento();
    reiniciarCiudad();
    actualizar();
  };

  /* Enter en el buscador solo vuelve a filtrar: no recarga la página */
  document.getElementById("filtros-eventos").onsubmit = function (evento) {
    evento.preventDefault();
    actualizar();
  };

  actualizar();
}

export function paginaEvento() {
  var evento = buscarEvento(parametro("id"));

  /* Si la dirección no trae un evento válido, vuelve al listado */
  if (!evento) {
    window.location.href = "eventos.html";
    return;
  }

  pintarDetalleEvento(evento);
}
