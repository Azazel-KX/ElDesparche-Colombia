# Base de datos de ElDesparche

PostgreSQL 13+ · 18 tablas · 3FN. Todo sale de `documents/BD/Diagrama_v2.drawio`.

| Archivo | Contenido |
|---|---|
| `schema_ElDesparche.sql` | Tipos ENUM, 18 tablas, índices y triggers de reglas de negocio |
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
| Usuarios | `USUARIO` (supertipo) → `ADMIN`, `CLIENTE`, `AGENTE`; `TELEFONO_USUARIO`, `SESION_ADMIN` |
| Verificación | `VERIFICACION`, `VERIF_CONTACTO` |
| Eventos y ventas | `CAUSA_CANCELACION`, `EVENTO`, `RESERVA`, `METODO_PAGO`, `PAGO`, `CONEXION_SOCIAL` |

## Decisiones del diseño

- **PK de `USUARIO`:** `numero_identificacion`, blindada: número normalizado (mayúsculas y dígitos), formato válido según el tipo de documento, no editable salvo corrección explícita y `ON UPDATE CASCADE` en las FK. Un mismo número no puede registrarse dos veces aunque cambie el tipo.
- **Herencia total y disjunta:** cada subtipo lleva `tipo_usuario` fijo por CHECK y una FK compuesta hacia `USUARIO`; un trigger diferido exige que todo usuario tenga su fila de subtipo.
- **Cancelaciones:** `CAUSA_CANCELACION` es un catálogo; `EVENTO` y `RESERVA` guardan `id_causa`, que es obligatorio solo cuando el estado es Cancelado/Cancelada.
- **Derivados no almacenados:** `edad` (de `fecha_nacimiento`) y `tiempo_en_pantalla` (de las dos fechas de la sesión).
- **Ciudad del evento:** no se guarda en `EVENTO`; se obtiene por `UBICACION → CIUDAD → DEPARTAMENTO → PAIS`.

## Reglas que hace cumplir la base (triggers)

- Todo `USUARIO` tiene su fila en `ADMIN`, `CLIENTE` o `AGENTE` (se valida al COMMIT).
- Toda verificación de contacto tiene su detalle en `VERIF_CONTACTO`.
- Para reservar: el cliente necesita verificación de contacto Aprobada, cumplir la edad mínima del evento y que haya cupo.
- `RESERVA.valor_total` = `numero_entradas` × precio del evento vigente al reservar.
- La causa de cancelación debe aplicar al tipo (`EVENTO`, `RESERVA` o `AMBOS`).
- El método de pago de un `PAGO` pertenece al cliente de la reserva.
- `capacidad_total` no puede bajar de las entradas ya reservadas.
- No se borra el subtipo ni el detalle de verificación dejando la fila principal.
- El documento de identidad no se edita; para corregirlo: `BEGIN; SET LOCAL app.corregir_documento = 'on'; UPDATE USUARIO SET numero_identificacion = '...' WHERE ...; COMMIT;`

## Cuentas del seed

Contraseña de todas: `Desparche2026!`

| Correo | Perfil |
|---|---|
| `admin@eldesparche.test` | ADMIN |
| `cliente1@eldesparche.test`, `cliente2@eldesparche.test` | CLIENTE (verificación de contacto aprobada) |
| `agente1@eldesparche.test`, `agente2@eldesparche.test` | AGENTE |

## Probar las reglas

Algunos ejemplos que la base debe rechazar:

```sql
-- evento cancelado sin causa
UPDATE EVENTO SET estado = 'Cancelado' WHERE codigo = 'EVT-2026-0001';
-- reserva que supera la capacidad
INSERT INTO RESERVA (numero_entradas, id_cliente, codigo_evento) VALUES (1000, '1000000002', 'EVT-2026-0004');
-- pago con el método de pago de otro cliente
INSERT INTO PAGO (monto, referencia_transaccion, id_reserva, id_metodo) VALUES (10000, 'TX-PRUEBA', 1, 2);
```
