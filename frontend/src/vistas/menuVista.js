/* ==========================================================================
   vistas/menuVista.js
   Menú lateral para celular y tableta.
   ========================================================================== */

/* ===== MENÚ LATERAL (celular y tableta) =====
   El botón «Menú» abre un panel que entra desde la derecha con los
   enlaces e iconos de línea. Es un <dialog> con showModal(): atrapa el
   foco, se cierra con Escape y deja inerte el resto de la página.
   La zona de cuenta y accesibilidad (#menu-cuenta) se MUEVE dentro del
   panel mientras está abierto y vuelve a la cabecera al cerrarlo; así
   conserva sus ids y sus eventos sin duplicar nada. */
var ICONOS_MENU = {
  inicio: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  eventos: '<path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.3 6.8 19.1l1-5.8L3.5 9.2l5.9-.8z"/>',
  reservas: '<path d="M4 7a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4z"/><path d="M14 5v12" stroke-dasharray="2 2"/>',
  nosotros: '<circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.8-.3 5 1.4 5 4.3"/>',
  admin: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'
};

function iconoMenu(nombre) {
  return '<svg class="lateral-icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    ICONOS_MENU[nombre] + '</svg>';
}

export function prepararMenuMovil() {
  var cabecera = document.querySelector(".cabecera");
  var boton = document.getElementById("boton-menu");
  var cuenta = document.getElementById("menu-cuenta");
  if (!cabecera || !boton) return;

  /* Sin JavaScript la cabecera muestra todo; con él, en pantallas
     angostas se esconde y vive en el panel lateral. */
  cabecera.classList.add("cabecera-plegable");
  boton.setAttribute("aria-controls", "menu-lateral");
  boton.setAttribute("aria-haspopup", "dialog");

  var panel = document.createElement("dialog");
  panel.className = "menu-lateral";
  panel.id = "menu-lateral";
  panel.setAttribute("aria-labelledby", "menu-lateral-titulo");
  panel.innerHTML =
    '<div class="lateral-cabeza">' +
      '<h2 class="lateral-titulo" id="menu-lateral-titulo">Menú</h2>' +
      '<button type="button" class="lateral-cerrar" aria-label="Cerrar el menú">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      '</button>' +
    '</div>' +
    '<nav aria-label="Navegación principal en el menú lateral">' +
      '<ul class="lateral-lista" id="lateral-paginas"></ul>' +
    '</nav>' +
    '<section class="lateral-cuenta" aria-labelledby="lateral-cuenta-titulo">' +
      '<h3 class="lateral-subtitulo" id="lateral-cuenta-titulo">Tu cuenta</h3>' +
    '</section>';
  document.body.appendChild(panel);

  var lugarCuenta = panel.querySelector(".lateral-cuenta");
  var origenCuenta = cuenta ? cuenta.parentNode : null;
  var siguienteCuenta = cuenta ? cuenta.nextSibling : null;

  /* Los enlaces se arman al abrir: así incluye «Administración» si la
     sesión de administrador se inició después de cargar la página. */
  function pintarPaginas() {
    var actual = location.pathname.split("/").pop() || "index.html";
    var paginas = [
      { href: "index.html", texto: "Inicio", icono: "inicio" },
      { href: "eventos.html", texto: "Eventos", icono: "eventos" },
      { href: "mis-reservas.html", texto: "Mis reservas", icono: "reservas" },
      { href: "nosotros.html", texto: "Nosotros", icono: "nosotros" }
    ];
    var enlacePanel = document.querySelector("#menu-principal a[data-panel]");
    if (enlacePanel) {
      paginas.push({
        href: enlacePanel.getAttribute("href"),
        texto: enlacePanel.textContent,
        icono: "admin",
        prefijo: enlacePanel.getAttribute("data-panel")
      });
    }

    var html = "";
    for (var i = 0; i < paginas.length; i++) {
      var esActual = paginas[i].href === actual ||
        (paginas[i].prefijo && actual.indexOf(paginas[i].prefijo) === 0);
      html += '<li><a href="' + paginas[i].href + '"' +
        (esActual ? ' aria-current="page"' : '') + '>' +
        iconoMenu(paginas[i].icono) + paginas[i].texto + '</a></li>';
    }
    panel.querySelector("#lateral-paginas").innerHTML = html;
  }

  function abrir() {
    pintarPaginas();
    if (cuenta) lugarCuenta.appendChild(cuenta);
    panel.showModal();
    boton.setAttribute("aria-expanded", "true");
  }

  function cerrar() {
    if (panel.open) panel.close();
  }

  /* Al cerrar (botón, Escape o clic fuera) la cuenta vuelve a su sitio
     y el foco regresa al botón «Menú». */
  panel.addEventListener("close", function () {
    if (cuenta && origenCuenta) origenCuenta.insertBefore(cuenta, siguienteCuenta);
    boton.setAttribute("aria-expanded", "false");
    setTimeout(function () { boton.focus(); }, 0);
  });

  boton.onclick = abrir;
  panel.querySelector(".lateral-cerrar").onclick = cerrar;

  /* Clic en el fondo oscuro (fuera del panel) también cierra */
  panel.addEventListener("click", function (evento) {
    if (evento.target === panel) cerrar();
  });

  /* Al elegir un enlace el panel se cierra */
  panel.addEventListener("click", function (evento) {
    if (evento.target.closest && evento.target.closest("a")) cerrar();
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 900) cerrar();
  });
}
