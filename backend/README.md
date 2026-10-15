# Backend de ElDesparche

API REST en Node.js + Express con PostgreSQL, organizada en MVC. Trabaja sobre el esquema de
`database/schema_ElDesparche.sql` (18 tablas; ver `database/README.md`).

```
backend/
├── src/
│   ├── config/        env.js (variables) y db.js (pool de PostgreSQL + transacciones)
│   ├── models/        consultas SQL (usuarioModel.js, ciudadModel.js)
│   ├── controllers/   lógica de cada endpoint (authController.js)
│   ├── routes/        rutas Express (authRoutes.js, ciudadRoutes.js)
│   ├── middlewares/   auth.js (JWT y roles), errorHandler.js (errores de PostgreSQL → mensajes)
│   ├── utils/         validacion.js, errores.js
│   ├── app.js         configura Express
│   └── server.js      arranca el servidor
└── test/              auth.test.js (integración, necesita BD) y validacion.test.js (unitarias)
```

## Puesta en marcha

1. Base de datos (Docker): `docker compose up -d` desde la raíz del repo.
2. Cargar esquema y datos de prueba sobre una base **vacía** (el esquema primero):
   ```bash
   docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/schema_ElDesparche.sql
   docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/seed.sql
   ```
3. `cp .env.example .env` y completa `JWT_SECRET` (mínimo 32 caracteres) y los datos de la base.
4. `npm install`, luego `npm run dev` (puerto 5000) o `npm test`.

Cuentas del seed (contraseña `Desparche2026!`): `admin@`, `cliente1@`, `cliente2@`, `agente1@` y
`agente2@eldesparche.test`.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servicio |
| GET | `/api/ciudades` | Ciudades con su departamento (para los selectores) |
| POST | `/api/auth/register` | Registro de CLIENTE o AGENTE; devuelve `token` y `usuario` |
| POST | `/api/auth/login` | Inicio de sesión por correo y contraseña; devuelve `token` y `usuario` |
| GET | `/api/auth/me` | Perfil del usuario autenticado (`Authorization: Bearer <token>`) |

### Registro

Campos comunes: `tipo_cuenta` (`CLIENTE` | `AGENTE`), `tipo_identificacion` (`CC`, `CE`, `PAS`, `PPT`, `NIT`),
`numero_identificacion`, `nombre`, `apellidos`, `correo`, `contrasena` (8 a 72 caracteres), `direccion`,
`id_ciudad`. Opcional: `telefono` (celular 3XXXXXXXXX o fijo 60X + 7 dígitos).

- **CLIENTE** agrega `fecha_nacimiento` (AAAA-MM-DD); opcionales `alias` y `publicidad` (booleano, por defecto `true`).
- **AGENTE** agrega `nit` (123456789-0) y `razon_social`; opcionales `nombre_comercial` y `descripcion`.
  La comisión y la experiencia las fija un administrador.
- **ADMIN** no se auto-registra.

El número de documento se normaliza (mayúsculas, sin puntos, guiones ni espacios) y debe cumplir el formato
de su tipo: CC 6–10 dígitos, CE 4–10, PPT 5–10, NIT 9–10 (sin dígito de verificación), PAS 5–15 alfanuméricos.
El documento es la clave primaria del usuario: un mismo número no se puede registrar dos veces aunque cambie
el tipo.

### Respuestas de error

| Estado | Cuándo | Cuerpo |
|---|---|---|
| 400 | Datos inválidos o ciudad inexistente | `{ error, detalles: { campo: mensaje } }` |
| 401 | Credenciales o token inválidos | `{ error }` |
| 409 | Correo, documento, NIT o alias ya registrados | `{ error, detalles: { campo: mensaje } }` |
| 422 | Una regla de negocio de la base de datos rechazó la operación | `{ error }` |

### Perfil (`/api/auth/me`)

Devuelve datos base (`numero_identificacion`, `nombre`, `apellidos`, `correo`, `direccion`, `ciudad`,
`departamento`, `pais`, `telefonos`) y los del perfil: CLIENTE (`fecha_nacimiento`, `edad`, `alias`, `puntos`,
`publicidad`), AGENTE (`nit`, `razon_social`, `nombre_comercial`, `descripcion`, `comision`, `experiencia`) o
ADMIN (`horario`). La edad se calcula en la consulta; no se almacena.

## Pruebas

`npm test` ejecuta todo `test/`:

- `validacion.test.js`: reglas de validación y middleware de roles. No necesita base de datos.
- `auth.test.js`: registro, login y perfil contra la base real; comprueba también que la base rechaza lo
  que debe (documento o NIT repetidos, ciudad inexistente, cliente sin verificación que intenta reservar).
  Necesita el esquema y el seed cargados y el `.env` configurado; limpia lo que crea.

## Pendiente

- Endpoints de eventos, reservas y reportes del enunciado (CRUD y dashboard del administrador).
- Verificación de contacto (`VERIFICACION` / `VERIF_CONTACTO`): hoy un cliente recién registrado no puede
  reservar hasta que tenga una verificación aprobada, y la API todavía no la crea.
- Métodos de pago y pagos.
