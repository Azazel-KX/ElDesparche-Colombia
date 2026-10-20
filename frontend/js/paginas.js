/* ==========================================================================
   El Desparche - paginas.js
   Páginas informativas (nosotros.html): las partes de la página, cifras con
   los datos reales, las animaciones al hacer scroll, el buscador de preguntas
   frecuentes y el atajo para abrir el registro de agente.
   ========================================================================== */

var D = window.Desparche;
var reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ===== PARTES DE LA PÁGINA (nosotros.html) =====
   Nosotros, Prensa, Preguntas frecuentes, Términos y el Manual de usuario viven
   en nosotros.html y se ve una parte a la vez. La parte sale del ancla de la
   dirección: el id de la parte (#prensa, #preguntas-frecuentes, #terminos,
   #manual-de-usuario) o cualquier id que esté dentro de ella (#comunidad,
   #tema-pagos, #cancelaciones, #manual-reservar...). Así funcionan
   los enlaces del pie desde otras páginas y los botones atrás y adelante. */
function prepararPartes() {
  var partes = document.querySelectorAll(".info-parte");
  if (!partes.length) return;
  var actual = null;

  function mostrar(parte) {
    if (parte === actual) return false;
    partes.forEach(function (p) { p.hidden = p !== parte; });
    actual = parte;
    document.title = parte.getAttribute("data-titulo") + " - El Desparche";

    /* El pie marca la parte actual, como antes cada página */
    document.querySelectorAll('.pie a[href^="nosotros.html#"]').forEach(function (enlace) {
      if (enlace.getAttribute("href").split("#")[1] === parte.id) {
        enlace.setAttribute("aria-current", "page");
      } else {
        enlace.removeAttribute("aria-current");
      }
    });

    /* El planeta de Prensa se mide con el ancho que tiene al verse */
    window.dispatchEvent(new Event("resize"));
    return true;
  }

  function irAlAncla(conFoco) {
    var id = decodeURIComponent(location.hash.slice(1));
    var destino = id ? document.getElementById(id) : null;
    var parte = destino ? destino.closest(".info-parte") : null;

    /* Sin ancla, o un ancla fuera de las partes (#contenido, #pie-redes) */
    if (!parte) {
      if (!actual) mostrar(partes[0]);
      return;
    }

    var cambio = mostrar(parte);
    if (destino === parte) {
      /* Como abrir una página: arriba y con el foco en su título. Sin animar,
         para que no se cruce con el desplazamiento suave hasta el ancla */
      window.scrollTo({ top: 0, behavior: "instant" });
      if (conFoco) {
        var titulo = parte.querySelector("h1");
        titulo.setAttribute("tabindex", "-1");
        titulo.focus({ preventScroll: true });
      }
    } else if (cambio) {
      /* El navegador no pudo bajar hasta el destino mientras estaba oculto */
      destino.scrollIntoView();
      if (conFoco && destino.hasAttribute("tabindex")) destino.focus({ preventScroll: true });
    }
  }

  irAlAncla(false);
  window.addEventListener("hashchange", function () { irAlAncla(true); });
}

/* Cifras dentro del texto, calculadas con los eventos de la web */
function prepararCifras() {
  var ciudades = D.eventos.map(function (e) { return e.ciudad; })
    .filter(function (c, i, todas) { return todas.indexOf(c) === i; });
  var valores = { eventos: D.eventos.length, ciudades: ciudades.length };

  document.querySelectorAll("[data-cifra]").forEach(function (cifra) {
    var valor = valores[cifra.getAttribute("data-cifra")];
    if (valor !== undefined) cifra.textContent = valor;
  });
}

/* Cada bloque con data-animar arranca su animación al entrar en pantalla */
function prepararAnimaciones() {
  var bloques = document.querySelectorAll("[data-animar]");
  if (!bloques.length || reducirMovimiento || !("IntersectionObserver" in window)) return;

  document.body.classList.add("info-animado");
  var observador = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
      if (!entrada.isIntersecting) return;
      entrada.target.classList.add("visible");
      observador.unobserve(entrada.target);
    });
  }, { threshold: 0.2 });

  bloques.forEach(function (bloque) { observador.observe(bloque); });
}

/* La cinta de fotos se mueve sola, así que se puede pausar (WCAG 2.2.2) */
function prepararCinta() {
  var boton = document.getElementById("cinta-pausa");
  var portada = document.querySelector(".info-portada");
  if (!boton || !portada) return;

  boton.addEventListener("click", function () {
    var pausada = portada.classList.toggle("cinta-pausada");
    boton.setAttribute("aria-pressed", pausada ? "true" : "false");
    boton.textContent = pausada ? "Reanudar la cinta de fotos" : "Pausar la cinta de fotos";
  });
}

/* Enlaces que abren el registro con «Agente» ya elegido */
function prepararRegistroAgente() {
  document.querySelectorAll("[data-registro-agente]").forEach(function (enlace) {
    enlace.addEventListener("click", function (evento) {
      evento.preventDefault();
      D.abrirAcceso("registro");
      var agente = document.querySelector('input[name="tipo-cuenta"][value="agente"]');
      if (agente) {
        agente.checked = true;
        agente.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  });
}

/* Preguntas frecuentes: el buscador filtra mientras se escribe y un enlace
   con #id-de-pregunta llega con esa respuesta ya abierta */
function sinTildes(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function prepararPreguntas() {
  var campo = document.getElementById("faq-buscar");
  if (!campo) return;

  /* Solo las preguntas de su parte: el Manual de usuario usa los mismos
     talones desplegables y no debe filtrarse con este buscador */
  var zona = campo.closest(".info-parte") || document;
  var preguntas = zona.querySelectorAll(".faq-pregunta");
  var grupos = zona.querySelectorAll(".faq-grupo");
  var aviso = document.getElementById("faq-cuantas");
  var vacio = document.getElementById("faq-vacio");
  var espera;

  function filtrar() {
    var palabras = sinTildes(campo.value.trim()).split(/\s+/).filter(Boolean);
    var visibles = 0;

    preguntas.forEach(function (pregunta) {
      /* También cuenta el nombre del tema: «pagos» muestra todo ese grupo */
      var tema = pregunta.closest(".faq-grupo").querySelector("h2").textContent;
      var texto = sinTildes(tema + " " + pregunta.textContent);
      var coincide = palabras.every(function (p) { return texto.indexOf(p) !== -1; });
      pregunta.hidden = !coincide;
      if (coincide) visibles++;
    });

    grupos.forEach(function (grupo) {
      grupo.hidden = !grupo.querySelector(".faq-pregunta:not([hidden])");
    });

    vacio.hidden = visibles > 0;

    /* El aviso espera a que se deje de escribir, para no leer cada letra */
    clearTimeout(espera);
    espera = setTimeout(function () {
      aviso.textContent = palabras.length === 0 ? ""
        : (visibles === 1 ? "1 pregunta encontrada." : visibles + " preguntas encontradas.");
    }, 400);
  }

  campo.addEventListener("input", filtrar);

  function abrirDesdeEnlace() {
    var destino = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (destino && destino.classList.contains("faq-pregunta")) {
      destino.open = true;
      destino.querySelector("summary").focus();
    }
  }
  abrirDesdeEnlace();
  window.addEventListener("hashchange", abrirDesdeEnlace);
}

/* Primero las partes: las preguntas frecuentes abren la respuesta del ancla
   y para eso su parte ya tiene que estar a la vista */
prepararPartes();
prepararCifras();
prepararAnimaciones();
prepararCinta();
prepararRegistroAgente();
prepararPreguntas();
