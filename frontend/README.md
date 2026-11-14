# El Desparche - Frontend

Sitio web de eventos y reservas hecho con **HTML5, CSS3 y JavaScript**, empaquetado con **Vite**.
El CSS está escrito **mobile first** y no usa Bootstrap ni otros frameworks. Todos los datos salen de la API del
backend (`/api`).

## Cómo ejecutarlo

Necesitas Node.js 20 o superior, y el backend y la base de datos encendidos (ver el [README de la raíz](../README.md)).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera la carpeta dist/ para publicar
npm run preview    # prueba la carpeta dist/ en http://localhost:5173
```

> Ya no sirve abrir `index.html` con doble clic: la web usa módulos de JavaScript y llama a la API, y eso solo funciona
> desde un servidor (Vite).

### Conexión con la API

La web nunca se conecta a la base de datos (local o Neon): todo pasa por el API, que es el único que tiene la cadena de
conexión. Toda llamada sale de `src/modelos/clienteApi.js`, que agrega el token, espera hasta 20 s (Neon tarda unos
segundos en despertar) y convierte los fallos en mensajes que se muestran tal cual.

- En desarrollo, Vite redirige las llamadas `/api` y las imágenes subidas (`/uploads`) a `http://localhost:5000`
  (ver `vite.config.js`). Para otro backend, define `API_PROXY_TARGET` en `frontend/.env` (ver `.env.example`).
- En producción, lo más simple es que la carpeta `dist/` y la API queden en el **mismo dominio** (por ejemplo con un
  proxy inverso o el túnel que envíe `/api` y `/uploads` al backend).
- Si la API está en otro dominio, define `VITE_API_URL` (ej. `https://api.eldesparche.online/api`) en `frontend/.env`
  antes de `npm run build`: el build agrega ese origen a `connect-src` en la etiqueta de seguridad de cada página (ver
  "Seguridad"). En el backend, agrega la web a `CORS_ORIGIN` y define `PUBLIC_URL` con la dirección del API.

Las tipografías (Inter, Geist, Outfit, Kadwa y Source Sans 3) se cargan desde Google Fonts; sin internet el navegador
usa una fuente de respaldo y solo cambian las letras. Los mapas usan OpenStreetMap.

## Páginas

| Página | Para quién | Qué hace |
|---|---|---|
| `index.html` | Todos | Portada con carrusel, buscador y filtros por país, departamento, ciudad y tipo de plan |
| `eventos.html` | Todos | Listado de eventos con filtros |
| `evento.html?id=` | Todos | Detalle de un evento con mapa |
| `reservar.html?id=` | Cliente | Formulario de reserva |
| `confirmacion.html` | Cliente | Comprobante con el código QR |
| `mis-reservas.html` | Cliente | Sus reservas con el estado actual; puede cancelarlas indicando la causa |
| `agente.html` | Agente | Resumen, sus eventos (crear y corregir solicitudes), reservas de sus eventos, validar entradas y perfil de la empresa |
| `admin.html` | Administrador | Panel, reportes, y CRUD de agentes, eventos, clientes, administradores, reservas y ubicaciones, más validar entradas |
| `nosotros.html` | Todos | Quiénes somos, sala de prensa (con el planeta de eventos) y preguntas frecuentes |

## Carpetas y archivos

```
css/estilos.css     Estilos generales (primero celular, luego las media queries)
css/admin.css       Estilos de los paneles de agente y administrador
css/paginas.css     Estilos de Nosotros (información, prensa y preguntas frecuentes)

src/                El código de la web, separado en modelo, vista y controlador (ver "Modelo, vista y controlador")

parciales/          Cabecera y pie que comparten las páginas (ver "Cabecera y pie")
img/                Imágenes e iconos
public/             Archivos que se publican tal cual (el manual de usuario en PDF)
docs/               Notas de diseño de las secciones de eventos
vite.config.js      Servidor de desarrollo, redirección /api y páginas del build
```

## Cabecera y pie

La cabecera y el pie son iguales en todas las páginas, así que no se copian en cada HTML: viven en `parciales/`
(`cabecera.html`, `pie.html` para las páginas públicas y `pie-panel.html` para los paneles) y cada página los pide con un
comentario:

```html
<!--@incluir cabecera-->
<!--@incluir pie-->
```

Un plugin de `vite.config.js` los arma al servir la página y al hacer el build, así el HTML publicado sigue siendo
estático. El enlace del menú que corresponde a la página (`class="activo"` y `aria-current`) se marca solo a partir del
`data-pagina` del `<body>`. Si editas un parcial, el navegador se recarga en `npm run dev`. Para otra página nueva basta
con agregar los dos comentarios (y su entrada en `vite.config.js` para el build).

## Modelo, vista y controlador

El JavaScript vive en `src/` y cada archivo pertenece a una sola capa. Las dependencias van siempre hacia abajo:
`controladores` → `vistas` → `modelos` → `lib`. Una vista nunca importa un controlador, y un modelo nunca toca el DOM.

```
src/lib/            Ayudas sin estado: escapar (contra XSS), formatos de dinero y fechas, reglas de validación
                    (iguales a las del backend) y utilidades del navegador (foco, animaciones, imágenes)
src/modelos/        Datos y reglas: llamadas a la API (clienteApi.js agrega el token y maneja el 401), sesión,
                    eventos, reservas, personas, ubicaciones, reportes, catálogos y las validaciones de cada formulario
src/vistas/         Dibujan: reciben datos y arman HTML o lo ponen en el DOM. No llaman a la API.
src/vistas/admin/   Las vistas de las secciones del administrador
src/controladores/  Conectan: leen la página, piden datos al modelo, se los pasan a la vista y atienden los clics
src/controladores/admin/   Una página por sección del administrador (panel, reportes, agentes, eventos, ...)
src/controladores/agente/  Una página por sección del agente (panel, mis eventos, reservas, perfil)
src/paginas/        Un archivo de arranque por HTML: arma la cabecera común y llama al controlador de la página
```

Dos piezas se comparten a propósito: `crearGestion()` (`controladores/gestionControlador.js`) es el CRUD de personas
que usan agentes, clientes y administradores, y el agente reutiliza las secciones de reservas y de validar entradas del
administrador limitándolas a sus eventos.

## Cómo funciona

- Cada página HTML carga un solo archivo de `src/paginas/` (por ejemplo `src/paginas/index.js`), que llama a
  `iniciarLayout()` (cabecera, sesión y accesibilidad) y al controlador de la página. Los paneles comprueban el rol de la
  sesión y muestran una sección a la vez según `?seccion=`.
- **Datos:** `EVENTOS` (en `modelos/eventoModelo.js`) se llena con `GET /api/eventos` en las páginas públicas, y con
  `/api/admin/eventos` en el panel del administrador. Los códigos de eventos y reservas (`EVT-2026-0001`, `DES-1001`)
  los asigna el servidor.
- **Sesión:** al iniciar sesión se guarda en `localStorage` el token y los datos básicos de la persona. `llamarApi()` agrega
  sola la cabecera `Authorization`; si el token venció (o el servidor responde 401), cierra la sesión y abre la ventana de
  acceso con el aviso "Tu sesión venció". Una sesión con el token ya vencido se descarta al cargar la página.
- **Perfiles:** el cliente reserva y ve sus reservas; el agente registra eventos (quedan "En revisión" hasta que un
  administrador los aprueba) y gestiona las reservas de los suyos; el administrador ve todo y los reportes.
- **Gestión de personas:** las páginas de agentes, clientes y administradores usan la misma pieza (`crearGestion` en
  `controladores/gestionControlador.js`) para la tabla, el detalle, el formulario de registro y edición, y la
  confirmación de eliminar. Cada página solo define lo suyo: columnas, campos, reglas y acciones propias (suspender un
  agente, bloquear un cliente).
- **Validaciones:** `src/lib/validacion.js` tiene las reglas (documento según su tipo, correo, teléfono, NIT, fecha de nacimiento,
  contraseña de 8 a 72 caracteres y ubicación con coordenadas válidas del planeta). El registro, el perfil del agente y los formularios de
  los paneles usan las mismas, y el servidor las vuelve a revisar.
- **Paginación:** las tablas de reservas, eventos, agentes, clientes y administradores muestran 10 filas por página
  (`lib/paginacion.js` y `vistas/paginacionVista.js`); al buscar, filtrar u ordenar se vuelve a la primera página.
- **Agente:** además de enviar solicitudes, aprueba (confirma) las reservas de sus eventos, y en un evento ya publicado
  puede editar la descripción, las observaciones y la foto, o cancelarlo con su causa.
- **Accesibilidad:** enlace de salto, textos alternativos, errores con icono y `aria-invalid`, tamaño de texto ajustable,
  foco visible, `prefers-reduced-motion` y diálogos `<dialog>` que atrapan el foco.

## Puntos de las media queries

| Ancho | Cambios |
|---|---|
| Menos de 600px | Diseño base: una columna, tablas en forma de tarjetas |
| 600px o más | Filtros en fila, 2 tarjetas por fila |
| 900px o más | Cabecera en una fila, portada en 2 columnas, 3 tarjetas por fila, tablas normales |
| 1200px o más | 4 tarjetas por fila |

## Seguridad

- **Texto seguro:** todo dato que viene de la base o de una persona pasa por `escapar()` (`src/lib/formato.js`) antes de entrar en un
  `innerHTML`. Las URL de imagen se revisan con `urlSegura()`.
- **CSP:** cada página trae una etiqueta `Content-Security-Policy` que solo permite scripts propios (el único script en
  línea, el que aplica el tamaño del texto, está autorizado por su hash), Google Fonts y OpenStreetMap. Si cambias
  ese script en línea, recalcula su hash o el navegador lo bloqueará.
- **Token:** vive en `localStorage`, así que un XSS podría leerlo; por eso importa el escape y la CSP. El backend revisa
  el rol en cada petición: ocultar un botón en la web no da permiso a nadie.

## Lo que falta

- **Redes sociales del pie de página:** los iconos son decorativos hasta que existan las cuentas reales.
- **Recuperar la contraseña por correo:** no hay envío de correos. Quien la olvida pide a un administrador que se la
  restablezca (botón en el detalle de agentes, clientes y administradores); cada persona puede cambiar la suya con
  "Contraseña" en la cabecera.

© 2026 El Desparche - Proyecto integrador. Tuluá, Colombia.