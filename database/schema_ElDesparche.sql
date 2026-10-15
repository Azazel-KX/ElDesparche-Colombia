-- ==================================================================================================================
-- ElDesparche — Esquema PostgreSQL (generado desde documents/BD/Diagrama_v2.drawio)
-- Motor: PostgreSQL 13+   ·   Proyecto Integrador 2026-2   ·   18 tablas, 3FN
-- Documento de apoyo: documents/BD/Modelo_Relacional_3FN_Diagrama_v2.docx
--
-- Ejecutar sobre una base vacía. Las tablas se crean en orden de dependencia.
-- ==================================================================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid(), crypt() para el seed

-- ==================================================================================================================
-- TIPOS ENUMERADOS (opciones fijas que define el sistema)
-- ==================================================================================================================

CREATE TYPE tipo_identificacion_t  AS ENUM ('CC', 'CE', 'PAS', 'PPT', 'NIT');
CREATE TYPE tipo_usuario_t         AS ENUM ('ADMIN', 'CLIENTE', 'AGENTE');
CREATE TYPE jornada_t              AS ENUM ('Mañana', 'Tarde', 'Noche', 'Completa');
CREATE TYPE tipo_verificacion_t    AS ENUM ('Contacto');
CREATE TYPE estado_verificacion_t  AS ENUM ('Pendiente', 'Aprobada', 'Rechazada');
CREATE TYPE estado_evento_t        AS ENUM ('Programado', 'En Boletería', 'En Vivo', 'Finalizado', 'Cancelado');
CREATE TYPE estado_reserva_t       AS ENUM ('Reservada', 'Confirmada', 'Cancelada');
CREATE TYPE tipo_metodo_pago_t     AS ENUM ('Tarjeta crédito', 'Tarjeta débito', 'Transferencia bancaria', 'Billetera digital');
CREATE TYPE estado_pago_t          AS ENUM ('Pendiente', 'Aprobado', 'Rechazado');
CREATE TYPE estado_conexion_t      AS ENUM ('Pendiente', 'Aceptada', 'Rechazada');
CREATE TYPE aplica_a_t             AS ENUM ('EVENTO', 'RESERVA', 'AMBOS');

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
-- ==================================================================================================================

CREATE TABLE USUARIO (
    numero_identificacion VARCHAR(20) PRIMARY KEY,
    tipo_identificacion   tipo_identificacion_t NOT NULL,
    tipo_usuario          tipo_usuario_t NOT NULL,
    nombre                VARCHAR(80)  NOT NULL,
    apellidos             VARCHAR(80)  NOT NULL,
    correo                VARCHAR(100) NOT NULL UNIQUE
                          CHECK (correo ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
    contrasena_hash       VARCHAR(255) NOT NULL,
    direccion             VARCHAR(200) NOT NULL,
    fecha_registro        TIMESTAMP NOT NULL DEFAULT NOW(),
    id_ciudad             INTEGER NOT NULL REFERENCES CIUDAD(id_ciudad) ON DELETE RESTRICT,
    -- Clave que usan los subtipos para fijar su tipo_usuario (disjunción)
    UNIQUE (numero_identificacion, tipo_usuario)
);

CREATE INDEX idx_usuario_tipo   ON USUARIO(tipo_usuario);
CREATE INDEX idx_usuario_ciudad ON USUARIO(id_ciudad);

-- Atributo multivalorado telefono
CREATE TABLE TELEFONO_USUARIO (
    numero_identificacion VARCHAR(20) NOT NULL REFERENCES USUARIO(numero_identificacion) ON DELETE CASCADE,
    telefono              VARCHAR(10) NOT NULL CHECK (telefono ~ '^(3[0-9]{9}|60[0-9]{8})$'),
    PRIMARY KEY (numero_identificacion, telefono)
);

CREATE TABLE ADMIN (
    numero_identificacion VARCHAR(20) PRIMARY KEY,
    tipo_usuario          tipo_usuario_t NOT NULL DEFAULT 'ADMIN' CHECK (tipo_usuario = 'ADMIN'),
    salario               NUMERIC(12,2) NOT NULL CHECK (salario >= 0),
    horario               jornada_t NOT NULL,
    FOREIGN KEY (numero_identificacion, tipo_usuario)
        REFERENCES USUARIO(numero_identificacion, tipo_usuario) ON DELETE CASCADE
);

CREATE TABLE CLIENTE (
    numero_identificacion VARCHAR(20) PRIMARY KEY,
    tipo_usuario          tipo_usuario_t NOT NULL DEFAULT 'CLIENTE' CHECK (tipo_usuario = 'CLIENTE'),
    fecha_nacimiento      DATE NOT NULL CHECK (fecha_nacimiento <= CURRENT_DATE),   -- edad se deriva, no se guarda
    foto_perfil           VARCHAR(255),
    alias                 VARCHAR(40) UNIQUE,
    puntos                INTEGER NOT NULL DEFAULT 0 CHECK (puntos >= 0),
    publicidad            BOOLEAN NOT NULL DEFAULT TRUE,                            -- visualización de publicidad
    FOREIGN KEY (numero_identificacion, tipo_usuario)
        REFERENCES USUARIO(numero_identificacion, tipo_usuario) ON DELETE CASCADE
);

CREATE TABLE AGENTE (
    numero_identificacion VARCHAR(20) PRIMARY KEY,
    tipo_usuario          tipo_usuario_t NOT NULL DEFAULT 'AGENTE' CHECK (tipo_usuario = 'AGENTE'),
    nit                   VARCHAR(20)  NOT NULL UNIQUE,    -- clave candidata: razon_social y demás dependen de la PK
    razon_social          VARCHAR(150) NOT NULL,
    nombre_comercial      VARCHAR(150),
    descripcion           TEXT,
    logo_url              VARCHAR(255),
    comision              NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (comision BETWEEN 0 AND 100),
    experiencia           SMALLINT NOT NULL DEFAULT 0 CHECK (experiencia >= 0),    -- años
    FOREIGN KEY (numero_identificacion, tipo_usuario)
        REFERENCES USUARIO(numero_identificacion, tipo_usuario) ON DELETE CASCADE
);

-- Entidad débil de ADMIN (relación identificadora Inicia). tiempo_en_pantalla es derivado: no se guarda.
CREATE TABLE SESION_ADMIN (
    numero_identificacion  VARCHAR(20) NOT NULL REFERENCES ADMIN(numero_identificacion) ON DELETE CASCADE,
    numero_sesion          INTEGER NOT NULL,                -- lo asigna el trigger si llega NULL
    fecha_hora_conexion    TIMESTAMP NOT NULL,
    fecha_hora_desconexion TIMESTAMP NOT NULL,              -- la fila se inserta al cerrar sesión
    direccion_ip           INET NOT NULL,
    PRIMARY KEY (numero_identificacion, numero_sesion),
    CHECK (fecha_hora_desconexion >= fecha_hora_conexion)
);

-- ==================================================================================================================
-- VERIFICACIÓN  (relación Detalla 1:1: VERIFICACION → VERIF_CONTACTO)
-- ==================================================================================================================

CREATE TABLE VERIFICACION (
    id_verificacion       SERIAL PRIMARY KEY,
    tipo                  tipo_verificacion_t NOT NULL DEFAULT 'Contacto',
    estado                estado_verificacion_t NOT NULL DEFAULT 'Pendiente',
    fecha_solicitud       TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion   TIMESTAMP NOT NULL DEFAULT NOW(),
    numero_identificacion VARCHAR(20) NOT NULL REFERENCES USUARIO(numero_identificacion) ON DELETE CASCADE,
    UNIQUE (id_verificacion, tipo),
    CHECK (fecha_actualizacion >= fecha_solicitud)
);

-- Una sola verificación pendiente por usuario y tipo (los reintentos se permiten al resolverse la anterior)
CREATE UNIQUE INDEX ux_verificacion_pendiente
    ON VERIFICACION(numero_identificacion, tipo) WHERE estado = 'Pendiente';

CREATE TABLE VERIF_CONTACTO (
    id_verificacion  INTEGER PRIMARY KEY,
    tipo             tipo_verificacion_t NOT NULL DEFAULT 'Contacto' CHECK (tipo = 'Contacto'),
    codigo_hash      VARCHAR(255) NOT NULL,
    fecha_expiracion TIMESTAMP NOT NULL,
    intentos         SMALLINT NOT NULL DEFAULT 0 CHECK (intentos >= 0),
    FOREIGN KEY (id_verificacion, tipo) REFERENCES VERIFICACION(id_verificacion, tipo) ON DELETE CASCADE
);

-- ==================================================================================================================
-- CATÁLOGO DE CAUSAS DE CANCELACIÓN  (Enunciado: "reservas canceladas y su causa", "eventos cancelados y su causa")
-- ==================================================================================================================

CREATE TABLE CAUSA_CANCELACION (
    id_causa SERIAL PRIMARY KEY,
    nombre   VARCHAR(100) NOT NULL UNIQUE,
    aplica_a aplica_a_t NOT NULL
);

-- ==================================================================================================================
-- EVENTOS  (Enunciado, punto 6; ciudad de realización = UBICACION → CIUDAD)
-- ==================================================================================================================

CREATE TABLE EVENTO (
    codigo            VARCHAR(20) PRIMARY KEY,
    nombre            VARCHAR(150) NOT NULL,
    descripcion       TEXT,
    categoria         VARCHAR(40) NOT NULL
                      CHECK (categoria IN ('musica', 'teatro', 'danza', 'circo', 'comedia')),
    url_imagen        VARCHAR(255),
    fecha_hora_inicio TIMESTAMP NOT NULL,
    fecha_hora_fin    TIMESTAMP NOT NULL,                       -- fecha y hora estimada de finalización
    capacidad_total   INTEGER NOT NULL CHECK (capacidad_total > 0),
    edad_minima       SMALLINT NOT NULL DEFAULT 0 CHECK (edad_minima >= 0),
    observaciones     TEXT,
    estado            estado_evento_t NOT NULL DEFAULT 'Programado',
    fecha_creacion    TIMESTAMP NOT NULL DEFAULT NOW(),
    precio            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),   -- precio base de la entrada
    id_ubicacion      INTEGER NOT NULL REFERENCES UBICACION(id_ubicacion) ON DELETE RESTRICT,
    id_agente         VARCHAR(20) NOT NULL REFERENCES AGENTE(numero_identificacion) ON DELETE RESTRICT,
    id_causa          INTEGER REFERENCES CAUSA_CANCELACION(id_causa) ON DELETE RESTRICT,
    CHECK (fecha_hora_fin > fecha_hora_inicio),
    CHECK ((estado = 'Cancelado') = (id_causa IS NOT NULL))     -- causa obligatoria solo si está cancelado
);

CREATE INDEX idx_evento_estado    ON EVENTO(estado);
CREATE INDEX idx_evento_inicio    ON EVENTO(fecha_hora_inicio);
CREATE INDEX idx_evento_agente    ON EVENTO(id_agente);
CREATE INDEX idx_evento_ubicacion ON EVENTO(id_ubicacion);

-- ==================================================================================================================
-- RESERVAS, MÉTODOS DE PAGO Y PAGOS
-- ==================================================================================================================

CREATE TABLE RESERVA (
    id_reserva      SERIAL PRIMARY KEY,
    codigo_qr       UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    valor_total     NUMERIC(12,2) NOT NULL CHECK (valor_total >= 0),   -- lo calcula el trigger si llega NULL
    fecha_hora      TIMESTAMP NOT NULL DEFAULT NOW(),
    estado          estado_reserva_t NOT NULL DEFAULT 'Reservada',
    numero_entradas INTEGER NOT NULL CHECK (numero_entradas > 0),
    observaciones   TEXT,
    id_cliente      VARCHAR(20) NOT NULL REFERENCES CLIENTE(numero_identificacion) ON DELETE CASCADE,
    codigo_evento   VARCHAR(20) NOT NULL REFERENCES EVENTO(codigo) ON DELETE CASCADE,
    id_causa        INTEGER REFERENCES CAUSA_CANCELACION(id_causa) ON DELETE RESTRICT,
    CHECK ((estado = 'Cancelada') = (id_causa IS NOT NULL))
);

CREATE INDEX idx_reserva_cliente ON RESERVA(id_cliente);
CREATE INDEX idx_reserva_evento  ON RESERVA(codigo_evento);
CREATE INDEX idx_reserva_estado  ON RESERVA(estado);
CREATE INDEX idx_reserva_fecha   ON RESERVA(fecha_hora);

CREATE TABLE METODO_PAGO (
    id_metodo          SERIAL PRIMARY KEY,
    tipo               tipo_metodo_pago_t NOT NULL,
    proveedor          VARCHAR(60) NOT NULL,
    referencia_visible VARCHAR(4) CHECK (referencia_visible ~ '^[0-9]{4}$'),   -- últimos 4 dígitos
    token_pasarela     VARCHAR(255) NOT NULL,
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro     TIMESTAMP NOT NULL DEFAULT NOW(),
    id_cliente         VARCHAR(20) NOT NULL REFERENCES CLIENTE(numero_identificacion) ON DELETE CASCADE
);

CREATE TABLE PAGO (
    id_pago                SERIAL PRIMARY KEY,
    monto                  NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    fecha_hora             TIMESTAMP NOT NULL DEFAULT NOW(),
    referencia_transaccion VARCHAR(80) NOT NULL UNIQUE,
    estado                 estado_pago_t NOT NULL DEFAULT 'Pendiente',
    id_reserva             INTEGER NOT NULL REFERENCES RESERVA(id_reserva) ON DELETE RESTRICT,
    id_metodo              INTEGER NOT NULL REFERENCES METODO_PAGO(id_metodo) ON DELETE RESTRICT
);

CREATE INDEX idx_pago_reserva ON PAGO(id_reserva);

-- ==================================================================================================================
-- CONEXIÓN SOCIAL  (N:M reflexiva sobre CLIENTE)
-- ==================================================================================================================

CREATE TABLE CONEXION_SOCIAL (
    id_solicitante  VARCHAR(20) NOT NULL REFERENCES CLIENTE(numero_identificacion) ON DELETE CASCADE,
    id_receptor     VARCHAR(20) NOT NULL REFERENCES CLIENTE(numero_identificacion) ON DELETE CASCADE,
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT NOW(),
    estado          estado_conexion_t NOT NULL DEFAULT 'Pendiente',
    PRIMARY KEY (id_solicitante, id_receptor),
    CHECK (id_solicitante <> id_receptor)
);

-- (A,B) y (B,A) no pueden coexistir
CREATE UNIQUE INDEX ux_conexion_par
    ON CONEXION_SOCIAL (LEAST(id_solicitante, id_receptor), GREATEST(id_solicitante, id_receptor));

-- ==================================================================================================================
-- TRIGGERS: reglas del diagrama que no son DF ni CHECK de una sola fila
-- ==================================================================================================================

-- 1. Herencia total: todo USUARIO debe tener su fila en ADMIN, CLIENTE o AGENTE (se valida al COMMIT)
CREATE OR REPLACE FUNCTION fn_usuario_tiene_subtipo() RETURNS trigger AS $$
DECLARE ok BOOLEAN;
BEGIN
    IF NEW.tipo_usuario = 'ADMIN' THEN
        SELECT EXISTS (SELECT 1 FROM ADMIN   WHERE numero_identificacion = NEW.numero_identificacion) INTO ok;
    ELSIF NEW.tipo_usuario = 'CLIENTE' THEN
        SELECT EXISTS (SELECT 1 FROM CLIENTE WHERE numero_identificacion = NEW.numero_identificacion) INTO ok;
    ELSE
        SELECT EXISTS (SELECT 1 FROM AGENTE  WHERE numero_identificacion = NEW.numero_identificacion) INTO ok;
    END IF;
    IF NOT ok THEN
        RAISE EXCEPTION 'El usuario % (%) no tiene su fila de subtipo', NEW.numero_identificacion, NEW.tipo_usuario;
    END IF;
    RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_usuario_subtipo
    AFTER INSERT OR UPDATE OF tipo_usuario ON USUARIO
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fn_usuario_tiene_subtipo();

-- 2. Toda VERIFICACION de tipo Contacto debe tener su detalle en VERIF_CONTACTO (se valida al COMMIT)
CREATE OR REPLACE FUNCTION fn_verificacion_tiene_detalle() RETURNS trigger AS $$
BEGIN
    IF NEW.tipo = 'Contacto'
       AND NOT EXISTS (SELECT 1 FROM VERIF_CONTACTO WHERE id_verificacion = NEW.id_verificacion) THEN
        RAISE EXCEPTION 'La verificación % es de contacto y no tiene detalle', NEW.id_verificacion;
    END IF;
    RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_verificacion_detalle
    AFTER INSERT OR UPDATE OF tipo ON VERIFICACION
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fn_verificacion_tiene_detalle();

-- 3. numero_sesion consecutivo por administrador
CREATE OR REPLACE FUNCTION fn_sesion_numero() RETURNS trigger AS $$
BEGIN
    IF NEW.numero_sesion IS NULL THEN
        SELECT COALESCE(MAX(numero_sesion), 0) + 1 INTO NEW.numero_sesion
          FROM SESION_ADMIN WHERE numero_identificacion = NEW.numero_identificacion;
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sesion_numero BEFORE INSERT ON SESION_ADMIN
    FOR EACH ROW EXECUTE FUNCTION fn_sesion_numero();

-- 4. La causa debe ser aplicable al tipo de cancelación (EVENTO o RESERVA)
CREATE OR REPLACE FUNCTION fn_causa_aplica() RETURNS trigger AS $$
DECLARE v_esperado aplica_a_t := TG_ARGV[0]::aplica_a_t; v_real aplica_a_t;
BEGIN
    IF NEW.id_causa IS NOT NULL THEN
        SELECT aplica_a INTO v_real FROM CAUSA_CANCELACION WHERE id_causa = NEW.id_causa;
        IF v_real NOT IN (v_esperado, 'AMBOS') THEN
            RAISE EXCEPTION 'La causa % no aplica a %', NEW.id_causa, v_esperado;
        END IF;
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evento_causa  BEFORE INSERT OR UPDATE OF id_causa ON EVENTO
    FOR EACH ROW EXECUTE FUNCTION fn_causa_aplica('EVENTO');
CREATE TRIGGER trg_reserva_causa BEFORE INSERT OR UPDATE OF id_causa ON RESERVA
    FOR EACH ROW EXECUTE FUNCTION fn_causa_aplica('RESERVA');

-- 5. Reglas de la reserva: verificación aprobada, edad mínima, cupo y valor_total
CREATE OR REPLACE FUNCTION fn_reserva_reglas() RETURNS trigger AS $$
DECLARE
    ev EVENTO%ROWTYPE;
    nacimiento DATE;
    ocupadas INTEGER;
BEGIN
    -- Bloquea el evento para que dos reservas simultáneas no superen la capacidad
    SELECT * INTO ev FROM EVENTO WHERE codigo = NEW.codigo_evento FOR UPDATE;

    IF TG_OP = 'INSERT' THEN
        IF NOT EXISTS (SELECT 1 FROM VERIFICACION
                        WHERE numero_identificacion = NEW.id_cliente
                          AND tipo = 'Contacto' AND estado = 'Aprobada') THEN
            RAISE EXCEPTION 'El cliente % no tiene verificación de contacto aprobada', NEW.id_cliente;
        END IF;

        SELECT fecha_nacimiento INTO nacimiento FROM CLIENTE WHERE numero_identificacion = NEW.id_cliente;
        IF EXTRACT(YEAR FROM age(ev.fecha_hora_inicio::date, nacimiento)) < ev.edad_minima THEN
            RAISE EXCEPTION 'El cliente no cumple la edad mínima (%) del evento %', ev.edad_minima, ev.codigo;
        END IF;

        IF NEW.valor_total IS NULL THEN
            NEW.valor_total := NEW.numero_entradas * ev.precio;       -- precio vigente al reservar
        ELSIF NEW.valor_total <> NEW.numero_entradas * ev.precio THEN
            RAISE EXCEPTION 'valor_total debe ser numero_entradas × precio del evento';
        END IF;
    END IF;

    -- Si cambia el número de entradas, se conserva el precio unitario con que se reservó
    IF TG_OP = 'UPDATE' AND NEW.numero_entradas <> OLD.numero_entradas
       AND NEW.valor_total = OLD.valor_total THEN
        NEW.valor_total := NEW.numero_entradas * (OLD.valor_total / OLD.numero_entradas);
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

-- 6. El método de pago de un PAGO debe pertenecer al cliente que hizo la RESERVA
CREATE OR REPLACE FUNCTION fn_pago_coherente() RETURNS trigger AS $$
BEGIN
    IF (SELECT id_cliente FROM RESERVA WHERE id_reserva = NEW.id_reserva)
       IS DISTINCT FROM
       (SELECT id_cliente FROM METODO_PAGO WHERE id_metodo = NEW.id_metodo) THEN
        RAISE EXCEPTION 'El método de pago % no pertenece al cliente de la reserva %', NEW.id_metodo, NEW.id_reserva;
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pago_coherente BEFORE INSERT OR UPDATE OF id_reserva, id_metodo ON PAGO
    FOR EACH ROW EXECUTE FUNCTION fn_pago_coherente();

-- 7. No se puede dejar un USUARIO sin su fila de subtipo borrando solo el subtipo (se valida al COMMIT)
CREATE OR REPLACE FUNCTION fn_subtipo_huerfano() RETURNS trigger AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM USUARIO WHERE numero_identificacion = OLD.numero_identificacion) THEN
        RAISE EXCEPTION 'No se puede borrar el subtipo de %: el usuario seguiría existiendo', OLD.numero_identificacion;
    END IF;
    RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_admin_huerfano   AFTER DELETE ON ADMIN
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fn_subtipo_huerfano();
CREATE CONSTRAINT TRIGGER trg_cliente_huerfano AFTER DELETE ON CLIENTE
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fn_subtipo_huerfano();
CREATE CONSTRAINT TRIGGER trg_agente_huerfano  AFTER DELETE ON AGENTE
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fn_subtipo_huerfano();

-- 8. Lo mismo para el detalle de verificación
CREATE OR REPLACE FUNCTION fn_detalle_huerfano() RETURNS trigger AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM VERIFICACION WHERE id_verificacion = OLD.id_verificacion AND tipo = 'Contacto') THEN
        RAISE EXCEPTION 'No se puede borrar el detalle de la verificación %', OLD.id_verificacion;
    END IF;
    RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_verif_contacto_huerfano AFTER DELETE ON VERIF_CONTACTO
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fn_detalle_huerfano();

-- 9. La capacidad del evento no puede quedar por debajo de las entradas ya reservadas
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

-- ==================================================================================================================
-- Fin del esquema
-- ==================================================================================================================
