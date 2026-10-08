# Estructura de datos y maquetado de las secciones de eventos

Referencia de las dos secciones de la portada:

1. **Eventos principales** — carrusel horizontal de carteles.
2. **Descubre eventos** — rejilla filtrada por el buscador de la portada.

El modelo de datos se tomó como referencia de [eventario.co](https://eventario.co),
analizando **cómo organizan la información**, no su contenido. Los eventos,
textos e imágenes de este proyecto son propios.

---

## 1. De dónde sale el modelo

Eventario corre sobre WordPress (tema Voxel) y expone su modelo en
`/wp-json/wp/v2/events`. Sus campos propios, quitando los de WordPress y los de
plugins de SEO:

| Campo de Eventario | Para qué sirve |
| --- | --- |
| `eventario_fecha`, `event_date` | Fecha y hora |
| `eventario_location`, `event_place` | Lugar y coordenadas |
| `event_barrio_details` | Ciudad / barrio (taxonomía jerárquica) |
| `eventario_tarifas`, `event_pricing_details` | Precios |
| `eventario_tipo_entrada` | Tipo de entrada |
| `eventario_priority` | **Prioridad: decide qué sale destacado** |
| `eventario_verified` | Evento verificado |
| `event_category_details` | Categoría (música, teatro…) |
| `event_features_details` | Características (parqueadero, apto niños…) |
| `orga_info`, `author_display` | Organizador |
| `aforo-max-evento`, `edad-minima-evento` | Aforo y edad mínima |
| `flyer-event`, `galeria-evento` | Cartel y galería |

Dos ideas de ahí que ya están aplicadas:

- **Un campo de prioridad** en lugar de una lista aparte de destacados: se
  promociona un evento cambiando un número.
- **Ubicación jerárquica** (departamento → ciudad) como taxonomía con padres e
  hijos, no como dos campos sueltos.

Su buscador declara los filtros **como datos**, no como HTML escrito a mano:
`keywords` (¿Qué buscas?), `terms-2` (¿Dónde?, taxonomía `places_barrio`) y
`recurring-date` (¿Cuándo?, rango de fechas).

---

## 2. El archivo `data/eventos.json`

Se genera desde `js/script.js` para no mantener los datos en dos sitios:

```bash
node scripts/generar-json.cjs
```

Lee de `script.js` tanto el array `EVENTOS` como la lista `DESTACADOS`.

### Estructura raíz

```json
{
  "version": "1.0",
  "moneda": "COP",
  "idioma": "es-CO",
  "total": 12,
  "destacados": [1, 4, 8, 9, 2, 11],
  "filtros": [ ... ],
  "eventos": [ ... ]
}
```

### Un evento

```json
{
  "id": 1,
  "slug": "festival-estereo-picnic",
  "url": "evento.html?id=1",
  "titulo": "Festival Estéreo Picnic",
  "descripcion": "Cuatro días de música, cultura y experiencias…",
  "categoria": "musica",
  "destacado": true,
  "prioridad": 1,
  "estado": { "etiqueta": "En Boletería", "clave": "boleteria", "reservable": true },
  "fecha": { "textoCorto": "20-23 mar 2027", "inicio": "…", "fin": "…" },
  "lugar": {
    "nombre": "Parque La Florida", "ciudad": "Bogotá",
    "departamento": "Bogotá D.C.", "pais": "Colombia",
    "lat": 4.711, "lon": -74.0721
  },
  "entrada": {
    "precio": 480000, "moneda": "COP", "gratis": false,
    "disponibles": 3842, "capacidad": "85.000 personas"
  },
  "medios": { "imagen": "img/27459.png", "alt": "Imagen promocional del evento…" },
  "observaciones": "Ingreso para mayores de 14 años…"
}
```

Decisiones de formato:

- **`precio` es número**, no `"$480.000 COP"`. Un número se ordena y se filtra;
  el formato se aplica al pintar con `toLocaleString('es-CO')`.
- **`estado` es objeto**: `clave` (clase CSS), `etiqueta` (lo que se ve y se oye)
  y `reservable` (regla de negocio), en vez de repartir esa lógica por el código.
- **`gratis` es un booleano calculado** de `precio === 0`, para que el filtro de
  precio no tenga que saber que cero significa entrada libre.
- El `alt` viaja con la imagen: así nunca queda una sin texto alternativo.

> Las **categorías** (`musica`, `teatro`, `danza`, `circo`, `comedia`) se
> propusieron a partir del contenido de cada evento. Están en una tabla al
> inicio de `scripts/generar-json.cjs`; revísalas y ajústalas.

---

## 3. Sección «Eventos principales» (carrusel)

### Qué hace Eventario y qué no conviene copiar

Su carrusel es un **Swiper de Elementor**. Cada tarjeta es, en el DOM, solo
`<a><figure><img></figure></a>`: el cartel es una imagen y el texto va aparte.
Dos problemas:

- Si la imagen no carga, la tarjeta queda vacía: no hay texto de respaldo.
- Al duplicar diapositivas para el bucle infinito (`swiper-slide-duplicate`), un
  lector de pantalla lee los mismos eventos dos veces.

### Lo que hacemos aquí

Misma distribución visual, con el contenido en HTML real y **sin librerías**:
scroll nativo con `scroll-snap`.

```html
<section class="principales" aria-labelledby="titulo-principales">
  <div class="principales-cabecera">
    <h2 id="titulo-principales">Eventos principales</h2>
    <div class="principales-flechas">
      <button type="button" class="flecha" id="principales-atras"
              aria-label="Ver carteles anteriores" aria-controls="principales">…</button>
      <button type="button" class="flecha" id="principales-adelante"
              aria-label="Ver carteles siguientes" aria-controls="principales">…</button>
    </div>
  </div>

  <div class="principales-tira" role="group" tabindex="0"
       aria-label="Eventos principales, lista desplazable en horizontal">
    <ul class="principales-lista" id="principales">
      <li class="cartel">
        <article class="cartel-cuerpo">
          <div class="cartel-imagen">
            <img src="…" alt="Cartel del evento …">
            <p class="cartel-fecha"><span class="oculto">Fechas: </span>20-23 mar 2027</p>
          </div>
          <div class="cartel-texto">
            <h3 class="cartel-titulo">
              <a class="cartel-enlace" href="evento.html?id=1">Festival Estéreo Picnic</a>
            </h3>
            <p class="cartel-lugar">
              <span class="oculto">Lugar: </span>Parque La Florida · Bogotá
            </p>
          </div>
        </article>
      </li>
    </ul>
  </div>
</section>
```

### Formato visual

| Propiedad | Valor |
| --- | --- |
| Proporción del cartel | `2 / 3` (afiche vertical) |
| Ancho de tarjeta | `clamp(170px, 46vw, 230px)` |
| Separación | `18px` · `20px` desde 600px |
| Desplazamiento | `scroll-snap-type: x mandatory` |
| Badge de fecha | arriba a la izquierda, sobre la imagen |
| Texto | debajo, centrado: título en mayúsculas + lugar |
| En escritorio | se monta sobre la portada con `margin-top: -64px` |

### Dos trampas encontradas al implementarlo

1. **`scrollLeft += …` no funciona con `scroll-snap-type: mandatory`.** El
   navegador cancela la animación y devuelve la tira al inicio. Hay que usar
   `tira.scrollBy({ left, behavior })`.
2. **El evento `scroll` no siempre llega** en un desplazamiento programático, y
   el estado `disabled` de las flechas se quedaba desfasado. Además del
   escuchador de `scroll`, se refresca con un `setTimeout` tras cada pulsación.

También hay una **tolerancia de 24px** al calcular si se llegó al extremo,
porque el `snap` deja la tira unos píxeles antes del final y sin ella la flecha
de avanzar nunca se desactivaba.

> **Ojo con el bucle automático.** Si el carrusel avanzara solo, WCAG 2.2.2
> exigiría un botón para pararlo. Aquí lo mueve el usuario, así que no aplica.

---

## 4. Portada con buscador y rejilla de resultados

El buscador vive **solo en la portada**; la rejilla de abajo muestra sus
resultados.

### La portada

```html
<section class="portada" aria-labelledby="titulo-portada">
  <div class="portada-fondo" aria-hidden="true">
    <img src="img/33202.png" alt="">
  </div>
  <div class="portada-contenido">
    <p class="etiqueta">…</p>
    <h1 id="titulo-portada">…</h1>
    <p class="parrafo-grande">…</p>
    <form class="filtros" role="search" aria-label="Buscar eventos" novalidate>…</form>
  </div>
</section>
```

- La foto es **decorativa** (`alt=""` + `aria-hidden`): lo que cuenta la página
  ya lo dicen el título y el texto; describirla otra vez haría al lector repetir.
- `.portada::before` pinta la capa oscura. Con `rgba(19,10,43,.80)` el texto
  blanco llega a **10.56:1 incluso sobre un píxel blanco puro** de la foto; el
  mínimo AA es 4.5:1.
- `--gris` **no se puede usar dentro de la portada**: sobre esa capa da 2.29:1.
  Los textos de ayuda usan `--texto-claro` (5.62:1).
- Desde 700px el formulario es una **rejilla** `1.6fr 1fr 1fr 1fr auto`, para que
  el botón no se quede solo en el renglón de abajo.

### El botón «Buscar»

El filtrado es instantáneo, así que no busca: **lleva el foco** al título de los
resultados y desplaza la vista. Mueve el foco y no solo el scroll, porque si solo
se desplazara la vista, quien navega con teclado seguiría en el formulario.

### Catálogo de filtros

En `data/eventos.json` cada filtro se declara como dato:

| `tipo` | Cómo se pinta | Cómo filtra |
| --- | --- | --- |
| `texto` | `<input type="search">` | subcadena sobre los campos de `buscaEn` |
| `jerarquico` | selects en cascada | cada nivel acota el siguiente |
| `lista` | `<select>` | igualdad sobre `campo` |
| `opcion` | `<select>` o radios | la `condicion` de la opción elegida |
| `rango-fechas` | dos `<input type="date">` | `fecha.inicio` dentro del rango |

Declararlos así permite **añadir un filtro sin tocar el HTML**: se recorre
`filtros` y se genera cada control.

### La rejilla

| Propiedad | Valor |
| --- | --- |
| Columnas | 1 · 2 (≥600px) · 3 (≥900px) · 4 (≥1200px) |
| Separación | `20px` · `24px` desde 900px |
| Imagen | horizontal, 190px de alto |
| Etiqueta de estado | arriba a la derecha, sobre la imagen |

### Diferencia entre las dos secciones

| | Eventos principales | Descubre eventos |
| --- | --- | --- |
| Disposición | tira horizontal | rejilla que fluye |
| Imagen | cartel vertical `2/3` | foto horizontal |
| Cuántos | 6 destacados | los que pasen el filtro (máx. 8) |
| Orden | `DESTACADOS` | orden de los datos |

---

## 5. Reglas de accesibilidad que aplican a las dos

- **Una sola parada de tabulación por tarjeta.** El enlace va en el `<h3>` y se
  estira con `::after`. Envolver la tarjeta entera en un `<a>` hace que el lector
  lea de corrido imagen + estado + precio como si fuera el nombre del enlace.
- **Listas de verdad** (`<ul>`/`<li>`): el lector anuncia «lista de N elementos».
- **El estado nunca depende solo del color**: cada etiqueta lleva su texto, y
  «Cancelado» además borde punteado por parecerse a «Finalizado».
- **Los resultados se anuncian** en una región `role="status"`.
- **Botones de flecha con `aria-label`** y `disabled` real en los extremos.
- **La tira es alcanzable con teclado** (`tabindex="0"`): toda región con scroll
  propio debe serlo.
- **El zoom de la portada y el desplazamiento suave se desactivan** si el sistema
  pide menos animación (`prefers-reduced-motion`).
