# Guía: ElDesparche en Neon (PostgreSQL en la nube)

Neon aloja la misma base PostgreSQL que usas en local. El esquema y el seed no cambian; solo cambia la cadena de conexión.

```
Navegador (web en Vite, :5173) ──/api y /uploads──▶ Backend Express (:5000) ──SSL──▶ Neon (PostgreSQL)
```

La web **nunca** se conecta a la base: solo habla con el API. La cadena de conexión de Neon vive únicamente en
`backend/.env`, así que no queda expuesta en el navegador.

## 1. Crear el proyecto

1. Entra a <https://console.neon.tech/> e inicia sesión.
2. **New Project** → nombre `eldesparche`, base de datos `eldesparche_db`, región la más cercana.
3. En **Connect** copia la **Connection string** (empieza con `postgresql://` y termina en
   `?sslmode=require&channel_binding=require`). Sirve la versión con *pooler* (el host tiene `-pooler`), recomendada
   para el backend.

## 2. Conectar el backend

**Con la CLI de Neon** (recomendado), desde la raíz del repositorio:

```bash
npm i -g neon@latest
neon login                                   # abre el navegador para iniciar sesión
neon link --org-id <org-id> --project-id <project-id> --branch production -y
```

`neon link` crea `.neon` (el enlace con el proyecto) y deja `DATABASE_URL` y `DATABASE_URL_UNPOOLED` en `.env.local` de la
raíz; los dos archivos están en `.gitignore`. `neon env pull` vuelve a traerlas si cambian. El backend solo lee
`backend/.env`, así que copia esas dos líneas al final de ese archivo.

**A mano:** en `backend/.env` agrega `DATABASE_URL` (si existe, el backend ignora las variables `DB_*`):

```
DATABASE_URL=postgresql://usuario:clave@ep-xxxx-pooler.us-east-2.aws.neon.tech/eldesparche_db?sslmode=require&channel_binding=require
```

El backend (`backend/src/config/env.js`):

- Se conecta con **SSL verificando el certificado** de Neon y respeta `channel_binding=require`.
- Espera hasta 10 s a que la base despierte (Neon la suspende cuando no se usa) y, al arrancar, reintenta 4 veces con
  espera creciente antes de rendirse.
- Corta una consulta que no responde en 15 s y descarta esa conexión, en vez de dejar la petición colgada.
- Fija la zona horaria de Colombia en cada conexión. El pooler de Neon (PgBouncer) entrega la zona del servidor (GMT)
  aunque la base tenga otra: sin esto, `NOW()` iría 5 horas adelantado.
- Ajustes opcionales en `backend/.env.example`: `DB_SSL`, `DB_POOL_MAX`, `DB_CONNECT_TIMEOUT_MS`, `DB_QUERY_TIMEOUT_MS`,
  `DB_IDLE_TIMEOUT_MS`.

## 3. Cargar el esquema y los datos de prueba

Sobre la base **vacía** de Neon, desde `backend/` (no hace falta tener `psql`):

```bash
npm run bd:cargar            # schema_ElDesparche.sql + seed.sql (lo que usan las pruebas)
npm run bd:cargar -- --demo  # además seed_demo.sql (más eventos, ciudades, clientes y reservas para la web)
```

El script usa la `DATABASE_URL_UNPOOLED` del `.env` si existe (conexión directa, la que recomienda Neon para cargar
esquemas) o si no la `DATABASE_URL`, y se detiene sin tocar nada si la base ya tiene el esquema. El esquema usa la
extensión `pgcrypto` (`gen_random_uuid()`, `crypt()`); Neon la trae disponible y el script la crea con
`CREATE EXTENSION IF NOT EXISTS`. También fija la zona horaria de la base en `America/Bogota`.

Con `psql` instalado también sirve:

```bash
psql "<DATABASE_URL>" -f database/schema_ElDesparche.sql
psql "<DATABASE_URL>" -f database/seed.sql
```

## 4. Verificar la conexión de punta a punta

```bash
cd backend && npm run dev     # debe decir: ✓ PostgreSQL conectado: ep-xxxx-pooler....neon.tech/eldesparche_db (SSL)
cd frontend && npm run dev    # en otra terminal
```

- <http://localhost:5000/api/health> → `{"estado":"ok","baseDatos":"ok"}` (503 y `"sin conexión"` si la base no responde).
- <http://localhost:5173/api/health> → lo mismo, pero pasando por el proxy de Vite (así llama la web al API).
- <http://localhost:5173> → la portada muestra los eventos de Neon; entra con `cliente1@eldesparche.test` /
  `Desparche2026!` y haz una reserva.

El diccionario de datos con todas las tablas está en `documents/BD/Diccionario_Datos_ElDesparche.txt`.

## 5. Herramientas de Neon para el asistente (opcional)

`neon init` instala el plugin de Neon para Claude Code: las skills `neon:*` y el servidor MCP `https://mcp.neon.tech/mcp`,
que se autoriza con OAuth (en Claude Code: `/mcp` → `plugin:neon:neon` → Authenticate). No guarda claves en el repositorio.

## 6. Publicar la web

- **Mismo dominio** (túnel de Cloudflare o proxy inverso que envía `/api` y `/uploads` al backend): no hay que
  configurar nada en la web.
- **Dominios distintos** (ej. web en `eldesparche.online` y API en `api.eldesparche.online`):
  - `frontend/.env`: `VITE_API_URL=https://api.eldesparche.online/api` antes de `npm run build` (el build agrega ese
    origen a la `Content-Security-Policy` de cada página).
  - `backend/.env`: `CORS_ORIGIN=https://eldesparche.online` y `PUBLIC_URL=https://api.eldesparche.online` (para la URL
    de las imágenes subidas).

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `relation "pais" does not exist` al cargar el seed | El esquema no se cargó. Ejecuta primero `schema_ElDesparche.sql` (o usa `npm run bd:cargar`). |
| `type "tipo_identificacion_t" already exists` / `La base ya tiene el esquema` | La base ya tiene el esquema. Usa una base vacía o recréala desde la consola de Neon. |
| `The server does not support SSL connections` | La URL apunta a una base local: quita `sslmode=require` o pon `DB_SSL=false`. |
| `self-signed certificate` / `unable to verify` | El servidor no tiene un certificado de confianza. Con Neon no pasa: revisa que el host sea el de Neon. |
| `password authentication failed` | Usuario o clave mal copiados. Si la clave tiene `@`, `#` o `/`, cópiala tal cual de Neon (ya viene codificada). |
| El primer arranque tarda o avisa `PostgreSQL no responde (intento 1...)` | Neon estaba suspendida y está despertando; el backend reintenta solo. |
| `/api/health` responde 503 | El backend no llega a la base: revisa la `DATABASE_URL` y que el proyecto de Neon esté activo. |
| `permission denied to create extension` | Usa el rol propietario del proyecto (el que crea Neon por defecto). |

## Seguridad

- No subas `.env` ni la cadena de conexión al repositorio (`.env` está en `.gitignore`).
- Nunca pongas la cadena de conexión en `frontend/.env`: todo lo que empieza con `VITE_` queda visible en el navegador.
- Las cuentas del seed son solo de prueba; no uses esa contraseña en producción.
