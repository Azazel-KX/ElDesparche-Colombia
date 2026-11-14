# Base de datos de ElDesparche

PostgreSQL 13+ · 11 tablas · 3FN. Alineada con el diagrama corregido y con el avance del corte 2 (`Avance_El_desparche_PI_2026-2_Corte_2.docx`).

| Archivo | Contenido |
|---|---|
| `schema_ElDesparche.sql` | Tipos ENUM, 11 tablas, índices y triggers de reglas de negocio. Sin datos |
| `seed.sql` | **La semilla (única):** todos los datos de ejemplo, en una sola transacción. Está dividida en secciones numeradas y comentadas para poder leerla de arriba abajo |
| `pruebas_bd.sql` | 88 pruebas de la estructura, la semilla y las reglas; no deja cambios (termina en `ROLLBACK`) |
| `../documents/BD/Diagrama_corregido.drawio` | Diagrama entidad-relación (fuente de verdad) |
| `../documents/BD/Avance_El_desparche_PI_2026-2_Corte_2.docx` | Análisis del enunciado, entidades, relaciones, cardinalidades y esquema relacional |
| `../documents/BD/Diccionario_Datos_ElDesparche.txt` | Diccionario de datos, campo por campo |

## Qué se carga y en qué orden

Son dos archivos, siempre en este orden y sobre una base **vacía**:

| Orden | Archivo | Qué deja |
|---|---|---|
| 1 | `schema_ElDesparche.sql` | Tipos, 11 tablas, índices y triggers. Sin datos |
| 2 | `seed.sql` | Todos los datos de ejemplo (ver abajo) |

Cada archivo corre en una sola transacción: si algo falla, no queda nada a medias. Los códigos de eventos nuevos siguen
solos desde el número más alto (el próximo es `EVT-2026-0069`).

### Cargar la base (local con Docker)

```bash
docker compose up -d
docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/schema_ElDesparche.sql
docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/seed.sql
```

(En PowerShell no existe `<`: usa Git Bash o cmd, o `Get-Content archivo.sql | docker exec -i ... psql ...`.)
Sin `psql` (por ejemplo, para Neon), desde `backend/`: `npm run bd:cargar`.

### Empezar de cero (borra todo)

El esquema no se puede cargar dos veces sobre la misma base. Para dejarla como nueva hay que vaciar el esquema y volver a cargar:

```bash
docker exec desparche_db_container psql -U postgres -d desparche_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/schema_ElDesparche.sql
docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/seed.sql
```

**Pierdes todos los datos.** La semilla tampoco se puede cargar dos veces sobre la misma base: choca con lo ya existente.

### Una base aparte para las pruebas

Para no pisar los datos con los que trabajas en la web, las pruebas se pueden correr contra otra base del mismo contenedor:

```bash
docker exec desparche_db_container psql -U postgres -c "CREATE DATABASE desparche_prueba"
docker exec -i desparche_db_container psql -U postgres -d desparche_prueba < database/schema_ElDesparche.sql
docker exec -i desparche_db_container psql -U postgres -d desparche_prueba < database/seed.sql
cd backend && DB_NAME=desparche_prueba npm test      # en PowerShell: $env:DB_NAME="desparche_prueba"; npm test
```

### Qué trae la semilla (`seed.sql`)

| Qué | Cuánto |
|---|---|
| Países | 8 (Colombia, Perú, México, Argentina, Ecuador, Chile, España y Estados Unidos), con 33 departamentos y 46 ciudades |
| Sitios para eventos | 47: 38 en Colombia y 9 en el exterior (la base admite cualquier coordenada del planeta) |
| Personas | 2 administradores, 10 agentes (uno suspendido y dos pendientes) y 33 clientes (5 del exterior y dos bloqueados) |
| Eventos | 68 (`EVT-2026-0001` a `0068`) en todos los estados, en los 8 países y con las fotos de `frontend/img` |
| Reservas | 283 en los 4 estados; hay un evento casi agotado (`EVT-2026-0020`) y otro agotado (`EVT-2026-0034`) |

**Cómo está armado el archivo** (pensado para leerlo de arriba abajo):

| Sección | Qué llena | Tablas |
|---|---|---|
| 0. Ayudas temporales | La contraseña de las cuentas, calculada una sola vez | (temporal) |
| 1. Geografía | Países, departamentos, ciudades y sitios de eventos | `PAIS` → `DEPARTAMENTO` → `CIUDAD` → `UBICACION` |
| 2. Personas | Administradores, agentes y clientes: usuario, teléfonos y subtipo | `USUARIO`, `USUARIO_TELEFONO`, `ADMIN`, `AGENTE`, `CLIENTE` |
| 3. Eventos | Los 68 eventos en una sola lista | `EVENTO` |
| 4. Reservas | 5 escritas a mano, el resto repartidas con una fórmula, y los dos eventos casi agotados | `RESERVA` |

El orden no es casual: una llave foránea solo puede apuntar a una fila que ya existe. Además, los datos usan **nombres y no
números de id** (un usuario dice `'Cali'`, no `id_ciudad = 1`); cada `INSERT ... SELECT ... FROM (VALUES ...) JOIN ...`
busca el id real. Las fechas de los eventos son relativas al día en que se carga.

Para Neon (PostgreSQL en la nube) ver `GUIA_NEON.md` en la raíz.

## Tablas

| Grupo | Tablas |
|---|---|
| Geografía | `PAIS`, `DEPARTAMENTO`, `CIUDAD`, `UBICACION` |
| Usuarios | `USUARIO` (superclase) → `ADMIN`, `CLIENTE`, `AGENTE`; `USUARIO_TELEFONO` |
| Eventos y ventas | `EVENTO`, `RESERVA` |

## Relaciones

| Relación | Entidades | Cardinalidad | Llave foránea (siempre NOT NULL) |
|---|---|---|---|
| Contiene | `PAIS` – `DEPARTAMENTO` | 1:N | `DEPARTAMENTO.id_pais` |
| Pertenece | `CIUDAD` – `DEPARTAMENTO` | N:1 | `CIUDAD.id_departamento` |
| Pertenece | `UBICACION` – `CIUDAD` | N:1 | `UBICACION.id_ciudad` |
| UbiPer | `USUARIO` – `CIUDAD` | N:1 | `USUARIO.id_ciudad` |
| UbiEve | `EVENTO` – `UBICACION` | N:1 | `EVENTO.id_ubicacion` |
| Registra | `AGENTE` – `EVENTO` | 1:N | `EVENTO.numero_identificacion` |
| Inscribe | `CLIENTE` – `RESERVA` | 1:N | `RESERVA.numero_identificacion` |
| Ofrece | `EVENTO` – `RESERVA` | 1:N | `RESERVA.codigo_evento` |
| IS-A (total, disjunta) | `USUARIO` → `ADMIN`, `CLIENTE`, `AGENTE` | 1:1 | PK de la subclase = PK de `USUARIO` (PK y FK) |

## Decisiones del diseño

- **PK de `USUARIO`:** `numero_identificacion`, blindada: número normalizado (mayúsculas y dígitos), formato válido según el tipo de documento, no editable salvo corrección explícita y `ON UPDATE CASCADE` en las FK. Un mismo número no puede registrarse dos veces aunque cambie el tipo.
- **Estado de la cuenta (`USUARIO.estado_usuario`):** `Activo`, `Pendiente` (agente que se registró solo y espera aprobación), `Suspendido` (agentes) o `Bloqueado` (clientes). Las dos últimas impiden iniciar sesión.
- **Revisión de eventos:** un evento que registra un agente queda `En revisión`; el administrador lo aprueba (pasa a `Programado` y se publica) o lo rechaza (`Rechazado`). Es la misma fila de `EVENTO`: solo cambia el estado. El motivo del rechazo se agrega a `observaciones` (`Rechazado por el administrador. Motivo: ...`).
- **Código de evento:** `EVT-AAAA-NNNN`; el número sale de la secuencia `evento_numero_seq` (el seed la deja en el último código cargado). Nunca se repite, aunque se borre un evento.
- **Entrada usada:** `RESERVA.estado` = `Usada` cuando la entrada se valida en la puerta del evento.
- **Sin `tipo_usuario`:** el perfil lo define la generalización. Cada subtipo (`ADMIN`, `CLIENTE`, `AGENTE`) usa como PK y FK el `numero_identificacion` de `USUARIO`; para saber el perfil se busca en qué subtipo está la fila.
- **Herencia total y disjunta:** un trigger diferido exige que todo usuario esté en exactamente un subtipo (ni ninguno ni dos).
- **Nombre:** `USUARIO.nombre_completo` guarda nombres y apellidos en una sola columna.
- **Llaves foráneas hacia el usuario:** se llaman `numero_identificacion`, igual que la PK a la que apuntan (`EVENTO` → agente, `RESERVA` → cliente).
- **Cancelaciones:** la causa se agrega a `observaciones` de `EVENTO` o `RESERVA`, en una línea nueva, con el formato que escribe la web: `Cancelada por el cliente. Causa: No puede asistir. Detalle: ...`. Si no hay cancelación ni rechazo, `observaciones` solo tiene las notas del evento o la reserva (o `NULL`).
- **Teatro:** `EVENTO.teatro` es el teatro o sitio del evento; la dirección exacta está en `UBICACION`.
- **Derivado no almacenado:** `edad` (de `fecha_nacimiento`).
- **Multivalorado:** `telefono` vive en `USUARIO_TELEFONO` (PK compuesta).
- **Ciudad del evento:** no se guarda en `EVENTO`; se obtiene por `UBICACION → CIUDAD → DEPARTAMENTO → PAIS`.

## Reglas que hace cumplir la base (triggers)

- Todo `USUARIO` está en exactamente una de `ADMIN`, `CLIENTE` o `AGENTE` (se valida al COMMIT). Cambiar de perfil es válido si el borrado y el nuevo insert van en la misma transacción.
- Solo los agentes registran eventos y solo los clientes reservan (lo garantizan las FK hacia `AGENTE` y `CLIENTE`).
- Para reservar: el cliente debe cumplir la edad mínima del evento y tiene que haber cupo.
- `RESERVA.valor_total` = `numero_entradas` × precio del evento vigente al reservar (0 si el evento es gratis).
- No hay tablas de pago: una reserva nace `Reservada` y un administrador aprueba la reserva y el pago pasándola a `Confirmada` (las de eventos gratis nacen confirmadas).
- `capacidad_total` no puede bajar de las entradas ya reservadas.
- El documento de identidad no se edita; para corregirlo: `BEGIN; SET LOCAL app.corregir_documento = 'on'; UPDATE USUARIO SET numero_identificacion = '...' WHERE ...; COMMIT;`

## Cuentas del seed

Contraseña de todas: `Desparche2026!` (dominio `eldesparche.test`)

| Correo | Perfil |
|---|---|
| `admin@`, `admin2@` | ADMIN |
| `agente1@` a `agente10@` | AGENTE (`agente3` y `agente10` pendientes de aprobación, `agente9` suspendido) |
| `cliente1@`, `cliente2@`, `cliente04@` a `cliente33@` | CLIENTE |
| `cliente3@`, `cliente20@` | CLIENTE bloqueado (no puede entrar) |

El seed trae eventos `En revisión` (`EVT-2026-0006`, `0056`, `0057`) y `Rechazado` con su motivo (`EVT-2026-0007`, `0058`, `0059`).
Las fechas de los eventos son relativas al día en que se carga el seed (`CURRENT_DATE + días`), así sus eventos están
siempre en el futuro; si la base se cargó hace meses, recárgala para que los eventos vuelvan a estar vigentes.

## Probar las reglas

`pruebas_bd.sql` comprueba en 88 pruebas la estructura, los datos del seed y que cada restricción
y trigger acepte lo válido y rechace lo inválido (herencia, documento, edad mínima, cupo, valor, borrados en
cascada o restringidos, ubicaciones). Corre en una transacción que termina en `ROLLBACK` y no usa `nextval`, así que no
deja cambios. Termina con error si alguna prueba falla. Desde `backend/` (PowerShell, cmd o Git Bash):

```bash
npm run test:bd
```

O directamente desde la raíz del repo (Git Bash o cmd; PowerShell no admite `<`):

```bash
docker exec -i desparche_db_container psql -U postgres -d desparche_db -v ON_ERROR_STOP=1 < database/pruebas_bd.sql
```

Algunos ejemplos que la base debe rechazar:

```sql
-- cliente menor de la edad mínima (cliente2 nació en 1998, pero se prueba con un evento para mayores de 30)
UPDATE EVENTO SET edad_minima = 30 WHERE codigo = 'EVT-2026-0004';
INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento) VALUES (1, '1000000003', 'EVT-2026-0004');
-- valor_total que no es entradas × precio
INSERT INTO RESERVA (numero_entradas, valor_total, numero_identificacion, codigo_evento) VALUES (1, 20000, '1000000002', 'EVT-2026-0004');
-- reserva que supera la capacidad
INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento) VALUES (1000, '1000000002', 'EVT-2026-0004');
-- usuario sin subtipo (se rechaza al COMMIT)
INSERT INTO USUARIO (numero_identificacion, tipo_identificacion, nombre_completo, correo, contrasena_hash, direccion, id_ciudad)
VALUES ('2000000001', 'CC', 'Sin Subtipo', 'sin.subtipo@eldesparche.test', 'x', 'Calle 1', 1);
-- un cliente no puede registrar eventos (solo los agentes)
INSERT INTO EVENTO (codigo, nombre, categoria, teatro, fecha_hora_inicio, fecha_hora_fin, capacidad_total, id_ubicacion, numero_identificacion)
VALUES ('EVT-PRUEBA', 'Prueba', 'musica', 'Teatro', '2027-01-01 19:00', '2027-01-01 21:00', 10, 1, '1000000002');
```
