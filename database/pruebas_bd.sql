-- ==================================================================================================================
-- ElDesparche — Pruebas de la base de datos (esquema + seed)
-- Comprueba la estructura, los datos del seed y que las restricciones y triggers acepten lo válido y rechacen lo
-- inválido. Todo corre en UNA transacción que termina en ROLLBACK: no deja cambios en la base donde se ejecuta.
-- Cada prueba corre en su propio bloque (subtransacción), así que una no afecta a la siguiente.
--
-- Uso (desde la raíz del repo, sobre una base con schema_ElDesparche.sql + seed.sql recién cargados):
--   docker exec -i desparche_db_container psql -U postgres -d desparche_db -v ON_ERROR_STOP=1 -q < database/pruebas_bd.sql
-- Termina con error (código distinto de 0) si alguna prueba falla.
-- ==================================================================================================================

\set QUIET on
\pset footer off
-- La salida de cada prueba se descarta; solo se muestra la tabla de resultados del final
\o /dev/null
BEGIN;

CREATE TEMP TABLE resultado (
    n         SERIAL,
    grupo     TEXT,
    prueba    TEXT,
    ok        BOOLEAN,
    detalle   TEXT
);

-- ¿La sentencia se rechaza? Si se da "patron", el mensaje de error debe contenerlo (sin distinguir mayúsculas).
-- Los triggers diferidos (herencia) se fuerzan con SET CONSTRAINTS ALL IMMEDIATE dentro del mismo bloque.
CREATE FUNCTION pg_temp.rechaza(grupo TEXT, prueba TEXT, sentencia TEXT, patron TEXT DEFAULT NULL) RETURNS void AS $$
BEGIN
    BEGIN
        EXECUTE sentencia;
        SET CONSTRAINTS ALL IMMEDIATE;
        RAISE EXCEPTION '__ACEPTADA__';
    EXCEPTION WHEN OTHERS THEN
        SET CONSTRAINTS ALL DEFERRED;
        IF SQLERRM = '__ACEPTADA__' THEN
            INSERT INTO resultado (grupo, prueba, ok, detalle) VALUES (grupo, prueba, FALSE, 'se aceptó y debía rechazarse');
        ELSIF patron IS NOT NULL AND SQLERRM !~* patron THEN
            INSERT INTO resultado (grupo, prueba, ok, detalle) VALUES (grupo, prueba, FALSE, 'rechazada por otro motivo: ' || SQLERRM);
        ELSE
            INSERT INTO resultado (grupo, prueba, ok, detalle) VALUES (grupo, prueba, TRUE, SQLSTATE || ' ' || left(SQLERRM, 90));
        END IF;
    END;
END $$ LANGUAGE plpgsql;

-- ¿La sentencia se acepta? Si se da "verificacion" (una consulta que devuelve un booleano), se evalúa después de la
-- sentencia y debe dar TRUE. Los cambios se deshacen al final del bloque.
CREATE FUNCTION pg_temp.acepta(grupo TEXT, prueba TEXT, sentencia TEXT, verificacion TEXT DEFAULT NULL) RETURNS void AS $$
DECLARE cumple BOOLEAN := TRUE;
BEGIN
    BEGIN
        EXECUTE sentencia;
        SET CONSTRAINTS ALL IMMEDIATE;
        IF verificacion IS NOT NULL THEN
            EXECUTE verificacion INTO cumple;
        END IF;
        RAISE EXCEPTION '__DESHACER__';
    EXCEPTION WHEN OTHERS THEN
        SET CONSTRAINTS ALL DEFERRED;
        IF SQLERRM <> '__DESHACER__' THEN
            INSERT INTO resultado (grupo, prueba, ok, detalle) VALUES (grupo, prueba, FALSE, 'se rechazó: ' || SQLERRM);
        ELSIF NOT COALESCE(cumple, FALSE) THEN
            INSERT INTO resultado (grupo, prueba, ok, detalle) VALUES (grupo, prueba, FALSE, 'se aceptó pero la verificación dio FALSE');
        ELSE
            INSERT INTO resultado (grupo, prueba, ok, detalle) VALUES (grupo, prueba, TRUE, 'ok');
        END IF;
    END;
END $$ LANGUAGE plpgsql;

-- ¿Una consulta devuelve lo esperado? (se comparan como texto)
CREATE FUNCTION pg_temp.igual(grupo TEXT, prueba TEXT, consulta TEXT, esperado TEXT) RETURNS void AS $$
DECLARE obtenido TEXT;
BEGIN
    EXECUTE consulta INTO obtenido;
    INSERT INTO resultado (grupo, prueba, ok, detalle)
    VALUES (grupo, prueba, obtenido IS NOT DISTINCT FROM esperado,
            CASE WHEN obtenido IS NOT DISTINCT FROM esperado THEN obtenido
                 ELSE 'esperado ' || COALESCE(esperado, 'NULL') || ', obtenido ' || COALESCE(obtenido, 'NULL') END);
END $$ LANGUAGE plpgsql;

-- Atajo para insertar un usuario completo (USUARIO + subtipo) en una sola sentencia
CREATE FUNCTION pg_temp.usuario_sql(doc TEXT, tipo TEXT, correo TEXT, subtipo TEXT) RETURNS TEXT AS $$
    SELECT format($f$INSERT INTO USUARIO (numero_identificacion, tipo_identificacion, nombre_completo, correo, contrasena_hash, direccion, id_ciudad)
                    VALUES (%L, %L, 'Usuario de Prueba', %L, 'x', 'Calle 1', 1); %s$f$, doc, tipo, correo, subtipo);
$$ LANGUAGE sql;

-- ==================================================================================================================
-- 1. ESTRUCTURA
-- ==================================================================================================================

SELECT pg_temp.igual('estructura', 'existen las 11 tablas del modelo',
  $$SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN
      ('pais','departamento','ciudad','ubicacion','usuario','usuario_telefono','admin','cliente','agente',
       'evento','reserva')$$, '11');
SELECT pg_temp.igual('estructura', 'USUARIO tiene estado_usuario',
  $$SELECT count(*) FROM information_schema.columns WHERE table_name = 'usuario' AND column_name = 'estado_usuario'$$, '1');
SELECT pg_temp.igual('estructura', 'estados de evento (incluye En revisión y Rechazado)',
  $$SELECT string_agg(e::text, ',' ORDER BY e) FROM unnest(enum_range(NULL::estado_evento_t)) e$$,
  'En revisión,Rechazado,Programado,En Boletería,En Vivo,Finalizado,Cancelado');
SELECT pg_temp.igual('estructura', 'estados de reserva (incluye Usada)',
  $$SELECT string_agg(e::text, ',' ORDER BY e) FROM unnest(enum_range(NULL::estado_reserva_t)) e$$,
  'Reservada,Confirmada,Usada,Cancelada');
SELECT pg_temp.igual('estructura', 'estados de la cuenta',
  $$SELECT string_agg(e::text, ',' ORDER BY e) FROM unnest(enum_range(NULL::estado_usuario_t)) e$$,
  'Activo,Pendiente,Suspendido,Bloqueado');
SELECT pg_temp.igual('estructura', 'existen los 7 triggers de reglas',
  $$SELECT count(DISTINCT tgname) FROM pg_trigger WHERE NOT tgisinternal AND tgname IN
      ('trg_usuario_subtipo','trg_admin_subtipo','trg_cliente_subtipo','trg_agente_subtipo',
       'trg_reserva_reglas','trg_evento_capacidad','trg_usuario_documento')$$, '7');
SELECT pg_temp.igual('estructura', 'existe la secuencia evento_numero_seq',
  $$SELECT count(*) FROM pg_class WHERE relkind = 'S' AND relname = 'evento_numero_seq'$$, '1');
SELECT pg_temp.igual('estructura', 'la base trabaja en hora de Colombia (NOW() no sale 5 horas adelantado)',
  $$SELECT current_setting('TimeZone')$$, 'America/Bogota');

-- ==================================================================================================================
-- 2. DATOS DEL SEED
-- ==================================================================================================================

SELECT pg_temp.igual('seed', '7 usuarios: 1 admin, 3 clientes, 3 agentes',
  $$SELECT (SELECT count(*) FROM USUARIO) || '/' || (SELECT count(*) FROM ADMIN) || '/' ||
           (SELECT count(*) FROM CLIENTE) || '/' || (SELECT count(*) FROM AGENTE)$$, '7/1/3/3');
SELECT pg_temp.igual('seed', 'todo usuario está en exactamente un subtipo',
  $$SELECT count(*) FROM USUARIO u WHERE
      (SELECT count(*) FROM ADMIN a WHERE a.numero_identificacion = u.numero_identificacion) +
      (SELECT count(*) FROM CLIENTE c WHERE c.numero_identificacion = u.numero_identificacion) +
      (SELECT count(*) FROM AGENTE g WHERE g.numero_identificacion = u.numero_identificacion) <> 1$$, '0');
SELECT pg_temp.igual('seed', 'agente3 Pendiente, cliente3 Bloqueado, el resto Activo',
  $$SELECT string_agg(split_part(correo, '@', 1) || '=' || estado_usuario, ',' ORDER BY correo) FROM USUARIO WHERE estado_usuario <> 'Activo'$$,
  'agente3=Pendiente,cliente3=Bloqueado');
SELECT pg_temp.igual('seed', 'las contraseñas son bcrypt de Desparche2026!',
  $$SELECT count(*) FROM USUARIO WHERE contrasena_hash = crypt('Desparche2026!', contrasena_hash)$$, '7');
SELECT pg_temp.igual('seed', '7 eventos por estado',
  $$SELECT string_agg(estado || '=' || n, ',' ORDER BY estado) FROM (SELECT estado, count(*) n FROM EVENTO GROUP BY estado) x$$,
  'En revisión=1,Rechazado=1,Programado=3,En Boletería=1,Cancelado=1');
SELECT pg_temp.igual('seed', 'el evento rechazado guarda su motivo en observaciones',
  $$SELECT observaciones LIKE '%Rechazado por el administrador. Motivo: %' FROM EVENTO WHERE codigo = 'EVT-2026-0007'$$, 'true');
SELECT pg_temp.igual('seed', '5 reservas',
  $$SELECT count(*) FROM RESERVA$$, '5');
SELECT pg_temp.igual('seed', 'valor_total de las reservas (entradas × precio)',
  $$SELECT string_agg(valor_total::bigint::text, ',' ORDER BY id_reserva) FROM RESERVA$$,
  '100000,45000,30000,20000,70000');
-- (se lee la secuencia sin nextval: una secuencia no se deshace con ROLLBACK)
SELECT pg_temp.igual('seed', 'la secuencia de códigos va por delante del código más alto',
  $$SELECT (CASE WHEN is_called THEN last_value + 1 ELSE last_value END)
          > (SELECT MAX(SUBSTRING(codigo FROM '[0-9]+$')::int) FROM EVENTO) FROM evento_numero_seq$$, 'true');
SELECT pg_temp.igual('seed', 'ubicaciones con ciudad',
  $$SELECT count(*) FROM UBICACION u JOIN CIUDAD c USING (id_ciudad)$$, '5');

-- ==================================================================================================================
-- 3. USUARIOS: documento, correo, teléfono, herencia
-- ==================================================================================================================

SELECT pg_temp.acepta('usuarios', 'alta de un cliente completo (USUARIO + CLIENTE)',
  pg_temp.usuario_sql('2000000001', 'CC', 'nuevo@eldesparche.test',
    $$INSERT INTO CLIENTE (numero_identificacion, fecha_nacimiento) VALUES ('2000000001', '2000-01-01')$$),
  $$SELECT estado_usuario = 'Activo' FROM USUARIO WHERE numero_identificacion = '2000000001'$$);
SELECT pg_temp.rechaza('usuarios', 'usuario sin subtipo (herencia total)',
  pg_temp.usuario_sql('2000000002', 'CC', 'sinsubtipo@eldesparche.test', ''), 'no tiene su fila de subtipo');
SELECT pg_temp.rechaza('usuarios', 'usuario en dos subtipos (herencia disjunta)',
  pg_temp.usuario_sql('2000000003', 'CC', 'dos@eldesparche.test',
    $$INSERT INTO CLIENTE (numero_identificacion, fecha_nacimiento) VALUES ('2000000003', '2000-01-01');
      INSERT INTO ADMIN (numero_identificacion, salario, horario) VALUES ('2000000003', 1, 'Mañana')$$), 'más de un subtipo');
SELECT pg_temp.rechaza('usuarios', 'borrar solo el subtipo deja al usuario sin perfil',
  $$DELETE FROM CLIENTE WHERE numero_identificacion = '1000000004'$$, 'no tiene su fila de subtipo');
SELECT pg_temp.rechaza('usuarios', 'documento con puntos (no normalizado)',
  pg_temp.usuario_sql('1.234.567', 'CC', 'puntos@eldesparche.test', ''), 'ck_usuario_documento_normalizado');
SELECT pg_temp.rechaza('usuarios', 'documento en minúsculas',
  pg_temp.usuario_sql('ab12345', 'PAS', 'minus@eldesparche.test', ''), 'ck_usuario_documento_normalizado');
SELECT pg_temp.rechaza('usuarios', 'CC con letras',
  pg_temp.usuario_sql('12345AB', 'CC', 'ccletras@eldesparche.test', ''), 'ck_usuario_documento_formato');
SELECT pg_temp.rechaza('usuarios', 'CC de 5 dígitos (mínimo 6)',
  pg_temp.usuario_sql('12345', 'CC', 'cccorta@eldesparche.test', ''), 'ck_usuario_documento_formato');
SELECT pg_temp.rechaza('usuarios', 'NIT de 8 dígitos (mínimo 9)',
  pg_temp.usuario_sql('90011122', 'NIT', 'nitcorto@eldesparche.test', ''), 'ck_usuario_documento_formato');
SELECT pg_temp.acepta('usuarios', 'pasaporte alfanumérico',
  pg_temp.usuario_sql('AB123456', 'PAS', 'pasaporte@eldesparche.test',
    $$INSERT INTO CLIENTE (numero_identificacion, fecha_nacimiento) VALUES ('AB123456', '1990-05-05')$$));
SELECT pg_temp.rechaza('usuarios', 'documento repetido (aunque cambie el tipo)',
  pg_temp.usuario_sql('1000000002', 'CE', 'otro@eldesparche.test', ''), 'usuario_pkey');
SELECT pg_temp.rechaza('usuarios', 'correo repetido',
  pg_temp.usuario_sql('2000000004', 'CC', 'admin@eldesparche.test', ''), 'correo');
SELECT pg_temp.rechaza('usuarios', 'correo sin @',
  pg_temp.usuario_sql('2000000005', 'CC', 'sin-arroba.test', ''), 'correo');
SELECT pg_temp.rechaza('usuarios', 'nombre vacío',
  $$INSERT INTO USUARIO (numero_identificacion, tipo_identificacion, nombre_completo, correo, contrasena_hash, direccion, id_ciudad)
    VALUES ('2000000006', 'CC', '   ', 'vacio@eldesparche.test', 'x', 'Calle 1', 1)$$, 'nombre_completo');
SELECT pg_temp.rechaza('usuarios', 'ciudad que no existe',
  $$INSERT INTO USUARIO (numero_identificacion, tipo_identificacion, nombre_completo, correo, contrasena_hash, direccion, id_ciudad)
    VALUES ('2000000007', 'CC', 'X', 'ciudad@eldesparche.test', 'x', 'Calle 1', 9999)$$, 'id_ciudad');
SELECT pg_temp.rechaza('usuarios', 'estado de cuenta inválido',
  $$UPDATE USUARIO SET estado_usuario = 'Eliminado' WHERE numero_identificacion = '1000000002'$$, 'estado_usuario_t');
SELECT pg_temp.acepta('usuarios', 'teléfono celular y fijo válidos',
  $$INSERT INTO USUARIO_TELEFONO VALUES ('1000000003', '3009998877'), ('1000000003', '6014567890')$$);
SELECT pg_temp.rechaza('usuarios', 'teléfono de 7 dígitos',
  $$INSERT INTO USUARIO_TELEFONO VALUES ('1000000003', '4567890')$$, 'telefono');
SELECT pg_temp.rechaza('usuarios', 'teléfono repetido para el mismo usuario',
  $$INSERT INTO USUARIO_TELEFONO VALUES ('1000000002', '3105556677')$$, 'usuario_telefono_pkey');

-- Documento inmutable salvo corrección explícita
SELECT pg_temp.rechaza('usuarios', 'cambiar el documento sin la corrección explícita',
  $$UPDATE USUARIO SET numero_identificacion = '1000000099' WHERE numero_identificacion = '1000000002'$$, 'no se puede modificar');
SELECT pg_temp.rechaza('usuarios', 'cambiar el tipo de documento sin la corrección explícita',
  $$UPDATE USUARIO SET tipo_identificacion = 'CE' WHERE numero_identificacion = '1000000002'$$, 'no se puede modificar');
SELECT pg_temp.acepta('usuarios', 'corrección explícita del documento se propaga en cascada',
  $$SET LOCAL app.corregir_documento = 'on';
    UPDATE USUARIO SET numero_identificacion = '1000000099' WHERE numero_identificacion = '1000000002';
    SET LOCAL app.corregir_documento = 'off'$$,
  $$SELECT (SELECT count(*) FROM CLIENTE WHERE numero_identificacion = '1000000099') = 1
       AND (SELECT count(*) FROM RESERVA WHERE numero_identificacion = '1000000099') = 3
       AND (SELECT count(*) FROM USUARIO_TELEFONO WHERE numero_identificacion = '1000000099') = 2$$);

-- ==================================================================================================================
-- 4. CLIENTES Y AGENTES
-- ==================================================================================================================

SELECT pg_temp.rechaza('subtipos', 'cliente con fecha de nacimiento futura',
  $$UPDATE CLIENTE SET fecha_nacimiento = CURRENT_DATE + 1 WHERE numero_identificacion = '1000000002'$$, 'fecha_nacimiento');
SELECT pg_temp.rechaza('subtipos', 'alias repetido',
  $$UPDATE CLIENTE SET alias = 'laura_g' WHERE numero_identificacion = '1000000002'$$, 'alias');
SELECT pg_temp.rechaza('subtipos', 'puntos negativos',
  $$UPDATE CLIENTE SET puntos = -1 WHERE numero_identificacion = '1000000002'$$, 'puntos');
SELECT pg_temp.rechaza('subtipos', 'NIT de agente repetido',
  $$UPDATE AGENTE SET nit = '900333444-5' WHERE numero_identificacion = '900111222'$$, 'nit');
SELECT pg_temp.rechaza('subtipos', 'comisión mayor que 100',
  $$UPDATE AGENTE SET comision = 101 WHERE numero_identificacion = '900111222'$$, 'comision');
SELECT pg_temp.rechaza('subtipos', 'salario negativo',
  $$UPDATE ADMIN SET salario = -1 WHERE numero_identificacion = '1000000001'$$, 'salario');

-- ==================================================================================================================
-- 5. EVENTOS
-- ==================================================================================================================

SELECT pg_temp.acepta('eventos', 'un agente registra un evento En revisión',
  $$INSERT INTO EVENTO (codigo, nombre, categoria, teatro, fecha_hora_inicio, fecha_hora_fin, capacidad_total, estado, precio, id_ubicacion, numero_identificacion)
    VALUES ('EVT-PRUEBA-0001', 'Prueba', 'danza', 'Teatro', '2027-01-01 19:00', '2027-01-01 21:00', 50, 'En revisión', 10000, 1, '900111222')$$,
  $$SELECT EXISTS (SELECT 1 FROM EVENTO WHERE estado = 'En revisión' AND nombre = 'Prueba')$$);
SELECT pg_temp.rechaza('eventos', 'un cliente no puede registrar eventos (solo agentes)',
  $$INSERT INTO EVENTO (codigo, nombre, categoria, teatro, fecha_hora_inicio, fecha_hora_fin, capacidad_total, id_ubicacion, numero_identificacion)
    VALUES ('EVT-PRUEBA', 'Prueba', 'musica', 'Teatro', '2027-01-01 19:00', '2027-01-01 21:00', 10, 1, '1000000002')$$, 'evento_numero_identificacion_fkey');
SELECT pg_temp.rechaza('eventos', 'código de evento repetido',
  $$INSERT INTO EVENTO (codigo, nombre, categoria, teatro, fecha_hora_inicio, fecha_hora_fin, capacidad_total, id_ubicacion, numero_identificacion)
    VALUES ('EVT-2026-0001', 'Prueba', 'musica', 'Teatro', '2027-01-01 19:00', '2027-01-01 21:00', 10, 1, '900111222')$$, 'evento_pkey');
SELECT pg_temp.rechaza('eventos', 'termina antes de empezar',
  $$UPDATE EVENTO SET fecha_hora_fin = fecha_hora_inicio - INTERVAL '1 hour' WHERE codigo = 'EVT-2026-0001'$$, 'check');
SELECT pg_temp.rechaza('eventos', 'categoría que no existe',
  $$UPDATE EVENTO SET categoria = 'deportes' WHERE codigo = 'EVT-2026-0001'$$, 'categoria');
SELECT pg_temp.rechaza('eventos', 'estado que no existe',
  $$UPDATE EVENTO SET estado = 'Pendiente' WHERE codigo = 'EVT-2026-0001'$$, 'estado_evento_t');
SELECT pg_temp.rechaza('eventos', 'capacidad 0',
  $$UPDATE EVENTO SET capacidad_total = 0 WHERE codigo = 'EVT-2026-0006'$$, 'capacidad_total');
SELECT pg_temp.rechaza('eventos', 'precio negativo',
  $$UPDATE EVENTO SET precio = -1 WHERE codigo = 'EVT-2026-0001'$$, 'precio');
SELECT pg_temp.rechaza('eventos', 'capacidad por debajo de lo reservado (2 entradas activas)',
  $$UPDATE EVENTO SET capacidad_total = 1 WHERE codigo = 'EVT-2026-0001'$$, 'menor que las entradas ya reservadas');
SELECT pg_temp.acepta('eventos', 'capacidad igual a lo reservado',
  $$UPDATE EVENTO SET capacidad_total = 2 WHERE codigo = 'EVT-2026-0001'$$);
SELECT pg_temp.acepta('eventos', 'las reservas canceladas no cuentan para la capacidad',
  $$UPDATE EVENTO SET capacidad_total = 1 WHERE codigo = 'EVT-2026-0004'$$);
SELECT pg_temp.acepta('eventos', 'ubicación en otro país (Madrid)',
  $$INSERT INTO UBICACION (direccion, latitud, longitud, id_ciudad) VALUES ('Puerta del Sol', 40.4168, -3.7038, 1)$$);
SELECT pg_temp.rechaza('eventos', 'latitud imposible (fuera de -90 a 90)',
  $$INSERT INTO UBICACION (direccion, latitud, longitud, id_ciudad) VALUES ('Imposible', 95, -3.7, 1)$$, 'check');
SELECT pg_temp.rechaza('eventos', 'longitud imposible (fuera de -180 a 180)',
  $$INSERT INTO UBICACION (direccion, latitud, longitud, id_ciudad) VALUES ('Imposible', 40.4, 190, 1)$$, 'check');
SELECT pg_temp.acepta('eventos', 'aprobar una solicitud: En revisión → Programado',
  $$UPDATE EVENTO SET estado = 'Programado' WHERE codigo = 'EVT-2026-0006'$$);

-- ==================================================================================================================
-- 6. RESERVAS: edad, cupo, valor y estados
-- ==================================================================================================================

-- Las fechas del seed son relativas al día de carga: la edad de cliente2 (1000000003) el día de EVT-2026-0004 se calcula
CREATE TEMP VIEW edad_cliente2 AS
SELECT EXTRACT(YEAR FROM age(e.fecha_hora_inicio::date, c.fecha_nacimiento))::int AS edad
  FROM EVENTO e, CLIENTE c WHERE e.codigo = 'EVT-2026-0004' AND c.numero_identificacion = '1000000003';
SELECT pg_temp.acepta('reservas', 'edad mínima justa (la edad del cliente ese día) se acepta',
  $$UPDATE EVENTO SET edad_minima = (SELECT edad FROM edad_cliente2) WHERE codigo = 'EVT-2026-0004';
    INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento) VALUES (1, '1000000003', 'EVT-2026-0004')$$);
SELECT pg_temp.rechaza('reservas', 'menor que la edad mínima (un año más)',
  $$UPDATE EVENTO SET edad_minima = (SELECT edad + 1 FROM edad_cliente2) WHERE codigo = 'EVT-2026-0004';
    INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento) VALUES (1, '1000000003', 'EVT-2026-0004')$$, 'edad mínima');
SELECT pg_temp.acepta('reservas', 'valor_total lo calcula el trigger',
  $$INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento) VALUES (2, '1000000002', 'EVT-2026-0004')$$,
  $$SELECT valor_total = 40000 FROM RESERVA ORDER BY id_reserva DESC LIMIT 1$$);
SELECT pg_temp.acepta('reservas', 'valor_total correcto enviado a mano',
  $$INSERT INTO RESERVA (numero_entradas, valor_total, numero_identificacion, codigo_evento) VALUES (1, 20000, '1000000002', 'EVT-2026-0004')$$);
SELECT pg_temp.rechaza('reservas', 'valor_total incorrecto',
  $$INSERT INTO RESERVA (numero_entradas, valor_total, numero_identificacion, codigo_evento) VALUES (1, 21000, '1000000002', 'EVT-2026-0004')$$, 'valor_total debe ser');
SELECT pg_temp.acepta('reservas', 'evento gratis: valor_total 0',
  $$UPDATE EVENTO SET precio = 0 WHERE codigo = 'EVT-2026-0004';
    INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento) VALUES (3, '1000000002', 'EVT-2026-0004')$$,
  $$SELECT valor_total = 0 FROM RESERVA ORDER BY id_reserva DESC LIMIT 1$$);
SELECT pg_temp.rechaza('reservas', 'supera la capacidad (1000 de 100)',
  $$INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento) VALUES (1000, '1000000002', 'EVT-2026-0004')$$, 'no tiene cupo');
SELECT pg_temp.acepta('reservas', 'llena exactamente la capacidad (100; la cancelada no cuenta)',
  $$INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento) VALUES (100, '1000000002', 'EVT-2026-0004')$$);
SELECT pg_temp.rechaza('reservas', 'reactivar una cancelada sin cupo',
  $$UPDATE EVENTO SET capacidad_total = 2 WHERE codigo = 'EVT-2026-0004';
    INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento) VALUES (2, '1000000003', 'EVT-2026-0004');
    UPDATE RESERVA SET estado = 'Confirmada' WHERE id_reserva = 4$$, 'no tiene cupo');
SELECT pg_temp.acepta('reservas', 'cambiar entradas conserva el precio con que se reservó',
  $$UPDATE EVENTO SET precio = 99999 WHERE codigo = 'EVT-2026-0001';
    UPDATE RESERVA SET numero_entradas = 3 WHERE id_reserva = 1$$,
  $$SELECT valor_total = 150000 FROM RESERVA WHERE id_reserva = 1$$);
SELECT pg_temp.acepta('reservas', 'marcar una entrada como Usada',
  $$UPDATE RESERVA SET estado = 'Usada' WHERE id_reserva = 1$$);
SELECT pg_temp.rechaza('reservas', '0 entradas',
  $$INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento) VALUES (0, '1000000002', 'EVT-2026-0004')$$, 'numero_entradas');
SELECT pg_temp.rechaza('reservas', 'un agente no puede reservar (solo clientes)',
  $$INSERT INTO RESERVA (numero_entradas, numero_identificacion, codigo_evento) VALUES (1, '900111222', 'EVT-2026-0004')$$, 'reserva_numero_identificacion_fkey');
SELECT pg_temp.igual('reservas', 'cada reserva tiene un código QR único',
  $$SELECT count(DISTINCT codigo_qr) = count(*) FROM RESERVA$$, 'true');

-- ==================================================================================================================
-- 7. BORRADOS: RESTRICT y CASCADE
-- ==================================================================================================================

SELECT pg_temp.acepta('borrados', 'borrar una reserva',
  $$DELETE FROM RESERVA WHERE id_reserva = 2$$);
SELECT pg_temp.rechaza('borrados', 'borrar un agente que tiene eventos',
  $$DELETE FROM USUARIO WHERE numero_identificacion = '900111222'$$, 'evento_numero_identificacion_fkey');
SELECT pg_temp.acepta('borrados', 'borrar un agente sin eventos (agente3: usuario, agente y teléfonos)',
  $$DELETE FROM USUARIO WHERE numero_identificacion = '900555666'$$,
  $$SELECT NOT EXISTS (SELECT 1 FROM AGENTE WHERE numero_identificacion = '900555666')
       AND NOT EXISTS (SELECT 1 FROM USUARIO_TELEFONO WHERE numero_identificacion = '900555666')$$);
SELECT pg_temp.acepta('borrados', 'borrar un cliente con reservas borra sus reservas',
  $$DELETE FROM USUARIO WHERE numero_identificacion = '1000000002'$$,
  $$SELECT NOT EXISTS (SELECT 1 FROM RESERVA WHERE numero_identificacion = '1000000002')$$);
SELECT pg_temp.acepta('borrados', 'borrar un cliente sin reservas',
  $$DELETE FROM USUARIO WHERE numero_identificacion = '1000000004'$$);
SELECT pg_temp.acepta('borrados', 'borrar un evento borra sus reservas',
  $$DELETE FROM EVENTO WHERE codigo = 'EVT-2026-0004'$$,
  $$SELECT NOT EXISTS (SELECT 1 FROM RESERVA WHERE codigo_evento = 'EVT-2026-0004')$$);
SELECT pg_temp.rechaza('borrados', 'borrar una ciudad que usan personas o ubicaciones',
  $$DELETE FROM CIUDAD WHERE id_ciudad = 1$$, 'ciudad');
SELECT pg_temp.rechaza('borrados', 'borrar un país con departamentos',
  $$DELETE FROM PAIS WHERE id_pais = 1$$, 'departamento');
SELECT pg_temp.acepta('borrados', 'borrar una ciudad sin uso (Soacha)',
  $$DELETE FROM CIUDAD WHERE nombre = 'Soacha'$$);

-- ==================================================================================================================
-- 8. UBICACIONES (nombres únicos en su nivel)
-- ==================================================================================================================

SELECT pg_temp.rechaza('ubicaciones', 'país repetido',
  $$INSERT INTO PAIS (nombre) VALUES ('Colombia')$$, 'pais_nombre_key');
SELECT pg_temp.rechaza('ubicaciones', 'ciudad repetida en el mismo departamento',
  $$INSERT INTO CIUDAD (nombre, id_departamento) VALUES ('Cali', 1)$$, 'ciudad_id_departamento_nombre_key');
SELECT pg_temp.acepta('ubicaciones', 'mismo nombre de ciudad en otro departamento',
  $$INSERT INTO CIUDAD (nombre, id_departamento) VALUES ('Cali', 2)$$);
SELECT pg_temp.rechaza('ubicaciones', 'departamento de un país que no existe',
  $$INSERT INTO DEPARTAMENTO (nombre, id_pais) VALUES ('Nuevo', 999)$$, 'departamento_id_pais_fkey');

-- ==================================================================================================================
-- RESULTADOS
-- ==================================================================================================================

\o
\echo
\echo '================================ PRUEBAS DE LA BASE DE DATOS ================================'
SELECT n AS "#", grupo AS "Grupo", prueba AS "Prueba", CASE WHEN ok THEN 'OK' ELSE 'FALLA' END AS "Resultado",
       left(detalle, 70) AS "Detalle"
  FROM resultado ORDER BY n;

SELECT count(*) FILTER (WHERE ok) AS "Pasaron", count(*) FILTER (WHERE NOT ok) AS "Fallaron", count(*) AS "Total"
  FROM resultado;

-- Si algo falló, termina con error para que el código de salida lo indique
DO $$
DECLARE fallas INTEGER;
BEGIN
    SELECT count(*) INTO fallas FROM resultado WHERE NOT ok;
    IF fallas > 0 THEN
        RAISE EXCEPTION '% prueba(s) de la base de datos fallaron', fallas;
    END IF;
END $$;

ROLLBACK;
