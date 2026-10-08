# -*- coding: utf-8 -*-
"""Flechas a los lados de los carteles, más espaciado y botón de pausa.

Se ejecuta DESPUÉS de scripts/portada-carrusel.py:

    python scripts/portada-carrusel.py
    python scripts/carrusel-auto.py

Es idempotente: si ya está aplicado, no hace nada.
"""
import io, sys

RUTA = 'css/estilos.css'
s = io.open(RUTA, encoding='utf-8').read()

if '.principales-marco' in s:
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

# ------------------------------------------- 1. Cabecera: botón de pausa
sustituir('1. cabecera y botón de pausa',
u""".principales-flechas {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}""",
u"""/* Botón de pausa del movimiento automático (WCAG 2.2.2) */
.boton-pausa {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--blanco);
  font-family: "Geist", "Inter", sans-serif;
  font-size: calc(13px * var(--escala-texto));
  font-weight: 600;
  cursor: pointer;
}

.boton-pausa:hover {
  background: rgba(255, 255, 255, 0.25);
}

.pausa-icono {
  font-size: 11px;
  line-height: 1;
}""")

# --------------------------------- 2. Flechas: de la cabecera a los lados
sustituir('2. flechas a los lados',
u"""/* Botones solo con icono: 44x44 px de área de pulsación (WCAG 2.5.8) */
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
}""",
u"""/* El marco solo existe para colgar las flechas a los lados de la tira */
.principales-marco {
  position: relative;
}

/* Botones solo con icono: 48x48 px de área de pulsación (WCAG 2.5.8 pide
   24x24 como mínimo; 48 es cómodo también con el dedo). */
.flecha {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  /* Blanco sólido: la flecha se ve sobre cualquier cartel que quede
     debajo, sin depender del color de la foto. */
  background: var(--blanco);
  color: var(--texto);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
}

.flecha-izq  { left: 6px; }
.flecha-der  { right: 6px; }

.flecha:hover {
  background: var(--morado);
  color: var(--blanco);
}""")

# -------------------------------------- 3. Espaciado de la tira y carteles
sustituir('3. espaciado de la tira',
u""".principales-lista {
  display: flex;
  gap: 18px;
  list-style: none;
  margin: 0;
  padding: 0 20px;
}""",
u""".principales-lista {
  display: flex;
  gap: 40px;
  list-style: none;
  margin: 0;
  /* El hueco lateral deja respirar al primer y último cartel, y evita
     que las flechas los tapen del todo. */
  padding: 0 64px;
}""")

sustituir('4. hueco de snap acorde al nuevo padding',
u"""  scroll-snap-type: x mandatory;
  scroll-padding: 0 20px;""",
u"""  scroll-snap-type: x mandatory;
  scroll-padding: 0 64px;

  /* Se oculta la barra de desplazamiento, pero el elemento SIGUE siendo
     desplazable: con rueda, con gesto tactil, con las flechas y con el
     teclado (la tira lleva tabindex="0"). Solo desaparece el dibujo de
     la barra, no la funcion. */
  scrollbar-width: none;        /* Firefox */
  -ms-overflow-style: none;     /* Edge antiguo */""")

# --------------------------------- 5. Escritorio: más aire y flechas fuera
sustituir('5. escritorio: separación',
u"""  .principales-lista {
    padding: 0 48px;
  }

  .principales-tira {
    scroll-padding: 0 48px;
  }""",
u"""  .principales-lista {
    gap: 64px;
    padding: 0 96px;
  }

  .principales-tira {
    scroll-padding: 0 96px;
  }

  .flecha-izq  { left: 16px; }
  .flecha-der  { right: 16px; }""")

io.open(RUTA, 'w', encoding='utf-8').write(s)
print('APLICADOS (%d):' % len(hechos))
for h in hechos:
    print('  OK  ', h)
if fallos:
    print('\nNO APLICADOS (%d):' % len(fallos))
    for f in fallos:
        print('  !! ', f)
    sys.exit(1)
