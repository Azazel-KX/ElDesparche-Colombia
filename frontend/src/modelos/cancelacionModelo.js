/* ==========================================================================
   modelos/cancelacionModelo.js
   Causas de cancelación de reservas y eventos, y el formato de la nota que se guarda en las observaciones.
   ========================================================================== */

/* ===== CAUSAS DE CANCELACIÓN =====
   La causa se guarda como texto en "observaciones" de la reserva o del
   evento (las dos tablas ya tienen ese campo), siempre con este formato
   para que los reportes la puedan leer:
   "Cancelada por el cliente. Causa: No puede asistir. Detalle: ..." */
export var CAUSAS_CANCELACION = {
  reserva: ["No puede asistir", "Error en el evento o en la cantidad", "Pago no realizado a tiempo",
            "Cambio de fecha del evento", "Otra causa"],
  evento: ["Baja venta de entradas", "Fuerza mayor o clima", "Problemas técnicos o logísticos",
           "Cambio de fecha del evento", "Otra causa"]
};

/* Lo que ve el cliente al cancelar: frases en primera persona que se guardan
   con la misma causa de los paneles, para que el reporte las agrupe juntas.
   "Pago no realizado a tiempo" no está porque esa la pone el agente o el admin. */
export var CAUSAS_CLIENTE = [
  ["Ya no puedo asistir", "No puede asistir"],
  ["Me equivoqué de evento o de cantidad", "Error en el evento o en la cantidad"],
  ["Cambió la fecha del evento", "Cambio de fecha del evento"],
  ["Otro motivo", "Otra causa"]
];

/* La frase del cliente para una causa guardada (o la causa tal cual) */
export function causaParaCliente(causa) {
  var par = CAUSAS_CLIENTE.filter(function (c) { return c[1] === causa; })[0];
  return par ? par[0] : causa;
}

export function notaCancelacion(tipo, quien, causa, detalle) {
  var nota = (tipo === "evento" ? "Cancelado" : "Cancelada") + " por " + quien + ". Causa: " + causa + ".";
  return detalle ? nota + " Detalle: " + detalle : nota;
}

/* La nota va en una línea nueva, después de lo que ya tuviera */
export function agregarNota(observaciones, nota) {
  return observaciones ? observaciones + "\n" + nota : nota;
}

/* { quien, causa, detalle } de unas observaciones, o null si no hay nota */
export function leerCancelacion(observaciones) {
  var m = /Cancelad[oa] por ([^.\n]+)\. Causa: ([^.\n]+)\.(?: Detalle: ([^\n]*))?/.exec(observaciones || "");
  return m ? { quien: m[1], causa: m[2], detalle: m[3] || "" } : null;
}
