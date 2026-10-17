/* ==========================================================================
   El Desparche - paginas.js
   Páginas informativas: cifras con los datos reales, las animaciones al
   hacer scroll y el atajo para abrir el registro de agente.
   ========================================================================== */

var D = window.Desparche;
var reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

prepararCifras();
prepararAnimaciones();
prepararCinta();
prepararRegistroAgente();
