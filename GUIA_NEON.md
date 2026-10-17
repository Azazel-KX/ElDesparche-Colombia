# Guía: ElDesparche en Neon (PostgreSQL en la nube)

Neon aloja la misma base PostgreSQL que usas en local. El esquema y el seed no cambian; solo cambia la cadena de conexión.

## 1. Crear el proyecto

1. Entra a <https://console.neon.tech/> e inicia sesión.
2. **New Project** → nombre `eldesparche`, base de datos `eldesparche_db`, región la más cercana.
3. En **Connection string** copia la URL (empieza con `postgresql://` y termina en `?sslmode=require`).

## 2. Cargar el esquema y los datos de prueba

Necesitas `psql` instalado. Sobre la base vacía de Neon, desde la raíz del repositorio:

```bash
psql "<DATABASE_URL>" -f database/schema_ElDesparche.sql
psql "<DATABASE_URL>" -f database/seed.sql
```

El esquema usa la extensión `pgcrypto` (`gen_random_uuid()`, `crypt()`); Neon la trae disponible y el script la crea con `CREATE EXTENSION IF NOT EXISTS`.

## 3. Verificar

```bash
psql "<DATABASE_URL>" -c "SELECT COUNT(*) FROM USUARIO;"      # 5
psql "<DATABASE_URL>" -c "SELECT COUNT(*) FROM EVENTO;"       # 5
psql "<DATABASE_URL>" -c "SELECT codigo, estado FROM EVENTO;"
```

El diccionario de datos con todas las tablas está en `documents/BD/Diccionario_Datos_ElDesparche.txt`.

## 4. Conectar el backend

En `backend/.env` comenta las variables `DB_*` y activa `DATABASE_URL`:

```
DATABASE_URL=postgresql://usuario:clave@ep-xxxx.neon.tech/eldesparche_db?sslmode=require
```

> El backend se está adaptando al esquema nuevo; hasta entonces sus consultas aún apuntan a tablas del esquema anterior.

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `relation "pais" does not exist` al cargar el seed | El esquema no se cargó. Ejecuta primero `schema_ElDesparche.sql`. |
| `type "tipo_usuario_t" already exists` | La base ya tiene el esquema. Usa una base vacía o recréala desde la consola de Neon. |
| `SSL connection required` | Falta `?sslmode=require` en la URL. |
| `permission denied to create extension` | Usa el rol propietario del proyecto (el que crea Neon por defecto). |

## Seguridad

- No subas `.env` ni la cadena de conexión al repositorio.
- Las cuentas del seed son solo de prueba; no uses esa contraseña en producción.
