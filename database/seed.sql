-- ==================================================================================================================
-- ElDesparche — Datos de prueba (SEED) para database/schema_ElDesparche.sql (cargar después de ese esquema)
-- Cuentas de prueba (contraseña Desparche2026!): admin@, cliente1@, cliente2@, agente1@, agente2@eldesparche.test
-- Se ejecuta en una sola transacción: los triggers diferidos (herencia total, detalle de verificación)
-- se validan al COMMIT.
-- ==================================================================================================================

BEGIN;

-- ==================================================================================================================
-- GEOGRAFÍA
-- ==================================================================================================================

INSERT INTO PAIS (nombre) VALUES ('Colombia');

INSERT INTO DEPARTAMENTO (nombre, id_pais) VALUES
('Valle del Cauca', 1),   -- 1
('Cundinamarca',    1),   -- 2
('Antioquia',       1),   -- 3
('Atlántico',       1);   -- 4

INSERT INTO CIUDAD (nombre, id_departamento) VALUES
('Cali',         1),      -- 1
('Tuluá',        1),      -- 2
('Palmira',      1),      -- 3
('Bogotá D.C.',  2),      -- 4
('Soacha',       2),      -- 5
('Medellín',     3),      -- 6
('Barranquilla', 4);      -- 7

INSERT INTO UBICACION (direccion, latitud, longitud, id_ciudad) VALUES
('Carrera 5 #6-05, Centro',            3.451647, -76.532000, 1),   -- 1 Cali
('Calle 10 #3-16, La Candelaria',      4.597900, -74.075800, 4),   -- 2 Bogotá
('Avenida 6N #28-10, Granada',         3.459500, -76.534000, 1),   -- 3 Cali
('Carrera 43A #1 Sur-100, El Poblado', 6.208700, -75.566400, 6),   -- 4 Medellín
('Carrera 25 #26-30, Centro',          4.084700, -76.195400, 2);   -- 5 Tuluá

-- ==================================================================================================================
-- USUARIOS (supertipo) y subtipos
-- ==================================================================================================================

INSERT INTO USUARIO (numero_identificacion, tipo_identificacion, tipo_usuario, nombre, apellidos, correo, contrasena_hash, direccion, id_ciudad) VALUES
('1000000001', 'CC',  'ADMIN',   'Ana María', 'Administradora Prueba', 'admin@eldesparche.test',    crypt('Desparche2026!', gen_salt('bf', 10)), 'Centro Administrativo, Carrera 7 #32-16', 4),
('1000000002', 'CC',  'CLIENTE', 'Camilo',    'Rojas Prueba',          'cliente1@eldesparche.test', crypt('Desparche2026!', gen_salt('bf', 10)), 'Calle 5 #10-20',                         1),
('1000000003', 'CC',  'CLIENTE', 'Laura',     'Gómez Prueba',          'cliente2@eldesparche.test', crypt('Desparche2026!', gen_salt('bf', 10)), 'Carrera 10 #5-15',                       2),
('900111222',  'NIT', 'AGENTE',  'Pacífico',  'Producciones',          'agente1@eldesparche.test',  crypt('Desparche2026!', gen_salt('bf', 10)), 'Avenida Principal #100',                 1),
('900333444',  'NIT', 'AGENTE',  'Capital',   'Eventos',               'agente2@eldesparche.test',  crypt('Desparche2026!', gen_salt('bf', 10)), 'Calle Comercial #50',                    4);

INSERT INTO TELEFONO_USUARIO (numero_identificacion, telefono) VALUES
('1000000001', '3001112233'),
('1000000002', '3105556677'),
('1000000002', '6022345678'),
('1000000003', '3204448899'),
('900111222',  '3157778899'),
('900333444',  '3012223344');

INSERT INTO ADMIN (numero_identificacion, salario, horario) VALUES
('1000000001', 4500000, 'Completa');

INSERT INTO CLIENTE (numero_identificacion, fecha_nacimiento, foto_perfil, alias, puntos, publicidad) VALUES
('1000000002', '1995-03-12', NULL, 'camilo_r', 120, TRUE),
('1000000003', '1998-07-30', NULL, 'laura_g',   40, FALSE);

INSERT INTO AGENTE (numero_identificacion, nit, razon_social, nombre_comercial, descripcion, logo_url, comision, experiencia) VALUES
('900111222', '900111222-1', 'Pacífico Producciones S.A.S.', 'Pacífico Producciones', 'Conciertos y festivales del suroccidente', NULL, 10.00, 8),
('900333444', '900333444-5', 'Capital Eventos S.A.S.',       'Capital Eventos',       'Teatro y espectáculos en la capital',      NULL,  8.50, 5);

INSERT INTO SESION_ADMIN (numero_identificacion, fecha_hora_conexion, fecha_hora_desconexion, direccion_ip) VALUES
('1000000001', '2026-10-01 08:00', '2026-10-01 09:30', '190.24.10.5'),
('1000000001', '2026-10-02 14:10', '2026-10-02 15:00', '190.24.10.5');

-- ==================================================================================================================
-- VERIFICACIÓN (los clientes necesitan la de contacto aprobada para reservar)
-- ==================================================================================================================

INSERT INTO VERIFICACION (tipo, estado, fecha_solicitud, fecha_actualizacion, numero_identificacion) VALUES
('Contacto', 'Aprobada', '2026-09-20 10:00', '2026-09-20 10:05', '1000000002'),   -- 1
('Contacto', 'Aprobada', '2026-09-21 11:00', '2026-09-21 11:03', '1000000003'),   -- 2
('Contacto', 'Pendiente', NOW(),             NOW(),               '900111222');   -- 3

INSERT INTO VERIF_CONTACTO (id_verificacion, codigo_hash, fecha_expiracion, intentos) VALUES
(1, crypt('482915', gen_salt('bf', 8)), '2026-09-20 10:15', 1),
(2, crypt('730264', gen_salt('bf', 8)), '2026-09-21 11:15', 1),
(3, crypt('159357', gen_salt('bf', 8)), NOW() + INTERVAL '15 minutes', 0);

-- ==================================================================================================================
-- CAUSAS DE CANCELACIÓN
-- ==================================================================================================================

INSERT INTO CAUSA_CANCELACION (nombre, aplica_a) VALUES
('Baja venta de entradas',                  'EVENTO'),    -- 1
('Fuerza mayor o clima',                    'EVENTO'),    -- 2
('Problemas técnicos o logísticos',         'EVENTO'),    -- 3
('Solicitud del cliente',                   'RESERVA'),   -- 4
('Pago no realizado a tiempo',              'RESERVA'),   -- 5
('Reprogramación o cambio de fecha',        'AMBOS');     -- 6

-- ==================================================================================================================
-- EVENTOS
-- ==================================================================================================================

INSERT INTO EVENTO (codigo, nombre, descripcion, categoria, fecha_hora_inicio, fecha_hora_fin, capacidad_total, edad_minima, observaciones, estado, precio, id_ubicacion, id_agente, id_causa) VALUES
('EVT-2026-0001', 'Concierto Música Colombiana',    'Gran concierto de artistas nacionales',      'musica',  '2026-11-15 19:00', '2026-11-15 23:00', 500,  0, 'Evento importante',  'Programado',   50000, 1, '900111222', NULL),
('EVT-2026-0002', 'Festival de Teatro Alternativo', 'Presentación de obras experimentales',      'teatro',  '2026-12-01 18:30', '2026-12-01 22:30', 300, 18, 'Para público adulto', 'Programado',   30000, 2, '900333444', NULL),
('EVT-2026-0003', 'Obra de Teatro Infantil',        'Función especial para niños y familias',    'teatro',  '2026-11-22 10:00', '2026-11-22 12:00', 200,  0, 'Apto para menores',  'En Boletería', 15000, 3, '900111222', NULL),
('EVT-2026-0004', 'Recital de Poesía',              'Poetas nacionales comparten sus obras',     'teatro',  '2026-11-20 19:00', '2026-11-20 21:00', 100,  0, 'Evento literario',   'Programado',   20000, 2, '900333444', NULL),
('EVT-2026-0005', 'Noche de Comedia en Medellín',   'Stand-up con humoristas invitados',         'comedia', '2026-10-30 20:00', '2026-10-30 22:30', 250, 16, 'Cancelado por clima', 'Cancelado',    35000, 4, '900333444', 2);

-- ==================================================================================================================
-- RESERVAS  (valor_total lo calcula el trigger: numero_entradas × precio del evento)
-- ==================================================================================================================

INSERT INTO RESERVA (numero_entradas, observaciones, estado, id_cliente, codigo_evento, id_causa) VALUES
(2, 'Asientos preferidos',    'Confirmada', '1000000002', 'EVT-2026-0001', NULL),   -- 1
(3, 'Entrada para familia',   'Reservada',  '1000000002', 'EVT-2026-0003', NULL),   -- 2
(1, 'Entrada estándar',       'Confirmada', '1000000003', 'EVT-2026-0002', NULL),   -- 3
(1, 'Ya no puede asistir',    'Cancelada',  '1000000002', 'EVT-2026-0004', 4),      -- 4
(2, 'Evento cancelado',       'Cancelada',  '1000000003', 'EVT-2026-0005', 6);      -- 5

-- ==================================================================================================================
-- MÉTODOS DE PAGO Y PAGOS
-- ==================================================================================================================

INSERT INTO METODO_PAGO (tipo, proveedor, referencia_visible, token_pasarela, activo, id_cliente) VALUES
('Tarjeta crédito', 'Visa',  '4242', 'tok_test_visa_4242',  TRUE, '1000000002'),   -- 1
('Billetera digital', 'Nequi', NULL, 'tok_test_nequi_0001', TRUE, '1000000003');   -- 2

INSERT INTO PAGO (monto, referencia_transaccion, estado, id_reserva, id_metodo) VALUES
(100000, 'TX-2026-000001', 'Aprobado', 1, 1),
( 30000, 'TX-2026-000002', 'Aprobado', 3, 2);

-- ==================================================================================================================
-- CONEXIÓN SOCIAL
-- ==================================================================================================================

INSERT INTO CONEXION_SOCIAL (id_solicitante, id_receptor, estado) VALUES
('1000000002', '1000000003', 'Aceptada');

COMMIT;
