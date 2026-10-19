# Base de datos de ElDesparche

PostgreSQL 13+ · 13 tablas · 3FN. Alineada con el avance del corte 2 (`Avance_El_desparche_PI_2026-2_Corte_2.docx`).

| Archivo | Contenido |
|---|---|
| `schema_ElDesparche.sql` | Tipos ENUM, 13 tablas, índices y triggers de reglas de negocio |
| `seed.sql` | Datos de prueba (una sola transacción) |
| `../documents/BD/Diagrama_v2.drawio` | Diagrama entidad-relación (fuente de verdad) |
| `../documents/BD/Modelo_Relacional_3FN_Diagrama_v2.docx` | Modelo relacional y normalización 1FN/2FN/3FN |
| `../documents/BD/Diccionario_Datos_ElDesparche.txt` | Diccionario de datos, campo por campo |
| `../documents/BD/modelo_ER_v2.md` | Diagrama ER en Mermaid |

## Cargar la base (local con Docker)

Sobre una base **vacía**; el esquema primero y el seed después:

```bash
docker compose up -d
docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/schema_ElDesparche.sql
docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/seed.sql
```

Para Neon (PostgreSQL en la nube) ver `GUIA_NEON.md` en la raíz.

## Tablas

| Grupo | Tablas |
|---|---|
| Geografía | `PAIS`, `DEPARTAMENTO`, `CIUDAD`, `UBICACION` |
| Usuarios | `USUARIO` (supertipo) → `ADMIN`, `CLIENTE`, `AGENTE`; `TELEFONO_USUARIO` |
| Eventos y ventas | `EVENTO`, `RESERVA`, `METODO_PAGO`, `PAGO` |

## Decisiones del diseño

- **PK de `USUARIO`:** `numero_identificacion`, blindada: número normalizado (mayúsculas y dígitos), formato válido según el tipo de documento, no editable salvo corrección explícita y `ON UPDATE CASCADE` en las FK. Un mismo número no puede registrarse dos veces aunque cambie el tipo.
- **Herencia total y disjunta:** cada subtipo lleva `tipo_usuario` fijo por CHECK y una FK compuesta hacia `USUARIO`; un trigger diferido exige que todo usuario tenga su fila de subtipo.
- **Cancelaciones:** la causa se guarda en `observaciones` de `EVENTO` o `RESERVA`, con el formato que escribe la web: `Cancelada por el cliente. Causa: No puede asistir. Detalle: ...`.
- **Teatro:** `EVENTO.teatro` es el teatro o sitio del evento; la dirección exacta está en `UBICACION`.
- **Derivado no almacenado:** `edad` (de `fecha_nacimiento`).
- **Ciudad del evento:** no se guarda en `EVENTO`; se obtiene por `UBICACION → CIUDAD → DEPARTAMENTO → PAIS`.

## Reglas que hace cumplir la base (triggers)

- Todo `USUARIO` tiene su fila en `ADMIN`, `CLIENTE` o `AGENTE` (se valida al COMMIT).
- Para reservar: el cliente debe cumplir la edad mínima del evento y tiene que haber cupo.
- `RESERVA.valor_total` = `numero_entradas` × precio del evento vigente al reservar + tarifa de Wompi (`fn_tarifa_wompi`: 2,65 % + $700, más IVA; una vez por pago y 0 si el evento es gratis). Es la misma cuenta que `tarifaWompi()` de la web.
- El método de pago de un `PAGO` pertenece al cliente de la reserva.
- `capacidad_total` no puede bajar de las entradas ya reservadas.
- No se borra el subtipo dejando la fila de `USUARIO`.
- El documento de identidad no se edita; para corregirlo: `BEGIN; SET LOCAL app.corregir_documento = 'on'; UPDATE USUARIO SET numero_identificacion = '...' WHERE ...; COMMIT;`

## Cuentas del seed

Contraseña de todas: `Desparche2026!`

| Correo | Perfil |
|---|---|
| `admin@eldesparche.test` | ADMIN |
| `cliente1@eldesparche.test`, `cliente2@eldesparche.test` | CLIENTE |
| `agente1@eldesparche.test`, `agente2@eldesparche.test` | AGENTE |

## Probar las reglas

Algunos ejemplos que la base debe rechazar:

```sql
-- cliente menor de la edad mínima (cliente2 nació en 1998, pero se prueba con un evento para mayores de 30)
UPDATE EVENTO SET edad_minima = 30 WHERE codigo = 'EVT-2026-0004';
INSERT INTO RESERVA (numero_entradas, id_cliente, codigo_evento) VALUES (1, '1000000003', 'EVT-2026-0004');
-- valor_total que no es entradas × precio + tarifa de Wompi
INSERT INTO RESERVA (numero_entradas, valor_total, id_cliente, codigo_evento) VALUES (1, 20000, '1000000002', 'EVT-2026-0004');
-- reserva que supera la capacidad
INSERT INTO RESERVA (numero_entradas, id_cliente, codigo_evento) VALUES (1000, '1000000002', 'EVT-2026-0004');
-- pago con el método de pago de otro cliente
INSERT INTO PAGO (monto, referencia_transaccion, id_reserva, id_metodo) VALUES (10000, 'TX-PRUEBA', 1, 2);
```
