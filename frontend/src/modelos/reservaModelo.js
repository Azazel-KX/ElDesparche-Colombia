/* ==========================================================================
   modelos/reservaModelo.js
   Reservas: reglas de precio y de entrada, y acceso a la API (cliente, administrador y agente).
   ========================================================================== */

import { edadEn, fechaTextoAIso } from "../lib/fechas.js";
import { enviarCrud, llamarApi, revisarRespuesta } from "./clienteApi.js";
import { buscarEvento, cuposLibres } from "./eventoModelo.js";
import { ESTADOS_PAGO } from "./catalogos.js";
import { normalizar } from "../lib/formato.js";
import { EVENTOS } from "./eventoModelo.js";

function reservaDesdeApi(r) {
  var evento = buscarEvento(r.eventoId) || {};
  return {
    codigo: r.codigo,
    idEvento: r.eventoId,
    titulo: r.evento,
    teatro: evento.teatro || "",
    ciudad: evento.ciudad || "",
    fechaEvento: evento.fechaInicio || "",
    titular: r.cliente,
    tickets: r.entradas,
    total: r.valor,
    fechaReserva: new Date(r.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" }),
    estado: r.estado,
    usada: r.usada,
    observaciones: r.observaciones,
    pago: r.pago
  };
}

/* ===== El cliente: reservar, ver sus reservas y cancelarlas =====
     GET   /api/reservas/mias                -> { reservas }
     POST  /api/reservas                     cuerpo { idEvento, entradas, observaciones } -> 201 { reserva }
     PATCH /api/reservas/:codigo/cancelar    cuerpo { causa, detalle }
   La confirmación y "Mis reservas" las pintan con la forma de reservaDesdeApi.
   Lo que la reserva no trae del evento (teatro, ciudad, fecha) sale del catálogo. */

export function reservasDelApi() {
  return llamarApi("/reservas/mias").then(function (resultado) {
    return revisarRespuesta(resultado, 200, "No se pudieron cargar tus reservas.").reservas.map(reservaDesdeApi);
  });
}

/* Registra la reserva y deja guardado su código como "última reserva" para la página de confirmación.
   Si el evento es de pago queda "Reservada" hasta que un administrador confirme el pago; si es gratis, confirmada. */
export function crearReserva(idEvento, entradas, observaciones) {
  return llamarApi("/reservas", {
    method: "POST",
    body: JSON.stringify({ idEvento: idEvento, entradas: entradas, observaciones: observaciones })
  }).then(function (resultado) {
    var datos = revisarRespuesta(resultado, 201, "No se pudo registrar la reserva.");
    guardarUltimaReserva(datos.reserva.codigo);
    return datos.reserva;
  });
}

/* La cancela el servidor, que agrega la causa a las observaciones */
export function cancelarReservaCliente(codigo, causa, detalle) {
  return llamarApi("/reservas/" + encodeURIComponent(codigo) + "/cancelar", {
    method: "PATCH",
    body: JSON.stringify({ causa: causa, detalle: detalle })
  }).then(function (resultado) {
    revisarRespuesta(resultado, 200, "No se pudo cancelar la reserva.");
  });
}

/* La reserva que se acaba de hacer o de abrir desde "Mis reservas" */
export function guardarUltimaReserva(codigo) {
  localStorage.setItem("ultimaReserva", codigo);
}

export function leerUltimaReserva() {
  return localStorage.getItem("ultimaReserva");
}

/* Reglas para reservar: solo reservan los clientes, con la edad mínima del evento y mientras queden
   cupos (las mismas que revisa la base de datos). Devuelve el motivo por el que no puede, o "" si puede. */
export function motivoBloqueoReserva(usuario, evento) {
  var inicioEvento = evento.inicio || fechaTextoAIso(evento.fechaInicio);

  if (usuario.tipo !== "usuario") {
    return "Solo las cuentas de cliente pueden reservar entradas.";
  }
  if (cuposLibres(evento) === 0) {
    return "Este evento ya no tiene cupos disponibles.";
  }
  if (evento.edad > 0 && !usuario.nacimiento) {
    return "Este evento es solo para mayores de " + evento.edad + " años y en tu cuenta no está tu fecha de nacimiento. " +
      "Escríbenos a soporte@eldesparche.online para agregarla.";
  }
  if (evento.edad > 0 && edadEn(usuario.nacimiento, inicioEvento ? new Date(inicioEvento) : new Date()) < evento.edad) {
    return "Este evento es solo para mayores de " + evento.edad + " años, así que no puedes reservar entradas.";
  }
  return "";
}

/* Una reserva de un evento de pago que todavía no tiene un pago aprobado: no lleva QR.
   Queda "Reservada" hasta que un administrador confirme el pago. */
export function esperaPago(reserva) {
  if (reserva.pago) return reserva.pago.estado === "PENDING";
  return reserva.estado === "Reservada" && reserva.total > 0;
}

export function contenidoQr(codigo, idEvento) {
  return "ELDESPARCHE|" + codigo + "|" + idEvento;
}

/* Lee el texto de un QR. Devuelve null si no es de El Desparche. */
export function leerContenidoQr(texto) {
  var partes = String(texto).trim().split("|");
  if (partes.length < 3 || partes[0] !== "ELDESPARCHE") return null;
  return { codigo: partes[1], idEvento: partes[2] };
}

export function obtenerReservasAdmin() {
  return llamarApi("/admin/reservas").then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cargar la lista de reservas.");
    }
    return resultado.datos.reservas;
  });
}

/* Devuelve la reserva como la dejó el servidor */
export function cancelarReservaAdmin(codigo, observaciones) {
  return llamarApi("/admin/reservas/" + encodeURIComponent(codigo) + "/estado", {
    method: "PATCH",
    body: JSON.stringify({ estado: "Cancelada", observaciones: observaciones })
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cancelar la reserva.");
    }
    return resultado.datos.reserva;
  });
}

/* ===== REGISTRAR, MODIFICAR Y ELIMINAR RESERVAS (solo el administrador) ===== */

/* ¿La entrada sirve para entrar? Pagada, gratis, o confirmada por un administrador
   (por ejemplo, una reserva que registró él y se pagó en taquilla) */
export function entradaValida(r) {
  if (r.estado === "Cancelada") return false;
  if (r.pago) return r.pago.estado === "APPROVED";
  return r.valor === 0 || r.estado === "Confirmada";
}

/* codigo = null para registrar una nueva. Devuelve la reserva como la dejó el servidor
   (con su código DES-#### real, el valor y la fecha, que pone la base de datos) */
export function guardarReserva(datos, codigo) {
  var guardado = codigo === null
    ? enviarCrud("/admin/reservas", "POST", datos, "No se pudo registrar la reserva.")
    : enviarCrud("/admin/reservas/" + encodeURIComponent(codigo), "PUT", datos, "No se pudieron guardar los cambios.");
  return guardado.then(function (respuesta) { return respuesta.reserva; });
}

export function eliminarReserva(codigo) {
  return enviarCrud("/admin/reservas/" + encodeURIComponent(codigo), "DELETE", null, "No se pudo eliminar la reserva.");
}

export function registrarIngreso(reserva, revisor, ruta) {
  var ingreso = {
    fecha: new Date().toISOString(),
    eventoId: reserva.eventoId,
    evento: reserva.evento,
    cliente: reserva.cliente,
    entradas: reserva.entradas,
    revisadoPor: revisor
  };

  return llamarApi((ruta || "/admin/entradas/") + encodeURIComponent(reserva.codigo) + "/ingreso", {
    method: "POST"
  }).then(function (resultado) {
    if (resultado.estado !== 201) {
      throw new Error(resultado.datos.error || "No se pudo registrar el ingreso.");
    }
    return ingreso;
  });
}

export function obtenerReservasAgente() {
  return llamarApi("/agente/reservas").then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudieron cargar las reservas de tus eventos.");
    }
    return resultado.datos.reservas;
  });
}

export function cancelarReservaAgente(codigo, observaciones) {
  return llamarApi("/agente/reservas/" + encodeURIComponent(codigo) + "/estado", {
    method: "PATCH",
    body: JSON.stringify({ estado: "Cancelada", observaciones: observaciones })
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cancelar la reserva.");
    }
  });
}

/* ===== Validar entradas en la puerta ===== */

/* ¿Esta persona puede validar entradas de ese evento? "permitidos" es null (todos) o la lista de sus eventos */
export function eventoPermitido(permitidos, idEvento) {
  return !permitidos || permitidos.indexOf(idEvento) !== -1;
}

/* Las entradas que la base ya tiene como usadas (no guarda la hora del ingreso), solo de los eventos permitidos */
export function ingresosRegistrados(reservas, permitidos) {
  return reservas
    .filter(function (r) { return r.usada && eventoPermitido(permitidos, r.eventoId); })
    .map(function (r) {
      return { codigo: r.codigo, eventoId: r.eventoId, evento: r.evento, cliente: r.cliente, entradas: r.entradas };
    });
}

/* Los eventos de la puerta: los que tienen reservas vigentes (no canceladas) y que esta persona puede validar */
export function eventosDeLaPuerta(reservas, permitidos) {
  var vistos = {};
  return reservas.filter(function (r) {
    if (r.estado === "Cancelada" || !eventoPermitido(permitidos, r.eventoId) || vistos[r.eventoId]) return false;
    vistos[r.eventoId] = true;
    return true;
  }).map(function (r) { return { id: r.eventoId, titulo: r.evento }; });
}

/* Qué hacer con una entrada que llega a la puerta. Devuelve un veredicto:
   { clase, titulo, texto, reserva, registrar }   (registrar = true solo si la entrada es válida)
   "eventoPuerta" es el evento que se está validando en esta puerta ("" = cualquiera). */
export function evaluarEntrada(codigo, reservas, permitidos, eventoPuerta) {
  var reserva = reservas.filter(function (r) { return r.codigo === codigo; })[0];

  if (!reserva) {
    return { clase: "validar-no", titulo: "Entrada no encontrada",
      texto: "No existe ninguna reserva con el código " + codigo + ". Revisa que esté bien escrito.", reserva: null };
  }

  /* Un agente no ve los datos de las entradas de otros organizadores */
  if (!eventoPermitido(permitidos, reserva.eventoId)) {
    return { clase: "validar-no", titulo: "No es de tus eventos",
      texto: "Esta entrada es para un evento de otro organizador, así que no puedes validarla.", reserva: null };
  }

  if (eventoPuerta && String(reserva.eventoId) !== eventoPuerta) {
    return { clase: "validar-no", titulo: "Es de otro evento",
      texto: "Esta entrada es para otro evento, no para el que estás validando en esta puerta.", reserva: reserva };
  }

  if (reserva.estado === "Cancelada") {
    return { clase: "validar-no", titulo: "Reserva cancelada", texto: "Esta reserva fue cancelada y la entrada ya no vale.", reserva: reserva };
  }

  if (reserva.pago && reserva.pago.estado !== "APPROVED") {
    return { clase: "validar-no", titulo: "Pago sin aprobar",
      texto: "El pago de esta reserva está " + ESTADOS_PAGO[reserva.pago.estado].toLowerCase() +
        ". No puede entrar hasta que se apruebe.", reserva: reserva };
  }

  if (!reserva.pago && reserva.valor > 0 && reserva.estado !== "Confirmada") {
    return { clase: "validar-no", titulo: "Reserva sin pagar",
      texto: "Esta reserva todavía no está pagada. Puede entrar cuando un administrador la confirme.", reserva: reserva };
  }

  /* Lo dice la base de datos (reserva.usada) */
  if (reserva.usada) {
    return { clase: "validar-usada", titulo: "Esta entrada ya se usó",
      texto: "Ya se registró el ingreso con esta entrada. Si la persona insiste, revisa su documento.", reserva: reserva };
  }

  return { clase: "validar-si", titulo: "Entrada válida",
    texto: "Comprueba que el documento de la persona coincide con el del titular y registra el ingreso.",
    reserva: reserva, registrar: true };
}

/* ----- Reservas del panel (administrador y agente) ----- */

export function reservasConPago(reservas, estado) {
  return reservas.filter(function (r) { return r.pago && r.pago.estado === estado; });
}

/* filtros = { texto, evento, pago, metodo, orden }; vacío = sin filtrar */
export function filtrarReservas(reservas, filtros) {
  var texto = normalizar((filtros.texto || "").trim());
  var lista = reservas.filter(function (r) {
    var coincide = texto === "" ||
      normalizar(r.codigo + " " + r.cliente + " " + r.evento + " " + (r.pago ? r.pago.id : "")).indexOf(texto) !== -1;
    return coincide &&
      (!filtros.evento || String(r.eventoId) === filtros.evento) &&
      (!filtros.pago || (r.pago && r.pago.estado === filtros.pago)) &&
      (!filtros.metodo || (r.pago && r.pago.metodo === filtros.metodo));
  });
  lista.sort(function (a, b) {
    if (filtros.orden === "valor") return b.valor - a.valor;
    if (filtros.orden === "entradas") return b.entradas - a.entradas;
    return b.fecha.localeCompare(a.fecha);
  });
  return lista;
}

export function eventoPorId(id) {
  return EVENTOS.filter(function (e) { return String(e.id) === String(id); })[0];
}

/* Reglas del formulario de registrar/editar una reserva. Devuelve { campo: mensaje }.
   ctx = { nuevo, abierto, cliente, evento } */
export function erroresDeReserva(v, ctx) {
  var errores = {};
  var ev = ctx.evento;
  if (ctx.nuevo) {
    if (!ctx.cliente) errores.cliente = "Elige el cliente.";
    if (!ev) errores.evento = "Elige el evento.";
  }
  if (!/^[0-9]+$/.test(String(v.entradas)) || Number(v.entradas) < 1 || Number(v.entradas) > 10) {
    errores.entradas = "El número de entradas debe ser de 1 a 10.";
  }
  if (!v.estado) errores.estado = "Elige el estado.";

  /* Edad mínima del evento, en la fecha del evento (como el trigger de la base de datos) */
  if (ctx.nuevo && ctx.cliente && ev && ev.edad > 0) {
    var inicio = ev.inicio || fechaTextoAIso(ev.fechaInicio);
    var edad = edadEn(ctx.cliente.nacimiento, inicio ? new Date(inicio) : new Date());
    if (edad < ev.edad) {
      errores.evento = ctx.cliente.nombre + " tendrá " + edad + " años y el evento es solo para mayores de " + ev.edad + ".";
    }
  }

  /* Cupo: solo cuentan las entradas que se agregan */
  if (ev && !errores.entradas) {
    var agregadas = Number(v.entradas) - (ctx.nuevo ? 0 : ctx.abierto.entradas);
    var cupos = cuposLibres(ev);
    if (agregadas > 0 && agregadas > cupos) {
      errores.entradas = cupos === 0 ? "El evento ya no tiene cupos."
        : (cupos === 1 ? "Solo queda 1 cupo." : "Solo quedan " + cupos + " cupos.");
    }
  }
  return errores;
}
