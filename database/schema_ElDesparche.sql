-- ==================================================================================================================
-- ElDesparche — Esquema PostgreSQL (generado desde documents/BD/Diagrama_corregido.drawio)
-- Motor: PostgreSQL 13+   ·   Proyecto Integrador 2026-2   ·   13 tablas, 3FN
-- Alineado con el avance del corte 2 (documents/BD/Avance_El_desparche_PI_2026-2_Corte_2.docx)
-- Diccionario de datos: documents/BD/Diccionario_Datos_ElDesparche.txt
--
-- Ejecutar sobre una base vacía. Las tablas se crean en orden de dependencia.
-- ==================================================================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid(), crypt() para el seed

-- Zona horaria: las columnas son TIMESTAMP sin zona y guardan la hora de Colombia (así las escribe la web). Si el
-- servidor está en UTC (Docker, Neon), NOW() y CURRENT_DATE darían la hora de Londres: las fechas automáticas saldrían
-- 5 horas adelantadas y un evento se daría por terminado 5 horas antes. Vale para las conexiones nuevas (el seed y
-- psql); el backend además la fija en cada conexión (backend/src/config/db.js).
DO $$
BEGIN
    EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'America/Bogota');
EXCEPTION WHEN insufficient_privilege THEN
    RAISE WARNING 'Sin permiso para fijar la zona horaria de la base; el backend la fija en cada conexión.';
END $$;
SET timezone TO 'America/Bogota';   -- y para el resto de esta carga

-- ==================================================================================================================
-- TIPOS ENUMERADOS (opciones fijas que define el sistema)
-- ==================================================================================================================

CREATE TYPE tipo_identificacion_t  AS ENUM ('CC', 'CE', 'PAS', 'PPT', 'NIT');
CREATE TYPE jornada_t              AS ENUM ('Mañana', 'Tarde', 'Noche', 'Completa');
-- Estado de la cuenta: un agente nuevo queda Pendiente hasta que un administrador lo aprueba; Suspendido (agentes)
-- y Bloqueado (clientes) impiden iniciar sesión. El motivo, si lo hay, no se guarda aquí.
CREATE TYPE estado_usuario_t       AS ENUM ('Activo', 'Pendiente', 'Suspendido', 'Bloqueado');
-- En revisión / Rechazado: el evento lo registró un agente y todavía no lo aprueba un administrador. Al aprobarlo
-- pasa a Programado. El motivo del rechazo (y la causa de una cancelación) van en EVENTO.observaciones.
CREATE TYPE estado_evento_t        AS ENUM ('En revisión', 'Rechazado', 'Programado', 'En Boletería', 'En Vivo', 'Finalizado', 'Cancelado');
-- Usada: la entrada ya se validó en la puerta del evento. La causa de una cancelación va en RESERVA.observaciones.
CREATE TYPE estado_reserva_t       AS ENUM ('Reservada', 'Confirmada', 'Usada', 'Cancelada');
CREATE TYPE tipo_metodo_pago_t     AS ENUM ('Tarjeta crédito', 'Tarjeta débito', 'Transferencia bancaria', 'Billetera digital');
CREATE TYPE estado_pago_t          AS ENUM ('Pendiente', 'Aprobado', 'Rechazado');

-- ==================================================================================================================
-- GEOGRAFÍA  (Enunciado: País → Departamento → Ciudad)
-- ==================================================================================================================

CREATE TABLE PAIS (
    id_pais SERIAL PRIMARY KEY,
    nombre  VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE DEPARTAMENTO (
    id_departamento SERIAL PRIMARY KEY,
    nombre          VARCHAR(60) NOT NULL,
    id_pais         INTEGER NOT NULL REFERENCES PAIS(id_pais) ON DELETE RESTRICT,
    UNIQUE (id_pais, nombre)
);

CREATE TABLE CIUDAD (
    id_ciudad       SERIAL PRIMARY KEY,
    nombre          VARCHAR(80) NOT NULL,
    id_departamento INTEGER NOT NULL REFERENCES DEPARTAMENTO(id_departamento) ON DELETE RESTRICT,
    UNIQUE (id_departamento, nombre)
);

CREATE TABLE UBICACION (
    id_ubicacion SERIAL PRIMARY KEY,
    direccion    VARCHAR(200) NOT NULL,
    latitud      NUMERIC(9,6) NOT NULL CHECK (latitud  BETWEEN -4.3  AND 13.6),
    longitud     NUMERIC(9,6) NOT NULL CHECK (longitud BETWEEN -82.0 AND -66.8),
    id_ciudad    INTEGER NOT NULL REFERENCES CIUDAD(id_ciudad) ON DELETE RESTRICT
);

-- ==================================================================================================================
-- USUARIOS  (supertipo) y subtipos ADMIN / CLIENTE / AGENTE  (IS-A total y disjunta)
-- No hay columna tipo_usuario: el perfil lo define en qué subtipo está la fila (ver triggers 1 y 5).
-- ==================================================================================================================

CREATE TABLE USUARIO (
    numero_identificacion VARCHAR(20) PRIMARY KEY
                          CONSTRAINT ck_usuario_documento_normalizado CHECK (numero_identificacion ~ '^[A-Z0-9]+$'),   -- normalizado: sin puntos, guiones, espacios ni minúsculas
    tipo_identificacion   tipo_identificacion_t NOT NULL,
    nombre_completo       VARCHAR(200) NOT NULL CHECK (length(btrim(nombre_completo)) > 0),
    correo                VARCHAR(100) NOT NULL UNIQUE
                          CHECK (correo ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
    contrasena_hash       VARCHAR(255) NOT NULL,
    direccion             VARCHAR(200) NOT NULL,
    fecha_registro        TIMESTAMP NOT NULL DEFAULT NOW(),
    estado_usuario        estado_usuario_t NOT NULL DEFAULT 'Activo',   -- suspensión o bloqueo de la cuenta
    id_ciudad             INTEGER NOT NULL REFERENCES CIUDAD(id_ciudad) ON DELETE RESTRICT,   -- ciudad de residencia (UbiPer)
    -- Formato según el tipo de documento (la PK no incluye el tipo, así que el número debe ser válido para su tipo).
    -- Solo se juzga un número ya normalizado: si tiene puntos o minúsculas, lo rechaza ck_usuario_documento_normalizado
    -- (sin esa condición fallaban las dos y PostgreSQL informaba esta, con un mensaje que no explica el problema).
    CONSTRAINT ck_usuario_documento_formato CHECK (numero_identificacion !~ '^[A-Z0-9]+$' OR CASE tipo_identificacion
               WHEN 'CC'  THEN numero_identificacion ~ '^[0-9]{6,10}$'
               WHEN 'CE'  THEN numero_identificacion ~ '^[0-9]{4,10}$'
               WHEN 'PPT' THEN numero_identificacion ~ '^[0-9]{5,10}$'
               WHEN 'NIT' THEN numero_identificacion ~ '^[0-9]{9,10}$'      -- sin dígito de verificación
               WHEN 'PAS' THEN numero_identificacion ~ '^[A-Z0-9]{5,15}$'
           END)
);

CREATE INDEX idx_usuario_ciudad ON USUARIO(id_ciudad);

-- Atributo multivalorado telefono: un usuario puede tener varios teléfonos
CREATE TABLE USUARIO_TELEFONO (
    numero_identificacion VARCHAR(20) NOT NULL REFERENCES USUARIO(numero_identificacion) ON UPDATE CASCADE ON DELETE CASCADE,
    telefono              VARCHAR(10) NOT NULL CHECK (telefono ~ '^(3[0-9]{9}|60[0-9]{8})$'),
    PRIMARY KEY (numero_identificacion, telefono)
);

-- Subtipos: la PK es la misma de USUARIO y además es FK (generalización IS-A)
CREATE TABLE ADMIN (
    numero_identificacion VARCHAR(20) PRIMARY KEY
                          REFERENCES USUARIO(numero_identificacion) ON UPDATE CASCADE ON DELETE CASCADE,
    salario               NUMERIC(12,2) NOT NULL CHECK (salario >= 0),
    horario               jornada_t NOT NULL
);

CREATE TABLE CLIENTE (
    numero_identificacion VARCHAR(20) PRIMARY KEY
                          REFERENCES USUARIO(numero_identificacion) ON UPDATE CASCADE ON DELETE CASCADE,
    fecha_nacimiento      DATE NOT NULL CHECK (fecha_nacimiento <= CURRENT_DATE),   -- edad se deriva, no se guarda
    foto_perfil           VARCHAR(255),
    alias                 VARCHAR(40) UNIQUE,
    puntos                INTEGER NOT NULL DEFAULT 0 CHECK (puntos >= 0),
    publicidad            BOOLEAN NOT NULL DEFAULT TRUE                             -- visualización de publicidad
);

CREATE TABLE AGENTE (
    numero_identificacion VARCHAR(20) PRIMARY KEY
                          REFERENCES USUARIO(numero_identificacion) ON UPDATE CASCADE ON DELETE CASCADE,
    nit                   VARCHAR(20)  NOT NULL UNIQUE,    -- clave candidata: razon_social y demás dependen de la PK
    razon_social          VARCHAR(150) NOT NULL,
    nombre_comercial      VARCHAR(150),
    descripcion           TEXT,
    logo_url              VARCHAR(255),
    comision              NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (comision BETWEEN 0 AND 100),
    experiencia           SMALLINT NOT NULL DEFAULT 0 CHECK (experiencia >= 0)     -- años
);

-- ==================================================================================================================
-- EVENTOS  (Enunciado, punto 6; ciudad de realización = UBICACION → CIUDAD)
-- La causa de una cancelación (o el motivo de un rechazo) se agrega a observaciones, en una línea nueva, con el formato
-- "Cancelado por <quién>. Causa: <causa>. Detalle: <detalle>" (lo escribe la web).
-- ==================================================================================================================

CREATE TABLE EVENTO (
    codigo                VARCHAR(20) PRIMARY KEY,
    nombre                VARCHAR(150) NOT NULL,
    descripcion           TEXT,
    categoria             VARCHAR(40) NOT NULL
                          CHECK (categoria IN ('musica', 'teatro', 'danza', 'circo', 'comedia')),
    url_imagen            VARCHAR(255),
    teatro                VARCHAR(150) NOT NULL,                    -- teatro o sitio donde se hace el evento
    fecha_hora_inicio     TIMESTAMP NOT NULL,
    fecha_hora_fin        TIMESTAMP NOT NULL,                       -- fecha y hora estimada de finalización
    capacidad_total       INTEGER NOT NULL CHECK (capacidad_total > 0),
    edad_minima           SMALLINT NOT NULL DEFAULT 0 CHECK (edad_minima >= 0),
    observaciones         TEXT,
    estado                estado_evento_t NOT NULL DEFAULT 'Programado',
    fecha_creacion        TIMESTAMP NOT NULL DEFAULT NOW(),
    precio                NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),   -- precio base de la entrada
    id_ubicacion          INTEGER NOT NULL REFERENCES UBICACION(id_ubicacion) ON DELETE RESTRICT,                               -- UbiEve
    numero_identificacion VARCHAR(20) NOT NULL REFERENCES AGENTE(numero_identificacion) ON UPDATE CASCADE ON DELETE RESTRICT,   -- Registra: agente que registra el evento
    CHECK (fecha_hora_fin > fecha_hora_inicio)
);

-- Número del código de un evento (EVT-AAAA-NNNN). Lo pide el backend con nextval al registrar un evento.
-- Una secuencia nunca entrega el mismo número dos veces, así que el código de un evento borrado no se vuelve a usar
-- (calcularlo como "el último + 1" repetía el del último evento si se borraba).
CREATE SEQUENCE evento_numero_seq;

CREATE INDEX idx_evento_estado    ON EVENTO(estado);
CREATE INDEX idx_evento_inicio    ON EVENTO(fecha_hora_inicio);
CREATE INDEX idx_evento_agente    ON EVENTO(numero_identificacion);
CREATE INDEX idx_evento_ubicacion ON EVENTO(id_ubicacion);

-- ==================================================================================================================
-- RESERVAS, MÉTODOS DE PAGO Y PAGOS
-- ==================================================================================================================

CREATE TABLE RESERVA (
    id_reserva            SERIAL PRIMARY KEY,
    codigo_qr             UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    valor_total           NUMERIC(12,2) NOT NULL CHECK (valor_total >= 0),   -- entradas × precio (el trigger la calcula si llega NULL)
    fecha_hora            TIMESTAMP NOT NULL DEFAULT NOW(),
    estado                estado_reserva_t NOT NULL DEFAULT 'Reservada',
    numero_entradas       INTEGER NOT NULL CHECK (numero_entradas > 0),
    observaciones         TEXT,
    numero_identificacion VARCHAR(20) NOT NULL REFERENCES CLIENTE(numero_identificacion) ON UPDATE CASCADE ON DELETE CASCADE,   -- Inscribe: cliente que reserva
    codigo_evento         VARCHAR(20) NOT NULL REFERENCES EVENTO(codigo) ON DELETE CASCADE                                      -- Ofrece
);

CREATE INDEX idx_reserva_cliente ON RESERVA(numero_identificacion);
CREATE INDEX idx_reserva_evento  ON RESERVA(codigo_evento);
CREATE INDEX idx_reserva_estado  ON RESERVA(estado);
CREATE INDEX idx_reserva_fecha   ON RESERVA(fecha_hora);

CREATE TABLE METODO_PAGO (
    id_metodo             SERIAL PRIMARY KEY,
    tipo                  tipo_metodo_pago_t NOT NULL,
    proveedor             VARCHAR(60) NOT NULL,
    referencia_visible    VARCHAR(4) CHECK (referencia_visible ~ '^[0-9]{4}$'),   -- últimos 4 dígitos
    token_pasarela        VARCHAR(255) NOT NULL,
    activo                BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro        TIMESTAMP NOT NULL DEFAULT NOW(),
    numero_identificacion VARCHAR(20) NOT NULL REFERENCES CLIENTE(numero_identificacion) ON UPDATE CASCADE ON DELETE CASCADE   -- Registra: cliente dueño
);

CREATE TABLE PAGO (
    id_pago                SERIAL PRIMARY KEY,
    monto                  NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    fecha_hora             TIMESTAMP NOT NULL DEFAULT NOW(),
    referencia_transaccion VARCHAR(80) NOT NULL UNIQUE,
    estado                 estado_pago_t NOT NULL DEFAULT 'Pendiente',
    id_reserva             INTEGER NOT NULL REFERENCES RESERVA(id_reserva) ON DELETE RESTRICT,       -- Genera
    id_metodo              INTEGER NOT NULL REFERENCES METODO_PAGO(id_metodo) ON DELETE RESTRICT     -- Utiliza
);

CREATE INDEX idx_pago_reserva ON PAGO(id_reserva);

-- ==================================================================================================================
-- TRIGGERS: reglas del diagrama que no son DF ni CHECK de una sola fila
-- ==================================================================================================================

-- 1. Herencia total y disjunta: todo USUARIO está en exactamente una de ADMIN, CLIENTE o AGENTE.
--    Se valida al COMMIT: el usuario y su fila de subtipo se insertan en la misma transacción
--    (primero USUARIO, porque el subtipo lo referencia por FK).
--    Cubre tres casos: usuario sin subtipo, usuario en dos subtipos y subtipo borrado dejando al usuario.
--    Si el USUARIO ya no existe (borrado en cascada) no hay nada que comprobar.
CREATE OR REPLACE FUNCTION fn_usuario_un_subtipo() RETURNS trigger AS $$
DECLARE
    doc VARCHAR(20) := CASE WHEN TG_OP = 'DELETE' THEN OLD.numero_identificacion ELSE NEW.numero_identificacion END;
    n   INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM USUARIO WHERE numero_identificacion = doc) THEN
        RETURN NULL;
    END IF;
    SELECT (SELECT COUNT(*) FROM ADMIN   WHERE numero_identificacion = doc)
         + (SELECT COUNT(*) FROM CLIENTE WHERE numero_identificacion = doc)
         + (SELECT COUNT(*) FROM AGENTE  WHERE numero_identificacion = doc) INTO n;
    IF n = 0 THEN
        RAISE EXCEPTION 'El usuario % no tiene su fila de subtipo (ADMIN, CLIENTE o AGENTE)', doc;
    ELSIF n > 1 THEN
        RAISE EXCEPTION 'El usuario % está en más de un subtipo (la herencia es disjunta)', doc;
    END IF;
    RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_usuario_subtipo
    AFTER INSERT ON USUARIO
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fn_usuario_un_subtipo();
CREATE CONSTRAINT TRIGGER trg_admin_subtipo
    AFTER INSERT OR DELETE ON ADMIN
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fn_usuario_un_subtipo();
CREATE CONSTRAINT TRIGGER trg_cliente_subtipo
    AFTER INSERT OR DELETE ON CLIENTE
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fn_usuario_un_subtipo();
CREATE CONSTRAINT TRIGGER trg_agente_subtipo
    AFTER INSERT OR DELETE ON AGENTE
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fn_usuario_un_subtipo();

-- 2. Reglas de la reserva: edad mínima, cupo y valor_total = entradas × precio
CREATE OR REPLACE FUNCTION fn_reserva_reglas() RETURNS trigger AS $$
DECLARE
    ev EVENTO%ROWTYPE;
    nacimiento DATE;
    ocupadas INTEGER;
    precio_unitario NUMERIC;
BEGIN
    -- Bloquea el evento para que dos reservas simultáneas no superen la capacidad
    SELECT * INTO ev FROM EVENTO WHERE codigo = NEW.codigo_evento FOR UPDATE;

    IF TG_OP = 'INSERT' THEN
        SELECT fecha_nacimiento INTO nacimiento FROM CLIENTE WHERE numero_identificacion = NEW.numero_identificacion;
        IF EXTRACT(YEAR FROM age(ev.fecha_hora_inicio::date, nacimiento)) < ev.edad_minima THEN
            RAISE EXCEPTION 'El cliente no cumple la edad mínima (%) del evento %', ev.edad_minima, ev.codigo;
        END IF;

        IF NEW.valor_total IS NULL THEN                               -- precio vigente al reservar
            NEW.valor_total := NEW.numero_entradas * ev.precio;
        ELSIF NEW.valor_total <> NEW.numero_entradas * ev.precio THEN
            RAISE EXCEPTION 'valor_total debe ser numero_entradas × precio del evento';
        END IF;
    END IF;

    -- Si cambia el número de entradas, se conserva el precio unitario con que se reservó.
    IF TG_OP = 'UPDATE' AND NEW.numero_entradas <> OLD.numero_entradas
       AND NEW.valor_total = OLD.valor_total THEN
        precio_unitario := OLD.valor_total / OLD.numero_entradas;
        NEW.valor_total := NEW.numero_entradas * precio_unitario;
    END IF;

    IF NEW.estado <> 'Cancelada' THEN
        SELECT COALESCE(SUM(numero_entradas), 0) INTO ocupadas
          FROM RESERVA
         WHERE codigo_evento = NEW.codigo_evento
           AND estado <> 'Cancelada'
           AND (TG_OP = 'INSERT' OR id_reserva <> NEW.id_reserva);
        IF ocupadas + NEW.numero_entradas > ev.capacidad_total THEN
            RAISE EXCEPTION 'El evento % no tiene cupo para % entradas', ev.codigo, NEW.numero_entradas;
        END IF;
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reserva_reglas
    BEFORE INSERT OR UPDATE OF numero_entradas, estado, codigo_evento ON RESERVA
    FOR EACH ROW EXECUTE FUNCTION fn_reserva_reglas();

-- 4. El método de pago de un PAGO debe pertenecer al cliente que hizo la RESERVA
CREATE OR REPLACE FUNCTION fn_pago_coherente() RETURNS trigger AS $$
BEGIN
    IF (SELECT numero_identificacion FROM RESERVA WHERE id_reserva = NEW.id_reserva)
       IS DISTINCT FROM
       (SELECT numero_identificacion FROM METODO_PAGO WHERE id_metodo = NEW.id_metodo) THEN
        RAISE EXCEPTION 'El método de pago % no pertenece al cliente de la reserva %', NEW.id_metodo, NEW.id_reserva;
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pago_coherente BEFORE INSERT OR UPDATE OF id_reserva, id_metodo ON PAGO
    FOR EACH ROW EXECUTE FUNCTION fn_pago_coherente();

-- 5. La capacidad del evento no puede quedar por debajo de las entradas ya reservadas
CREATE OR REPLACE FUNCTION fn_evento_capacidad() RETURNS trigger AS $$
DECLARE ocupadas INTEGER;
BEGIN
    SELECT COALESCE(SUM(numero_entradas), 0) INTO ocupadas
      FROM RESERVA WHERE codigo_evento = NEW.codigo AND estado <> 'Cancelada';
    IF NEW.capacidad_total < ocupadas THEN
        RAISE EXCEPTION 'capacidad_total (%) es menor que las entradas ya reservadas (%)', NEW.capacidad_total, ocupadas;
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evento_capacidad BEFORE UPDATE OF capacidad_total ON EVENTO
    FOR EACH ROW EXECUTE FUNCTION fn_evento_capacidad();

-- 6. El documento de identidad (PK) no se edita por accidente; la corrección de un dato mal digitado es explícita:
--       BEGIN; SET LOCAL app.corregir_documento = 'on'; UPDATE USUARIO SET numero_identificacion = '...' WHERE ...; COMMIT;
--     Las FK tienen ON UPDATE CASCADE, así que el cambio se propaga a todas las tablas.
CREATE OR REPLACE FUNCTION fn_usuario_documento_inmutable() RETURNS trigger AS $$
BEGIN
    IF (NEW.numero_identificacion IS DISTINCT FROM OLD.numero_identificacion
        OR NEW.tipo_identificacion IS DISTINCT FROM OLD.tipo_identificacion)
       AND COALESCE(current_setting('app.corregir_documento', true), 'off') <> 'on' THEN
        RAISE EXCEPTION 'El documento de identidad no se puede modificar (use SET LOCAL app.corregir_documento = ''on'' para corregirlo)';
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuario_documento
    BEFORE UPDATE OF numero_identificacion, tipo_identificacion ON USUARIO
    FOR EACH ROW EXECUTE FUNCTION fn_usuario_documento_inmutable();

-- ==================================================================================================================
-- Fin del esquema
-- ==================================================================================================================
