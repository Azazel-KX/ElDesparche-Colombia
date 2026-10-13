-- ==================================================================================================================
-- ElDesparche — Esquema PostgreSQL
-- Corresponde al Diccionario de Datos v1.4 (documents/BD/Diccionario_Datos_ElDesparche.txt)
-- Motor: PostgreSQL 13+ (requiere PostGIS; gen_random_uuid() nativo desde PG13)
-- ==================================================================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==================================================================================================================
-- TIPOS ENUMERADOS
-- ==================================================================================================================

CREATE TYPE tipo_identificacion_t   AS ENUM ('CC','CE','PAS','PPT','NIT');
CREATE TYPE tipo_usuario_t          AS ENUM ('ADMIN','CLIENTE','EMPRESA');
CREATE TYPE estado_cuenta_t         AS ENUM ('Activa','Inactiva');
CREATE TYPE jornada_t               AS ENUM ('Mañana','Tarde','Noche','Completa');
CREATE TYPE tipo_verificacion_t     AS ENUM ('Contacto','Biométrica');
CREATE TYPE estado_verificacion_t   AS ENUM ('Pendiente','Aprobada','Rechazada');
CREATE TYPE estado_evento_t         AS ENUM ('Programado','En Boletería','En Vivo','Finalizado','Cancelado');
CREATE TYPE rol_organiza_t          AS ENUM ('coorganizador','patrocinador');
CREATE TYPE nivel_entrada_t         AS ENUM ('General','Preferencial','VIP','Palco','Gratuita');
CREATE TYPE estado_ticket_t         AS ENUM ('Reservado','Confirmado','Cancelado','Usado');
CREATE TYPE tipo_metodo_pago_t      AS ENUM ('Tarjeta crédito','Tarjeta débito','Transferencia bancaria');
CREATE TYPE estado_pago_t           AS ENUM ('Pendiente','Aprobado','Rechazado');
CREATE TYPE estado_conexion_t       AS ENUM ('Pendiente','Aceptada','Rechazada');
CREATE TYPE aplica_a_t              AS ENUM ('EVENTO','TICKET','AMBOS');
CREATE TYPE estado_reembolso_t      AS ENUM ('Pendiente','Reembolsado','No aplica');

-- ==================================================================================================================
-- GEOGRAFÍA
-- ==================================================================================================================

CREATE TABLE PAIS (
    id_pais                  SERIAL PRIMARY KEY,
    nombre                   VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE DEPARTAMENTO (
    id_departamento          SERIAL PRIMARY KEY,
    codigo_dane              CHAR(2) NOT NULL UNIQUE CHECK (codigo_dane ~ '^[0-9]{2}$'),
    nombre                   VARCHAR(60) NOT NULL,
    id_pais                  INTEGER NOT NULL REFERENCES PAIS(id_pais),
    UNIQUE (id_pais, nombre)
);

CREATE TABLE CIUDAD (
    id_ciudad                SERIAL PRIMARY KEY,
    codigo_dane              CHAR(5) NOT NULL UNIQUE CHECK (codigo_dane ~ '^[0-9]{5}$'),
    nombre                   VARCHAR(80) NOT NULL,
    id_departamento          INTEGER NOT NULL REFERENCES DEPARTAMENTO(id_departamento),
    UNIQUE (id_departamento, nombre)
);

CREATE TABLE UBICACION (
    id_ubicacion             SERIAL PRIMARY KEY,
    direccion                VARCHAR(150) NOT NULL,
    coordenadas              GEOGRAPHY(Point, 4326) NOT NULL,
    id_ciudad                INTEGER NOT NULL REFERENCES CIUDAD(id_ciudad),
    CONSTRAINT chk_ubicacion_colombia CHECK (
        ST_Y(coordenadas::geometry) BETWEEN -4.3 AND 13.6 AND
        ST_X(coordenadas::geometry) BETWEEN -82.0 AND -66.8
    )
);
CREATE INDEX idx_ubicacion_coord  ON UBICACION USING GIST (coordenadas);
CREATE INDEX idx_ubicacion_ciudad ON UBICACION(id_ciudad);

CREATE TABLE LUGAR (
    id_lugar                 SERIAL PRIMARY KEY,
    nombre                   VARCHAR(100) NOT NULL,
    capacidad_maxima         INTEGER NOT NULL CHECK (capacidad_maxima > 0),
    url_imagen               VARCHAR(255) NOT NULL,
    id_ubicacion             INTEGER NOT NULL UNIQUE REFERENCES UBICACION(id_ubicacion)
);

-- ==================================================================================================================
-- USUARIOS
-- ==================================================================================================================

CREATE TABLE CATEGORIA (
    id_categoria             SERIAL PRIMARY KEY,
    nombre                   VARCHAR(40) NOT NULL UNIQUE,
    activa                   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE USUARIO (
    numero_identificacion    VARCHAR(20) PRIMARY KEY,
    tipo_identificacion      tipo_identificacion_t NOT NULL,
    nombres                  VARCHAR(60) NOT NULL,
    apellidos                VARCHAR(60) NOT NULL,
    tipo_usuario             tipo_usuario_t NOT NULL,
    correo                   VARCHAR(100) NOT NULL UNIQUE CHECK (correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    contrasena_hash          VARCHAR(255) NOT NULL,
    fecha_registro           TIMESTAMP NOT NULL DEFAULT NOW(),
    estado_cuenta            estado_cuenta_t NOT NULL DEFAULT 'Activa',
    id_ubicacion             INTEGER NOT NULL UNIQUE REFERENCES UBICACION(id_ubicacion),
    UNIQUE (numero_identificacion, tipo_usuario),
    CONSTRAINT chk_usuario_identificacion CHECK (
        (tipo_identificacion IN ('CC','CE') AND numero_identificacion ~ '^[0-9]{6,10}$') OR
        (tipo_identificacion = 'PPT' AND numero_identificacion ~ '^[0-9]+$') OR
        (tipo_identificacion = 'PAS' AND numero_identificacion ~ '^[A-Za-z0-9]{5,20}$') OR
        (tipo_identificacion = 'NIT' AND numero_identificacion ~ '^[0-9]{9}$')
    )
);
CREATE INDEX idx_usuario_tipo ON USUARIO(tipo_usuario);

CREATE TABLE TELEFONO_USUARIO (
    numero_identificacion    VARCHAR(20) NOT NULL REFERENCES USUARIO(numero_identificacion) ON UPDATE CASCADE,
    telefono                 CHAR(10) NOT NULL CHECK (telefono ~ '^(3[0-9]{9}|60[1-8][0-9]{7})$'),
    PRIMARY KEY (numero_identificacion, telefono)
);

-- Fix v1.4: tipo_usuario fijo + FK compuesta en cada subtipo => disjunción real a nivel de BD.
CREATE TABLE ADMIN (
    numero_identificacion    VARCHAR(20) PRIMARY KEY,
    tipo_usuario             tipo_usuario_t NOT NULL DEFAULT 'ADMIN' CHECK (tipo_usuario = 'ADMIN'),
    salario                  NUMERIC(12,2) NOT NULL CHECK (salario >= 0),
    horario                  jornada_t NOT NULL,
    FOREIGN KEY (numero_identificacion, tipo_usuario)
        REFERENCES USUARIO(numero_identificacion, tipo_usuario) ON UPDATE CASCADE
);

CREATE TABLE CLIENTE (
    numero_identificacion    VARCHAR(20) PRIMARY KEY,
    tipo_usuario             tipo_usuario_t NOT NULL DEFAULT 'CLIENTE' CHECK (tipo_usuario = 'CLIENTE'),
    fecha_nacimiento         DATE NOT NULL,
    foto_perfil              VARCHAR(255),
    alias                    VARCHAR(30) UNIQUE,
    FOREIGN KEY (numero_identificacion, tipo_usuario)
        REFERENCES USUARIO(numero_identificacion, tipo_usuario) ON UPDATE CASCADE
);

CREATE TABLE CATEGORIA_CLIENTE (
    id_cliente               VARCHAR(20) NOT NULL REFERENCES CLIENTE(numero_identificacion) ON UPDATE CASCADE ON DELETE CASCADE,
    id_categoria             INTEGER NOT NULL REFERENCES CATEGORIA(id_categoria),
    PRIMARY KEY (id_cliente, id_categoria)
);

CREATE TABLE EMPRESA (
    numero_identificacion    VARCHAR(20) PRIMARY KEY,
    tipo_usuario             tipo_usuario_t NOT NULL DEFAULT 'EMPRESA' CHECK (tipo_usuario = 'EMPRESA'),
    nit                      VARCHAR(15) NOT NULL UNIQUE CHECK (nit ~ '^[0-9]{9}-[0-9]$'),
    razon_social             VARCHAR(120) NOT NULL,
    nombre_comercial         VARCHAR(100) NOT NULL,
    descripcion              TEXT,
    logo_url                 VARCHAR(255),
    comision_fija            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (comision_fija >= 0),
    FOREIGN KEY (numero_identificacion, tipo_usuario)
        REFERENCES USUARIO(numero_identificacion, tipo_usuario) ON UPDATE CASCADE
);

CREATE TABLE CATEGORIA_EMPRESA (
    id_empresa               VARCHAR(20) NOT NULL REFERENCES EMPRESA(numero_identificacion) ON UPDATE CASCADE ON DELETE CASCADE,
    id_categoria             INTEGER NOT NULL REFERENCES CATEGORIA(id_categoria),
    PRIMARY KEY (id_empresa, id_categoria)
);

CREATE TABLE SESION_ADMIN (
    numero_identificacion    VARCHAR(20) NOT NULL REFERENCES ADMIN(numero_identificacion) ON UPDATE CASCADE ON DELETE CASCADE,
    numero_sesion            INTEGER NOT NULL,
    fecha_hora_conexion      TIMESTAMP NOT NULL,
    fecha_hora_desconexion   TIMESTAMP NOT NULL,
    direccion_ip             INET NOT NULL,
    PRIMARY KEY (numero_identificacion, numero_sesion),
    CHECK (fecha_hora_desconexion >= fecha_hora_conexion)
);

-- ==================================================================================================================
-- VERIFICACIÓN
-- ==================================================================================================================

CREATE TABLE VERIFICACION (
    id_verificacion          SERIAL PRIMARY KEY,
    tipo                     tipo_verificacion_t NOT NULL,
    estado                   estado_verificacion_t NOT NULL DEFAULT 'Pendiente',
    fecha_solicitud          TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion      TIMESTAMP NOT NULL DEFAULT NOW(),
    numero_identificacion    VARCHAR(20) NOT NULL REFERENCES USUARIO(numero_identificacion) ON UPDATE CASCADE,
    UNIQUE (id_verificacion, tipo)
);
CREATE INDEX idx_verificacion_usuario ON VERIFICACION(numero_identificacion);
-- Fix v1.4: solo una verificación pendiente por tipo y usuario (sí permite reintentar tras Aprobada/Rechazada).
CREATE UNIQUE INDEX uq_verificacion_pendiente ON VERIFICACION(numero_identificacion, tipo) WHERE estado = 'Pendiente';

CREATE TABLE VERIF_CONTACTO (
    id_verificacion          INTEGER PRIMARY KEY REFERENCES VERIFICACION(id_verificacion) ON DELETE CASCADE,
    tipo                     tipo_verificacion_t NOT NULL DEFAULT 'Contacto' CHECK (tipo = 'Contacto'),
    codigo_hash              VARCHAR(255) NOT NULL,
    fecha_expiracion         TIMESTAMP NOT NULL,
    intentos                 SMALLINT NOT NULL DEFAULT 0 CHECK (intentos BETWEEN 0 AND 5),
    FOREIGN KEY (id_verificacion, tipo) REFERENCES VERIFICACION(id_verificacion, tipo)
);

CREATE TABLE VERIF_BIOMETRICA (
    id_verificacion          INTEGER PRIMARY KEY REFERENCES VERIFICACION(id_verificacion) ON DELETE CASCADE,
    tipo                     tipo_verificacion_t NOT NULL DEFAULT 'Biométrica' CHECK (tipo = 'Biométrica'),
    url_documento_frente     VARCHAR(255) NOT NULL,
    url_documento_reverso    VARCHAR(255) NOT NULL,
    url_selfie               VARCHAR(255) NOT NULL,
    puntaje_coincidencia     NUMERIC(5,2) CHECK (puntaje_coincidencia BETWEEN 0 AND 100),
    prueba_vida              BOOLEAN NOT NULL DEFAULT FALSE,
    numero_documento_leido   VARCHAR(20),
    fecha_nacimiento_leida   DATE,
    fecha_vencimiento_doc    DATE,
    fecha_autorizacion_datos TIMESTAMP NOT NULL,
    FOREIGN KEY (id_verificacion, tipo) REFERENCES VERIFICACION(id_verificacion, tipo)
);

-- ==================================================================================================================
-- EVENTOS Y VENTAS
-- ==================================================================================================================

CREATE TABLE PROVEEDOR_PAGO (
    id_proveedor             SERIAL PRIMARY KEY,
    nombre                   VARCHAR(40) NOT NULL UNIQUE,
    activo                   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE EVENTO (
    codigo                   VARCHAR(20) PRIMARY KEY,
    nombre                   VARCHAR(150) NOT NULL,
    descripcion              TEXT NOT NULL,
    id_categoria             INTEGER NOT NULL REFERENCES CATEGORIA(id_categoria),
    url_imagen               VARCHAR(255),
    fecha_hora_inicio        TIMESTAMP NOT NULL,
    fecha_hora_fin           TIMESTAMP NOT NULL,
    capacidad_total          INTEGER NOT NULL CHECK (capacidad_total > 0),
    edad_minima              SMALLINT NOT NULL DEFAULT 0 CHECK (edad_minima BETWEEN 0 AND 99),
    observaciones            TEXT,
    estado                   estado_evento_t NOT NULL DEFAULT 'Programado',
    fecha_creacion           TIMESTAMP NOT NULL DEFAULT NOW(),
    id_creador               VARCHAR(20) NOT NULL REFERENCES USUARIO(numero_identificacion) ON UPDATE CASCADE,
    id_lugar                 INTEGER NOT NULL REFERENCES LUGAR(id_lugar),
    CHECK (fecha_hora_fin > fecha_hora_inicio)
);
CREATE INDEX idx_evento_estado     ON EVENTO(estado);
CREATE INDEX idx_evento_fecha      ON EVENTO(fecha_hora_inicio);
CREATE INDEX idx_evento_categoria  ON EVENTO(id_categoria);
CREATE INDEX idx_evento_lugar      ON EVENTO(id_lugar);
CREATE INDEX idx_evento_creador    ON EVENTO(id_creador);

CREATE TABLE ORGANIZA (
    id_empresa               VARCHAR(20) NOT NULL REFERENCES EMPRESA(numero_identificacion) ON UPDATE CASCADE ON DELETE CASCADE,
    codigo_evento            VARCHAR(20) NOT NULL REFERENCES EVENTO(codigo) ON DELETE CASCADE,
    rol                      rol_organiza_t NOT NULL,
    PRIMARY KEY (id_empresa, codigo_evento)
);

CREATE TABLE NIVEL_ENTRADA (
    id_nivel                 SERIAL PRIMARY KEY,
    nombre                   nivel_entrada_t NOT NULL,
    precio                   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
    cupo                     INTEGER NOT NULL CHECK (cupo > 0),
    codigo_evento            VARCHAR(20) NOT NULL REFERENCES EVENTO(codigo) ON DELETE CASCADE,
    UNIQUE (codigo_evento, nombre),
    CHECK (nombre <> 'Gratuita' OR precio = 0)
);
CREATE INDEX idx_nivel_evento ON NIVEL_ENTRADA(codigo_evento);

CREATE TABLE TICKET (
    id_ticket                SERIAL PRIMARY KEY,
    codigo_qr                UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    precio_pagado            NUMERIC(12,2) NOT NULL CHECK (precio_pagado >= 0),
    fecha_hora               TIMESTAMP NOT NULL DEFAULT NOW(),
    estado                   estado_ticket_t NOT NULL DEFAULT 'Reservado',
    id_cliente               VARCHAR(20) NOT NULL REFERENCES CLIENTE(numero_identificacion) ON UPDATE CASCADE,
    id_nivel                 INTEGER NOT NULL REFERENCES NIVEL_ENTRADA(id_nivel)
);
CREATE INDEX idx_ticket_cliente ON TICKET(id_cliente);
CREATE INDEX idx_ticket_nivel   ON TICKET(id_nivel);
CREATE INDEX idx_ticket_estado  ON TICKET(estado);

CREATE TABLE METODO_PAGO (
    id_metodo                SERIAL PRIMARY KEY,
    tipo                     tipo_metodo_pago_t NOT NULL,
    id_proveedor             INTEGER NOT NULL REFERENCES PROVEEDOR_PAGO(id_proveedor),
    referencia_visible       CHAR(4) NOT NULL CHECK (referencia_visible ~ '^[0-9]{4}$'),
    token_pasarela           VARCHAR(255) NOT NULL UNIQUE,
    activo                   BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro           TIMESTAMP NOT NULL DEFAULT NOW(),
    id_cliente               VARCHAR(20) NOT NULL REFERENCES CLIENTE(numero_identificacion) ON UPDATE CASCADE
);
CREATE INDEX idx_metodo_cliente ON METODO_PAGO(id_cliente);

CREATE TABLE PAGO (
    id_pago                  SERIAL PRIMARY KEY,
    monto                    NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    fecha_hora               TIMESTAMP NOT NULL DEFAULT NOW(),
    referencia_transaccion   VARCHAR(60) NOT NULL UNIQUE,
    estado                   estado_pago_t NOT NULL DEFAULT 'Pendiente',
    id_ticket                INTEGER NOT NULL REFERENCES TICKET(id_ticket),
    id_metodo                INTEGER NOT NULL REFERENCES METODO_PAGO(id_metodo)
);
CREATE INDEX idx_pago_ticket ON PAGO(id_ticket);
CREATE INDEX idx_pago_estado ON PAGO(estado);

CREATE TABLE RESENA (
    id_resena                SERIAL PRIMARY KEY,
    calificacion             SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario               TEXT,
    fecha                    TIMESTAMP NOT NULL DEFAULT NOW(),
    id_cliente               VARCHAR(20) NOT NULL REFERENCES CLIENTE(numero_identificacion) ON UPDATE CASCADE,
    codigo_evento            VARCHAR(20) NOT NULL REFERENCES EVENTO(codigo),
    UNIQUE (id_cliente, codigo_evento)
);
CREATE INDEX idx_resena_evento ON RESENA(codigo_evento);

CREATE TABLE CONEXION_SOCIAL (
    id_solicitante           VARCHAR(20) NOT NULL REFERENCES CLIENTE(numero_identificacion) ON UPDATE CASCADE,
    id_receptor              VARCHAR(20) NOT NULL REFERENCES CLIENTE(numero_identificacion) ON UPDATE CASCADE,
    fecha_solicitud          TIMESTAMP NOT NULL DEFAULT NOW(),
    estado                   estado_conexion_t NOT NULL DEFAULT 'Pendiente',
    PRIMARY KEY (id_solicitante, id_receptor),
    CHECK (id_solicitante <> id_receptor)
);

-- ==================================================================================================================
-- CANCELACIONES
-- ==================================================================================================================

CREATE TABLE CAUSA_CANCELACION (
    id_causa                 SERIAL PRIMARY KEY,
    nombre                   VARCHAR(80) NOT NULL UNIQUE,
    aplica_a                 aplica_a_t NOT NULL,
    requiere_detalle         BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE CANCELACION_EVENTO (
    codigo_evento            VARCHAR(20) PRIMARY KEY REFERENCES EVENTO(codigo),
    fecha                    TIMESTAMP NOT NULL DEFAULT NOW(),
    motivo                   TEXT,
    id_causa                 INTEGER NOT NULL REFERENCES CAUSA_CANCELACION(id_causa)
);

CREATE TABLE CANCELACION_TICKET (
    id_ticket                INTEGER PRIMARY KEY REFERENCES TICKET(id_ticket),
    fecha                    TIMESTAMP NOT NULL DEFAULT NOW(),
    motivo                   TEXT,
    estado_reembolso         estado_reembolso_t NOT NULL DEFAULT 'No aplica',
    monto_reembolsado        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monto_reembolsado >= 0),
    id_causa                 INTEGER NOT NULL REFERENCES CAUSA_CANCELACION(id_causa)
);

-- ==================================================================================================================
-- TRIGGERS — reglas de negocio e integridad que un CHECK de una sola tabla no puede expresar
-- ==================================================================================================================

-- Fix v1.4 (1/6): totalidad de la herencia de USUARIO (antes solo era disjunta).
-- Diferido a fin de transacción: permite insertar USUARIO y su subtipo en el mismo INSERT/transacción.
CREATE OR REPLACE FUNCTION fn_usuario_subtipo_total() RETURNS TRIGGER AS $$
DECLARE
    existe BOOLEAN;
BEGIN
    CASE NEW.tipo_usuario
        WHEN 'ADMIN'   THEN SELECT EXISTS(SELECT 1 FROM ADMIN   WHERE numero_identificacion = NEW.numero_identificacion) INTO existe;
        WHEN 'CLIENTE' THEN SELECT EXISTS(SELECT 1 FROM CLIENTE WHERE numero_identificacion = NEW.numero_identificacion) INTO existe;
        WHEN 'EMPRESA' THEN SELECT EXISTS(SELECT 1 FROM EMPRESA WHERE numero_identificacion = NEW.numero_identificacion) INTO existe;
    END CASE;
    IF NOT existe THEN
        RAISE EXCEPTION 'USUARIO % declarado como % no tiene fila de subtipo correspondiente', NEW.numero_identificacion, NEW.tipo_usuario;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_usuario_subtipo_total
    AFTER INSERT OR UPDATE OF tipo_usuario ON USUARIO
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fn_usuario_subtipo_total();

-- Integridad geográfica: el código DANE de la ciudad debe empezar con el código DANE de su departamento.
CREATE OR REPLACE FUNCTION fn_ciudad_dane_prefijo() RETURNS TRIGGER AS $$
DECLARE
    dpto_codigo CHAR(2);
BEGIN
    SELECT codigo_dane INTO dpto_codigo FROM DEPARTAMENTO WHERE id_departamento = NEW.id_departamento;
    IF LEFT(NEW.codigo_dane, 2) <> dpto_codigo THEN
        RAISE EXCEPTION 'El código DANE % no corresponde al departamento (código %)', NEW.codigo_dane, dpto_codigo;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ciudad_dane_prefijo
    BEFORE INSERT OR UPDATE ON CIUDAD
    FOR EACH ROW EXECUTE FUNCTION fn_ciudad_dane_prefijo();

-- Fix v1.4 (2/6, parcial): EVENTO — capacidad vs. lugar, y tipo de creador (ADMIN no crea eventos).
CREATE OR REPLACE FUNCTION fn_evento_validaciones() RETURNS TRIGGER AS $$
DECLARE
    cap_lugar INTEGER;
    tipo_usr  tipo_usuario_t;
BEGIN
    SELECT capacidad_maxima INTO cap_lugar FROM LUGAR WHERE id_lugar = NEW.id_lugar;
    IF NEW.capacidad_total > cap_lugar THEN
        RAISE EXCEPTION 'capacidad_total (%) excede la capacidad_maxima del lugar (%)', NEW.capacidad_total, cap_lugar;
    END IF;

    SELECT tipo_usuario INTO tipo_usr FROM USUARIO WHERE numero_identificacion = NEW.id_creador;
    IF tipo_usr IS NULL OR tipo_usr NOT IN ('CLIENTE','EMPRESA') THEN
        RAISE EXCEPTION 'El creador de un evento (%) debe ser CLIENTE o EMPRESA', NEW.id_creador;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evento_validaciones
    BEFORE INSERT OR UPDATE ON EVENTO
    FOR EACH ROW EXECUTE FUNCTION fn_evento_validaciones();

-- Sincroniza EVENTO.estado = 'Cancelado' al registrar la cancelación.
CREATE OR REPLACE FUNCTION fn_evento_marcar_cancelado() RETURNS TRIGGER AS $$
BEGIN
    UPDATE EVENTO SET estado = 'Cancelado' WHERE codigo = NEW.codigo_evento;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evento_marcar_cancelado
    AFTER INSERT ON CANCELACION_EVENTO
    FOR EACH ROW EXECUTE FUNCTION fn_evento_marcar_cancelado();

-- NIVEL_ENTRADA: eventos de CLIENTE solo gratuitos; suma de cupos <= capacidad_total del evento.
CREATE OR REPLACE FUNCTION fn_nivel_entrada_validaciones() RETURNS TRIGGER AS $$
DECLARE
    tipo_creador tipo_usuario_t;
    cap_total    INTEGER;
    suma_cupo    INTEGER;
BEGIN
    SELECT u.tipo_usuario, e.capacidad_total INTO tipo_creador, cap_total
    FROM EVENTO e JOIN USUARIO u ON u.numero_identificacion = e.id_creador
    WHERE e.codigo = NEW.codigo_evento;

    IF tipo_creador = 'CLIENTE' AND NEW.precio <> 0 THEN
        RAISE EXCEPTION 'Los eventos creados por un CLIENTE solo pueden tener niveles de entrada gratuitos';
    END IF;

    SELECT COALESCE(SUM(cupo), 0) INTO suma_cupo
    FROM NIVEL_ENTRADA
    WHERE codigo_evento = NEW.codigo_evento AND id_nivel <> COALESCE(NEW.id_nivel, -1);

    IF suma_cupo + NEW.cupo > cap_total THEN
        RAISE EXCEPTION 'La suma de cupos (%) excede la capacidad_total del evento (%)', suma_cupo + NEW.cupo, cap_total;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nivel_entrada_validaciones
    BEFORE INSERT OR UPDATE ON NIVEL_ENTRADA
    FOR EACH ROW EXECUTE FUNCTION fn_nivel_entrada_validaciones();

-- TICKET: edad mínima, verificación biométrica aprobada, un ticket activo por evento, cupo del nivel.
CREATE OR REPLACE FUNCTION fn_ticket_validaciones() RETURNS TRIGGER AS $$
DECLARE
    v_codigo_evento        VARCHAR(20);
    v_edad_minima          SMALLINT;
    v_cupo                 INTEGER;
    v_fecha_nacimiento     DATE;
    v_biometrica_aprobada  BOOLEAN;
    v_tickets_activos      INTEGER;
    v_tickets_nivel        INTEGER;
BEGIN
    -- Cancelar un ticket no debe volver a exigir edad/verificación/cupo: solo se revalidan
    -- altas reales o cambios de nivel, nunca una transición hacia 'Cancelado'.
    IF TG_OP = 'UPDATE' AND NEW.estado = 'Cancelado' THEN
        RETURN NEW;
    END IF;

    SELECT ne.codigo_evento, ne.cupo INTO v_codigo_evento, v_cupo
    FROM NIVEL_ENTRADA ne WHERE ne.id_nivel = NEW.id_nivel;

    SELECT e.edad_minima INTO v_edad_minima FROM EVENTO e WHERE e.codigo = v_codigo_evento;
    SELECT c.fecha_nacimiento INTO v_fecha_nacimiento FROM CLIENTE c WHERE c.numero_identificacion = NEW.id_cliente;

    IF DATE_PART('year', AGE(v_fecha_nacimiento)) < v_edad_minima THEN
        RAISE EXCEPTION 'El cliente % no cumple la edad mínima (%) del evento', NEW.id_cliente, v_edad_minima;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM VERIFICACION v
        JOIN VERIF_BIOMETRICA vb ON vb.id_verificacion = v.id_verificacion
        WHERE v.numero_identificacion = NEW.id_cliente AND v.estado = 'Aprobada'
    ) INTO v_biometrica_aprobada;

    IF NOT v_biometrica_aprobada THEN
        RAISE EXCEPTION 'El cliente % no tiene una verificación biométrica Aprobada', NEW.id_cliente;
    END IF;

    SELECT COUNT(*) INTO v_tickets_activos
    FROM TICKET t JOIN NIVEL_ENTRADA ne2 ON ne2.id_nivel = t.id_nivel
    WHERE t.id_cliente = NEW.id_cliente AND ne2.codigo_evento = v_codigo_evento
      AND t.estado <> 'Cancelado' AND t.id_ticket <> COALESCE(NEW.id_ticket, -1);

    IF v_tickets_activos > 0 THEN
        RAISE EXCEPTION 'El cliente % ya tiene un ticket activo para el evento %', NEW.id_cliente, v_codigo_evento;
    END IF;

    SELECT COUNT(*) INTO v_tickets_nivel
    FROM TICKET
    WHERE id_nivel = NEW.id_nivel AND estado <> 'Cancelado' AND id_ticket <> COALESCE(NEW.id_ticket, -1);

    IF v_tickets_nivel + 1 > v_cupo THEN
        RAISE EXCEPTION 'No hay cupo disponible en el nivel %', NEW.id_nivel;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_validaciones
    BEFORE INSERT OR UPDATE OF id_nivel, estado ON TICKET
    FOR EACH ROW EXECUTE FUNCTION fn_ticket_validaciones();

-- Sincroniza TICKET.estado = 'Cancelado' al registrar la cancelación.
CREATE OR REPLACE FUNCTION fn_ticket_marcar_cancelado() RETURNS TRIGGER AS $$
BEGIN
    UPDATE TICKET SET estado = 'Cancelado' WHERE id_ticket = NEW.id_ticket;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_marcar_cancelado
    AFTER INSERT ON CANCELACION_TICKET
    FOR EACH ROW EXECUTE FUNCTION fn_ticket_marcar_cancelado();

-- RESENA: solo quien tiene un ticket en estado 'Usado' puede reseñar ese evento.
CREATE OR REPLACE FUNCTION fn_resena_validacion() RETURNS TRIGGER AS $$
DECLARE
    v_tiene_usado BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM TICKET t JOIN NIVEL_ENTRADA ne ON ne.id_nivel = t.id_nivel
        WHERE t.id_cliente = NEW.id_cliente AND ne.codigo_evento = NEW.codigo_evento AND t.estado = 'Usado'
    ) INTO v_tiene_usado;

    IF NOT v_tiene_usado THEN
        RAISE EXCEPTION 'Solo puede reseñar un evento quien tiene un ticket en estado Usado';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_resena_validacion
    BEFORE INSERT ON RESENA
    FOR EACH ROW EXECUTE FUNCTION fn_resena_validacion();

-- CANCELACION_EVENTO / CANCELACION_TICKET: motivo obligatorio si la causa lo exige.
CREATE OR REPLACE FUNCTION fn_cancelacion_motivo_requerido() RETURNS TRIGGER AS $$
DECLARE
    v_requiere BOOLEAN;
BEGIN
    SELECT requiere_detalle INTO v_requiere FROM CAUSA_CANCELACION WHERE id_causa = NEW.id_causa;
    IF v_requiere AND (NEW.motivo IS NULL OR BTRIM(NEW.motivo) = '') THEN
        RAISE EXCEPTION 'La causa seleccionada exige escribir un motivo';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cancelacion_evento_motivo
    BEFORE INSERT OR UPDATE ON CANCELACION_EVENTO
    FOR EACH ROW EXECUTE FUNCTION fn_cancelacion_motivo_requerido();

CREATE TRIGGER trg_cancelacion_ticket_motivo
    BEFORE INSERT OR UPDATE ON CANCELACION_TICKET
    FOR EACH ROW EXECUTE FUNCTION fn_cancelacion_motivo_requerido();

-- VERIFICACION: actualiza fecha_actualizacion cuando cambia el estado.
CREATE OR REPLACE FUNCTION fn_verificacion_fecha_actualizacion() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado <> OLD.estado THEN
        NEW.fecha_actualizacion := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_verificacion_fecha_actualizacion
    BEFORE UPDATE ON VERIFICACION
    FOR EACH ROW EXECUTE FUNCTION fn_verificacion_fecha_actualizacion();

-- ==================================================================================================================
-- Fin del esquema.
-- ==================================================================================================================
