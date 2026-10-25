# El Desparche

Sistema web de gestión de eventos y reservas (Proyecto Integrador 2026-2, Bases de Datos y Programación en Ambiente Web I).
Un cliente reserva entradas, un agente publica eventos y administra las reservas de los suyos, y un administrador
gestiona todo y consulta los reportes. Funciona al estilo de Tuboleta, Eventbrite o Ticketmaster.

**Integrantes:** Issabhella Alarcon Moreno · Sebastian Jaramillo Ortiz · Emmanuel Obando Sanchez · Valentina Osorio Moran

## Cómo está organizado

| Carpeta | Qué contiene | Más información |
|---|---|---|
| `database/` | Esquema PostgreSQL (11 tablas, 3FN, triggers de reglas de negocio), datos de prueba y pruebas del esquema | [`database/README.md`](database/README.md) |
| `backend/` | API REST en Node.js + Express (MVC), con JWT, validaciones, reportes y pruebas | [`backend/README.md`](backend/README.md) |
| `frontend/` | Sitio web (HTML5, CSS3 y JavaScript con Vite) para clientes, agentes y administradores | [`frontend/README.md`](frontend/README.md) |
| `documents/` | Documentos del proyecto: diagrama entidad-relación, diccionario de datos, avances y cronogramas | |

La web habla con la API por HTTP (`/api`) y la API con PostgreSQL. El frontend no guarda datos de ejemplo:
todo sale de la base de datos.

## Cómo ejecutarlo en tu computador

Necesitas Node.js 20 o superior y Docker.

```bash
# 1. Base de datos (desde la raíz del repositorio)
docker compose up -d database
docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/schema_ElDesparche.sql
docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/seed.sql
# Opcional, para ver la web con mucho contenido (8 países, 68 eventos, unas 280 reservas):
docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/seed_demo.sql
```

Para correr las pruebas carga solo el esquema y `seed.sql` (de preferencia en una base aparte): ver [`database/README.md`](database/README.md).

```bash
# 2. API en http://localhost:5000
cd backend
cp .env.example .env      # en Windows: copy .env.example .env
npm install
npm run dev
```

```bash
# 3. Web en http://localhost:5173 (Vite redirige /api al puerto 5000)
cd frontend
npm install
npm run dev
```

Si la base ya tiene las tablas, no hace falta repetir el paso de carga. Para usar PostgreSQL en la nube (Neon) mira `GUIA_NEON.md`.

### Cuentas de prueba

El seed crea un administrador, clientes y agentes (y `seed_demo.sql`, muchos más) (`admin@eldesparche.test`, `cliente1@eldesparche.test`,
`agente1@eldesparche.test`…). Su contraseña y la lista completa están en [`database/README.md`](database/README.md).
**Son solo para desarrollo:** antes de publicar la web en internet hay que borrarlas o cambiarles la contraseña.

### Pruebas

```bash
cd backend && npm test        # pruebas de la API (necesitan la base de datos encendida)
cd backend && npm run test:bd # pruebas del esquema y de las reglas de la base
```

## Qué pide el enunciado y dónde está

| Requisito del enunciado | Dónde |
|---|---|
| Base de datos relacional en PostgreSQL | `database/schema_ElDesparche.sql` |
| País, departamento y ciudad por separado; personas con varios teléfonos; clientes, agentes y administradores | `database/` (herencia `USUARIO` → `CLIENTE`/`AGENTE`/`ADMIN`) |
| Eventos con sus cinco estados y reservas con sus estados | `EVENTO`, `RESERVA` y sus triggers |
| Inicio de sesión con correo y contraseña; registro de clientes y agentes | `backend/src/routes/authRoutes.js`, ventana de acceso en `frontend/src/vistas/accesoVista.js` |
| CRUD de personas, clientes, agentes, administradores, eventos, reservas, países, departamentos y ciudades | `backend/src/routes/adminRoutes.js` y las páginas del panel de administración |
| Vistas distintas para cliente, agente y administrador | `mis-reservas.html`, `agente.html`, `admin.html` |
| Dashboard y reportes solo para administradores | `admin.html` (Panel y Reportes), `backend/src/models/reporteModel.js` |
| Repositorio en GitHub con el trabajo del equipo | Este repositorio |

### Lo que todavía no cumple

- **Bootstrap y TypeScript en el frontend:** el enunciado los pide como objetivo, pero el frontend está hecho con
  CSS propio y JavaScript sin tipos. Su código sí está separado en modelo, vista y controlador (`frontend/src/`), igual
  que el backend.
- **Pagos en línea:** no hay pasarela de pago. Hoy una reserva de
  un evento de pago queda "Reservada" hasta que un administrador la confirma.
- **Causa de cancelación:** se guarda como texto dentro de `observaciones`, no en una columna propia.
