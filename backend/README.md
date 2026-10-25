# Backend de ElDesparche

API REST en Node.js + Express con PostgreSQL, organizada en MVC. Trabaja sobre el esquema de
`database/schema_ElDesparche.sql` (13 tablas; ver `database/README.md`). Las respuestas tienen la misma forma que
la que espera la web (`frontend/src/modelos/`). El frontend ya no trae datos de ejemplo:
todo sale de este API.

```
backend/
├── src/
│   ├── config/        env.js (variables) y db.js (pool de PostgreSQL + transacciones)
│   ├── models/        el SQL: usuario, persona (agentes, clientes, administradores), evento, reserva,
│   │                  ubicacion, ciudad y reporte (resumen y reportes)
│   ├── controllers/   la lógica de cada endpoint: auth, evento (catálogo), admin*, agente, reserva (cliente), reporte
│   ├── routes/        authRoutes, ciudadRoutes, eventoRoutes, adminRoutes, agenteRoutes, reservaRoutes
│   ├── middlewares/   auth.js (JWT, cuenta activa y roles), errorHandler.js (errores de PostgreSQL → mensajes)
│   ├── utils/         validaciones, formato (nombres, fechas, notas de cancelación, códigos), imágenes, SQL común
│   ├── app.js         configura Express
│   └── server.js      arranca el servidor
├── test/              pruebas (ver "Pruebas")
└── uploads/           imágenes de eventos y logos subidas desde los paneles (no se versiona)
```

## Puesta en marcha

1. Base de datos (Docker): `docker compose up -d` desde la raíz del repo.
2. Cargar esquema y datos de prueba sobre una base **vacía** (el esquema primero):
   ```bash
   docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/schema_ElDesparche.sql
   docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/seed.sql
   ```
3. `cp .env.example .env` y completa `JWT_SECRET` (mínimo 32 caracteres) y los datos de la base. `CORS_ORIGIN` debe
   incluir la dirección donde corre la web, y `PUBLIC_URL` la del API si no es `http://localhost:5000`.
4. `npm install`, luego `npm run dev` (puerto 5000) o `npm test`.

Cuentas del seed (contraseña `Desparche2026!`): `admin@`, `cliente1@`, `cliente2@`, `agente1@`, `agente2@`,
`agente3@` (agente pendiente de aprobación) y `cliente3@` (cliente bloqueado) `eldesparche.test`.

## Seguridad y reglas generales

- **Sesión:** `Authorization: Bearer <token>` (JWT de 2 horas). En cada petición protegida se consulta la cuenta en la
  base: si se eliminó (401) o está suspendida o bloqueada (403), pierde el acceso al instante aunque el token siga
  vigente. El rol sale de la base, no del token.
- **Propiedad:** un agente solo ve y modifica lo suyo (sus eventos, las reservas de sus eventos, su perfil); el agente
  sale del token, nunca del body ni de la URL. Un cliente solo ve y cancela sus reservas.
- **Estado de la cuenta (`estado_usuario`):** un agente que se registra solo queda `Pendiente`: puede entrar a su
  panel pero no enviar eventos hasta que un administrador lo apruebe. `Suspendido` (agentes) y `Bloqueado` (clientes)
  no inician sesión.
- **Imágenes:** los paneles mandan las imágenes de eventos y logos como data URL (hasta 2 MB). Se guardan como archivo
  en `uploads/` (se comprueba que de verdad sean JPG, PNG o WEBP) y la base solo guarda la ruta. Se sirven en
  `/uploads/...`. Los paneles admiten cuerpos de hasta 3 MB; el resto del API, 100 KB.
- **Notas de cancelación y rechazo:** no hay tablas de causas. La causa se agrega a `observaciones`, en una línea
  nueva, con el mismo formato de `notaCancelacion()` de la web (`Cancelado por el agente. Causa: ... Detalle: ...`).
  El motivo de un rechazo se agrega como `Rechazado por el administrador. Motivo: ...`.
- **Códigos:** un evento se identifica por `EVT-AAAA-NNNN` y una reserva por `DES-NNNN` (sale de `id_reserva`).

## Endpoints

### Públicos y sesión

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servicio |
| GET | `/api/ciudades` | Ciudades con su departamento (para los selectores) |
| GET | `/api/eventos` | Catálogo público con la forma de `EVENTOS` de la web; filtros `ciudad`, `categoria`, `estado`, `limite`, `pagina`. Nunca muestra solicitudes |
| GET | `/api/eventos/:codigo` | Un evento publicado (404 si no existe o aún es una solicitud) |
| POST | `/api/auth/register` | Registro de CLIENTE o AGENTE; devuelve `token` y `usuario` |
| POST | `/api/auth/login` | Inicio de sesión; devuelve `token` y `usuario` |
| GET | `/api/auth/me` | Perfil del usuario autenticado |

### Cliente (`/api/reservas`, solo CLIENTE)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/reservas` | `{ idEvento, entradas (1 a 10), observaciones }`. Evento de pago: queda `Reservada` hasta que se confirme el pago; gratis: `Confirmada`. 409 si el evento no está a la venta o ya terminó (aunque siga `Programado`) |
| GET | `/api/reservas/mias` | Sus reservas |
| PATCH | `/api/reservas/:codigo/cancelar` | `{ causa, detalle }`. Causas: No puede asistir, Error en el evento o en la cantidad, Cambio de fecha del evento, Otra causa (con detalle) |

### Agente (`/api/agente`, solo AGENTE)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/agente/resumen` | Indicadores, ventas por mes, estados, sus eventos y actividad (forma de `resumenAgenteLocal()`) |
| GET | `/api/agente/eventos` | `{ agente, eventos: [publicados], solicitudes: [en revisión y rechazadas] }` |
| POST | `/api/agente/eventos` | Envía una solicitud (campos de `datosFormulario()`); queda `En revisión`. Un agente `Pendiente` recibe 403 |
| PUT | `/api/agente/eventos/:id` | Corrige una solicitud en revisión o rechazada; vuelve a `En revisión` y se quita el motivo anterior |
| DELETE | `/api/agente/eventos/:id` | Retira una solicitud que todavía no se publica |
| GET | `/api/agente/reservas` | Las reservas de sus eventos |
| PATCH | `/api/agente/reservas/:codigo/estado` | `{ estado: "Cancelada", observaciones }` (con la nota de causa). 403 si la reserva es de otro organizador |
| POST | `/api/agente/entradas/:codigo/ingreso` | Valida la entrada en la puerta (201). 403 si es de otro organizador |
| PUT | `/api/agente/perfil` | `{ nombre, descripcion, logo, correo, telefono, ciudad, experiencia }`. El NIT, la razón social y la comisión no cambian aquí |

### Administrador (`/api/admin`, solo ADMINISTRADOR)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/admin/resumen?meses=6` | Indicadores, meses, estados, categorías, mejores agentes y actividad (forma de `resumenLocal()`) |
| GET | `/api/admin/reportes?anio=2026` | Todos los reportes del enunciado (forma de `reportesLocal()`) |
| GET, POST | `/api/admin/agentes` | Lista (forma de `AGENTES_DEMO`) y alta (USUARIO + AGENTE, con `contrasena`) |
| PUT, DELETE | `/api/admin/agentes/:nit` | Modifica (el NIT y el documento no cambian) o elimina (409 si tiene eventos) |
| PATCH | `/api/admin/agentes/:nit/estado` | `{ estado: "Activo" \| "Pendiente" \| "Suspendido" }` |
| GET, POST | `/api/admin/clientes` | Lista (forma de `CLIENTES_DEMO`) y alta |
| PUT, DELETE | `/api/admin/clientes/:documento` | Modifica o elimina (sus reservas se borran; 409 si alguna tiene un pago) |
| PATCH | `/api/admin/clientes/:documento/estado` | `{ estado: "Activa" \| "Bloqueada" }` |
| GET, POST | `/api/admin/administradores` | Lista y alta |
| PUT, DELETE | `/api/admin/administradores/:documento` | Modifica o elimina (no la cuenta propia ni al último administrador) |
| GET, POST | `/api/admin/eventos` | Eventos publicados (forma de `EVENTOS`) y alta de un evento ya publicado (`Programado`) con el `nit` del agente |
| PUT, DELETE | `/api/admin/eventos/:id` | Modifica (no si está cancelado o finalizado; la capacidad no baja de lo reservado) o elimina (409 si hay pagos) |
| PATCH | `/api/admin/eventos/:id/estado` | `{ estado, observaciones }`. Programado → En Boletería → En Vivo → Finalizado; Cancelado desde cualquiera. Al cancelar, sus reservas se cancelan |
| GET | `/api/admin/eventos/solicitudes` | Las solicitudes `En revisión` |
| PATCH | `/api/admin/eventos/solicitudes/:id` | `{ estado: "Aprobado" \| "Rechazado", motivo }`. Aprobar la publica como `Programado` |
| GET, POST | `/api/admin/reservas` | Lista (con su pago) y alta para un cliente (venta en taquilla) |
| PUT, DELETE | `/api/admin/reservas/:codigo` | Modifica entradas, estado u observaciones (con pago, solo observaciones) o elimina (409 si tiene pago) |
| PATCH | `/api/admin/reservas/:codigo/estado` | `{ estado: "Cancelada", observaciones }` |
| POST | `/api/admin/entradas/:codigo/ingreso` | Valida la entrada (201). Rechaza (409) si está usada, cancelada, sin pagar, con el pago no aprobado o si el evento terminó |
| GET | `/api/admin/ubicaciones` | `{ paises, departamentos, ciudades }` |
| POST, PUT, DELETE | `/api/admin/paises[/:id]`, `/departamentos[/:id]`, `/ciudades[/:id]` | `{ nombre }` (y `idPais` o `idDepartamento` al registrar). DELETE: 409 si algo depende de él |

### Registro (`/api/auth/register`)

Campos comunes: `tipo_cuenta` (`CLIENTE` | `AGENTE`), `tipo_identificacion` (`CC`, `CE`, `PAS`, `PPT`, `NIT`),
`numero_identificacion`, `nombre`, `apellidos`, `correo`, `contrasena` (8 a 72 caracteres), `direccion`,
`id_ciudad`. Opcional: `telefono` (celular 3XXXXXXXXX o fijo 60X + 7 dígitos).

- **CLIENTE** agrega `fecha_nacimiento` (AAAA-MM-DD); opcionales `alias` y `publicidad` (booleano, por defecto `true`).
- **AGENTE** agrega `nit` (123456789-0) y `razon_social`; opcionales `nombre_comercial` y `descripcion`. Queda
  `Pendiente` hasta que un administrador lo apruebe. La comisión y la experiencia las fija un administrador.
- **ADMIN** no se auto-registra.

El número de documento se normaliza (mayúsculas, sin puntos, guiones ni espacios) y debe cumplir el formato
de su tipo. Es la clave primaria: un mismo número no se registra dos veces aunque cambie el tipo. La base guarda
nombre y apellidos juntos en `USUARIO.nombre_completo` y las respuestas devuelven `nombre_completo`. Login y registro
devuelven además `tipo_identificacion`, `fecha_nacimiento` (CLIENTE), `nit` (AGENTE) y `estado_usuario`. Las fechas
salen como se guardaron (`AAAA-MM-DD` y `AAAA-MM-DDTHH:MM:SS`, sin zona horaria).

### Respuestas de error

| Estado | Cuándo | Cuerpo |
|---|---|---|
| 400 | Datos inválidos, o algo que se eligió no existe (ciudad, evento, cliente, agente) | `{ error, detalles: { campo: mensaje } }` |
| 401 | Sin token, token inválido o vencido, o la cuenta ya no existe | `{ error }` |
| 403 | Sin permiso para esa ruta, cuenta suspendida o bloqueada, o el recurso es de otro organizador | `{ error }` |
| 404 | No existe (o es de otra persona y no se revela) | `{ error }` |
| 409 | Ya existe (correo, documento, NIT, alias, nombre de ubicación), algo depende de lo que se quiere borrar, o el estado no lo permite (entrada ya usada, solicitud ya decidida) | `{ error, detalles? }` |
| 413 | La imagen supera los 2 MB | `{ error, detalles }` |
| 422 | Una regla de negocio lo impide (edad mínima, cupo, transición de estado, capacidad menor que lo reservado) | `{ error }` |

## Pruebas

`npm test` ejecuta todo `test/`, un archivo detrás de otro (`--test-concurrency=1`): las pruebas de integración
comparten una sola base y en paralelo se pisarían. `npm run test:cobertura` hace lo mismo con el informe de cobertura
de `src/`, y `npm run test:bd` corre las pruebas de la base (`database/pruebas_bd.sql`) dentro del contenedor de
Docker. Los tres funcionan en PowerShell, cmd y Git Bash.

- Unitarias (no necesitan base): `validacion.test.js` (registro, login y roles), `validacionEvento.test.js`
  (eventos, estados, decisiones, filtros y utilidades de formato) y `errores.test.js` (traducción de errores de
  PostgreSQL, el 500 genérico, imágenes y validación de personas de los paneles).
- Integración (necesitan el esquema y el seed cargados y el `.env`; limpian lo que crean): `auth.test.js`,
  `eventos.test.js` (catálogo y administración de eventos y solicitudes), `personas.test.js` (agentes, clientes,
  administradores y estado de la cuenta), `reservas.test.js` (cliente, administrador y validación de entradas),
  `agente.test.js` (panel del agente y flujo completo de revisión) y `panel.test.js` (ubicaciones, resumen y reportes).
  `ayudas.js` reúne lo que comparten.

## Pendiente

- **Pagos en línea:** no hay pasarela de pago. Una reserva de un evento de pago queda `Reservada` hasta que un
  administrador la confirme. El estado del pago en la base tiene 3 valores (Pendiente, Aprobado, Rechazado).

La web pública usa el API: el catálogo, el detalle y los filtros salen de `GET /api/eventos`
(incluye `pais` para los filtros de ubicación), la reserva se crea con `POST /api/reservas`, y "Mis reservas", la
confirmación y la cancelación usan `GET /api/reservas/mias` y `PATCH /api/reservas/:codigo/cancelar`.
