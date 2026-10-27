# Base de datos de ElDesparche

PostgreSQL 13+ · 11 tablas · 3FN. Alineada con el diagrama corregido y con el avance del corte 2 (`Avance_El_desparche_PI_2026-2_Corte_2.docx`).

| Archivo | Contenido |
|---|---|
| `schema_ElDesparche.sql` | Tipos ENUM, 11 tablas, índices y triggers de reglas de negocio |
| `seed.sql` | Datos de prueba básicos (una sola transacción): los que esperan las pruebas del backend y de la base |
| `seed_demo.sql` | Semilla grande de demostración (opcional): se carga después de `seed.sql` y suma países, ciudades, agentes, clientes, eventos y reservas |
| `pruebas_bd.sql` | 88 pruebas de la estructura, el seed y las reglas; no deja cambios (termina en `ROLLBACK`) |
| `../documents/BD/Diagrama_corregido.drawio` | Diagrama entidad-relación (fuente de verdad) |
| `../documents/BD/Avance_El_desparche_PI_2026-2_Corte_2.docx` | Análisis del enunciado, entidades, relaciones, cardinalidades y esquema relacional |
| `../documents/BD/Diccionario_Datos_ElDesparche.txt` | Diccionario de datos, campo por campo |

## Qué se carga y en qué orden

| Orden | Archivo | ¿Cuándo? | Qué deja |
|---|---|---|---|
| 1 | `schema_ElDesparche.sql` | Siempre, sobre una base **vacía** | Tipos, 11 tablas, índices y triggers. Sin datos |
| 2 | `seed.sql` | Siempre (lo usan las pruebas y es la base de la demo) | Colombia con 4 departamentos y 7 ciudades, 7 usuarios, 7 eventos y 5 reservas |
| 3 | `seed_demo.sql` | Opcional: para ver la web con mucho contenido | 8 países, más agentes, clientes, eventos y reservas (ver abajo) |

Después de cada carga no hace falta nada más: los códigos de eventos siguen solos desde el número más alto.
Cada archivo corre en una sola transacción: si algo falla, no queda nada a medias.

Dos formas de dejar la base según lo que necesites:

| Para | Carga | Notas |
|---|---|---|
| Correr las pruebas (`npm test`, `npm run test:bd`) | 1 + 2 | **Sin** `seed_demo.sql`: las pruebas esperan exactamente los datos de `seed.sql` (por ejemplo, 5 reservas) |
| Ver y probar la web | 1 + 2 + 3 | Es lo que carga `encender.bat` cuando la base está vacía |

### Cargar la base (local con Docker)

```bash
docker compose up -d
docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/schema_ElDesparche.sql
docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/seed.sql
docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/seed_demo.sql   # opcional
```

(En PowerShell no existe `<`: usa Git Bash o cmd, o `Get-Content archivo.sql | docker exec -i ... psql ...`.)

### Empezar de cero (borra todo)

El esquema no se puede cargar dos veces sobre la misma base. Para dejarla como nueva hay que vaciar el esquema y volver a cargar:

```bash
docker exec desparche_db_container psql -U postgres -d desparche_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/schema_ElDesparche.sql
docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/seed.sql
docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/seed_demo.sql   # opcional
```

**Pierdes todos los datos.** `seed_demo.sql` tampoco se puede cargar dos veces: choca con lo ya existente.

### Una base aparte para las pruebas

Para no pisar los datos de demostración, las pruebas se pueden correr contra otra base del mismo contenedor, con solo el paso 1 y el 2:

```bash
docker exec desparche_db_container psql -U postgres -c "CREATE DATABASE desparche_prueba"
docker exec -i desparche_db_container psql -U postgres -d desparche_prueba < database/schema_ElDesparche.sql
docker exec -i desparche_db_container psql -U postgres -d desparche_prueba < database/seed.sql
cd backend && DB_NAME=desparche_prueba npm test      # en PowerShell: $env:DB_NAME="desparche_prueba"; npm test
```

### Semilla grande de demostración (`seed_demo.sql`)

Suma datos **sin tocar** los de `seed.sql`:

| Qué | Cuánto |
|---|---|
| Países | 8 en total (Colombia, Perú, México, Argentina, Ecuador, Chile, España y Estados Unidos), con 33 departamentos y 46 ciudades |
| Sitios para eventos | 42 nuevos: 33 en Colombia y 9 en el exterior (la base admite cualquier coordenada del planeta) |
| Personas | 7 agentes (uno suspendido y uno pendiente), 30 clientes (5 del exterior y uno bloqueado) y un administrador |
| Eventos | 61 nuevos (`EVT-2026-0008` a `0068`, 68 en total) en todos los estados, en los 8 países y con las 32 fotos de `frontend/img` |
| Reservas | Unas 280 en total, en los 4 estados; hay un evento casi agotado y otro agotado |

Las fechas de los eventos son relativas al día en que se carga. Las cuentas nuevas usan la misma contraseña
(`Desparche2026!`): `admin2@`, `agente4@` a `agente10@` y `cliente04@` a `cliente33@` `eldesparche.test`.

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

Contraseña de todas: `Desparche2026!`

| Correo | Perfil |
|---|---|
| `admin@eldesparche.test` | ADMIN |
| `cliente1@eldesparche.test`, `cliente2@eldesparche.test` | CLIENTE |
| `agente1@eldesparche.test`, `agente2@eldesparche.test` | AGENTE |
| `agente3@eldesparche.test` | AGENTE pendiente de aprobación |
| `cliente3@eldesparche.test` | CLIENTE bloqueado (no puede entrar) |

El seed también trae un evento `En revisión` (`EVT-2026-0006`) y uno `Rechazado` con su motivo (`EVT-2026-0007`).
Las fechas de los eventos son relativas al día en que se carga el seed (`CURRENT_DATE + días`), así sus eventos están
siempre en el futuro; si la base se cargó hace meses, recárgala para que los eventos vuelvan a estar vigentes.

## Probar las reglas

`pruebas_bd.sql` comprueba en 88 pruebas la estructura, los datos del seed y que cada restricción
y trigger acepte lo válido y rechace lo inválido (herencia, documento, edad mínima, cupo, valor, borrados en
cascada o restringidos, ubicaciones). Corre en una transacción que termina en `ROLLBACK` y no usa `nextval`, así que no
deja cambios. Termina con error si alguna prueba falla. Desde `backend/` (PowerShell, cmd o Git Bash):

```bash
npm run test:bd               # muestra las que fallan y el total
npm run test:bd -- --todas    # además, la tabla con las 88 pruebas
```

`npm run test:bd` no necesita `psql` ni Docker y sirve igual con la base local que con **Neon**: en el servidor del
`backend/.env` crea una base temporal, le carga `schema_ElDesparche.sql` + `seed.sql`, corre las pruebas y la borra (salga
bien o mal), así que no toca tus datos ni le afecta tener `seed_demo.sql` cargado.

Con `psql`, directamente desde la raíz del repo y sobre una base con solo el esquema y el seed (Git Bash o cmd;
PowerShell no admite `<`):

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
