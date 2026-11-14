/* ==========================================================================
   vistas/accesoVista.js
   Ventana de acceso (iniciar sesión y registrarse) y sus mensajes de error.
   ========================================================================== */

import { escapar } from "../lib/formato.js";

/* La ventana se arma con JavaScript y se agrega a todas las páginas, así no hay que repetir el mismo
   bloque de HTML en cada una. Usa la etiqueta <dialog> de HTML5, que ya trae el fondo oscuro y el
   cierre con la tecla Escape.

   La vista solo dibuja: qué pasa al enviar cada formulario lo decide el controlador, que le pasa
   los manejadores { alEntrar, alRegistrar, alAbrirRegistro }. */

/* Escribe la ventana emergente al final del <body> */
export function crearModalAcceso(manejadores) {
  var modal = document.createElement("dialog");
  modal.className = "modal";
  modal.id = "modal-acceso";

  /* aria-labelledby apunta al título oculto de abajo: toda ventana
     emergente necesita un nombre que el lector anuncie al abrirse.
     <dialog> + showModal() ya se encarga solo de atrapar el foco dentro
     de la ventana y de cerrarla con la tecla Escape (WCAG 2.1.2). */
  modal.setAttribute("aria-labelledby", "titulo-modal");

  modal.innerHTML = '' +
    '<div class="modal-caja">' +

      '<h2 class="oculto" id="titulo-modal">Acceso a tu cuenta de El Desparche</h2>' +

      /* Botón solo con icono: el nombre accesible lo da aria-label y la
         "×" se oculta al lector para que no lea "por" o "equis". */
      '<button type="button" class="modal-cerrar" id="cerrar-modal" ' +
              'aria-label="Cerrar la ventana de acceso">' +
        '<span aria-hidden="true">×</span>' +
      '</button>' +

      /* Logo de El Desparche (decorativo: el título ya nombra la ventana) */
      '<div class="modal-logo">' +
        '<img class="logo-texto" src="img/logo-eldesparche.svg" alt="" aria-hidden="true">' +
      '</div>' +

      /* Pestañas con el patrón ARIA de tabs: el contenedor es tablist,
         cada botón es tab con aria-selected, y cada formulario es el
         tabpanel que le corresponde. */
      '<div class="modal-pestanas" role="tablist" aria-label="Entrar o registrarse">' +
        '<button type="button" class="pestana activa" data-pestana="entrar" ' +
                'role="tab" id="pestana-entrar" aria-selected="true" ' +
                'aria-controls="form-entrar">Iniciar sesión</button>' +
        '<button type="button" class="pestana" data-pestana="registro" ' +
                'role="tab" id="pestana-registro" aria-selected="false" ' +
                'aria-controls="form-registro">Registrarse</button>' +
      '</div>' +

      /* ----- Formulario de inicio de sesión ----- */
      '<form id="form-entrar" role="tabpanel" aria-labelledby="pestana-entrar" novalidate>' +
        '<p class="modal-saludo">¡Qué bueno verte de nuevo! Entra para ver y gestionar tus reservas.</p>' +

        '<div class="campo">' +
          '<label for="correo-entrar">Correo electrónico</label>' +
          '<input type="email" id="correo-entrar" name="correo" required ' +
                 'placeholder="correo@ejemplo.com" autocomplete="email" ' +
                 'aria-describedby="error-entrar">' +
        '</div>' +

        '<div class="campo">' +
          '<label for="clave-entrar">Contraseña</label>' +
          '<input type="password" id="clave-entrar" name="clave" required ' +
                 'placeholder="Tu contraseña" ' +
                 'autocomplete="current-password" aria-describedby="error-entrar">' +
        '</div>' +

        /* role="alert" hace que el lector lea el error en cuanto aparece */
        '<p class="mensaje error" id="error-entrar" role="alert"></p>' +

        '<button type="submit" class="boton boton-morado boton-ancho">Iniciar sesión</button>' +

        /* Aquí el registro aparece como un vínculo */
        '<p class="modal-pie">¿No tienes cuenta? ' +
          '<button type="button" class="vinculo" data-pestana="registro">Regístrate</button>' +
        '</p>' +
      '</form>' +

      /* ----- Formulario de registro ----- */
      '<form id="form-registro" role="tabpanel" aria-labelledby="pestana-registro" hidden novalidate>' +
        '<p class="modal-saludo">Crea tu cuenta y empieza a despacharte.</p>' +

        /* Los dos tipos de cuenta son un grupo de radios: <fieldset> y
           <legend> los agrupan de verdad, así el lector anuncia la
           pregunta antes de cada opción ("Usuario, 1 de 2"). */
        '<fieldset class="tipos-cuenta-grupo">' +
          '<legend class="modal-subtitulo">¿Cómo quieres registrarte?</legend>' +

          /* Cada radio se nombra SOLO con "Usuario" o "Agente"
             (aria-labelledby) y la frase larga pasa a ser su descripción
             (aria-describedby). Sin esto el lector leía de un tirón
             "Usuario Reserva entradas para los eventos que te gusten"
             como si todo fuera el nombre de la opción. */
          '<div class="tipos-cuenta">' +
            '<label class="tipo-cuenta">' +
              '<input type="radio" name="tipo-cuenta" value="usuario" checked ' +
                     'aria-labelledby="tipo-usuario-nombre" ' +
                     'aria-describedby="tipo-usuario-texto">' +
              '<span class="tipo-nombre" id="tipo-usuario-nombre">Usuario</span>' +
              '<span class="tipo-texto" id="tipo-usuario-texto">' +
                'Reserva entradas para los eventos que te gusten.</span>' +
            '</label>' +

            '<label class="tipo-cuenta">' +
              '<input type="radio" name="tipo-cuenta" value="agente" ' +
                     'aria-labelledby="tipo-agente-nombre" ' +
                     'aria-describedby="tipo-agente-texto">' +
              '<span class="tipo-nombre" id="tipo-agente-nombre">Agente</span>' +
              '<span class="tipo-texto" id="tipo-agente-texto">' +
                'Publica y administra tus propios eventos.</span>' +
            '</label>' +
          '</div>' +
        '</fieldset>' +

        /* Los campos siguen la tabla USUARIO de la base de datos
           (tipo y número de documento, nombres, apellidos, correo, clave,
           país, departamento y ciudad). Lo propio de cada tipo de cuenta va en su
           grupo: CLIENTE pide fecha de nacimiento; AGENTE pide NIT y
           razón social. */
        '<fieldset class="grupo-campos">' +
          '<legend class="modal-subtitulo">Tus datos</legend>' +

          '<div class="campo">' +
            '<label for="tipo-id-registro">Tipo de documento</label>' +
            '<select id="tipo-id-registro" name="tipo_identificacion" required ' +
                    'aria-describedby="error-registro">' +
              '<option value="CC">Cédula de ciudadanía (CC)</option>' +
              '<option value="CE">Cédula de extranjería (CE)</option>' +
              '<option value="PAS">Pasaporte (PAS)</option>' +
              '<option value="PPT">Permiso por protección temporal (PPT)</option>' +
              '<option value="NIT">NIT</option>' +
            '</select>' +
          '</div>' +

          '<div class="campo">' +
            '<label for="numero-id-registro">Número de documento</label>' +
            '<input type="text" id="numero-id-registro" name="numero_identificacion" required ' +
                   'inputmode="numeric" maxlength="20" autocomplete="off" ' +
                   'aria-describedby="error-registro">' +
          '</div>' +

          '<div class="campo">' +
            '<label for="nombres-registro">Nombres</label>' +
            '<input type="text" id="nombres-registro" name="nombres" required ' +
                   'maxlength="60" placeholder="Tus nombres" autocomplete="given-name" ' +
                   'aria-describedby="error-registro">' +
          '</div>' +

          '<div class="campo">' +
            '<label for="apellidos-registro">Apellidos</label>' +
            '<input type="text" id="apellidos-registro" name="apellidos" required ' +
                   'maxlength="60" placeholder="Tus apellidos" autocomplete="family-name" ' +
                   'aria-describedby="error-registro">' +
          '</div>' +

          '<div class="campo">' +
            '<label for="telefono-registro">Teléfono <span class="opcional">(opcional)</span></label>' +
            '<input type="tel" id="telefono-registro" name="telefono" ' +
                   'inputmode="numeric" maxlength="10" placeholder="3001234567" ' +
                   'autocomplete="tel-national" aria-describedby="error-registro">' +
          '</div>' +
        '</fieldset>' +

        '<fieldset class="grupo-campos">' +
          '<legend class="modal-subtitulo">¿Dónde vives?</legend>' +

          '<div class="campo">' +
            '<label for="pais-registro">País</label>' +
            '<select id="pais-registro" required aria-describedby="error-registro">' +
              '<option value="">Cargando países…</option>' +
            '</select>' +
          '</div>' +

          '<div class="campo">' +
            '<label for="departamento-registro">Departamento</label>' +
            '<select id="departamento-registro" required disabled aria-describedby="error-registro">' +
              '<option value="">Elige primero un país</option>' +
            '</select>' +
          '</div>' +

          '<div class="campo">' +
            '<label for="ciudad-registro">Ciudad</label>' +
            '<select id="ciudad-registro" name="id_ciudad" required disabled ' +
                    'aria-describedby="error-registro">' +
              '<option value="">Elige primero un departamento</option>' +
            '</select>' +
          '</div>' +

          '<div class="campo">' +
            '<label for="direccion-registro">Dirección</label>' +
            '<input type="text" id="direccion-registro" name="direccion" required ' +
                   'maxlength="150" placeholder="Calle 10 # 5-20" autocomplete="street-address" ' +
                   'aria-describedby="error-registro">' +
          '</div>' +
        '</fieldset>' +

        /* Solo para cuenta de Usuario (tabla CLIENTE) */
        '<fieldset class="grupo-campos" id="campos-usuario">' +
          '<legend class="modal-subtitulo">Sobre ti</legend>' +

          '<div class="campo">' +
            '<label for="nacimiento-registro">Fecha de nacimiento</label>' +
            '<input type="date" id="nacimiento-registro" name="fecha_nacimiento" required ' +
                   'autocomplete="bday" aria-describedby="ayuda-nacimiento error-registro">' +
            '<p class="ayuda-campo" id="ayuda-nacimiento">Algunos eventos tienen edad mínima.</p>' +
          '</div>' +

          '<div class="campo">' +
            '<label for="alias-registro">Alias <span class="opcional">(opcional)</span></label>' +
            '<input type="text" id="alias-registro" name="alias" maxlength="30" ' +
                   'placeholder="Cómo te verán los demás" autocomplete="nickname" ' +
                   'aria-describedby="error-registro">' +
          '</div>' +
        '</fieldset>' +

        /* Solo para cuenta de Agente (tabla AGENTE) */
        '<fieldset class="grupo-campos" id="campos-agente" hidden disabled>' +
          '<legend class="modal-subtitulo">Datos de la empresa</legend>' +

          '<div class="campo">' +
            '<label for="nit-registro">NIT</label>' +
            '<input type="text" id="nit-registro" name="nit" required ' +
                   'maxlength="11" placeholder="900123456-7" autocomplete="off" ' +
                   'aria-describedby="ayuda-nit error-registro">' +
            '<p class="ayuda-campo" id="ayuda-nit">Nueve dígitos, guion y dígito de verificación.</p>' +
          '</div>' +

          '<div class="campo">' +
            '<label for="razon-registro">Razón social</label>' +
            '<input type="text" id="razon-registro" name="razon_social" required ' +
                   'maxlength="120" aria-describedby="error-registro">' +
          '</div>' +

          '<div class="campo">' +
            '<label for="comercial-registro">Nombre comercial</label>' +
            '<input type="text" id="comercial-registro" name="nombre_comercial" required ' +
                   'maxlength="100" aria-describedby="error-registro">' +
          '</div>' +

          '<div class="campo">' +
            '<label for="descripcion-registro">Descripción <span class="opcional">(opcional)</span></label>' +
            '<textarea id="descripcion-registro" name="descripcion" rows="3" ' +
                      'aria-describedby="error-registro"></textarea>' +
          '</div>' +
        '</fieldset>' +

        '<fieldset class="grupo-campos">' +
          '<legend class="modal-subtitulo">Tu cuenta</legend>' +

          '<div class="campo">' +
            '<label for="correo-registro">Correo electrónico</label>' +
            '<input type="email" id="correo-registro" name="correo" required ' +
                   'maxlength="100" placeholder="correo@ejemplo.com" autocomplete="email" ' +
                   'aria-describedby="error-registro">' +
          '</div>' +

          '<div class="campo">' +
            '<label for="clave-registro">Contraseña</label>' +
            '<input type="password" id="clave-registro" name="clave" required ' +
                   'minlength="8" maxlength="72" placeholder="Mínimo 8 caracteres" ' +
                   'autocomplete="new-password" aria-describedby="ayuda-clave error-registro">' +
            /* La regla se dice ANTES de equivocarse, no solo al fallar */
            '<p class="ayuda-campo" id="ayuda-clave">Debe tener 8 caracteres como mínimo.</p>' +
          '</div>' +

          '<div class="campo">' +
            '<label for="clave2-registro">Repite la contraseña</label>' +
            '<input type="password" id="clave2-registro" name="clave2" required ' +
                   'maxlength="72" placeholder="Escríbela otra vez" ' +
                   'autocomplete="new-password" aria-describedby="error-registro">' +
          '</div>' +
        '</fieldset>' +

        '<p class="mensaje error" id="error-registro" role="alert"></p>' +

        '<button type="submit" class="boton boton-morado boton-ancho">Crear cuenta</button>' +

        '<p class="modal-pie">¿Ya tienes cuenta? ' +
          '<button type="button" class="vinculo" data-pestana="entrar">Inicia sesión</button>' +
        '</p>' +
      '</form>' +

    '</div>';

  document.body.appendChild(modal);

  /* Botón de cerrar */
  document.getElementById("cerrar-modal").onclick = function () {
    modal.close();
  };

  /* Al hacer clic en el fondo oscuro también se cierra */
  modal.onclick = function (evento) {
    if (evento.target === modal) {
      modal.close();
    }
  };

  /* Todos los botones que cambian de pestaña (las pestañas y los vínculos) */
  var botones = modal.querySelectorAll("[data-pestana]");
  for (var i = 0; i < botones.length; i++) {
    botones[i].onclick = function () {
      cambiarPestana(this.getAttribute("data-pestana"));
    };
  }

  /* Al cambiar entre Usuario y Agente se muestran los campos de cada uno */
  var radiosTipo = modal.querySelectorAll('input[name="tipo-cuenta"]');
  for (var j = 0; j < radiosTipo.length; j++) {
    radiosTipo[j].onchange = mostrarCamposDelTipo;
  }
  mostrarCamposDelTipo();

  /* Nadie puede haber nacido mañana */
  document.getElementById("nacimiento-registro").max = new Date().toISOString().slice(0, 10);

  /* Qué hacer al enviar cada formulario y al abrir el registro lo decide el controlador */
  alAbrirRegistro = manejadores.alAbrirRegistro;
  document.getElementById("form-entrar").onsubmit = manejadores.alEntrar;
  document.getElementById("form-registro").onsubmit = manejadores.alRegistrar;
}

var alAbrirRegistro = function () {};

/* Ids de todos los campos del registro (para limpiar las marcas de error) */
export var CAMPOS_REGISTRO = [
  "tipo-id-registro", "numero-id-registro", "nombres-registro", "apellidos-registro",
  "telefono-registro", "pais-registro", "departamento-registro", "ciudad-registro",
  "direccion-registro", "nacimiento-registro",
  "alias-registro", "nit-registro", "razon-registro", "comercial-registro",
  "descripcion-registro", "correo-registro", "clave-registro", "clave2-registro"
];

/* Muestra los campos propios del tipo de cuenta elegido y oculta los otros.
   Un <fieldset disabled> no se valida ni se envía, y el lector de pantalla
   lo ignora; por eso se usa junto con hidden. */
function mostrarCamposDelTipo() {
  var esAgente = document.querySelector('input[name="tipo-cuenta"]:checked').value === "agente";
  var usuario = document.getElementById("campos-usuario");
  var agente = document.getElementById("campos-agente");

  usuario.hidden = esAgente;
  usuario.disabled = esAgente;
  agente.hidden = !esAgente;
  agente.disabled = !esAgente;

  /* Un agente normalmente se identifica con NIT */
  var tipoId = document.getElementById("tipo-id-registro");
  if (esAgente && tipoId.value !== "NIT") {
    tipoId.value = "NIT";
  } else if (!esAgente && tipoId.value === "NIT") {
    tipoId.value = "CC";
  }
}

/* Muestra la pestaña de entrar o la de registro.
   Además de la clase "activa" (que es solo el aspecto), se actualiza
   aria-selected, que es el ESTADO que anuncia el lector de pantalla. */
function cambiarPestana(cual) {
  var pestanas = document.querySelectorAll("#modal-acceso .pestana");

  for (var i = 0; i < pestanas.length; i++) {
    var elegida = pestanas[i].getAttribute("data-pestana") === cual;
    pestanas[i].classList.toggle("activa", elegida);
    pestanas[i].setAttribute("aria-selected", elegida ? "true" : "false");
  }

  document.getElementById("form-entrar").hidden = cual !== "entrar";
  document.getElementById("form-registro").hidden = cual !== "registro";

  if (cual === "registro") {
    alAbrirRegistro();
  }

  /* Se limpian los mensajes de error al cambiar */
  limpiarError("error-entrar", ["correo-entrar", "clave-entrar"]);
  limpiarError("error-registro", CAMPOS_REGISTRO);
}

/* Pone las opciones de una lista; "vacio" es el texto de la opción sin elegir */
function ponerOpciones(lista, opciones, vacio) {
  lista.innerHTML = "";
  var primera = document.createElement("option");
  primera.value = "";
  primera.textContent = vacio;
  lista.appendChild(primera);
  opciones.forEach(function (dato) {
    var opcion = document.createElement("option");
    opcion.value = dato.valor;
    opcion.textContent = dato.texto;
    lista.appendChild(opcion);
  });
}

/* Nombres sin repetir, en el orden en que llegan */
function sinRepetir(nombres) {
  return nombres.filter(function (nombre, i) { return nombres.indexOf(nombre) === i; });
}

/* Llena país, departamento y ciudad del registro con los de la base de datos: al elegir el país se abren sus
   departamentos y al elegir el departamento, sus ciudades. */
export function llenarCiudadesRegistro(ciudades) {
  var pais = document.getElementById("pais-registro");
  var departamento = document.getElementById("departamento-registro");
  var ciudad = document.getElementById("ciudad-registro");

  function opcionesDe(nombres) {
    return nombres.map(function (nombre) { return { valor: nombre, texto: nombre }; });
  }

  function pintarDepartamentos() {
    var elegido = pais.value;
    departamento.disabled = !elegido;
    ponerOpciones(departamento, opcionesDe(sinRepetir(ciudades
      .filter(function (c) { return c.pais === elegido; })
      .map(function (c) { return c.departamento; }))),
      elegido ? "Elige tu departamento" : "Elige primero un país");
    pintarCiudades();
  }

  function pintarCiudades() {
    var elegido = departamento.value;
    ciudad.disabled = !elegido;
    ponerOpciones(ciudad, ciudades
      .filter(function (c) { return c.pais === pais.value && c.departamento === elegido; })
      .map(function (c) { return { valor: c.id_ciudad, texto: c.nombre }; }),
      elegido ? "Elige tu ciudad" : "Elige primero un departamento");
  }

  ponerOpciones(pais, opcionesDe(sinRepetir(ciudades.map(function (c) { return c.pais; }))), "Elige tu país");
  pais.onchange = pintarDepartamentos;
  departamento.onchange = pintarCiudades;
  pintarDepartamentos();
}

export function ciudadesRegistroConError() {
  ["pais", "departamento", "ciudad"].forEach(function (nivel) {
    document.getElementById(nivel + "-registro").innerHTML = '<option value="">No se pudieron cargar las ubicaciones</option>';
  });
}

/* ===== MENSAJES DE ERROR ACCESIBLES =====
   REGLA DE ORO (WCAG 1.4.1 y 3.3.1): el error no se transmite solo con
   el color rojo. El mensaje lleva un icono, la palabra "Error:" delante
   y el campo culpable queda marcado con aria-invalid="true". Al ir el
   contenedor con role="alert", el lector lo lee en cuanto aparece. */
export function mostrarError(idMensaje, texto, idCampo) {
  var caja = document.getElementById(idMensaje);

  caja.innerHTML = '<span><strong>Error:</strong> ' + escapar(texto) + '</span>';

  /* El foco va al campo que falló para poder corregirlo enseguida */
  if (idCampo) {
    var campo = document.getElementById(idCampo);
    if (campo) {
      campo.setAttribute("aria-invalid", "true");
      campo.focus();
    }
  }
}

/* Borra el mensaje y quita la marca de inválido de los campos */
export function limpiarError(idMensaje, campos) {
  var caja = document.getElementById(idMensaje);
  if (caja) {
    caja.textContent = "";
  }

  for (var i = 0; i < campos.length; i++) {
    var campo = document.getElementById(campos[i]);
    if (campo) {
      campo.removeAttribute("aria-invalid");
    }
  }
}

/* Abre la ventana emergente en la pestaña que se le indique */
export function abrirAcceso(cual) {
  var modal = document.getElementById("modal-acceso");
  if (modal.open) return;   /* ya abierta (por ejemplo con el aviso de sesión vencida): no se borra el aviso */
  cambiarPestana(cual || "entrar");
  modal.showModal();
}
