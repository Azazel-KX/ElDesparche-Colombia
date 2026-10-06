# -*- coding: utf-8 -*-
"""Aplica a css/estilos.css la portada con imagen de fondo y el carrusel
de eventos principales. Es idempotente: si ya está aplicado, no hace nada.

Se deja en el repositorio porque el archivo de estilos ya ha revertido dos
veces; si vuelve a pasar, basta con ejecutarlo de nuevo:

    python scripts/portada-carrusel.py
"""
import io, sys

RUTA = 'css/estilos.css'
s = io.open(RUTA, encoding='utf-8').read()

if '.portada-contenido' in s:
    print('Ya estaba aplicado; no se toca nada.')
    sys.exit(0)

hechos, fallos = [], []

def sustituir(nombre, viejo, nuevo):
    global s
    if s.count(viejo) != 1:
        fallos.append('%s (encontrado %d)' % (nombre, s.count(viejo)))
        return
    s = s.replace(viejo, nuevo)
    hechos.append(nombre)

# ------------------------------------------------------- 1. Botón de portada
sustituir('1. boton-portada',
u""".boton-portada {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 64px;
  background: var(--morado);
  border-radius: 14px;
  color: var(--blanco);
  font-size: calc(15px * var(--escala-texto));
  text-align: center;
  text-decoration: none;
}

.boton-portada:hover {
  opacity: 0.9;
}""",
u""".boton-portada {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 56px;
  padding: 0 34px;
  background: var(--morado);
  border-radius: 999px;
  color: var(--blanco);
  font-family: "Geist", "Inter", sans-serif;
  font-weight: 700;
  font-size: calc(16px * var(--escala-texto));
  text-align: center;
  text-decoration: none;
}

/* Se oscurece en vez de bajar la opacidad: con opacity el texto blanco
   perdía contraste sobre el morado. #4a24d6 da 8.35:1. */
.boton-portada:hover {
  background: #4a24d6;
}""")

# --------------------------------------------- 2. Portada con imagen de fondo
sustituir('2. portada con imagen de fondo',
u""".portada {
  background: var(--blanco);
  padding: 36px 20px;
}""",
u"""/* ===== PORTADA A SANGRE =====
   La foto ocupa todo el bloque y el contenido va encima. */
.portada {
  position: relative;
  isolation: isolate;        /* el contenido no se mezcla con el fondo */
  overflow: hidden;
  padding: 56px 20px 64px;
  text-align: center;
  color: var(--blanco);
  background: var(--oscuro);  /* color de respaldo si la foto no carga */
}

/* La foto, detrás de todo */
.portada-fondo {
  position: absolute;
  inset: 0;
  z-index: -2;
}

.portada-fondo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Zoom lento y continuo (efecto Ken Burns). Va de ida y vuelta para
     que no pegue un salto al reiniciar. */
  animation: portada-zoom 24s ease-in-out infinite alternate;
}

/* Capa oscura: es lo que garantiza que el texto se lea.
   Con 0.82 de opacidad, el blanco llega a 11.38:1 INCLUSO si debajo
   hubiera un píxel blanco puro; el mínimo AA es 4.5:1. */
.portada::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    180deg,
    rgba(19, 10, 43, 0.80) 0%,
    rgba(19, 10, 43, 0.86) 55%,
    rgba(19, 10, 43, 0.94) 100%
  );
}

.portada-contenido {
  position: relative;
  max-width: 900px;
  margin: 0 auto;
}

/* Sobre el fondo oscuro, los textos de la portada van en claro */
.portada h1 {
  color: var(--blanco);
}

.portada .parrafo-grande {
  color: var(--texto-claro);   /* 6.06:1 sobre la capa oscura */
}

.portada .etiqueta {
  background: rgba(255, 255, 255, 0.16);
  color: var(--blanco);
  border: 1px solid rgba(255, 255, 255, 0.35);
}

/* --gris no se puede usar aquí: sobre la capa oscura da 2.29:1 */
.portada .ayuda-campo {
  color: var(--texto-claro);
}

@keyframes portada-zoom {
  from { transform: scale(1); }
  to   { transform: scale(1.08); }
}

/* Quien pidió menos animación en su sistema ve la foto quieta */
@media (prefers-reduced-motion: reduce) {
  .portada-fondo img { animation: none; }
}

/* ===== BUSCADOR DENTRO DE LA PORTADA ===== */
.portada .filtros {
  max-width: 820px;
  margin: 28px auto 0;
}

/* Botón de buscar: lleva el foco a los resultados */
.boton-buscar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 54px;
  padding: 0 30px;
  border: 2px solid var(--borde-negro);
  border-radius: 14px;
  background: var(--morado);
  color: var(--blanco);
  font-family: "Geist", "Inter", sans-serif;
  font-weight: 700;
  font-size: calc(15px * var(--escala-texto));
  cursor: pointer;
  white-space: nowrap;
}

.boton-buscar:hover {
  background: #4a24d6;
}

/* ===== CARRUSEL DE EVENTOS PRINCIPALES ===== */
/* El bloque termina con un desvanecido hacia el blanco de la seccion
   siguiente, en vez de con un corte seco. Asi tambien desaparece el
   escalon entre el fondo gris de la pagina y el blanco de abajo.
   El relleno inferior da el aire que necesita el degradado: sin el, el
   desvanecido caeria encima de los carteles. */
.principales {
  background: linear-gradient(
    180deg,
    var(--oscuro) 0%,
    var(--oscuro) 62%,
    var(--blanco) 100%
  );
  padding: 32px 0 56px;
}

.principales-cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px;
  margin-bottom: 18px;
}

.principales-cabecera h2 {
  color: var(--blanco);
  font-family: "Geist", "Inter", sans-serif;
  font-weight: 700;
  margin: 0;
}

.principales-flechas {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* Botones solo con icono: 44x44 px de área de pulsación (WCAG 2.5.8) */
.flecha {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: var(--blanco);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.flecha:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.25);
}

/* Al llegar al extremo el botón se desactiva de verdad (disabled), que el
   lector anuncia como "no disponible": no depende solo de verse apagado. */
.flecha:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* La tira se desplaza en horizontal con scroll nativo */
.principales-tira {
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding: 0 20px;
  scroll-behavior: smooth;
  scrollbar-width: none;        /* Firefox: oculta la barra */
  -ms-overflow-style: none;
  padding: 4px 0 0;
}

.principales-tira::-webkit-scrollbar {
  display: none;
}

.principales-lista {
  display: flex;
  gap: 18px;
  list-style: none;
  margin: 0;
  padding: 0 20px;
}

.cartel {
  flex: 0 0 clamp(165px, 44vw, 210px);
  scroll-snap-align: start;
  display: flex;
}

.cartel-cuerpo {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--blanco);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}

.cartel-imagen {
  position: relative;
  aspect-ratio: 3 / 4;   /* algo mas bajo que un afiche: asi el carrusel
                            entero cabe en la zona de arriba */
  overflow: hidden;
}

.cartel-imagen img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Fecha sobre el cartel, arriba a la izquierda */
.cartel-fecha {
  position: absolute;
  top: 10px;
  left: 10px;
  margin: 0;
  background: var(--blanco);
  color: var(--texto);
  border-radius: 10px;
  padding: 6px 10px;
  font-family: "Geist", "Inter", sans-serif;
  font-size: calc(11px * var(--escala-texto));
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
}

/* Todos los carteles miden lo mismo, pero el texto no ocupa lo mismo en
   todos: cuando el lugar cabe en una linea sobraban hasta 43px en blanco
   al final y el cartel parecia cortado, mientras que otros quedaban
   justos. Con justify-content: center el texto se centra en el hueco
   disponible, asi el remate se ve igual de intencionado en todos. */
.cartel-texto {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 18px 14px 20px;
  text-align: center;
}

.cartel-titulo {
  margin: 0;
  font-family: "Geist", "Inter", sans-serif;
  font-size: calc(13px * var(--escala-texto));
  font-weight: 700;
  line-height: 1.25;
  text-transform: uppercase;
}

.cartel-enlace {
  color: var(--texto);
  text-decoration: none;
}

/* Un solo enlace por tarjeta, estirado sobre todo el cartel: así hay una
   sola parada de tabulación y el ratón puede pulsar en cualquier parte. */
.cartel-enlace::after {
  content: "";
  position: absolute;
  inset: 0;
}

.cartel-enlace:hover {
  text-decoration: underline;
}

.cartel-enlace:focus-visible {
  outline: none;
}

.cartel:has(.cartel-enlace:focus-visible) .cartel-cuerpo {
  outline: var(--foco-grosor) solid var(--foco-claro);
  outline-offset: 3px;
}

@supports not selector(:has(a)) {
  .cartel-enlace:focus-visible {
    outline: var(--foco-grosor) solid var(--foco-claro);
    outline-offset: 2px;
  }
}

.cartel-lugar {
  margin: 0;
  font-family: "Geist", "Inter", sans-serif;
  font-size: calc(11px * var(--escala-texto));
  color: var(--gris);
  text-transform: uppercase;
  line-height: 1.3;
}""")

# ------------------------------- 3. Quitar la figura antigua de la portada
sustituir('3. quitar .portada-imagen',
u""".portada-imagen {
  margin: 24px 0 0;
}

.portada-imagen img {
  width: 100%;
  height: 230px;
  object-fit: cover;
  border-radius: 24px;
}

""", u"")

# ------------------------------------------- 4. Media query 600px
sustituir('4a. 600px: quitar portada-imagen',
u"""  .portada-imagen img,
  .portada-evento img {
    height: 320px;
  }""",
u"""  .portada-evento img {
    height: 320px;
  }

  /* El buscador pasa a una fila y el botón se ajusta a su texto */
  .boton-portada {
    width: auto;
  }""")

sustituir('4b. 600px: boton-portada',
u"""  .boton-portada {
    min-width: 192px;
    min-height: 117px;
  }""",
u"""  .principales-lista {
    gap: 48px;
  }""")

# ------------------------------------------- 5. Media query 900px
sustituir('5. 900px: portada en dos columnas -> a sangre',
u"""  /* La portada se divide en dos columnas */
  .portada {
    display: flex;
    align-items: center;
    gap: 56px;
    padding-top: 56px;
    padding-bottom: 56px;
  }

  .portada-texto {
    flex: 1;
  }

  .portada-imagen {
    flex: 0 0 48%;
    margin: 0;
  }

  .portada-imagen img {
    height: 400px;
  }""",
u"""  /* La portada ocupa buena parte de la pantalla, como un escaparate */
  .portada {
    min-height: 46vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: 72px;
    padding-bottom: 88px;
  }

  /* El carrusel se monta sobre el borde inferior de la foto */
  .principales {
    margin-top: -130px;
    position: relative;
    z-index: 2;
    padding-top: 0;
    padding-bottom: 72px;
    /* Arriba transparente para que se vea la foto de la portada por
       detras; de la mitad hacia abajo se funde con el blanco de la
       seccion siguiente. */
    background: linear-gradient(
      180deg,
      transparent 0%,
      transparent 42%,
      rgba(255, 255, 255, 0.72) 76%,
      var(--blanco) 100%
    );
  }

  .principales-cabecera {
    padding: 0 48px;
  }

  .principales-cabecera h2 {
    /* Queda sobre la foto, por eso va en blanco con sombra */
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.7);
  }

  .principales-lista {
    padding: 0 48px;
  }

  .principales-tira {
    scroll-padding: 0 48px;
  }""")

io.open(RUTA, 'w', encoding='utf-8').write(s)
print('APLICADOS (%d):' % len(hechos))
for h in hechos:
    print('  OK  ', h)
if fallos:
    print('\nNO APLICADOS (%d):' % len(fallos))
    for f in fallos:
        print('  !! ', f)
    sys.exit(1)
