/* ==========================================================================
   vistas/admin/ubicacionesVista.js
   Ubicaciones (admin.html?seccion=ubicaciones): países, departamentos y ciudades.

   Las funciones reciben el "estado" de la página:
     { datos: { paises, departamentos, ciudades }, personas: { clientes, agentes, administradores },
       elegidos: { pais, departamento }, enCurso: { nivel, id, accion } | null }
   ========================================================================== */

import { escapar, numero } from "../../lib/formato.js";
import { NIVELES_UBICACION } from "../../modelos/catalogos.js";
import { hijosDe, nombreDeUbicacion, ordenarPorNombre, usosDeCiudad } from "../../modelos/ubicacionModelo.js";
import { pintarTarjetasResumen } from "../graficasVista.js";

/* "2 eventos · 3 personas" o "Sin uso" */
function textoUsos(u) {
  var gente = u.clientes.length + u.agentes.length + u.administradores.length;
  var partes = [];
  if (u.eventos.length) partes.push(u.eventos.length + (u.eventos.length === 1 ? " evento" : " eventos"));
  if (gente) partes.push(gente + (gente === 1 ? " persona" : " personas"));
  return partes.length ? partes.join(" · ") : "Sin uso";
}

export function pintarResumenUbicaciones(estado) {
  var datos = estado.datos;
  var conEventos = datos.ciudades.filter(function (c) { return usosDeCiudad(estado.personas, c).eventos.length > 0; }).length;
  pintarTarjetasResumen([
    { titulo: "Países", valor: datos.paises.length, formato: numero.format },
    { titulo: "Departamentos", valor: datos.departamentos.length, formato: numero.format },
    { titulo: "Ciudades", valor: datos.ciudades.length, formato: numero.format },
    { titulo: "Ciudades con eventos", valor: conEventos, formato: numero.format }
  ]);
}

function filaEdicion(nivel, x) {
  var n = NIVELES_UBICACION[nivel];
  var id = "editar-" + nivel + "-" + x.id;
  return '<form class="ubic-editar" data-nivel="' + nivel + '" data-id="' + x.id + '" novalidate>' +
    '<label class="oculto" for="' + id + '">Nuevo nombre de ' + escapar(x.nombre) + '</label>' +
    '<input type="text" id="' + id + '" value="' + escapar(x.nombre) + '" maxlength="' + n.max + '" autocomplete="off" />' +
    '<div class="ubic-botones">' +
      '<button type="submit" class="admin-boton">Guardar</button>' +
      '<button type="button" class="admin-boton-sec" data-accion="volver">Cancelar</button>' +
    '</div>' +
    '<p class="detalle-error" id="error-' + id + '" role="alert"></p>' +
  '</form>';
}

function filaConfirmar(estado, nivel, x) {
  var n = NIVELES_UBICACION[nivel];
  var bloqueo = "";
  if (nivel !== "ciudad" && hijosDe(estado.datos, nivel, x.id).length) {
    var cuantos = hijosDe(estado.datos, nivel, x.id).length;
    var hijo = nivel === "pais" ? NIVELES_UBICACION.departamento : NIVELES_UBICACION.ciudad;
    bloqueo = "Tiene " + cuantos + " " + (cuantos === 1 ? hijo.singular : hijo.plural) + ". " +
      (nivel === "pais" ? (cuantos === 1 ? "Elimínalo" : "Elimínalos") : (cuantos === 1 ? "Elimínala" : "Elimínalas")) + " primero.";
  } else if (nivel === "ciudad" && textoUsos(usosDeCiudad(estado.personas, x)) !== "Sin uso") {
    bloqueo = "La usan " + textoUsos(usosDeCiudad(estado.personas, x)) + ". Cámbialos de ciudad primero.";
  }

  if (bloqueo) {
    return '<div class="ubic-confirmar">' +
      '<p id="confirmar-' + nivel + '-' + x.id + '"><strong>No se puede eliminar ' + escapar(x.nombre) + '.</strong> ' + bloqueo + '</p>' +
      '<div class="ubic-botones"><button type="button" class="admin-boton-sec" data-accion="volver">Entendido</button></div>' +
    '</div>';
  }
  return '<div class="ubic-confirmar">' +
    '<p id="confirmar-' + nivel + '-' + x.id + '"><strong>¿Eliminar ' + (nivel === "ciudad" ? "la " : "el ") + n.singular + ' ' +
      escapar(x.nombre) + '?</strong> Esto no se puede deshacer.</p>' +
    '<div class="ubic-botones">' +
      '<button type="button" class="admin-boton admin-boton-peligro" data-accion="si-eliminar" ' +
        'aria-describedby="confirmar-' + nivel + '-' + x.id + '">Sí, eliminar</button>' +
      '<button type="button" class="admin-boton-sec" data-accion="volver">Cancelar</button>' +
    '</div>' +
  '</div>';
}

function fila(estado, nivel, x) {
  var enCurso = estado.enCurso;
  if (enCurso && enCurso.nivel === nivel && enCurso.id === x.id) {
    return '<li class="ubic-item ubic-item-abierto">' +
      (enCurso.accion === "editar" ? filaEdicion(nivel, x) : filaConfirmar(estado, nivel, x)) + '</li>';
  }

  var detalle;
  var nombre;
  if (nivel === "ciudad") {
    detalle = textoUsos(usosDeCiudad(estado.personas, x));
    nombre = '<span class="ubic-texto"><span class="ubic-nombre">' + escapar(x.nombre) + '</span>' +
      '<span class="ubic-conteo">' + detalle + '</span></span>';
  } else {
    var cuantos = hijosDe(estado.datos, nivel, x.id).length;
    var hijo = nivel === "pais" ? NIVELES_UBICACION.departamento : NIVELES_UBICACION.ciudad;
    detalle = cuantos + " " + (cuantos === 1 ? hijo.singular : hijo.plural);
    var activo = estado.elegidos[nivel] === x.id;
    nombre = '<button type="button" class="ubic-elegir" data-elegir="' + nivel + '" data-id="' + x.id + '" aria-pressed="' + activo + '">' +
      '<span class="ubic-nombre">' + escapar(x.nombre) + '</span>' +
      '<span class="ubic-conteo">' + detalle + '<span class="oculto">. Ver sus ' + hijo.plural + '</span></span>' +
    '</button>';
  }
  return '<li class="ubic-item' + (estado.elegidos[nivel] === x.id ? " ubic-item-activo" : "") + '">' + nombre +
    '<span class="ubic-acciones">' +
      '<button type="button" class="admin-boton-sec" data-accion="editar" data-nivel="' + nivel + '" data-id="' + x.id + '">' +
        'Editar<span class="oculto"> ' + escapar(x.nombre) + '</span></button>' +
      '<button type="button" class="admin-boton-sec ubic-eliminar" data-accion="eliminar" data-nivel="' + nivel + '" data-id="' + x.id + '">' +
        'Eliminar<span class="oculto"> ' + escapar(x.nombre) + '</span></button>' +
    '</span>' +
  '</li>';
}

/* Las tres listas: países, departamentos del país elegido y ciudades del departamento elegido */
export function pintarUbicaciones(estado) {
  var datos = estado.datos;
  var elegidos = estado.elegidos;
  var listas = {
    pais: document.getElementById("lista-paises"),
    departamento: document.getElementById("lista-departamentos"),
    ciudad: document.getElementById("lista-ciudades")
  };

  listas.pais.innerHTML = ordenarPorNombre(datos.paises).map(function (p) { return fila(estado, "pais", p); }).join("");

  var pais = elegidos.pais;
  document.getElementById("titulo-departamentos").textContent = pais ? "Departamentos de " + nombreDeUbicacion(datos, "pais", pais) : "Departamentos";
  document.getElementById("caja-departamentos").hidden = !pais;
  document.getElementById("sin-pais").hidden = !!pais;
  listas.departamento.innerHTML = pais
    ? ordenarPorNombre(hijosDe(datos, "pais", pais)).map(function (d) { return fila(estado, "departamento", d); }).join("") ||
      '<li class="ubic-vacio">Este país todavía no tiene departamentos.</li>'
    : "";

  var dep = elegidos.departamento;
  document.getElementById("titulo-ciudades").textContent = dep ? "Ciudades de " + nombreDeUbicacion(datos, "departamento", dep) : "Ciudades";
  document.getElementById("caja-ciudades").hidden = !dep;
  document.getElementById("sin-departamento").hidden = !!dep;
  listas.ciudad.innerHTML = dep
    ? ordenarPorNombre(hijosDe(datos, "departamento", dep)).map(function (c) { return fila(estado, "ciudad", c); }).join("") ||
      '<li class="ubic-vacio">Este departamento todavía no tiene ciudades.</li>'
    : "";
}
