/* ==========================================================================
   vistas/agenteVista.js
   Pantallas del panel del agente.
   ========================================================================== */

import { animarAlVer } from "../lib/dom.js";
import { fechaEnvio, fechaLegible } from "../lib/fechas.js";
import { escapar, numero, pesos, pesosCompacto } from "../lib/formato.js";
import { NOMBRE_CATEGORIA } from "../modelos/catalogos.js";
import { etiquetaEstado } from "./etiquetasVista.js";
import { barraOcupacion, pintarTarjetasResumen } from "./graficasVista.js";

export function pintarIndicadoresAgente(datos) {
  var ind = datos.indicadores;
  var ultimo = datos.meses[datos.meses.length - 1];
  var anterior = datos.meses[datos.meses.length - 2];
  var cambio = anterior && anterior.reservas
    ? Math.round((ultimo.reservas - anterior.reservas) / anterior.reservas * 100)
    : null;
  var porcentaje = function (n) { return n + " %"; };

  pintarTarjetasResumen([
    { titulo: "Eventos activos", valor: ind.eventosActivos, formato: numero.format },
    { titulo: "Entradas vendidas", valor: ind.entradas, formato: numero.format, cambio: cambio },
    { titulo: "Ventas", valor: ind.ingresos, formato: pesosCompacto.format, completo: pesos.format },
    { titulo: "Tu ganancia (después de la comisión del " + numero.format(datos.agente.comision) + " %)",
      valor: ind.ganancia, formato: pesosCompacto.format, completo: pesos.format },
    { titulo: "Ocupación promedio", valor: ind.ocupacion, formato: porcentaje },
    { titulo: "Reservas por aprobar", valor: ind.porAprobar, formato: numero.format,
      alerta: ind.porAprobar > 0 }
  ]);
}

/* Cada evento con su fecha, teatro, estado y cuánto se ha llenado */
export function pintarEventosAgente(datos) {
  var lista = document.getElementById("agente-eventos");

  if (!datos.eventos.length) {
    lista.innerHTML = '<li class="agente-vacio">Todavía no tienes eventos publicados.</li>';
    return;
  }

  lista.innerHTML = datos.eventos.map(function (e) {
    var cifras = e.estado === "Cancelado"
      ? "Evento cancelado"
      : numero.format(e.vendidas) + " de " + numero.format(e.capacidadTotal) + " entradas";

    return '<li class="agente-evento">' +
      '<img src="' + escapar(e.imagen) + '" alt="">' +
      '<div class="agente-evento-texto">' +
        '<h3><a href="evento.html?id=' + encodeURIComponent(e.id) + '">' + escapar(e.titulo) + '</a></h3>' +
        '<p>' + escapar(e.fechaInicio) + '</p>' +
        '<p>' + escapar(e.teatro) + ' · ' + escapar(e.ciudad) + '</p>' +
      '</div>' +
      '<div class="agente-evento-estado">' +
        etiquetaEstado(e.estado, false) +
        '<p class="agente-evento-cifras">' + cifras + '</p>' +
        barraOcupacion(e) +
      '</div>' +
    '</li>';
  }).join("");

  lista.classList.remove("visible");
  animarAlVer(lista);
}

/* Aviso cuando la cuenta del agente no está activa */
export function pintarEstadoCuenta(agente) {
  var caja = document.getElementById("agente-cuenta");
  var textos = {
    "Pendiente": "Tu cuenta de agente está en revisión. Cuando un administrador la apruebe podrás publicar eventos.",
    "Suspendido": "Tu cuenta de agente está suspendida, así que no puedes publicar eventos nuevos. Escribe a soporte@eldesparche.online para saber el motivo."
  };

  caja.hidden = !textos[agente.estado];
  caja.textContent = textos[agente.estado] || "";
}

/* Tarjeta de un evento ya publicado */
export function tarjetaPublicado(e) {
  var cifras = e.estado === "Cancelado"
    ? "Evento cancelado"
    : numero.format(e.vendidas) + " de " + numero.format(e.capacidadTotal) + " entradas";

  return '<li class="agente-evento">' +
    '<img src="' + escapar(e.imagen) + '" alt="">' +
    '<div class="agente-evento-texto">' +
      '<h3>' + escapar(e.titulo) + '</h3>' +
      '<p>' + escapar(e.fechaInicio) + '</p>' +
      '<p>' + escapar(e.teatro) + ' · ' + escapar(e.ciudad) + '</p>' +
      '<p><a class="agente-enlace" href="evento.html?id=' + encodeURIComponent(e.id) + '">Ver la página del evento' +
        '<span class="oculto"> ' + escapar(e.titulo) + '</span></a></p>' +
    '</div>' +
    '<div class="agente-evento-estado">' +
      etiquetaEstado(e.estado, false) +
      '<p class="agente-evento-cifras">' + cifras + '</p>' +
      barraOcupacion(e) +
      (e.estado === "Cancelado" || e.estado === "Finalizado" ? "" :
        '<div class="agente-evento-acciones">' +
          '<button type="button" class="admin-boton-sec" data-editar-publicado="' + escapar(e.id) + '">Editar' +
            '<span class="oculto"> ' + escapar(e.titulo) + '</span></button>' +
          '<button type="button" class="admin-boton-sec agente-retirar" data-cancelar-evento="' + escapar(e.id) + '">Cancelar evento' +
            '<span class="oculto"> ' + escapar(e.titulo) + '</span></button>' +
        '</div>') +
    '</div>' +
  '</li>';
}

/* Tarjeta de una solicitud que todavía no se publica */
export function tarjetaSolicitud(s) {
  var foto = '<img src="' + escapar(s.imagen || "img/evento-sin-foto.svg") + '" alt="">';

  var motivo = s.estado === "Rechazado" && s.motivo
    ? '<p class="agente-motivo"><strong>Motivo del rechazo:</strong> ' + escapar(s.motivo) + '</p>'
    : '';

  var nota = s.estado === "En revisión"
    ? '<p class="agente-evento-cifras">Enviado el ' + escapar(fechaEnvio(s.enviado)) + '</p>'
    : '';

  return '<li class="agente-evento agente-solicitud">' +
    foto +
    '<div class="agente-evento-texto">' +
      '<h3>' + escapar(s.nombre) + '</h3>' +
      '<p>' + escapar(fechaLegible(s.inicio)) + '</p>' +
      '<p>' + escapar(s.teatro) + ' · ' + escapar(s.ciudad) + '</p>' +
      '<p>' + escapar(NOMBRE_CATEGORIA[s.categoria] || s.categoria) + ' · ' +
        (Number(s.precio) === 0 ? "Gratis" : escapar(pesos.format(s.precio))) + '</p>' +
      motivo +
    '</div>' +
    '<div class="agente-evento-estado">' +
      etiquetaEstado(s.estado, false) +
      nota +
      '<div class="agente-evento-acciones">' +
        '<button type="button" class="admin-boton-sec" data-editar="' + escapar(s.id) + '">' +
          (s.estado === "Rechazado" ? "Corregir y reenviar" : "Editar") +
          '<span class="oculto"> ' + escapar(s.nombre) + '</span></button>' +
        '<button type="button" class="admin-boton-sec agente-retirar" data-retirar="' + escapar(s.id) + '">Retirar' +
          '<span class="oculto"> ' + escapar(s.nombre) + '</span></button>' +
      '</div>' +
    '</div>' +
  '</li>';
}

/* Lista de ciudades del formulario, agrupadas por departamento */
export function llenarCiudadesAgente(lista, grupos) {
  lista.innerHTML = '<option value="">Elige una ciudad</option>' +
    Object.keys(grupos).sort().map(function (departamento) {
      return '<optgroup label="' + escapar(departamento) + '">' +
        grupos[departamento].sort().map(function (nombre) {
          return '<option value="' + escapar(nombre) + '" data-departamento="' + escapar(departamento) + '">' +
            escapar(nombre) + '</option>';
        }).join("") +
      '</optgroup>';
    }).join("");
}

export function pintarSaludoAgente(usuario, datos) {
  document.getElementById("admin-saludo").textContent =
    "Hola, " + usuario.nombre.split(" ")[0] + ". Así van los eventos de " + datos.agente.nombre + ".";
}

/* ----- Mis eventos ----- */

/* hayAlgo: si el agente tiene eventos o solicitudes (aunque el filtro los oculte) */
export function pintarMisEventos(lista, conteo, filtrados, hayAlgo) {
  var total = filtrados.solicitudes.length + filtrados.eventos.length;

  conteo.textContent = total === 1 ? "1 evento" : total + " eventos";

  if (!total) {
    lista.innerHTML = '<li class="agente-vacio">' +
      (hayAlgo
        ? "Ningún evento coincide con la búsqueda."
        : "Todavía no tienes eventos. Crea el primero con el botón «Crear evento».") +
    '</li>';
    return;
  }

  /* Primero lo que está pendiente, después lo publicado */
  lista.innerHTML = filtrados.solicitudes.map(tarjetaSolicitud).join("") + filtrados.eventos.map(tarjetaPublicado).join("");
  lista.classList.remove("visible");
  animarAlVer(lista);
}

/* Los campos del formulario de la solicitud, por nombre */
export function camposSolicitud() {
  return {
    nombre: document.getElementById("evento-nombre"),
    categoria: document.getElementById("evento-categoria"),
    plan: document.getElementById("evento-plan"),
    descripcion: document.getElementById("evento-descripcion"),
    inicio: document.getElementById("evento-inicio"),
    fin: document.getElementById("evento-fin"),
    ciudad: document.getElementById("evento-ciudad"),
    teatro: document.getElementById("evento-teatro"),
    direccion: document.getElementById("evento-direccion"),
    capacidad: document.getElementById("evento-capacidad"),
    precio: document.getElementById("evento-precio"),
    edad: document.getElementById("evento-edad"),
    observaciones: document.getElementById("evento-observaciones"),
    lat: document.getElementById("evento-lat"),
    lon: document.getElementById("evento-lon")
  };
}

/* Los textos de los campos, sin espacios sobrantes */
export function leerCamposSolicitud(campos) {
  var v = {};
  Object.keys(campos).forEach(function (k) { v[k] = campos[k].value.trim(); });
  return v;
}

/* Lo que se envía al servidor */
export function datosDeSolicitud(campos, imagen) {
  var opcion = campos.ciudad.selectedOptions[0];
  return {
    nombre: campos.nombre.value.trim(),
    categoria: campos.categoria.value,
    plan: campos.plan.value,
    descripcion: campos.descripcion.value.trim(),
    inicio: campos.inicio.value,
    fin: campos.fin.value,
    ciudad: campos.ciudad.value,
    departamento: opcion ? opcion.getAttribute("data-departamento") || "" : "",
    teatro: campos.teatro.value.trim(),
    direccion: campos.direccion.value.trim(),
    capacidad: Number(campos.capacidad.value),
    precio: Number(campos.precio.value),
    edad: Number(campos.edad.value),
    observaciones: campos.observaciones.value.trim(),
    imagen: imagen,
    lat: Number(campos.lat.value),
    lon: Number(campos.lon.value)
  };
}

export function mostrarErrorEnFormulario(caja, mensaje) {
  caja.innerHTML = "<span><strong>Error:</strong> " + escapar(mensaje) + "</span>";
}

/* ----- Perfil de la empresa ----- */

var ETIQUETA_CUENTA = { "Activo": "estado-programado", "Pendiente": "estado-boleteria", "Suspendido": "estado-cancelado" };
var TEXTO_CUENTA = { "Activo": "Cuenta activa", "Pendiente": "Cuenta en revisión", "Suspendido": "Cuenta suspendida" };

function fechaRegistro(iso) {
  var fecha = new Date(iso + "T12:00:00");
  return isNaN(fecha) ? iso : fecha.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

export function pintarCabeceraPerfil(agente, logo) {
  document.getElementById("perfil-cabecera").hidden = false;
  document.getElementById("perfil-nombre").textContent = agente.nombre;
  document.getElementById("perfil-razon").textContent = agente.razon || "";
  document.getElementById("perfil-estado").innerHTML =
    '<span class="estado ' + (ETIQUETA_CUENTA[agente.estado] || "estado-finalizado") + '">' +
      '<span class="oculto">Estado de la cuenta: </span>' + escapar(TEXTO_CUENTA[agente.estado] || agente.estado) +
    '</span>';
  document.getElementById("perfil-logo").innerHTML = logo
    ? '<img src="' + escapar(logo) + '" alt="">'
    : '<span>' + escapar(agente.nombre.charAt(0)) + '</span>';
}

export function pintarLegalesPerfil(agente, usuario, totalEventos) {
  document.getElementById("perfil-legales").innerHTML =
    '<div><dt>NIT</dt><dd>' + escapar(agente.nit) + '</dd></div>' +
    '<div><dt>Razón social</dt><dd>' + escapar(agente.razon || "—") + '</dd></div>' +
    '<div><dt>Comisión de El Desparche</dt><dd>' + numero.format(agente.comision) + ' % por entrada vendida</dd></div>' +
    '<div><dt>Agente desde</dt><dd>' + escapar(agente.registro ? fechaRegistro(agente.registro) : "—") + '</dd></div>' +
    '<div><dt>Eventos publicados</dt><dd>' + totalEventos + '</dd></div>' +
    '<div><dt>Responsable de la cuenta</dt><dd>' + escapar(usuario.nombre) + '</dd></div>';
}

export function mostrarLogoPerfil(logo) {
  var vista = document.getElementById("perfil-logo-vista");
  vista.hidden = !logo;
  vista.src = logo || "";
  document.getElementById("perfil-quitar-logo").hidden = !logo;
}

export function llenarFormularioPerfil(campos, agente) {
  campos.nombre.value = agente.nombre || "";
  campos.descripcion.value = agente.descripcion || "";
  campos.correo.value = agente.correo || "";
  campos.telefono.value = agente.telefono || "";
  campos.experiencia.value = agente.experiencia !== undefined ? agente.experiencia : "";

  /* Si la ciudad del agente no está en la lista, se agrega para no perderla */
  var existe = Array.prototype.some.call(campos.ciudad.options, function (o) { return o.value === agente.ciudad; });
  if (agente.ciudad && !existe) {
    var opcion = document.createElement("option");
    opcion.value = agente.ciudad;
    opcion.textContent = agente.ciudad;
    campos.ciudad.appendChild(opcion);
  }
  campos.ciudad.value = agente.ciudad || "";

  mostrarLogoPerfil(agente.logo || "");
}
