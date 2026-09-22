# El Desparche · versión HTML5 + CSS3

Proyecto HTML5 semántico, CSS3 externo y
JavaScript sin dependencias. No requiere compilación ni `node_modules`.

## Estructura

```
html5/
├── index.html        Las tres vistas (inicio, listado, detalle) + modal de acceso
├── css/
│   └── styles.css    Todos los estilos: variables, grid, flexbox, media queries
├── js/
│   ├── data.js       Catálogo de eventos y catálogos de filtros
│   └── app.js        Navegación, filtros, paginación, reserva y autenticación
└── assets/           Imágenes e iconos (PNG / SVG)
```

## Cómo abrirlo

Basta con abrir `index.html` en el navegador. Para que el mapa de OpenStreetMap
cargue sin restricciones conviene servirlo por HTTP:

```bash
npx -y serve html5
```

## Accesibilidad

- Etiquetas `label` asociadas a cada campo (ocultas visualmente cuando el diseño
  no las muestra).
- `aria-current`, `aria-expanded`, `aria-selected`, `aria-live` y `role="alert"`
  en los puntos donde el contenido cambia de forma dinámica.
- Las tarjetas de evento son operables con teclado (`Enter` / `Espacio`).
- `Esc` cierra los desplegables y el modal.
- Se respeta `prefers-reduced-motion`.

## Puntos de quiebre responsive

- **900 px**: la tabla de información pasa a una columna y la tarjeta de reserva
  ocupa todo el ancho.
- **720 px**: la barra de navegación se envuelve, los desplegables ocupan el 100 %
  y el botón principal se expande.
