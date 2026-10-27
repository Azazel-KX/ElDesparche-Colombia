/* ==========================================================================
   vistas/etiquetasVista.js
   Etiquetas de estado y avatares que se repiten en varias pantallas.
   ========================================================================== */

import { escapar } from "../lib/formato.js";

/* Convierte el estado en una clase de CSS: "En Boletería" -> "estado-boleteria" */
function claseEstado(estado) {
  if (estado === "Programado") return "estado-programado";
  if (estado === "En Boletería") return "estado-boleteria";
  if (estado === "En Vivo") return "estado-vivo";
  if (estado === "Finalizado") return "estado-finalizado";
  if (estado === "En revisión") return "estado-revision";
  if (estado === "Rechazado") return "estado-rechazado";
  return "estado-cancelado";
}

/* Devuelve el HTML completo de la etiqueta de estado.

   ACCESIBILIDAD (WCAG 1.4.1 - el color no es el único medio): la señal
   que distingue un estado de otro es SU PROPIO TEXTO ("Cancelado",
   "Finalizado"...), que se lee igual aunque no se perciba el color.
   Como refuerzo, cada estado tiene además un fondo distinto y el de
   "Cancelado" lleva el borde punteado, porque es el que más se parece
   al de "Finalizado".

   El texto "Estado del evento:" está oculto a la vista pero sí se lee:
   da contexto al escuchar la tarjeta. */
export function etiquetaEstado(estado, grande) {
  var clases = "estado " + claseEstado(estado);
  if (grande) {
    clases = clases + " estado-grande";
  }
  return '<span class="' + clases + '">' +
           '<span class="oculto">Estado del evento: </span>' + escapar(estado) +
         '</span>';
}

/* Colores de las gráficas (paleta de IBM, definida en admin.css) */
export var COLOR_ESTADO = {
  "Programado": "var(--grafica-azul)",
  "En Boletería": "var(--grafica-amarillo)",
  "En Vivo": "var(--grafica-magenta)",
  "Finalizado": "var(--grafica-morado)",
  "Cancelado": "var(--grafica-naranja)"
};

var CLASE_AGENTE = {
  "Activo": "agente-activo",
  "Pendiente": "agente-pendiente",
  "Suspendido": "agente-suspendido"
};

export function etiquetaAgente(estado) {
  return '<span class="estado ' + CLASE_AGENTE[estado] + '">' +
    '<span class="oculto">Estado: </span>' + estado +
  '</span>';
}

/* Logo del agente o, si no tiene, la inicial de su nombre */
export function avatarAgente(a, grande) {
  if (a.logo) {
    return '<img class="agente-inicial agente-logo' + (grande ? " agente-inicial-grande" : "") + '" src="' +
      escapar(a.logo) + '" alt="" />';
  }
  return '<span class="agente-inicial' + (grande ? " agente-inicial-grande" : "") + '" aria-hidden="true">' +
    escapar(a.nombre.charAt(0)) + '</span>';
}

export var CLASE_RESERVA = {
  "Confirmada": "agente-activo",
  "Reservada": "agente-pendiente",
  "Cancelada": "agente-suspendido"
};

export function etiqueta(texto, clase, prefijo) {
  return '<span class="estado ' + clase + '"><span class="oculto">' + prefijo + ': </span>' + escapar(texto) + '</span>';
}

/* Colores de cada estado de la reserva en las gráficas */
export var COLOR_RESERVA = {
  "Confirmada": "var(--grafica-azul)",
  "Reservada": "var(--grafica-amarillo)",
  "Cancelada": "var(--grafica-magenta)"
};

/* Si la reserva ya la aprobó un administrador (reserva y pago a la vez) */
export function etiquetaAprobacion(r) {
  if (r.estado === "Cancelada") return '<span class="texto-gris">Cancelada</span>';
  if (r.valor === 0) return '<span class="texto-gris">Gratis</span>';
  return r.estado === "Reservada"
    ? etiqueta("Por aprobar", "agente-pendiente", "Aprobación")
    : etiqueta("Aprobada", "agente-activo", "Aprobación");
}
