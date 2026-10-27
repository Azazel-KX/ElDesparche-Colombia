# Documentación de El Desparche

Esta guía explica **qué hace cada archivo del proyecto y cuál es su papel en la página**. Sirve para quien llega nuevo
al repositorio y quiere saber dónde está cada cosa y por qué.

Para ejecutar el proyecto mira el [README de la raíz](README.md). Esta guía complementa los README de cada parte:
[backend](backend/README.md), [frontend](frontend/README.md), [base de datos](database/README.md) y
[Neon](GUIA_NEON.md).

- **Frontend:** HTML5, CSS3 y JavaScript (módulos ES) empaquetado con Vite. Sin frameworks. Patrón MVC.
- **Backend:** Node.js + Express, patrón MVC, autenticación con JWT.
- **Base de datos:** PostgreSQL (local con Docker o en la nube con Neon).

## 3. Cómo viaja un dato por el sistema

Ejemplo: un cliente reserva entradas.

```
Navegador                            Servidor (backend)                    PostgreSQL
─────────                            ──────────────────                    ──────────
reservar.html
  └ paginas/reservar.js
     └ controladores/reservaControlador   (lee el formulario)
        └ modelos/reservaModelo           (arma la petición)
           └ modelos/clienteApi.js ──────► POST /api/reservas
                                            routes/reservaRoutes.js
                                             └ middlewares/auth.js    (revisa el token y el rol)
                                              └ controllers/reservaController.js
                                               └ utils/validacionReserva.js (revisa los datos)
                                                └ models/reservaModel.js ──► INSERT en RESERVA
                                                                              └ trigger fn_reserva_reglas
                                                                                (edad, cupo, valor total)
        ◄──────────── JSON con la reserva ◄───────────────────────────────────┘
     └ vistas/reservarVista.js            (muestra el resultado)
```

Regla de oro de cada lado:

- **Backend:** `routes` → `middlewares` → `controllers` → `utils` (validación) → `models` (SQL). Solo los modelos
  hablan con la base.
- **Frontend:** `paginas` → `controladores` → `vistas` → `modelos` → `lib`. Una vista nunca llama a la API; un modelo
  nunca toca el DOM.
- **Doble validación:** las mismas reglas están en el navegador (`frontend/src/lib/validacion.js`), en el servidor
  (`backend/src/utils/validacion*.js`) y en la base (restricciones y triggers). El navegador solo ayuda; la última
  palabra la tiene la base.


## 4. Base de datos (`database/`)

| Archivo | Para qué sirve |
|---|---|
| `schema_ElDesparche.sql` | **Estructura.** Crea los tipos, las 11 tablas, índices, la secuencia de códigos de evento y los triggers. No tiene datos. |
| `seed.sql` | **Datos mínimos.** Cuentas de prueba (admin, clientes, agentes), ciudades y 7 eventos (`EVT-2026-0001` a `0007`). Las fechas son relativas al día de carga, así los eventos siempre están en el futuro. Es lo que esperan las pruebas del backend. |
| `seed_demo.sql` | **Datos grandes para demostración.** Se carga después de `seed.sql`: 8 países más, ciudades, 7 agentes, 30 clientes, 61 eventos con fotos y cientos de reservas en todos los estados. **No usarla con `npm test`.** |
| `pruebas_bd.sql` | **88 pruebas de la base.** Comprueba estructura, datos y que las restricciones y triggers acepten lo válido y rechacen lo inválido. Corre en una transacción que termina en `ROLLBACK`: no deja cambios. |
| `README.md` | Qué cargar y en qué orden, cómo empezar de cero, tablas, relaciones, decisiones de diseño y cuentas del seed. |

### Las 11 tablas

| Tabla | Qué guarda |
|---|---|
| `PAIS`, `DEPARTAMENTO`, `CIUDAD` | Jerarquía geográfica: país → departamento → ciudad. |
| `UBICACION` | Un lugar concreto (dirección y coordenadas del planeta) donde se hace un evento. |
| `USUARIO` | Datos comunes de toda persona: documento, nombre, correo, contraseña (hash), ciudad, estado de la cuenta. |
| `USUARIO_TELEFONO` | Los teléfonos de cada usuario (puede tener varios). |
| `ADMIN`, `CLIENTE`, `AGENTE` | Subtipos de `USUARIO` (herencia total y disjunta: cada usuario es exactamente uno). `AGENTE` agrega NIT, razón social, comisión y logo. |
| `EVENTO` | Nombre, descripción, categoría, imagen, sitio, fechas, capacidad, edad mínima, precio, estado, ubicación y agente que lo registra. |
| `RESERVA` | Una reserva de un cliente a un evento: entradas, valor total, estado, observaciones y fecha de ingreso. |

### Reglas que hace cumplir la base (triggers)

| Trigger / función | Qué impide o hace |
|---|---|
| `fn_usuario_un_subtipo` | Que un usuario esté en dos subtipos o en ninguno. |
| `fn_reserva_reglas` | Que se reserve sin cupo, que el cliente no tenga la edad mínima, y calcula `valor_total = entradas × precio`. |
| `fn_evento_capacidad` | Que se baje la capacidad de un evento por debajo de lo ya reservado. |
| `fn_usuario_documento_inmutable` | Que se cambie el documento de un usuario después de creado. |

Estados de una reserva: `Reservada`, `Confirmada`, `Usada`, `Cancelada`. Estados de un evento: `En revisión`,
`Rechazado`, `Programado`, `En Boletería`, `En Vivo`, `Finalizado`, `Cancelado`.

---

## 5. Backend (`backend/`)

API REST en Express. Corre en `http://localhost:5000`.

### Archivos de configuración y arranque

| Archivo | Qué hace |
|---|---|
| `package.json` | Dependencias (`express`, `pg`, `jsonwebtoken`, `bcryptjs`, `helmet`, `cors`, `express-rate-limit`, `dotenv`) y scripts: `start`, `dev`, `bd:cargar`, `test`, `test:cobertura`, `test:bd`. |
| `.env.example` | Plantilla de variables de entorno: puerto, JWT, CORS, conexión a la base (local o `DATABASE_URL` de Neon), zona horaria. Se copia a `.env`. |
| `README.md` | Puesta en marcha, seguridad, lista completa de endpoints y pruebas. |
| `scripts/cargarBd.js` | `npm run bd:cargar`: carga el esquema y el seed en la base del `.env` (local o Neon) sin necesitar `psql`. Con `--demo` agrega también `seed_demo.sql`. |
| `src/server.js` | **Punto de entrada.** Verifica que la base responda (con reintentos) y recién entonces empieza a escuchar. |
| `src/app.js` | **Arma la aplicación Express:** `helmet`, CORS, lectura del cuerpo JSON, servicio de `/uploads`, `/api/health` (estado del API y de la base) y monta cada grupo de rutas. Al final van el 404 y el manejador de errores. |
| `src/config/env.js` | Lee y valida las variables de entorno. Falla al arrancar si falta una obligatoria. Arma la configuración de la base y describe la conexión sin mostrar la contraseña. |
| `src/config/db.js` | El `pool` de conexiones a PostgreSQL, la zona horaria de cada conexión, `conTransaccion()` (BEGIN/COMMIT/ROLLBACK) y la verificación de conexión. |

### Rutas (`src/routes/`) — qué URL existe y quién puede usarla

| Archivo | Prefijo | Quién entra | Contenido |
|---|---|---|---|
| `authRoutes.js` | `/api/auth` | Público / con sesión | `register`, `login` (con límite de intentos), `me`, cambio de contraseña. |
| `ciudadRoutes.js` | `/api/ciudades` | Público | Lista de ciudades para el formulario de registro. |
| `eventoRoutes.js` | `/api/eventos` | Público | Catálogo de eventos y detalle por código. |
| `reservaRoutes.js` | `/api/reservas` | Solo cliente | Crear reserva, ver las mías, cancelar. |
| `agenteRoutes.js` | `/api/agente` | Solo agente | Resumen, eventos y solicitudes, editar/cancelar publicado, reservas de sus eventos, confirmar, validar entrada, perfil. |
| `adminRoutes.js` | `/api/admin` | Solo administrador | Eventos y solicitudes, agentes, clientes, administradores, reservas, entradas, ubicaciones, resumen y reportes. |

### Middlewares (`src/middlewares/`) — se ejecutan antes del controlador

| Archivo | Qué hace |
|---|---|
| `auth.js` | `requiereToken` (exige un JWT válido y que la cuenta siga activa) y `requiereRol` (solo deja pasar a ciertos perfiles). |
| `cuerpo.js` | Lee el JSON de la petición: 100 KB en general y hasta 3 MB en los paneles, donde llegan las imágenes. Solo se aplica después de verificar el token. |
| `errorHandler.js` | Convierte cualquier error en una respuesta clara. Traduce los errores técnicos de PostgreSQL (llave duplicada, restricción rota...) a mensajes que entiende una persona, responde 503 si la base no está disponible y 404 si la ruta no existe. |

### Controladores (`src/controllers/`) — reciben la petición y responden

| Archivo | Qué hace |
|---|---|
| `authController.js` | Registro de clientes, inicio de sesión (firma el JWT), cambio de contraseña y datos del usuario actual. |
| `eventoController.js` | Catálogo público: lista (con filtros y paginación) y detalle. Nunca muestra eventos "En revisión" o "Rechazado". |
| `reservaController.js` | Reservas del cliente: crear, listar las suyas y cancelar. |
| `agenteController.js` | Todo lo del agente: solicitudes de eventos, edición y cancelación de un evento publicado, reservas de sus eventos, confirmar una reserva, registrar ingreso y actualizar el perfil de la empresa. |
| `adminEventosController.js` | Eventos y solicitudes vistos por el administrador: CRUD, cambio de estado y decidir (aprobar/rechazar) una solicitud. |
| `adminPersonasController.js` | CRUD de agentes, clientes y administradores; suspender/bloquear cuentas; restablecer contraseña. |
| `adminReservasController.js` | Reservas del administrador: listar, crear, editar, cancelar, eliminar y registrar ingreso. |
| `adminUbicacionesController.js` | Crear, renombrar y eliminar países, departamentos y ciudades. |
| `reporteController.js` | Resumen del panel (administrador y agente) y reportes. Solo lectura. |

### Modelos (`src/models/`) — aquí vive el SQL

| Archivo | Qué hace |
|---|---|
| `usuarioModel.js` | Buscar por correo, estado de la cuenta, perfil (admin/cliente/agente), crear usuarios y cambiar la contraseña. |
| `personaModel.js` | Listar, crear, editar y borrar agentes, clientes y administradores. |
| `eventoModel.js` | Eventos: catálogo público, solicitudes, crear, editar, cambiar estado, decidir, eliminar y generar el código `EVT-AAAA-NNNN`. |
| `reservaModel.js` | Reservas de los tres perfiles: listar, crear, editar, cancelar, eliminar y registrar ingreso. |
| `ubicacionModel.js` | País, departamento y ciudad. |
| `ciudadModel.js` | Ciudades con su departamento, para los selectores. |
| `imagenModel.js` | Guarda y borra las imágenes subidas junto con la escritura en la base, para que no queden archivos sin uso. |
| `reporteModel.js` | Consultas de resumen y reportes (ventas por mes, estados, categorías, agentes, actividad). |

### Utilidades (`src/utils/`)

| Archivo | Qué hace |
|---|---|
| `errores.js` | La clase `ErrorHttp` (código HTTP, mensaje y detalles) que lanzan los controladores. |
| `validacion.js` | Validación de registro, login y cambio de contraseña (documento, correo, teléfono, contraseña de 8 a 72 caracteres...). |
| `validacionEvento.js` | Validación de eventos, cambios de estado, edición de publicados, decisiones y filtros del catálogo. |
| `validacionPersonas.js` | Validación de los formularios de agentes, clientes y administradores. |
| `validacionReserva.js` | Validación de reservas nuevas, ediciones y cancelaciones. |
| `formato.js` | Funciones puras de formato: separar nombres, notas de cancelación, fechas, últimos meses, "hace cuánto", plan del evento. |
| `imagenes.js` | Convierte una imagen enviada como *data URL* en un archivo dentro de `uploads/`, comprobando que de verdad sea una imagen. |
| `sql.js` | Fragmentos de SQL que comparten los modelos que cuentan ventas e ingresos (qué reservas cuentan como válidas). |

---

## 6. Frontend (`frontend/`)

### 6.1 Las páginas HTML

| Archivo | Quién la ve | Qué muestra |
|---|---|---|
| `index.html` | Todos | **Portada:** carrusel de eventos principales, buscador, filtros por país/departamento/ciudad/tipo de plan y la rejilla "Descubre eventos" (solo eventos reservables, 8 por página). |
| `eventos.html` | Todos | **Listado de eventos:** cabecera tipo boleta, buscador y menú desplegable "Filtros" (país → departamento → ciudad, estado) con etiquetas de lo aplicado. |
| `evento.html` | Todos | **Detalle de un evento:** cartel, descripción, fecha, precio, cupos, ubicación con mapa de OpenStreetMap y botón para reservar. |
| `reservar.html` | Cliente | **Formulario de reserva:** resumen del evento, cantidad de entradas y total. |
| `confirmacion.html` | Cliente | **Comprobante** de la reserva con su código y QR. |
| `mis-reservas.html` | Cliente | Sus reservas con el estado actual; puede cancelarlas indicando la causa. |
| `agente.html` | Agente | **Panel del agente** con cinco secciones: panel, mis eventos, reservas, validar entradas y perfil. |
| `admin.html` | Administrador | **Panel del administrador** con nueve secciones: panel, reportes, agentes, eventos, clientes, administradores, reservas, ubicaciones y validar. |
| `nosotros.html` | Todos | Quiénes somos, sala de prensa (con el planeta de eventos), cifras, cinta de fotos y preguntas frecuentes. |

Cada HTML pide la cabecera y el pie con un comentario (`<!--@incluir cabecera-->`) y carga **un solo script** de
`src/paginas/`. Los paneles (`admin.html`, `agente.html`) muestran una sección a la vez según `?seccion=`.

### 6.2 Parciales (`parciales/`)

| Archivo | Qué es |
|---|---|
| `cabecera.html` | Cabecera común: logo, menú, botones de acceso o menú "Mi cuenta", panel de accesibilidad. |
| `pie.html` | Pie de las páginas públicas. |
| `pie-panel.html` | Pie más sencillo de los paneles. |

El plugin `incluirParciales` de `vite.config.js` los inserta al servir y al construir; así el HTML final es estático.

### 6.3 Estilos (`css/`)

| Archivo | Qué estiliza |
|---|---|
| `estilos.css` | Todo lo general, escrito *mobile first*: variables de color y tipografía, cabecera, portada, tarjetas, boleta, barra de filtros, detalle del evento, reservas, ventana de acceso, accesibilidad. |
| `admin.css` | Los paneles de agente y administrador: menú lateral, tablas (que en celular se vuelven tarjetas), formularios, gráficas, reportes, paginación. |
| `paginas.css` | La página Nosotros: información, prensa, planeta y preguntas frecuentes. |

### 6.4 Capa de arranque (`src/paginas/`)

Un archivo por HTML. Solo conecta: llama a `iniciarLayout()` y al controlador de la página.

| Archivo | Arranca |
|---|---|
| `index.js` | `index.html` |
| `eventos.js` | `eventos.html` |
| `evento.js` | `evento.html` |
| `reservar.js` | `reservar.html` |
| `confirmacion.js` | `confirmacion.html` |
| `mis-reservas.js` | `mis-reservas.html` |
| `nosotros.js` | `nosotros.html` |
| `agente.js` | `agente.html` (elige la sección según `?seccion=`) |
| `admin.js` | `admin.html` (elige la sección según `?seccion=`) |

### 6.5 Librerías sin estado (`src/lib/`)

| Archivo | Qué ofrece |
|---|---|
| `formato.js` | `escapar()` (defensa contra XSS: todo dato pasa por aquí antes de entrar al HTML), `urlSegura()`, formato de pesos y búsquedas sin tildes. |
| `fechas.js` | Fechas legibles en español, edad, últimos meses, hora local. |
| `validacion.js` | Reglas de formularios: correo, teléfono, documento por tipo, NIT, fecha de nacimiento, contraseña, latitud y longitud. Espejo de las del backend. |
| `dom.js` | Ayudas del navegador: mover el foco, animación al aparecer, contadores, leer parámetros de la URL y reducir imágenes antes de subirlas. |
| `paginacion.js` | Corta una lista en páginas de 10. |

### 6.6 Modelos (`src/modelos/`) — datos, reglas y llamadas a la API

| Archivo | Qué hace |
|---|---|
| `clienteApi.js` | **Único punto de salida hacia el API.** Agrega el token, espera hasta 20 s, cierra la sesión si el servidor responde 401 y convierte los fallos en mensajes legibles. |
| `sesionModelo.js` | Guarda en `localStorage` quién entró y su token; descarta la sesión vencida. |
| `authModelo.js` | Iniciar sesión, registrarse, comprobar que la cuenta sigue vigente, ciudades del registro y cambio de contraseña. |
| `eventoModelo.js` | El catálogo de eventos en memoria y sus reglas: si está disponible, cupos libres, filtros de la portada y del listado, ubicaciones del catálogo, datos del administrador y del agente. |
| `reservaModelo.js` | Reglas de reservas: si se puede reservar, si una entrada es válida, contenido del QR, y acceso a la API de cliente, administrador y agente. |
| `personaModelo.js` | Agentes, clientes y administradores: validar, guardar, eliminar, cambiar estado y restablecer contraseña. |
| `ubicacionModelo.js` | Países, departamentos y ciudades; cuántos usos tiene una ciudad. |
| `reporteModelo.js` | Pedir resúmenes y reportes. |
| `cancelacionModelo.js` | Causas de cancelación y el formato de la nota que se guarda en las observaciones. |
| `catalogos.js` | Listas fijas: categorías, planes, estados, tipos de documento, horarios. |
| `preferenciasModelo.js` | Guarda el tamaño de texto elegido por la persona. |

### 6.7 Vistas (`src/vistas/`) — solo dibujan

**Generales**

| Archivo | Qué dibuja |
|---|---|
| `accesibilidadVista.js` | Panel de accesibilidad de la cabecera y cambio de tamaño del texto. |
| `accesoVista.js` | Ventana de iniciar sesión y registrarse, con sus errores. |
| `sesionVista.js` | Cabecera según la sesión: botones de acceso o menú desplegable "Mi cuenta". |
| `menuVista.js` | Menú lateral de celular y tableta. |
| `dialogoVista.js` | Ventanas `<dialog>` que piden datos (por ejemplo, el correo para restablecer). |
| `confirmarVista.js` | Ventana de "¿Seguro?" antes de acciones destructivas. |
| `formularioVista.js` | Construye formularios a partir de una lista de campos, los lee y muestra sus errores. |
| `camposVista.js` | Define los campos de cada formulario de los paneles (agente, evento, cliente, administrador, reserva). |
| `etiquetasVista.js` | Etiquetas de colores para estados, avatar y nombre del agente. |
| `paginacionVista.js` | Botones de página de las tablas; vuelve a la primera página al filtrar. |
| `filtrosEventosVista.js` | Menú desplegable de filtros (abrir/cerrar con teclado, clic fuera) y etiquetas de lo aplicado; lo usan `eventos.html` y el administrador. |
| `cancelacionVista.js` | Campos para pedir la causa al cancelar. |
| `mapaVista.js` | Mapa Leaflet/OpenStreetMap para marcar el punto de un evento. |
| `qrVista.js` | Dibuja el código QR real. |
| `graficasVista.js` | Tarjetas de resumen, gráficas de ventas por mes, anillos de estados, barras de ocupación y actividad reciente. |

**Páginas públicas y del cliente**

| Archivo | Qué dibuja |
|---|---|
| `inicioVista.js` | Selectores de país y ciudad de la portada y el paginado de tarjetas. |
| `carruselVista.js` | Carrusel de eventos principales. |
| `eventoVista.js` | Tarjetas de evento, contador de resultados, detalle del evento, migas de pan y ubicación. |
| `reservarVista.js` | Resumen del evento y del total en el formulario de reserva; errores. |
| `confirmacionVista.js` | Comprobante de la reserva. |
| `misReservasVista.js` | Lista de reservas del cliente y la ventana para cancelar. |
| `nosotrosVista.js` | Animaciones, cifras, cinta de fotos, preguntas frecuentes y registro de agente de Nosotros. |
| `prensaVista.js` | El planeta de eventos (globo) y los botones de copiar de la sala de prensa. |

**Panel del agente**

| Archivo | Qué dibuja |
|---|---|
| `agenteVista.js` | Indicadores, tarjetas de sus eventos y solicitudes, estado de la cuenta, formulario de solicitud y perfil de la empresa. |

**Panel del administrador (`vistas/admin/`)**

| Archivo | Sección |
|---|---|
| `eventosVista.js` | Eventos: tarjetas, tabla, detalle, formulario, cambio de estado y "Por revisar". |
| `reservasVista.js` | Reservas (también para el agente): tarjetas, gráficas, tabla, detalle y formularios. |
| `agentesVista.js` | Agentes: resumen, tabla, detalle y filtros. |
| `clientesVista.js` | Clientes: resumen, tabla y detalle con historial. |
| `administradoresVista.js` | Administradores: resumen, tabla y detalle. |
| `ubicacionesVista.js` | Países, departamentos y ciudades. |
| `reportesVista.js` | Reportes en tablas, cifras y barras. |
| `validarVista.js` | Resultado de cada entrada, lista de ingresos y lector de QR con la cámara. |

### 6.8 Controladores (`src/controladores/`) — conectan todo

**Comunes**

| Archivo | Qué hace |
|---|---|
| `layoutControlador.js` | Lo común a toda página: cabecera, sesión, menú, accesibilidad y aviso de "sesión vencida". |
| `accesoControlador.js` | Lee y valida el formulario de entrar/registrarse, llama al API y guarda la sesión. |
| `catalogoControlador.js` | Pide el catálogo de eventos a la API y, cuando llega, ejecuta lo propio de la página. |
| `gestionControlador.js` | `crearGestion()`: el CRUD de personas (tabla, detalle, formulario, confirmar eliminación) que reutilizan agentes, clientes y administradores. |

**Públicas y del cliente**

| Archivo | Página |
|---|---|
| `inicioControlador.js` | Portada: carrusel, buscador, filtros y paginación. |
| `eventosControlador.js` | Listado (`eventos.html`) y detalle (`evento.html`). |
| `reservaControlador.js` | Reservar, comprobante y mis reservas. |
| `nosotrosControlador.js` | Nosotros. |

**Paneles**

| Archivo | Qué hace |
|---|---|
| `adminControlador.js` | Base de ambos paneles: comprueba el rol y cambia de sección. |
| `agenteControlador.js` | Base del panel del agente (ciudades, entrada con rol agente). |
| `admin/panelControlador.js` | Indicadores y gráficas del administrador. |
| `admin/reportesControlador.js` | Reportes del año. |
| `admin/eventosControlador.js` | Eventos del administrador: filtros, registrar, editar, cambiar estado, eliminar y revisar solicitudes. |
| `admin/reservasControlador.js` | Reservas: buscar, ver detalle, cancelar y (administrador) crear, editar, eliminar. También la usa el agente limitada a sus eventos. |
| `admin/agentesControlador.js` | Agentes: registrar, editar, suspender, eliminar y restablecer contraseña. |
| `admin/clientesControlador.js` | Clientes: igual, con bloqueo. |
| `admin/administradoresControlador.js` | Administradores. |
| `admin/ubicacionesControlador.js` | Ubicaciones. |
| `admin/validarControlador.js` | Validar entradas en la puerta (también para el agente). |
| `agente/panelControlador.js` | Panel del agente. |
| `agente/eventosControlador.js` | Mis eventos: crear, corregir y retirar solicitudes; editar o cancelar un evento publicado. |
| `agente/reservasValidarControlador.js` | Reservas y validar entradas del agente (reutiliza las del administrador). |
| `agente/perfilControlador.js` | Perfil de la empresa (el NIT, la razón social y la comisión no se cambian aquí). |


## 10. Pruebas

| Dónde | Qué prueba | Cómo correrlas |
|---|---|---|
| `backend/test/*.test.js` | 172 pruebas del API | `cd backend && npm test` (con la base cargada solo con `schema` y `seed.sql`) |
| `database/pruebas_bd.sql` | 88 pruebas de estructura, datos, restricciones y triggers | `cd backend && npm run test:bd` |

| Archivo de prueba | Cubre |
|---|---|
| `auth.test.js` | Registro, login, cambio de contraseña y ciudades. |
| `eventos.test.js` | Catálogo público y administración de eventos y solicitudes. |
| `agente.test.js` | Panel del agente: solicitudes, reservas de sus eventos, validar entradas y perfil. |
| `reservas.test.js` | Reservas del cliente, del administrador y validación de entradas. |
| `personas.test.js` | Agentes, clientes, administradores y estados de cuenta. |
| `panel.test.js` | Ubicaciones, resumen y reportes. |
| `limpieza.test.js` | Que no queden ubicaciones ni imágenes sin uso. |
| `conexionBd.test.js` | Configuración de la conexión y respuesta cuando la base se cae. |
| `zonaHoraria.test.js` | Que cada conexión abra con la zona horaria correcta. |
| `validacion.test.js`, `validacionEvento.test.js` | Reglas de validación (sin base de datos). |
| `errores.test.js` | Manejo de errores, imágenes inválidas y validaciones de personas (sin base de datos). |
| `ayudas.js` | No es una prueba: funciones comunes (arrancar el servidor, entrar, crear eventos y limpiar). |
