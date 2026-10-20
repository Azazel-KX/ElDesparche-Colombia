/* ==========================================================================
   El Desparche - agente.js
   Panel del agente (el organizador de eventos). Reutiliza las gráficas de
   admin.js y lo que script.js deja en window.Desparche.

   Con USAR_API = true los datos salen del API con la misma forma que
   resumenAgenteLocal():
   - GET /api/agente/resumen   (con el token de un usuario AGENTE)
     { agente: { nombre, estado, comision },
       indicadores: { eventosActivos, entradas, ingresos, ganancia, ocupacion, pagosPendientes },
       meses: [{ mes, reservas, ingresos }],   reservas = entradas vendidas ese mes
       estados: [{ estado, total }],
       eventos: [ igual que EVENTOS de script.js ],
       actividad: [{ cuando, texto }] }
   - GET    /api/agente/eventos        -> { agente, eventos: [publicados], solicitudes: [...] }
   - POST   /api/agente/eventos        cuerpo: una solicitud (ver datosFormulario())
   - PUT    /api/agente/eventos/:id    corrige una solicitud en revisión o rechazada
   - DELETE /api/agente/eventos/:id    retira una solicitud que aún no se publica
   Una solicitud nueva o corregida queda "En revisión"; el administrador la
   aprueba (pasa a EVENTO como "Programado") o la rechaza con un motivo.
   - GET  /api/agente/reservas                 -> { reservas: [ igual que en admin.js ] }
   - PATCH /api/agente/reservas/:codigo/estado  cuerpo { estado: "Cancelada", observaciones }
     ("observaciones" lleva la causa, con el formato de notaCancelacion() en script.js)
     (solo si la reserva es de un evento de ese agente; si no, 403)
   - PUT  /api/agente/perfil    cuerpo { nombre, descripcion, logo, correo, telefono, ciudad, experiencia }
     (nombre = nombre_comercial de AGENTE; el NIT, la razón social y la comisión no se cambian aquí)
   - POST /api/agente/entradas/:codigo/ingreso  marca la entrada como usada (201)
   El backend solo debe devolver los eventos y reservas de ESE agente, y
   rechazar el ingreso de una entrada que sea de otro organizador.
   ========================================================================== */

import {
  pesos, numero, escapar, animarAlVer, pintarTarjetas, pintarMeses, prepararSelectorSerie,
  pintarEstados, pintarActividad, completarEvento, barraOcupacion,
  obtenerAgentes, obtenerReservasAdmin, ultimosMeses, COLOR_ESTADO, paginaValidar,
  paginaReservasAdmin, cancelarReservaAdmin, crearMapaEvento, reducirImagen, esEventoDe, iniciarSecciones
} from "./admin.js";

var D = window.Desparche;

var pesosCompacto = new Intl.NumberFormat("es-CO", {
  style: "currency", currency: "COP", notation: "compact", maximumFractionDigits: 1
});


/* ===== DATOS ===== */

function primerNombre(nombre) {
  var partes = String(nombre).split(" ");
  return partes[0] + (partes[1] ? " " + partes[1].charAt(0) + "." : "");
}

function cuandoFue(iso) {
  var fecha = new Date(iso);
  return fecha.toLocaleDateString("es-CO", { day: "numeric", month: "short" }) + ", " +
    fecha.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

function textoActividad(r) {
  var entradas = r.entradas === 1 ? "1 entrada" : r.entradas + " entradas";
  var quien = primerNombre(r.cliente);

  if (r.estado === "Cancelada") {
    return quien + " canceló " + entradas + " para " + r.evento + ".";
  }
  if (r.pago && r.pago.estado === "PENDING") {
    return quien + " reservó " + entradas + " para " + r.evento + " y su pago está pendiente.";
  }
  return quien + " compró " + entradas + " para " + r.evento + ".";
}

function resumenAgenteLocal(usuario) {
  return Promise.all([obtenerAgentes(), obtenerReservasAdmin()]).then(function (datos) {
    var agente = datos[0].filter(function (a) { return a.nit === usuario.nit; })[0];
    if (!agente) {
      throw new Error("No encontramos la empresa de esta cuenta de agente.");
    }

    var eventos = D.eventos
      .filter(function (e) { return esDelAgente(e, agente); })
      .map(completarEvento);
    var vigentes = eventos.filter(function (e) { return e.estado !== "Cancelado"; });

    var reservas = datos[1]
      .filter(function (r) { return eventos.some(function (e) { return e.id === r.eventoId; }); })
      .sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });

    /* Precio medio de una entrada, para pasar las ventas del mes a pesos */
    var precioMedio = agente.entradas ? agente.ingresos / agente.entradas : 0;
    var etiquetas = ultimosMeses(agente.ventas.length);

    var conteo = {};
    eventos.forEach(function (e) { conteo[e.estado] = (conteo[e.estado] || 0) + 1; });

    var ocupacion = vigentes.length
      ? Math.round(vigentes.reduce(function (s, e) { return s + e.ocupacion; }, 0) / vigentes.length)
      : 0;

    return {
      agente: { nombre: agente.nombre, estado: agente.estado, comision: agente.comision },
      indicadores: {
        eventosActivos: eventos.filter(function (e) {
          return e.estado !== "Finalizado" && e.estado !== "Cancelado";
        }).length,
        entradas: agente.entradas,
        ingresos: agente.ingresos,
        ganancia: Math.round(agente.ingresos * (1 - agente.comision / 100)),
        ocupacion: ocupacion,
        pagosPendientes: reservas.filter(function (r) {
          return r.estado !== "Cancelada" && r.pago && r.pago.estado === "PENDING";
        }).length
      },
      meses: etiquetas.map(function (mes, i) {
        return { mes: mes, reservas: agente.ventas[i], ingresos: Math.round(agente.ventas[i] * precioMedio) };
      }),
      estados: Object.keys(COLOR_ESTADO).map(function (estado) {
        return { estado: estado, total: conteo[estado] || 0 };
      }),
      eventos: eventos,
      actividad: reservas.slice(0, 6).map(function (r) {
        return { cuando: cuandoFue(r.fecha), texto: textoActividad(r) };
      })
    };
  });
}

function obtenerResumenAgente(usuario) {
  if (!D.usarApi) {
    return resumenAgenteLocal(usuario);
  }

  return D.llamarApi("/agente/resumen", {
    headers: { Authorization: "Bearer " + usuario.token }
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudieron cargar los datos de tu panel.");
    }
    var datos = resultado.datos;
    datos.eventos = datos.eventos.map(completarEvento);
    return datos;
  });
}


/* ===== DIBUJO ===== */

function pintarIndicadoresAgente(datos) {
  var ind = datos.indicadores;
  var ultimo = datos.meses[datos.meses.length - 1];
  var anterior = datos.meses[datos.meses.length - 2];
  var cambio = anterior && anterior.reservas
    ? Math.round((ultimo.reservas - anterior.reservas) / anterior.reservas * 100)
    : null;
  var porcentaje = function (n) { return n + " %"; };

  pintarTarjetas([
    { titulo: "Eventos activos", valor: ind.eventosActivos, formato: numero.format },
    { titulo: "Entradas vendidas", valor: ind.entradas, formato: numero.format, cambio: cambio },
    { titulo: "Ventas", valor: ind.ingresos, formato: pesosCompacto.format, completo: pesos.format },
    { titulo: "Tu ganancia (después de la comisión del " + numero.format(datos.agente.comision) + " %)",
      valor: ind.ganancia, formato: pesosCompacto.format, completo: pesos.format },
    { titulo: "Ocupación promedio", valor: ind.ocupacion, formato: porcentaje },
    { titulo: "Pagos pendientes", valor: ind.pagosPendientes, formato: numero.format,
      alerta: ind.pagosPendientes > 0 }
  ]);
}

/* Cada evento con su fecha, teatro, estado y cuánto se ha llenado */
function pintarEventosAgente(datos) {
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
        D.etiquetaEstado(e.estado, false) +
        '<p class="agente-evento-cifras">' + cifras + '</p>' +
        barraOcupacion(e) +
      '</div>' +
    '</li>';
  }).join("");

  lista.classList.remove("visible");
  animarAlVer(lista);
}

/* Aviso cuando la cuenta del agente no está activa */
function pintarEstadoCuenta(agente) {
  var caja = document.getElementById("agente-cuenta");
  var textos = {
    "Pendiente": "Tu cuenta de agente está en revisión. Cuando un administrador la apruebe podrás publicar eventos.",
    "Suspendido": "Tu cuenta de agente está suspendida, así que no puedes publicar eventos nuevos. Escribe a soporte@eldesparche.online para saber el motivo."
  };

  caja.hidden = !textos[agente.estado];
  caja.textContent = textos[agente.estado] || "";
}


/* ===== PÁGINA ===== */

/* Muestra el panel si hay sesión de agente; si no, el aviso de acceso */
function entrarComoAgente() {
  var usuario = D.obtenerUsuario();

  if (!usuario || usuario.tipo !== "agente") {
    document.getElementById("admin-bloqueo").hidden = false;
    document.getElementById("bloqueo-entrar").onclick = function () {
      D.abrirAcceso("entrar");
    };
    return null;
  }

  document.getElementById("admin-marco").hidden = false;
  return usuario;
}

function paginaPanelAgente() {
  var usuario = entrarComoAgente();
  if (!usuario) return;

  var aviso = document.getElementById("admin-aviso");
  var datosActuales = null;

  obtenerResumenAgente(usuario).then(function (datos) {
    datosActuales = datos;

    document.getElementById("admin-saludo").textContent =
      "Hola, " + usuario.nombre.split(" ")[0] + ". Así van los eventos de " + datos.agente.nombre + ".";
    datos.nombreCantidad = "Entradas";

    aviso.textContent = D.usarApi ? "" :
      "Modo local: la base de datos está desactivada y se muestran datos de ejemplo.";

    pintarEstadoCuenta(datos.agente);
    pintarIndicadoresAgente(datos);
    pintarMeses(datos);
    pintarEventosAgente(datos);
    pintarEstados(datos);
    pintarActividad(datos);
  }).catch(function (error) {
    aviso.innerHTML = "<strong>Error:</strong> " + escapar(error.message);
  });

  prepararSelectorSerie(function () { return datosActuales; });

  /* La gráfica de meses se vuelve a dibujar si cambia mucho el ancho */
  var cajaMeses = document.getElementById("grafica-meses");
  var anchoAnterior = 0;
  var espera = null;
  if ("ResizeObserver" in window) {
    new ResizeObserver(function () {
      clearTimeout(espera);
      espera = setTimeout(function () {
        var ancho = cajaMeses.clientWidth;
        if (datosActuales && ancho > 0 && Math.abs(ancho - anchoAnterior) > 20) {
          anchoAnterior = ancho;
          pintarMeses(datosActuales);
        }
      }, 150);
    }).observe(cajaMeses);
  }
}

/* ==========================================================================
   SECCIÓN: MIS EVENTOS (agente.html?seccion=eventos)
   ========================================================================== */

var NOMBRE_CATEGORIA = { musica: "Música", teatro: "Teatro", danza: "Danza", circo: "Circo", comedia: "Comedia" };

/* Solicitudes de eventos nuevos guardadas en este navegador (modo local) */
function leerSolicitudes() {
  try {
    return JSON.parse(localStorage.getItem("eventosAgente")) || [];
  } catch (e) {
    return [];
  }
}

function guardarSolicitudes(lista) {
  try {
    localStorage.setItem("eventosAgente", JSON.stringify(lista));
    return true;
  } catch (e) {
    return false;   /* sin espacio (por ejemplo, una imagen muy grande) o modo privado */
  }
}

/* Eventos de ejemplo del agente y los que creó y ya se aprobaron */
function esDelAgente(evento, agente) {
  return esEventoDe(evento, agente);
}

function obtenerEventosDelAgente(usuario) {
  if (!D.usarApi) {
    return obtenerAgentes().then(function (agentes) {
      var agente = agentes.filter(function (a) { return a.nit === usuario.nit; })[0];
      if (!agente) {
        throw new Error("No encontramos la empresa de esta cuenta de agente.");
      }
      return {
        agente: agente,
        eventos: D.eventos
          .filter(function (e) { return esDelAgente(e, agente); })
          .map(completarEvento),
        /* Las aprobadas ya están en D.eventos como publicadas */
        solicitudes: leerSolicitudes().filter(function (s) { return s.nit === usuario.nit && s.estado !== "Aprobado"; })
      };
    });
  }

  return D.llamarApi("/agente/eventos", {
    headers: { Authorization: "Bearer " + usuario.token }
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudieron cargar tus eventos.");
    }
    return {
      agente: resultado.datos.agente,
      eventos: resultado.datos.eventos.map(completarEvento),
      solicitudes: resultado.datos.solicitudes
    };
  });
}

/* Crea o corrige una solicitud: siempre vuelve a quedar "En revisión" */
function enviarSolicitud(usuario, datos, id) {
  if (!D.usarApi) {
    var lista = leerSolicitudes();
    var solicitud = Object.assign({}, datos, {
      id: id || "SOL-" + Date.now(),
      nit: usuario.nit,
      estado: "En revisión",
      motivo: "",
      enviado: new Date().toISOString()
    });

    var posicion = lista.map(function (s) { return s.id; }).indexOf(solicitud.id);
    if (posicion === -1) {
      lista.push(solicitud);
    } else {
      lista[posicion] = solicitud;
    }

    if (!guardarSolicitudes(lista)) {
      return Promise.reject(new Error("No se pudo guardar el evento en este navegador. Prueba con una imagen más pequeña."));
    }
    return Promise.resolve(solicitud);
  }

  return D.llamarApi("/agente/eventos" + (id ? "/" + encodeURIComponent(id) : ""), {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + usuario.token },
    body: JSON.stringify(datos)
  }).then(function (resultado) {
    if (resultado.estado !== 200 && resultado.estado !== 201) {
      throw new Error(resultado.datos.error || "No se pudo enviar el evento a revisión.");
    }
    return resultado.datos;
  });
}

function retirarSolicitud(usuario, id) {
  if (!D.usarApi) {
    guardarSolicitudes(leerSolicitudes().filter(function (s) { return s.id !== id; }));
    return Promise.resolve();
  }

  return D.llamarApi("/agente/eventos/" + encodeURIComponent(id), {
    method: "DELETE",
    headers: { Authorization: "Bearer " + usuario.token }
  }).then(function (resultado) {
    if (resultado.estado !== 200 && resultado.estado !== 204) {
      throw new Error(resultado.datos.error || "No se pudo retirar la solicitud.");
    }
  });
}

/* "2026-12-05T19:00" -> "5 de diciembre de 2026, 7:00 p. m." */
function fechaLegible(valor) {
  var fecha = new Date(valor);
  if (isNaN(fecha)) return valor;
  return fecha.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) + ", " +
    fecha.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

/* Fecha corta para "Enviado el": "15 oct 2026, 9:24 a. m." */
function fechaEnvio(valor) {
  var fecha = new Date(valor);
  if (isNaN(fecha)) return valor;
  var meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return fecha.getDate() + " " + meses[fecha.getMonth()] + " " + fecha.getFullYear() + ", " +
    fecha.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

/* Fecha y hora actual en el formato de <input type="datetime-local"> */
function ahoraLocal() {
  var ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
  return ahora.toISOString().slice(0, 16);
}

/* Tarjeta de un evento ya publicado */
function tarjetaPublicado(e) {
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
      D.etiquetaEstado(e.estado, false) +
      '<p class="agente-evento-cifras">' + cifras + '</p>' +
      barraOcupacion(e) +
    '</div>' +
  '</li>';
}

/* Tarjeta de una solicitud que todavía no se publica */
function tarjetaSolicitud(s) {
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
      D.etiquetaEstado(s.estado, false) +
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

/* Llena la lista de ciudades del formulario, agrupadas por departamento */
function cargarCiudades(lista) {
  return D.llamarApi("/ciudades").then(function (resultado) {
    var ciudades = (resultado.datos && resultado.datos.ciudades) || [];
    var grupos = {};
    ciudades.forEach(function (c) {
      (grupos[c.departamento] = grupos[c.departamento] || []).push(c.nombre);
    });

    lista.innerHTML = '<option value="">Elige una ciudad</option>' +
      Object.keys(grupos).sort().map(function (departamento) {
        return '<optgroup label="' + escapar(departamento) + '">' +
          grupos[departamento].sort().map(function (nombre) {
            return '<option value="' + escapar(nombre) + '" data-departamento="' + escapar(departamento) + '">' +
              escapar(nombre) + '</option>';
          }).join("") +
        '</optgroup>';
      }).join("");
  });
}

function paginaEventosAgente() {
  var usuario = entrarComoAgente();
  if (!usuario) return;

  var aviso = document.getElementById("admin-aviso");
  var exito = document.getElementById("exito-evento");
  var lista = document.getElementById("lista-mis-eventos");
  var conteo = document.getElementById("resultado-mis-eventos");
  var buscar = document.getElementById("buscar-mis-eventos");
  var filtro = document.getElementById("filtro-mis-eventos");
  var botonCrear = document.getElementById("crear-evento");

  var dialogo = document.getElementById("dialogo-evento");
  var formulario = document.getElementById("formulario-evento");
  var error = document.getElementById("error-evento");
  var vista = document.getElementById("vista-imagen");
  var campoImagen = document.getElementById("evento-imagen");

  var datos = { eventos: [], solicitudes: [] };
  var editando = null;        /* id de la solicitud que se corrige */
  var imagenActual = "";      /* imagen reducida, en data URL */
  var origenFoco = null;      /* botón que abrió el formulario */

  var campos = {
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

  /* ----- Lista ----- */

  function pintarLista() {
    var texto = normalizarTexto(buscar.value);
    var estado = filtro.value;

    function coincide(nombre, teatro, ciudad, estadoItem) {
      return (!estado || estadoItem === estado) &&
        (!texto || normalizarTexto(nombre + " " + teatro + " " + ciudad).indexOf(texto) !== -1);
    }

    var solicitudes = datos.solicitudes.filter(function (s) {
      return coincide(s.nombre, s.teatro, s.ciudad, s.estado);
    });
    var eventos = datos.eventos.filter(function (e) {
      return coincide(e.titulo, e.teatro, e.ciudad, e.estado);
    });
    var total = solicitudes.length + eventos.length;

    conteo.textContent = total === 1 ? "1 evento" : total + " eventos";

    if (!total) {
      lista.innerHTML = '<li class="agente-vacio">' +
        (datos.solicitudes.length + datos.eventos.length
          ? "Ningún evento coincide con la búsqueda."
          : "Todavía no tienes eventos. Crea el primero con el botón «Crear evento».") +
      '</li>';
      return;
    }

    /* Primero lo que está pendiente, después lo publicado */
    lista.innerHTML = solicitudes.map(tarjetaSolicitud).join("") + eventos.map(tarjetaPublicado).join("");
    lista.classList.remove("visible");
    animarAlVer(lista);
  }

  function normalizarTexto(t) {
    return String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function cargar() {
    return obtenerEventosDelAgente(usuario).then(function (resultado) {
      datos = resultado;
      pintarEstadoCuenta(resultado.agente);

      var activo = resultado.agente.estado === "Activo";
      botonCrear.disabled = !activo;
      if (!activo) {
        botonCrear.setAttribute("aria-describedby", "agente-cuenta");
      } else {
        botonCrear.removeAttribute("aria-describedby");
      }

      pintarLista();
    });
  }

  buscar.addEventListener("input", pintarLista);
  filtro.addEventListener("change", pintarLista);
  document.getElementById("filtros-agente").addEventListener("submit", function (evento) {
    evento.preventDefault();
  });

  lista.addEventListener("click", function (evento) {
    var editar = evento.target.closest("[data-editar]");
    var retirar = evento.target.closest("[data-retirar]");

    if (editar) {
      var solicitud = datos.solicitudes.filter(function (s) { return s.id === editar.getAttribute("data-editar"); })[0];
      if (solicitud) abrirFormulario(solicitud, editar);
    }

    if (retirar) {
      var id = retirar.getAttribute("data-retirar");
      var cual = datos.solicitudes.filter(function (s) { return s.id === id; })[0];
      if (!cual || !confirm("¿Retirar «" + cual.nombre + "»? La solicitud se borra y no se publicará.")) return;

      retirarSolicitud(usuario, id).then(function () {
        exito.textContent = "Retiraste «" + cual.nombre + "».";
        return cargar();
      }).then(function () {
        buscar.focus();
      }).catch(function (e) {
        aviso.innerHTML = "<strong>Error:</strong> " + escapar(e.message);
      });
    }
  });

  /* ----- Formulario ----- */

  function limpiarErrores() {
    error.textContent = "";
    Object.keys(campos).forEach(function (k) { campos[k].removeAttribute("aria-invalid"); });
  }

  function abrirFormulario(solicitud, boton) {
    origenFoco = boton;
    editando = solicitud ? solicitud.id : null;
    formulario.reset();
    limpiarErrores();

    imagenActual = solicitud && solicitud.imagen ? solicitud.imagen : "";
    vista.hidden = !imagenActual;
    vista.src = imagenActual || "";

    if (solicitud) {
      Object.keys(campos).forEach(function (k) {
        if (solicitud[k] !== undefined) campos[k].value = solicitud[k];
      });
    }

    document.getElementById("titulo-formulario").textContent = solicitud ? "Editar evento" : "Crear evento";
    document.getElementById("enviar-evento").textContent = solicitud ? "Guardar y reenviar a revisión" : "Enviar a revisión";
    campos.inicio.min = ahoraLocal();
    campos.fin.min = campos.inicio.value || ahoraLocal();

    dialogo.showModal();
    campos.nombre.focus();

    /* El mapa se dibuja cuando la ventana ya está abierta y tiene tamaño */
    mapa.preparar().then(function () {
      if (solicitud && solicitud.lat !== undefined && solicitud.lat !== "") {
        mapa.ponerPunto(Number(solicitud.lat), Number(solicitud.lon), true);
      } else {
        mapa.quitarPunto();
        mapa.centrarEnCiudad(campos.ciudad.value);
      }
    });
  }

  function cerrarFormulario() {
    if (dialogo.open) dialogo.close();
  }

  dialogo.addEventListener("close", function () {
    var volver = origenFoco;
    setTimeout(function () { if (volver && document.body.contains(volver)) volver.focus(); }, 0);
  });

  botonCrear.addEventListener("click", function () { abrirFormulario(null, botonCrear); });
  document.getElementById("cerrar-formulario").addEventListener("click", cerrarFormulario);
  document.getElementById("cancelar-formulario").addEventListener("click", cerrarFormulario);

  var mapa = crearMapaEvento(campos, {
    caja: document.getElementById("mapa-evento"),
    estado: document.getElementById("estado-mapa"),
    buscar: document.getElementById("buscar-direccion")
  });

  campos.inicio.addEventListener("change", function () {
    campos.fin.min = campos.inicio.value || ahoraLocal();
  });

  Object.keys(campos).forEach(function (k) {
    campos[k].addEventListener("input", function () { campos[k].removeAttribute("aria-invalid"); });
  });

  campoImagen.addEventListener("change", function () {
    var archivo = campoImagen.files[0];
    if (!archivo) return;

    if (!/^image\//.test(archivo.type) || archivo.size > 10 * 1024 * 1024) {
      campoImagen.value = "";
      campoImagen.setAttribute("aria-invalid", "true");
      error.innerHTML = "<span><strong>Error:</strong> Elige una imagen (JPG, PNG o WebP) de menos de 10 MB.</span>";
      return;
    }

    campoImagen.removeAttribute("aria-invalid");
    reducirImagen(archivo).then(function (url) {
      imagenActual = url;
      vista.src = url;
      vista.hidden = false;
    }).catch(function (e) {
      error.innerHTML = "<span><strong>Error:</strong> " + escapar(e.message) + "</span>";
    });
  });

  /* Revisa los campos en orden y devuelve el primer problema */
  function validar() {
    var v = {};
    Object.keys(campos).forEach(function (k) { v[k] = campos[k].value.trim(); });

    var entero = function (texto) { return /^\d+$/.test(texto); };

    if (v.nombre.length < 3) return ["nombre", "Escribe el nombre del evento."];
    if (!v.categoria) return ["categoria", "Elige la categoría del evento."];
    if (!v.plan) return ["plan", "Elige el tipo de plan."];
    if (v.descripcion.length < 30) return ["descripcion", "La descripción debe tener al menos 30 caracteres."];
    if (!v.inicio) return ["inicio", "Escribe la fecha y la hora en que empieza el evento."];
    if (new Date(v.inicio) <= new Date()) return ["inicio", "El evento debe empezar en una fecha futura."];
    if (!v.fin) return ["fin", "Escribe la fecha y la hora en que termina el evento."];
    if (new Date(v.fin) <= new Date(v.inicio)) return ["fin", "El evento debe terminar después de empezar."];
    if (!v.ciudad) return ["ciudad", "Elige la ciudad del evento."];
    if (v.teatro.length < 3) return ["teatro", "Escribe el nombre del teatro o del sitio del evento."];
    if (v.direccion.length < 5) return ["direccion", "Escribe la dirección del teatro."];
    if (!entero(v.capacidad) || Number(v.capacidad) < 1) return ["capacidad", "La capacidad debe ser un número entero mayor que 0."];
    if (v.precio === "" || isNaN(Number(v.precio)) || Number(v.precio) < 0) return ["precio", "El precio debe ser 0 (gratis) o mayor."];
    if (!entero(v.edad) || Number(v.edad) > 21) return ["edad", "La edad mínima debe ser un número entre 0 y 21."];
    if (v.lat === "" || v.lon === "") return ["lat", "Marca en el mapa dónde es el evento (o escribe la latitud y la longitud)."];
    if (Math.abs(Number(v.lat)) > 90) return ["lat", "La latitud debe estar entre -90 y 90."];
    if (Math.abs(Number(v.lon)) > 180) return ["lon", "La longitud debe estar entre -180 y 180."];
    return null;
  }

  function datosFormulario() {
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
      imagen: imagenActual,
      lat: Number(campos.lat.value),
      lon: Number(campos.lon.value)
    };
  }

  formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();
    limpiarErrores();

    var problema = validar();
    if (problema) {
      error.innerHTML = "<span><strong>Error:</strong> " + escapar(problema[1]) + "</span>";
      campos[problema[0]].setAttribute("aria-invalid", "true");
      campos[problema[0]].focus();
      return;
    }

    var boton = document.getElementById("enviar-evento");
    var nuevos = datosFormulario();
    boton.disabled = true;

    enviarSolicitud(usuario, nuevos, editando).then(function () {
      exito.textContent = (editando ? "Guardaste los cambios de «" : "Enviaste «") + nuevos.nombre +
        "» a revisión. Te avisaremos cuando un administrador lo revise.";
      origenFoco = buscar;
      cerrarFormulario();
      return cargar();
    }).catch(function (e) {
      error.innerHTML = "<span><strong>Error:</strong> " + escapar(e.message) + "</span>";
    }).then(function () {
      boton.disabled = false;
    });
  });

  aviso.textContent = D.usarApi ? "" :
    "Modo local: los eventos que crees se guardan solo en este navegador hasta que exista la base de datos.";

  cargarCiudades(campos.ciudad).catch(function () {
    campos.ciudad.innerHTML = '<option value="">No se pudieron cargar las ciudades</option>';
  });

  cargar().catch(function (e) {
    aviso.innerHTML = "<strong>Error:</strong> " + escapar(e.message);
  });
}


/* ==========================================================================
   SECCIÓN: VALIDAR ENTRADAS (agente.html?seccion=validar)
   Es la misma validación del administrador, limitada a los eventos del agente.
   ========================================================================== */

function obtenerReservasAgente(usuario) {
  if (!D.usarApi) {
    return obtenerReservasAdmin();   /* en modo local, paginaValidar filtra por evento */
  }

  return D.llamarApi("/agente/reservas", {
    headers: { Authorization: "Bearer " + usuario.token }
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudieron cargar las reservas de tus eventos.");
    }
    return resultado.datos.reservas;
  });
}

function paginaValidarAgente() {
  var usuario = entrarComoAgente();
  if (!usuario) return;

  obtenerEventosDelAgente(usuario).then(function (datos) {
    pintarEstadoCuenta(datos.agente);
    paginaValidar({
      usuario: usuario,
      eventos: datos.eventos.map(function (e) { return e.id; }),
      obtenerReservas: function () { return obtenerReservasAgente(usuario); },
      rutaIngreso: "/agente/entradas/"
    });
  }).catch(function (error) {
    document.getElementById("admin-aviso").innerHTML = "<strong>Error:</strong> " + escapar(error.message);
  });
}


/* ==========================================================================
   SECCIÓN: RESERVAS (agente.html?seccion=reservas)
   Es la misma lista del administrador, limitada a los eventos del agente.
   ========================================================================== */

function cancelarReservaAgente(usuario, codigo, observaciones) {
  if (!D.usarApi) {
    return cancelarReservaAdmin(codigo, observaciones);   /* modo local: mismo registro que ve el administrador */
  }

  return D.llamarApi("/agente/reservas/" + encodeURIComponent(codigo) + "/estado", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + usuario.token },
    body: JSON.stringify({ estado: "Cancelada", observaciones: observaciones })
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo cancelar la reserva.");
    }
  });
}

function paginaReservasAgente() {
  var usuario = entrarComoAgente();
  if (!usuario) return;

  obtenerEventosDelAgente(usuario).then(function (datos) {
    pintarEstadoCuenta(datos.agente);
    paginaReservasAdmin({
      eventos: datos.eventos.map(function (e) { return e.id; }),
      obtenerReservas: function () { return obtenerReservasAgente(usuario); },
      cancelar: function (codigo, observaciones) { return cancelarReservaAgente(usuario, codigo, observaciones); },
      quien: "el agente",
      notaDevolucion: " El pago ya fue aprobado: el equipo de El Desparche hará la devolución del dinero al cliente por Wompi."
    });
  }).catch(function (error) {
    document.getElementById("admin-aviso").innerHTML = "<strong>Error:</strong> " + escapar(error.message);
  });
}


/* ==========================================================================
   SECCIÓN: PERFIL DE LA EMPRESA (agente.html?seccion=perfil)
   ========================================================================== */

function guardarPerfil(usuario, datos) {
  if (!D.usarApi) {
    try {
      var perfiles = JSON.parse(localStorage.getItem("perfilesAgentes")) || {};
      perfiles[usuario.nit] = datos;
      localStorage.setItem("perfilesAgentes", JSON.stringify(perfiles));
    } catch (e) {
      return Promise.reject(new Error("No se pudo guardar el perfil en este navegador. Prueba con un logo más pequeño."));
    }
    return Promise.resolve(datos);
  }

  return D.llamarApi("/agente/perfil", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + usuario.token },
    body: JSON.stringify(datos)
  }).then(function (resultado) {
    if (resultado.estado !== 200) {
      throw new Error(resultado.datos.error || "No se pudo guardar el perfil.");
    }
    return resultado.datos;
  });
}

function paginaPerfilAgente() {
  var usuario = entrarComoAgente();
  if (!usuario) return;

  var aviso = document.getElementById("admin-aviso");
  var exito = document.getElementById("exito-perfil");
  var error = document.getElementById("error-perfil");
  var formulario = document.getElementById("formulario-perfil");
  var archivoLogo = document.getElementById("perfil-logo-archivo");
  var vistaLogo = document.getElementById("perfil-logo-vista");
  var quitarLogo = document.getElementById("perfil-quitar-logo");

  var campos = {
    nombre: document.getElementById("perfil-comercial"),
    descripcion: document.getElementById("perfil-descripcion"),
    correo: document.getElementById("perfil-correo"),
    telefono: document.getElementById("perfil-telefono"),
    ciudad: document.getElementById("perfil-ciudad"),
    experiencia: document.getElementById("perfil-experiencia")
  };
  var agente = null;
  var logoActual = "";

  var ETIQUETA_CUENTA = { "Activo": "estado-programado", "Pendiente": "estado-boleteria", "Suspendido": "estado-cancelado" };
  var TEXTO_CUENTA = { "Activo": "Cuenta activa", "Pendiente": "Cuenta en revisión", "Suspendido": "Cuenta suspendida" };

  function fechaRegistro(iso) {
    var fecha = new Date(iso + "T12:00:00");
    return isNaN(fecha) ? iso : fecha.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  }

  function pintarCabecera() {
    document.getElementById("perfil-cabecera").hidden = false;
    document.getElementById("perfil-nombre").textContent = agente.nombre;
    document.getElementById("perfil-razon").textContent = agente.razon || "";
    document.getElementById("perfil-estado").innerHTML =
      '<span class="estado ' + (ETIQUETA_CUENTA[agente.estado] || "estado-finalizado") + '">' +
        '<span class="oculto">Estado de la cuenta: </span>' + escapar(TEXTO_CUENTA[agente.estado] || agente.estado) +
      '</span>';
    document.getElementById("perfil-logo").innerHTML = logoActual
      ? '<img src="' + escapar(logoActual) + '" alt="">'
      : '<span>' + escapar(agente.nombre.charAt(0)) + '</span>';
  }

  function pintarLegales(totalEventos) {
    document.getElementById("perfil-legales").innerHTML =
      '<div><dt>NIT</dt><dd>' + escapar(agente.nit) + '</dd></div>' +
      '<div><dt>Razón social</dt><dd>' + escapar(agente.razon || "—") + '</dd></div>' +
      '<div><dt>Comisión de El Desparche</dt><dd>' + numero.format(agente.comision) + ' % por entrada vendida</dd></div>' +
      '<div><dt>Agente desde</dt><dd>' + escapar(agente.registro ? fechaRegistro(agente.registro) : "—") + '</dd></div>' +
      '<div><dt>Eventos publicados</dt><dd>' + totalEventos + '</dd></div>' +
      '<div><dt>Responsable de la cuenta</dt><dd>' + escapar(usuario.nombre) + '</dd></div>';
  }

  function mostrarLogo() {
    vistaLogo.hidden = !logoActual;
    vistaLogo.src = logoActual || "";
    quitarLogo.hidden = !logoActual;
  }

  function llenarFormulario() {
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

    logoActual = agente.logo || "";
    mostrarLogo();
  }

  function validar() {
    var v = {};
    Object.keys(campos).forEach(function (k) { v[k] = campos[k].value.trim(); });

    if (v.nombre.length < 3) return ["nombre", "Escribe el nombre comercial de la empresa."];
    if (v.descripcion.length < 30) return ["descripcion", "La descripción debe tener al menos 30 caracteres."];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.correo)) return ["correo", "Escribe un correo válido, por ejemplo contacto@empresa.com."];
    if (!/^\d{10}$/.test(v.telefono)) return ["telefono", "El teléfono debe tener 10 dígitos, sin espacios."];
    if (!v.ciudad) return ["ciudad", "Elige la ciudad de la empresa."];
    if (!/^\d+$/.test(v.experiencia) || Number(v.experiencia) > 80) return ["experiencia", "Los años de experiencia deben ser un número entre 0 y 80."];
    return null;
  }

  Object.keys(campos).forEach(function (k) {
    campos[k].addEventListener("input", function () { campos[k].removeAttribute("aria-invalid"); });
  });

  archivoLogo.addEventListener("change", function () {
    var archivo = archivoLogo.files[0];
    if (!archivo) return;
    if (!/^image\//.test(archivo.type) || archivo.size > 10 * 1024 * 1024) {
      archivoLogo.value = "";
      error.innerHTML = "<span><strong>Error:</strong> Elige una imagen (JPG, PNG o WebP) de menos de 10 MB.</span>";
      archivoLogo.focus();
      return;
    }
    reducirImagen(archivo, 400).then(function (url) {
      logoActual = url;
      mostrarLogo();
    }).catch(function (e) {
      error.innerHTML = "<span><strong>Error:</strong> " + escapar(e.message) + "</span>";
    });
  });

  quitarLogo.addEventListener("click", function () {
    logoActual = "";
    archivoLogo.value = "";
    mostrarLogo();
    archivoLogo.focus();
  });

  formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();
    error.textContent = "";
    exito.textContent = "";
    Object.keys(campos).forEach(function (k) { campos[k].removeAttribute("aria-invalid"); });

    var problema = validar();
    if (problema) {
      error.innerHTML = "<span><strong>Error:</strong> " + escapar(problema[1]) + "</span>";
      campos[problema[0]].setAttribute("aria-invalid", "true");
      campos[problema[0]].focus();
      return;
    }

    var datos = {
      nombre: campos.nombre.value.trim(),
      descripcion: campos.descripcion.value.trim(),
      logo: logoActual,
      correo: campos.correo.value.trim(),
      telefono: campos.telefono.value.trim(),
      ciudad: campos.ciudad.value,
      experiencia: Number(campos.experiencia.value)
    };

    var boton = document.getElementById("guardar-perfil");
    boton.disabled = true;
    guardarPerfil(usuario, datos).then(function () {
      Object.assign(agente, datos);
      pintarCabecera();
      exito.textContent = "Guardaste los cambios del perfil de " + datos.nombre + ".";
    }).catch(function (e) {
      error.innerHTML = "<span><strong>Error:</strong> " + escapar(e.message) + "</span>";
    }).then(function () {
      boton.disabled = false;
    });
  });

  aviso.textContent = D.usarApi ? "" :
    "Modo local: los cambios del perfil se guardan solo en este navegador.";

  Promise.all([obtenerEventosDelAgente(usuario), cargarCiudades(campos.ciudad).catch(function () {})])
    .then(function (resultado) {
      agente = resultado[0].agente;
      pintarEstadoCuenta(agente);
      llenarFormulario();
      pintarCabecera();
      pintarLegales(resultado[0].eventos.length);
    }).catch(function (e) {
      aviso.innerHTML = "<strong>Error:</strong> " + escapar(e.message);
    });
}


/* Todo el panel del agente es agente.html: cada sección es una plantilla y
   iniciarSecciones() (js/admin.js) muestra una a la vez, igual que en admin.html */
if (document.body.getAttribute("data-pagina") === "agente") {
  iniciarSecciones({
    panel: paginaPanelAgente,
    eventos: paginaEventosAgente,
    reservas: paginaReservasAgente,
    validar: paginaValidarAgente,
    perfil: paginaPerfilAgente
  });
}
