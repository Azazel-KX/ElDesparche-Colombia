# Backend de ElDesparche

API REST en Node.js + Express con PostgreSQL, organizada en MVC.

```
backend/
├── src/
│   ├── config/        env.js (variables) y db.js (pool de PostgreSQL + transacciones)
│   ├── models/        consultas SQL (usuarioModel.js)
│   ├── controllers/   lógica de cada endpoint (authController.js)
│   ├── routes/        rutas Express (authRoutes.js)
│   ├── middlewares/   auth.js (JWT y roles), errorHandler.js
│   ├── utils/         validacion.js, errores.js
│   ├── app.js         configura Express
│   └── server.js      arranca el servidor
└── test/              pruebas de integración (node:test)
```

## Puesta en marcha

1. Base de datos (Docker): `docker compose up -d` desde la raíz del repo.
2. Cargar esquema y datos de prueba sobre una base **vacía**:
   ```bash
   docker exec -i desparche_db_container psql -U postgres -d desparche_db -f - < database/schema.sql
   docker exec -i desparche_db_container psql -U postgres -d desparche_db -f - < database/seed.sql
   ```
3. `cp .env.example .env` y completa `JWT_SECRET` (mínimo 32 caracteres).
4. `npm install`, luego `npm run dev` (puerto 5000) o `npm test`.

Cuentas del seed (contraseña `Desparche2026!`): `admin@`, `cliente1@`, `cliente2@`, `empresa1@`, `empresa2@eldesparche.test`.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servicio |
| POST | `/api/auth/register` | Registro de CLIENTE o EMPRESA; devuelve `token` y `usuario` |
| POST | `/api/auth/login` | Inicio de sesión por correo y contraseña; devuelve `token` y `usuario` |
| GET | `/api/auth/me` | Perfil del usuario autenticado (`Authorization: Bearer <token>`) |

Campos de registro comunes: `tipo_cuenta` (CLIENTE | EMPRESA), `tipo_identificacion`, `numero_identificacion`,
`nombres`, `apellidos`, `correo`, `contrasena` (8 a 72 caracteres), `direccion`, `id_ciudad`; opcionales:
`telefono`, `latitud` y `longitud` (si faltan se usa el punto medio de la ciudad).
CLIENTE agrega `fecha_nacimiento` (AAAA-MM-DD) y `alias` opcional; EMPRESA agrega `nit` (123456789-0),
`razon_social`, `nombre_comercial` y `descripcion` opcional.
