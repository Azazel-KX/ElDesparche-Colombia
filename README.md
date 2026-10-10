# ElDesparche-Colombia

Plataforma web de eventos y reservas con verificación biométrica simulada (Proyecto Integrador universitario, 2026-2).
Muestra eventos por ciudad, permite registrarse como **usuario** (cliente) o **agente** (empresa), iniciar sesión y reservar tickets.

## Estructura

| Carpeta | Contenido |
|---|---|
| `frontend/` | Sitio web (HTML5, CSS3, JavaScript; Vite para desarrollo) |
| `backend/` | API REST en Node.js + Express (MVC) sobre PostgreSQL. Ver [`backend/README.md`](backend/README.md) |
| `database/` | `schema.sql` (esquema PostgreSQL + PostGIS) y `seed.sql` (datos de prueba) |
| `documents/` | Análisis (PESTEL, Canvas, Vester, Pareto), BD, cronogramas, Daily Scrum, enunciado |
| `docker-compose.yml` | PostgreSQL 15 con PostGIS para desarrollo |

## Puesta en marcha (desarrollo)

Requisitos: Node.js 20+, Docker.

```bash
# 1. Base de datos
docker compose up -d
docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/schema.sql
docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/seed.sql   # datos de prueba

# 2. Backend (puerto 5000)
cd backend
cp .env.example .env        # completa JWT_SECRET con un valor aleatorio de 32+ caracteres
npm install
npm run dev

# 3. Frontend (puerto 5173; redirige /api al backend)
cd ../frontend
npm install
npm run dev
```

`schema.sql` y `seed.sql` se cargan **una sola vez sobre una base vacía** (no son idempotentes).
Para repetirlo: `docker compose down -v` y volver a empezar.

Cuentas de prueba del seed (contraseña `Desparche2026!`, **solo desarrollo**):
`admin@`, `cliente1@`, `cliente2@`, `empresa1@`, `empresa2@eldesparche.test`.

## Pruebas

```bash
cd backend && npm test   # requiere la base de datos con schema + seed y backend/.env
```

## Flujo de trabajo

- Ramas por tarea (`feat/...`, `fix/...`, `docs/...`) y Pull Request hacia `main`.
- Commits con prefijo convencional: `feat`, `fix`, `docs`, `chore`.
- Tablero y sprints en Jira (proyecto SCR).

## Seguridad

- Nunca se sube `.env`; solo `.env.example`.
- Los datos que vienen del usuario o de la base se escapan con `esc()` antes de insertarse con `innerHTML`.
- El seed contiene una contraseña de prueba conocida: no cargarlo en un entorno real.
