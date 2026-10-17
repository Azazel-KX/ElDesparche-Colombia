/* ==========================================================================
   El Desparche - verificar.js
   Página "Verificar mi identidad" (cliente).

   1. Lee en el navegador el código de barras PDF417 de la cédula amarilla
      (o el QR de la cédula digital) con ZXing, y compara el número y la
      fecha de nacimiento leídos con los datos de la cuenta.
   2. Guarda una foto del frente del documento y una selfie, que el
      administrador revisa en la página de Verificaciones.
   La solicitud queda "Pendiente" hasta que un administrador la aprueba.
   ========================================================================== */

import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

var D = window.Desparche;

var pistas = new Map();
pistas.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417, BarcodeFormat.QR_CODE]);
pistas.set(DecodeHintType.TRY_HARDER, true);

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function fechaLarga(iso) {
  var p = iso.split("-");
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

/* ===== LECTURA DE LA CÉDULA ===== */

function limpiar(texto) {
  return texto.replace(/\0/g, " ").replace(/\s+/g, " ").trim();
}

/* Datos del código PDF417 de la cédula amarilla. Sus campos van en
   posiciones fijas; si el formato no encaja, se buscan por patrón. */
function leerCodigo(texto) {
  var datos = { numero: "", nacimiento: "", nombre: "" };

  if (texto.length >= 160) {
    var numero = texto.substring(48, 58).replace(/\D/g, "").replace(/^0+/, "");
    var fecha = texto.substring(152, 160);
    if (numero.length >= 6) datos.numero = numero;
    if (/^(19|20)\d{6}$/.test(fecha)) {
      datos.nacimiento = fecha.slice(0, 4) + "-" + fecha.slice(4, 6) + "-" + fecha.slice(6, 8);
    }
    datos.nombre = limpiar([
      texto.substring(104, 127), texto.substring(127, 150),
      texto.substring(58, 81), texto.substring(81, 104)
    ].join(" ")).replace(/[^A-ZÁÉÍÓÚÑ ]/gi, "").trim();
  }

  if (!datos.nacimiento) {
    var sexoFecha = texto.match(/[MF]((?:19|20)\d{2})(\d{2})(\d{2})/);
    if (sexoFecha) datos.nacimiento = sexoFecha[1] + "-" + sexoFecha[2] + "-" + sexoFecha[3];
  }

  return datos;
}

/* ¿El código contiene el número y la fecha de la cuenta? */
function comparar(texto, datos, numeroCuenta, nacimientoCuenta) {
  var numero = numeroCuenta.replace(/\D/g, "").replace(/^0+/, "");
  var p = nacimientoCuenta.split("-");
  var formatosFecha = p.length === 3
    ? [p[0] + p[1] + p[2], p[0] + "-" + p[1] + "-" + p[2], p[2] + "/" + p[1] + "/" + p[0], p[2] + p[1] + p[0]]
    : [];

  var numeroOk = numero !== "" && (datos.numero === numero || texto.indexOf(numero) !== -1);
  var fechaOk = formatosFecha.length > 0 && (datos.nacimiento === nacimientoCuenta ||
    formatosFecha.some(function (f) { return texto.indexOf(f) !== -1; }));

  return { numero: numeroOk, nacimiento: fechaOk };
}

/* ===== IMÁGENES ===== */

/* Reduce la foto a 640 px de lado como máximo para guardarla */
function reducir(origen, ancho, alto) {
  var escala = Math.min(1, 640 / Math.max(ancho, alto));
  var lienzo = document.createElement("canvas");
  lienzo.width = Math.round(ancho * escala);
  lienzo.height = Math.round(alto * escala);
  lienzo.getContext("2d").drawImage(origen, 0, 0, lienzo.width, lienzo.height);
  return lienzo.toDataURL("image/jpeg", 0.8);
}

function leerArchivo(archivo) {
  return new Promise(function (resolver, rechazar) {
    var lector = new FileReader();
    lector.onload = function () {
      var imagen = new Image();
      imagen.onload = function () { resolver({ url: lector.result, imagen: imagen }); };
      imagen.onerror = function () { rechazar(new Error("El archivo no es una imagen válida.")); };
      imagen.src = lector.result;
    };
    lector.onerror = function () { rechazar(new Error("No se pudo leer el archivo.")); };
    lector.readAsDataURL(archivo);
  });
}

function abrirCamara(video, frontal) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return Promise.reject(new Error("Tu navegador no permite usar la cámara. Sube una foto en su lugar."));
  }
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: frontal ? "user" : "environment", width: { ideal: 1280 } },
    audio: false
  }).then(function (flujo) {
    video.srcObject = flujo;
    return video.play().then(function () { return flujo; });
  }).catch(function (error) {
    if (error && error.name === "NotAllowedError") {
      throw new Error("No diste permiso para usar la cámara. Puedes subir una foto en su lugar.");
    }
    throw new Error(error && error.message ? error.message : "No se pudo abrir la cámara. Sube una foto en su lugar.");
  });
}

function apagar(flujo) {
  if (flujo) flujo.getTracks().forEach(function (pista) { pista.stop(); });
}

/* ===== PÁGINA ===== */

function pintarEstado(caja, solicitud) {
  if (!solicitud) {
    caja.innerHTML = "";
    return;
  }

  var lectura = solicitud.lectura || {};
  var resumenLectura = lectura.metodo
    ? (lectura.coincide
        ? "La lectura automática de tu cédula coincidió con tus datos."
        : "La lectura automática no coincidió del todo con tus datos; un administrador lo revisará.")
    : "Tu documento se revisará a mano.";

  var textos = {
    "Pendiente": {
      clase: "verificar-estado-pendiente",
      titulo: "Tu verificación está en revisión",
      cuerpo: "La enviaste el " + new Date(solicitud.fechaSolicitud).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) +
        ". " + resumenLectura + " Podrás reservar en cuanto un administrador la apruebe."
    },
    "Aprobada": {
      clase: "verificar-estado-aprobada",
      titulo: "Tu identidad está verificada",
      cuerpo: "Ya puedes reservar entradas para cualquier evento. <a href=\"eventos.html\">Ver eventos</a>"
    },
    "Rechazada": {
      clase: "verificar-estado-rechazada",
      titulo: "Tu verificación fue rechazada",
      cuerpo: (solicitud.motivo ? "Motivo: " + escapar(solicitud.motivo) + ". " : "") +
        "Revisa tus datos y vuelve a enviarla con fotos más claras."
    }
  };

  var t = textos[solicitud.estado];
  caja.innerHTML =
    '<div class="caja verificar-estado ' + t.clase + '">' +
      '<p class="verificar-estado-etiqueta"><span class="oculto">Estado: </span>' + escapar(solicitud.estado) + '</p>' +
      '<h2>' + t.titulo + '</h2>' +
      '<p>' + t.cuerpo + '</p>' +
    '</div>';
}

function paginaVerificar() {
  var usuario = D.obtenerUsuario();
  var caja = document.getElementById("verificar-estado");
  var formulario = document.getElementById("form-verificar");

  if (!usuario) {
    caja.innerHTML = '<div class="caja verificar-estado"><h2>Inicia sesión para continuar</h2>' +
      '<p>Necesitas una cuenta de cliente para verificar tu identidad.</p></div>';
    D.abrirAcceso("entrar");
    return;
  }

  if (usuario.tipo !== "usuario") {
    caja.innerHTML = '<div class="caja verificar-estado"><h2>Esta página es para clientes</h2>' +
      '<p>La verificación de identidad solo la necesitan las cuentas que reservan entradas.</p></div>';
    return;
  }

  var solicitud = D.verificacionDe(usuario.correo);
  pintarEstado(caja, solicitud);

  if (solicitud && solicitud.estado !== "Rechazada") {
    return;
  }

  formulario.hidden = false;

  var tipo = document.getElementById("ver-tipo");
  var numero = document.getElementById("ver-numero");
  var nacimiento = document.getElementById("ver-nacimiento");
  var resultado = document.getElementById("reverso-resultado");
  var error = document.getElementById("error-verificar");
  var lector = new BrowserMultiFormatReader(pistas);

  if (usuario.tipoDocumento) tipo.value = usuario.tipoDocumento;
  if (usuario.id && usuario.id !== "local") numero.value = usuario.id;
  if (usuario.nacimiento) nacimiento.value = usuario.nacimiento;

  var lectura = null;
  var fotoFrente = "";
  var selfie = "";
  var controlesEscaner = null;
  var flujoSelfie = null;

  function pasoReversoSegunTipo() {
    var esCedula = tipo.value === "CC";
    document.getElementById("paso-reverso").hidden = !esCedula;
    if (!esCedula) lectura = null;
  }
  tipo.addEventListener("change", pasoReversoSegunTipo);
  pasoReversoSegunTipo();

  function mostrarLectura(texto, metodo) {
    var datos = leerCodigo(texto);
    var coincide = comparar(texto, datos, numero.value.trim(), nacimiento.value);

    lectura = {
      metodo: metodo,
      numeroLeido: datos.numero,
      nacimientoLeido: datos.nacimiento,
      nombreLeido: datos.nombre,
      coincideNumero: coincide.numero,
      coincideNacimiento: coincide.nacimiento,
      coincide: coincide.numero && coincide.nacimiento
    };

    var fila = function (nombre, valor, ok) {
      return '<li class="' + (ok ? "verificar-ok" : "verificar-no") + '">' +
        '<strong>' + (ok ? "Coincide" : "No coincide") + ':</strong> ' + nombre +
        (valor ? ' <span class="texto-gris">(leído: ' + escapar(valor) + ')</span>' : '') + '</li>';
    };

    resultado.innerHTML =
      '<p class="verificar-resultado-titulo">' + (lectura.coincide
        ? "Listo: leímos tu cédula y tus datos coinciden."
        : "Leímos el código, pero algunos datos no coinciden con los que escribiste.") + '</p>' +
      '<ul>' +
        fila("número de documento", datos.numero, coincide.numero) +
        fila("fecha de nacimiento", datos.nacimiento ? fechaLarga(datos.nacimiento) : "", coincide.nacimiento) +
      '</ul>' +
      (lectura.coincide ? '' : '<p class="texto-gris">Revisa los datos del paso 1 y vuelve a escanear, o envía la verificación para que la revise un administrador.</p>');
  }

  function sinLectura(mensaje) {
    resultado.innerHTML = '<p class="verificar-resultado-titulo">' + mensaje + '</p>' +
      '<p class="texto-gris">Prueba con más luz, sin reflejos y con el código entero dentro de la foto. ' +
      'Si no funciona, puedes enviar la verificación igual y la revisará un administrador.</p>';
  }

  function detenerEscaner() {
    if (controlesEscaner) {
      controlesEscaner.stop();
      controlesEscaner = null;
    }
    document.getElementById("reverso-visor").hidden = true;
  }

  document.getElementById("reverso-camara").onclick = function () {
    var video = document.getElementById("reverso-video");
    document.getElementById("reverso-visor").hidden = false;
    resultado.textContent = "Buscando el código de barras…";

    lector.decodeFromConstraints({ video: { facingMode: "environment" } }, video, function (leido) {
      if (leido) {
        mostrarLectura(leido.getText(), leido.getBarcodeFormat() === BarcodeFormat.QR_CODE ? "QR" : "PDF417");
        detenerEscaner();
      }
    }).then(function (controles) {
      controlesEscaner = controles;
    }).catch(function () {
      detenerEscaner();
      sinLectura("No se pudo abrir la cámara. Sube una foto del reverso en su lugar.");
    });
  };

  document.getElementById("reverso-detener").onclick = function () {
    detenerEscaner();
    resultado.textContent = "";
    document.getElementById("reverso-camara").focus();
  };

  document.getElementById("reverso-archivo").onchange = function () {
    var archivo = this.files[0];
    if (!archivo) return;
    detenerEscaner();
    resultado.textContent = "Leyendo el código de la foto…";

    leerArchivo(archivo).then(function (leida) {
      return lector.decodeFromImageUrl(leida.url);
    }).then(function (leido) {
      mostrarLectura(leido.getText(), leido.getBarcodeFormat() === BarcodeFormat.QR_CODE ? "QR" : "PDF417");
    }).catch(function () {
      sinLectura("No encontramos el código de barras en esa foto.");
    });
  };

  document.getElementById("frente-archivo").onchange = function () {
    var archivo = this.files[0];
    if (!archivo) return;
    leerArchivo(archivo).then(function (leida) {
      fotoFrente = reducir(leida.imagen, leida.imagen.naturalWidth, leida.imagen.naturalHeight);
      document.getElementById("frente-imagen").src = fotoFrente;
      document.getElementById("frente-vista").hidden = false;
    }).catch(function (e) {
      error.innerHTML = "<strong>Error:</strong> " + escapar(e.message);
    });
  };

  function cerrarSelfie() {
    apagar(flujoSelfie);
    flujoSelfie = null;
    document.getElementById("selfie-visor").hidden = true;
  }

  function ponerSelfie(url) {
    selfie = url;
    document.getElementById("selfie-imagen").src = selfie;
    document.getElementById("selfie-vista").hidden = false;
  }

  document.getElementById("selfie-camara").onclick = function () {
    var video = document.getElementById("selfie-video");
    document.getElementById("selfie-visor").hidden = false;
    abrirCamara(video, true).then(function (flujo) {
      flujoSelfie = flujo;
      document.getElementById("selfie-tomar").focus();
    }).catch(function (e) {
      cerrarSelfie();
      error.innerHTML = "<strong>Error:</strong> " + escapar(e.message);
    });
  };

  document.getElementById("selfie-tomar").onclick = function () {
    var video = document.getElementById("selfie-video");
    if (!video.videoWidth) return;
    ponerSelfie(reducir(video, video.videoWidth, video.videoHeight));
    cerrarSelfie();
    document.getElementById("selfie-camara").focus();
  };

  document.getElementById("selfie-detener").onclick = function () {
    cerrarSelfie();
    document.getElementById("selfie-camara").focus();
  };

  document.getElementById("selfie-archivo").onchange = function () {
    var archivo = this.files[0];
    if (!archivo) return;
    leerArchivo(archivo).then(function (leida) {
      ponerSelfie(reducir(leida.imagen, leida.imagen.naturalWidth, leida.imagen.naturalHeight));
    }).catch(function (e) {
      error.innerHTML = "<strong>Error:</strong> " + escapar(e.message);
    });
  };

  formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();
    error.textContent = "";
    [numero, nacimiento].forEach(function (campo) { campo.removeAttribute("aria-invalid"); });

    function fallo(texto, campo) {
      error.innerHTML = "<strong>Error:</strong> " + texto;
      if (campo) {
        campo.setAttribute("aria-invalid", "true");
        campo.focus();
      }
    }

    if (!/^[A-Za-z0-9]{5,15}$/.test(numero.value.trim())) {
      return fallo("Escribe tu número de documento (solo letras y números).", numero);
    }
    if (!nacimiento.value) {
      return fallo("Escribe tu fecha de nacimiento.", nacimiento);
    }
    if (!fotoFrente) {
      return fallo("Falta la foto del frente de tu documento (paso 3).", document.getElementById("frente-archivo"));
    }
    if (!selfie) {
      return fallo("Falta tu selfie (paso 4).", document.getElementById("selfie-camara"));
    }
    if (!document.getElementById("ver-autorizo").checked) {
      return fallo("Debes autorizar el tratamiento de tus datos para poder verificarte.", document.getElementById("ver-autorizo"));
    }

    detenerEscaner();
    cerrarSelfie();

    /* Si los datos del paso 1 cambiaron después de escanear, se vuelve a comparar */
    if (lectura && lectura.numeroLeido) {
      lectura.coincideNumero = lectura.numeroLeido === numero.value.trim().replace(/^0+/, "");
      lectura.coincideNacimiento = lectura.nacimientoLeido === nacimiento.value;
      lectura.coincide = lectura.coincideNumero && lectura.coincideNacimiento;
    }

    var nueva = {
      estado: "Pendiente",
      tipo: "Biométrica",
      fechaSolicitud: new Date().toISOString(),
      nombre: usuario.nombre,
      correo: usuario.correo,
      tipoDocumento: tipo.value,
      documento: numero.value.trim(),
      nacimiento: nacimiento.value,
      lectura: lectura,
      fotoDocumento: fotoFrente,
      selfie: selfie,
      autorizacionDatos: new Date().toISOString()
    };

    try {
      D.guardarVerificacion(usuario.correo, nueva);
    } catch (e) {
      return fallo("No se pudo guardar la verificación en este navegador. Prueba con fotos más pequeñas.");
    }

    usuario.id = nueva.documento;
    usuario.tipoDocumento = nueva.tipoDocumento;
    usuario.nacimiento = nueva.nacimiento;
    D.guardarUsuario(usuario);

    formulario.hidden = true;
    pintarEstado(caja, nueva);
    var titulo = caja.querySelector("h2");
    titulo.setAttribute("tabindex", "-1");
    titulo.focus();
  });
}

paginaVerificar();
