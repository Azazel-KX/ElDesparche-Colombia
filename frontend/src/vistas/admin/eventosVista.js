/* ==========================================================================
   vistas/admin/eventosVista.js
   Eventos del administrador: tarjetas, tabla, detalle, formulario, cambio de estado y
   eventos por revisar. Solo dibujan; los datos y los eventos los maneja
   controladores/admin/eventosControlador.js.
   ========================================================================== */

import { animarAlVer } from "../../lib/dom.js";
import { fechaEnvio, fechaLegible } from "../../lib/fechas.js";
import { escapar, numero, pesos, textoPrecio } from "../../lib/formato.js";
import { ESTADOS_EVENTO, NOMBRE_CATEGORIA, NOMBRE_PLAN } from "../../modelos/catalogos.js";
import { tieneUbicacion, valoresEvento } from "../../modelos/eventoModelo.js";
import { camposEvento } from "../camposVista.js";
import { camposCancelacion } from "../cancelacionVista.js";
import { etiquetaEstado } from "../etiquetasVista.js";
import { mapaSolicitud } from "../eventoVista.js";
import { htmlFormulario } from "../formularioVista.js";
import { barraOcupacion, pintarTarjetasResumen } from "../graficasVista.js";
import { crearMapaEvento } from "../mapaVista.js";
import { ocultarPaginacion, paginarTabla } from "../paginacionVista.js";

export function pintarResumenEventos(eventos) {
  var tarjetas = [{ titulo: "Eventos", valor: eventos.length, formato: numero.format }];
  ESTADOS_EVENTO.forEach(function (estado) {
    tarjetas.push({
      titulo: estado,
      valor: eventos.filter(function (e) { return e.estado === estado; }).length,
      formato: numero.format
    });
  });
  pintarTarjetasResumen(tarjetas);
}

/* Opciones del filtro por ciudad, con las ciudades de los eventos */
export function llenarFiltroCiudades(filtro, ciudades) {
  ciudades.forEach(function (ciudad) {
    var opcion = document.createElement("option");
    opcion.value = ciudad;
    opcion.textContent = ciudad;
    filtro.appendChild(opcion);
  });
}

export function pintarTablaEventos(lista, total) {
  var conteo = document.getElementById("conteo-eventos");
  var cuerpo = document.getElementById("cuerpo-eventos");

  conteo.textContent = lista.length === total
    ? "Mostrando los " + total + " eventos."
    : "Mostrando " + lista.length + " de " + total + " eventos.";

  if (lista.length === 0) {
    ocultarPaginacion("cuerpo-eventos");
    cuerpo.innerHTML = '<tr role="row"><td role="cell" colspan="6" class="tabla-vacia">' +
      'No hay eventos que coincidan con la búsqueda. Prueba con otros filtros.</td></tr>';
    return;
  }

  cuerpo.innerHTML = paginarTabla("cuerpo-eventos", lista, function () { pintarTablaEventos(lista, total); }).map(function (e) {
    return '<tr role="row">' +
      '<th scope="row" role="rowheader">' +
        '<span class="agente-celda">' +
          '<img class="evento-miniatura" src="' + escapar(e.imagen) + '" alt="" />' +
          '<span><span class="agente-nombre">' + escapar(e.titulo) + '</span>' +
          '<span class="agente-nit">' + escapar(e.teatro) + ', ' + escapar(e.ciudad) + '</span></span>' +
        '</span>' +
      '</th>' +
      '<td role="cell" data-etiqueta="Fecha">' + escapar(e.fechaCorta) + '</td>' +
      '<td role="cell" data-etiqueta="Precio" class="numero">' + textoPrecio(e.precio) + '</td>' +
      '<td role="cell" data-etiqueta="Ocupación">' + barraOcupacion(e) + '</td>' +
      '<td role="cell" data-etiqueta="Estado">' + etiquetaEstado(e.estado, false) + '</td>' +
      '<td role="cell" class="celda-accion">' +
        '<button type="button" class="admin-boton-sec" data-id="' + e.id + '">' +
          'Gestionar<span class="oculto"> ' + escapar(e.titulo) + '</span>' +
        '</button>' +
      '</td>' +
    '</tr>';
  }).join("");

  animarAlVer(cuerpo);
}

function formularioEstado(e) {
  if (e.estado === "Finalizado" || e.estado === "Cancelado") {
    return '<p class="texto-gris">Este evento está ' + e.estado.toLowerCase() +
      ', así que su estado ya no se puede cambiar.</p>';
  }

  return '<form class="form-estado" id="form-estado" novalidate>' +
    '<div class="campo-estado">' +
      '<label for="nuevo-estado">Cambiar el estado</label>' +
      '<select id="nuevo-estado">' + ESTADOS_EVENTO.map(function (estado) {
        return '<option value="' + estado + '"' + (estado === e.estado ? " selected" : "") + '>' +
          estado + (estado === e.estado ? " (actual)" : "") + '</option>';
      }).join("") + '</select>' +
    '</div>' +
    '<div class="campo-motivo" id="campo-motivo" hidden>' +
      camposCancelacion("evento", "motivo") +
      '<p class="ayuda-motivo">Se guarda en las observaciones del evento y se les mostrará a las personas que tenían reservas.</p>' +
    '</div>' +
    '<p class="detalle-error" id="error-estado" role="alert"></p>' +
    '<div class="detalle-botones" id="botones-estado">' +
      '<button type="submit" class="admin-boton">Guardar cambio</button>' +
    '</div>' +
  '</form>';
}

export function botonesEvento() {
  return '<button type="button" class="admin-boton-sec" data-accion="editar">Editar evento</button>' +
    '<button type="button" class="admin-boton admin-boton-peligro" data-accion="eliminar">Eliminar evento</button>';
}

export function pintarDetalleEventoAdmin(contenido, e, mensaje) {
  contenido.innerHTML =
    '<div class="detalle-cabecera">' +
      '<img class="evento-miniatura evento-miniatura-grande" src="' + escapar(e.imagen) + '" alt="" />' +
      '<div>' +
        '<h2 id="detalle-nombre" tabindex="-1">' + escapar(e.titulo) + '</h2>' +
        '<p>' + escapar(e.teatro) + ', ' + escapar(e.ciudad) + '</p>' +
        etiquetaEstado(e.estado, false) +
      '</div>' +
    '</div>' +
    '<p class="detalle-aviso" id="detalle-aviso" role="status">' + (mensaje || "") + '</p>' +
    '<p class="detalle-descripcion">' + escapar(e.descripcion) + '</p>' +
    '<dl class="detalle-datos">' +
      '<div><dt>Agente</dt><dd>' + escapar(e.agente) + '</dd></div>' +
      '<div><dt>Precio</dt><dd>' + textoPrecio(e.precio) + '</dd></div>' +
      '<div><dt>Inicio</dt><dd>' + escapar(e.fechaInicio) + '</dd></div>' +
      '<div><dt>Fin</dt><dd>' + escapar(e.fechaFin) + '</dd></div>' +
      '<div><dt>Capacidad</dt><dd>' + numero.format(e.capacidadTotal) + ' personas</dd></div>' +
      '<div><dt>Entradas vendidas</dt><dd>' + numero.format(e.vendidas) + '</dd></div>' +
      '<div><dt>Disponibles</dt><dd>' + numero.format(e.disponibles) + '</dd></div>' +
      '<div><dt>Ingresos estimados</dt><dd>' + pesos.format(e.ingresos) + '</dd></div>' +
    '</dl>' +
    '<h3>Ocupación</h3>' +
    '<div class="detalle-ocupacion" id="detalle-ocupacion">' + barraOcupacion(e, true) + '</div>' +
    '<h3>Observaciones</h3>' +
    '<p class="detalle-descripcion texto-con-saltos">' + escapar(e.observaciones) + '</p>' +
    '<p><a class="detalle-enlace" href="evento.html?id=' + e.id + '">Ver la página pública del evento</a></p>' +
    '<div class="detalle-acciones" id="acciones-evento">' + botonesEvento() + '</div>' +
    '<div class="detalle-acciones">' + formularioEstado(e) + '</div>';

  animarAlVer(document.getElementById("detalle-ocupacion"));
}

/* e = null para registrar un evento nuevo */
export function pintarFormularioEvento(contenido, e, ciudades, agentes) {
  var listaCiudades = ciudades.slice();
  if (e && e.ciudad && !listaCiudades.some(function (x) { return x[0] === e.ciudad; })) {
    listaCiudades.push([e.ciudad, e.ciudad]);
  }

  contenido.innerHTML =
    '<div class="detalle-cabecera"><div>' +
      '<h2 id="detalle-nombre" tabindex="-1">' + (e ? "Editar " + escapar(e.titulo) : "Registrar evento") + '</h2>' +
      '<p>' + (e ? "Cambia los datos que necesites y guarda." : "Publica un evento a nombre de un agente.") + '</p>' +
    '</div></div>' +
    htmlFormulario("form-evento", camposEvento(!e, listaCiudades, agentes),
      e ? valoresEvento(e) : { estado: "Programado", precio: 0, edad: 0 },
      e ? "Guardar cambios" : "Registrar evento");

  /* El mapa del formulario (el mismo del agente) */
  var mapa = crearMapaEvento({
    lat: document.getElementById("f-lat"), lon: document.getElementById("f-lon"),
    ciudad: document.getElementById("f-ciudad"), direccion: document.getElementById("f-direccion")
  }, {
    caja: document.getElementById("mapa-evento-admin"),
    estado: document.getElementById("estado-mapa-admin"),
    buscar: document.getElementById("buscar-direccion-admin")
  });
  mapa.preparar().then(function () {
    var lat = parseFloat(String(document.getElementById("f-lat").value).replace(",", "."));
    var lon = parseFloat(String(document.getElementById("f-lon").value).replace(",", "."));
    if (!isNaN(lat) && !isNaN(lon)) mapa.ponerPunto(lat, lon, true);
    else if (e) mapa.centrarEnCiudad(e.ciudad);
  });
}

/* suyas = cuántas reservas se borrarían junto con el evento */
export function confirmarEliminacionEvento(e, suyas) {
  var acciones = document.getElementById("acciones-evento");
  acciones.innerHTML =
    '<div class="detalle-confirmar">' +
      '<p id="texto-confirmar"><strong>¿Eliminar ' + escapar(e.titulo) + '?</strong> ' +
      'Desaparece de la página' + (suyas ? ' y se borran sus ' + suyas + (suyas === 1 ? ' reserva' : ' reservas') : '') +
      '. Esto no se puede deshacer. Si solo no se va a hacer, mejor cancélalo.</p>' +
      '<div class="detalle-botones">' +
        '<button type="button" class="admin-boton admin-boton-peligro" data-accion="si-eliminar" aria-describedby="texto-confirmar">Sí, eliminar</button>' +
        '<button type="button" class="admin-boton-sec" data-accion="no-eliminar">Volver</button>' +
      '</div>' +
    '</div>';
  acciones.querySelector('[data-accion="si-eliminar"]').focus();
}

export function restaurarBotonesEvento() {
  document.getElementById("acciones-evento").innerHTML = botonesEvento();
  document.querySelector('#acciones-evento [data-accion="eliminar"]').focus();
}

/* El motivo solo se pide al cambiar a Cancelado */
export function mostrarMotivoDeCancelacion(cancelar) {
  document.getElementById("campo-motivo").hidden = !cancelar;
  document.getElementById("error-estado").textContent = "";
  document.getElementById("botones-estado").innerHTML =
    '<button type="submit" class="admin-boton' + (cancelar ? ' admin-boton-peligro' : '') + '">' +
      (cancelar ? "Cancelar el evento" : "Guardar cambio") + '</button>';
}

export function confirmarCancelacionEvento(contenido, e) {
  document.getElementById("botones-estado").innerHTML =
    '<div class="detalle-confirmar">' +
      '<p id="texto-confirmar"><strong>¿Cancelar ' + escapar(e.titulo) + '?</strong> ' +
      'Las reservas del evento quedarán canceladas y este cambio no se puede deshacer.</p>' +
      '<div class="detalle-botones">' +
        '<button type="button" class="admin-boton admin-boton-peligro" data-accion="si-cancelar" aria-describedby="texto-confirmar">Sí, cancelar el evento</button>' +
        '<button type="button" class="admin-boton-sec" data-accion="volver">Volver</button>' +
      '</div>' +
    '</div>';
  contenido.querySelector('[data-accion="si-cancelar"]').focus();
}

export function volverACancelarEvento() {
  document.getElementById("botones-estado").innerHTML =
    '<button type="submit" class="admin-boton admin-boton-peligro">Cancelar el evento</button>';
  document.querySelector("#botones-estado button").focus();
}

/* ----- Eventos por revisar ----- */

export function pintarPorRevisar(solicitudes) {
  var conteo = document.getElementById("conteo-por-revisar");
  var lista = document.getElementById("lista-por-revisar");

  conteo.textContent = solicitudes.length === 0
    ? "No hay eventos esperando revisión."
    : (solicitudes.length === 1 ? "1 evento espera" : solicitudes.length + " eventos esperan") +
      " tu aprobación antes de publicarse.";

  lista.innerHTML = solicitudes.map(function (s) {
    return '<li class="agente-evento revision-item">' +
      '<img src="' + escapar(s.imagen || "img/evento-sin-foto.svg") + '" alt="">' +
      '<div class="agente-evento-texto">' +
        '<h3>' + escapar(s.nombre) + '</h3>' +
        '<p>' + escapar(s.agente) + '</p>' +
        '<p>' + escapar(fechaLegible(s.inicio)) + ' · ' + escapar(s.teatro) + ', ' + escapar(s.ciudad) + '</p>' +
        '<p class="agente-enviado">Enviado el ' + escapar(fechaEnvio(s.enviado)) + '</p>' +
      '</div>' +
      '<div class="revision-accion">' +
        '<button type="button" class="admin-boton-sec" data-revisar="' + escapar(s.id) + '">Revisar' +
          '<span class="oculto"> ' + escapar(s.nombre) + '</span></button>' +
      '</div>' +
    '</li>';
  }).join("");

  animarAlVer(lista);
}

export function botonesRevision(solicitud) {
  var rechazar = '<button type="button" class="admin-boton-sec agente-retirar" data-revision="mostrar-rechazo">Rechazar</button>';
  if (solicitud && !tieneUbicacion(solicitud)) return rechazar;
  return '<button type="button" class="admin-boton" data-revision="aprobar">Aprobar y publicar</button>' + rechazar;
}

export function pintarSolicitud(contenido, s) {
  contenido.innerHTML =
    '<div class="detalle-cabecera">' +
      '<img class="evento-miniatura evento-miniatura-grande" src="' + escapar(s.imagen || "img/evento-sin-foto.svg") + '" alt="" />' +
      '<div>' +
        '<h2 id="detalle-nombre" tabindex="-1">' + escapar(s.nombre) + '</h2>' +
        '<p>' + escapar(s.agente) + '</p>' +
        etiquetaEstado("En revisión", false) +
      '</div>' +
    '</div>' +
    '<p class="detalle-descripcion">' + escapar(s.descripcion) + '</p>' +
    '<dl class="detalle-datos">' +
      '<div><dt>Categoría</dt><dd>' + escapar(NOMBRE_CATEGORIA[s.categoria] || s.categoria) + '</dd></div>' +
      '<div><dt>Tipo de plan</dt><dd>' + escapar(NOMBRE_PLAN[s.plan] || s.plan) + '</dd></div>' +
      '<div><dt>Inicio</dt><dd>' + escapar(fechaLegible(s.inicio)) + '</dd></div>' +
      '<div><dt>Fin</dt><dd>' + escapar(fechaLegible(s.fin)) + '</dd></div>' +
      '<div><dt>Ciudad</dt><dd>' + escapar(s.ciudad) + (s.departamento ? ", " + escapar(s.departamento) : "") + '</dd></div>' +
      '<div><dt>Teatro</dt><dd>' + escapar(s.teatro) + '</dd></div>' +
      '<div><dt>Dirección</dt><dd>' + escapar(s.direccion) + '</dd></div>' +
      '<div><dt>Capacidad</dt><dd>' + numero.format(s.capacidad) + ' personas</dd></div>' +
      '<div><dt>Precio</dt><dd>' + textoPrecio(Number(s.precio)) + '</dd></div>' +
      '<div><dt>Edad mínima</dt><dd>' + (Number(s.edad) > 0 ? s.edad + " años" : "Todas las edades") + '</dd></div>' +
    '</dl>' +
    '<h3>Observaciones</h3>' +
    '<p class="detalle-descripcion">' + escapar(s.observaciones || "Sin observaciones.") + '</p>' +
    '<h3>Ubicación</h3>' + mapaSolicitud(s) +
    '<div class="detalle-acciones">' +
      '<div class="campo-motivo" id="campo-rechazo" hidden>' +
        '<label for="motivo-rechazo-evento">Motivo del rechazo</label>' +
        '<textarea id="motivo-rechazo-evento" rows="3" aria-describedby="ayuda-rechazo"></textarea>' +
        '<p class="ayuda-motivo" id="ayuda-rechazo">El agente lo verá junto a su evento para corregirlo.</p>' +
      '</div>' +
      '<p class="detalle-error" id="error-revision" role="alert"></p>' +
      '<div class="detalle-botones" id="botones-revision">' + botonesRevision(s) + '</div>' +
    '</div>';
}

/* Abre el cuadro del motivo; si falta el punto en el mapa, propone el motivo */
export function mostrarCampoRechazo(solicitud) {
  var motivo = document.getElementById("motivo-rechazo-evento");
  document.getElementById("campo-rechazo").hidden = false;
  if (!tieneUbicacion(solicitud) && !motivo.value) {
    motivo.value = "Falta marcar en el mapa el punto exacto donde se hace el evento.";
  }
  document.getElementById("botones-revision").innerHTML =
    '<button type="button" class="admin-boton admin-boton-peligro" data-revision="rechazar">Rechazar el evento</button>' +
    '<button type="button" class="admin-boton-sec" data-revision="volver">Volver</button>';
  motivo.focus();
}

export function ocultarCampoRechazo(solicitud) {
  var botones = document.getElementById("botones-revision");
  document.getElementById("campo-rechazo").hidden = true;
  document.getElementById("motivo-rechazo-evento").removeAttribute("aria-invalid");
  botones.innerHTML = botonesRevision(solicitud);
  botones.querySelector("button").focus();
}
