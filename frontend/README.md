# El Desparche - Eventos y reservas en línea

Página web de eventos y reservas hecha con **HTML5, CSS3 y JavaScript**.
No usa frameworks ni librerías, y el CSS está escrito **mobile first**.

## Cómo abrirla

Abre `index.html` con doble clic. También funciona con la extensión
Live Server de VS Code.

Las tipografías (Inter, Geist, Outfit, Kadwa y Source Sans 3) se cargan desde
Google Fonts, así que con internet se ve igual al diseño original. Sin internet
el navegador usa Arial y solo cambian las letras.

## Archivos

```
index.html          Página de inicio
eventos.html        Listado de eventos con filtros
evento.html         Detalle de un evento (recibe ?id=)
reservar.html       Formulario de reserva
confirmacion.html   Comprobante con el código QR
mis-reservas.html   Tabla de reservas del usuario

css/estilos.css     Todos los estilos (primero celular, luego las media queries)
js/script.js        Datos de los eventos y toda la lógica
img/                Imágenes e iconos
```

## Cómo funciona

- Cada página HTML tiene un atributo `data-pagina` en el `<body>`.
  Al final de `script.js` hay un `if` que revisa ese atributo y ejecuta
  la función de esa página.
- Los eventos están en la lista `EVENTOS` al principio de `script.js`.
  Para cambiar el contenido de la página solo se edita esa lista.
- El usuario y las reservas se guardan en el navegador con `localStorage`,
  así que no se pierden al cerrar la página.
- El inicio de sesión es una **ventana emergente** (la etiqueta `<dialog>` de
  HTML5). Está en todas las páginas porque `script.js` la agrega sola, así no
  hay que repetir el mismo bloque de HTML en cada archivo.
- Al registrarse se elige entre dos tipos de cuenta: **Usuario** (reserva
  entradas) o **Agente** (publica eventos). El tipo se guarda junto con el
  nombre y el correo, y al agente le aparece una etiqueta morada en la cabecera.

## Puntos de las media queries

| Ancho | Cambios |
|---|---|
| Menos de 600px | Diseño base: una columna, tabla en forma de tarjetas |
| 600px o más | Filtros en fila, 2 tarjetas por fila |
| 900px o más | Cabecera en una fila, portada en 2 columnas, 3 tarjetas por fila, tabla normal |
| 1200px o más | 4 tarjetas por fila |

## Notas

El inicio de sesión es solo una simulación: no hay servidor ni base de datos.
Las reservas se guardan únicamente en el navegador de cada persona.

© 2026 El Desparche - Proyecto integrador. Tuluá, Colombia.
