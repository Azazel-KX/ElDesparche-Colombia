-- ==================================================================================================================
-- ElDesparche — Datos de prueba (SEED) para database/schema_ElDesparche.sql (cargar después de ese esquema)
-- Cuentas de prueba (contraseña Desparche2026!): admin@, cliente1@, cliente2@, agente1@, agente2@eldesparche.test
-- Se ejecuta en una sola transacción: los triggers diferidos (herencia total) se validan al COMMIT.
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
-- USUARIOS (supertipo), teléfonos y subtipos
-- ==================================================================================================================

-- El perfil (ADMIN, CLIENTE o AGENTE) lo define la tabla de subtipo en la que se inserta cada usuario.
INSERT INTO USUARIO (numero_identificacion, tipo_identificacion, nombre_completo, correo, contrasena_hash, direccion, id_ciudad) VALUES
('1000000001', 'CC',  'Ana María Administradora Prueba', 'admin@eldesparche.test',    crypt('Desparche2026!', gen_salt('bf', 10)), 'Centro Administrativo, Carrera 7 #32-16', 4),   -- ADMIN
('1000000002', 'CC',  'Camilo Rojas Prueba',             'cliente1@eldesparche.test', crypt('Desparche2026!', gen_salt('bf', 10)), 'Calle 5 #10-20',                         1),   -- CLIENTE
('1000000003', 'CC',  'Laura Gómez Prueba',              'cliente2@eldesparche.test', crypt('Desparche2026!', gen_salt('bf', 10)), 'Carrera 10 #5-15',                       2),   -- CLIENTE
('900111222',  'NIT', 'Pacífico Producciones',           'agente1@eldesparche.test',  crypt('Desparche2026!', gen_salt('bf', 10)), 'Avenida Principal #100',                 1),   -- AGENTE
('900333444',  'NIT', 'Capital Eventos',                 'agente2@eldesparche.test',  crypt('Desparche2026!', gen_salt('bf', 10)), 'Calle Comercial #50',                    4);   -- AGENTE

INSERT INTO USUARIO_TELEFONO (numero_identificacion, telefono) VALUES
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

-- ==================================================================================================================
-- EVENTOS
-- ==================================================================================================================

INSERT INTO EVENTO (codigo, nombre, descripcion, categoria, teatro, fecha_hora_inicio, fecha_hora_fin, capacidad_total, edad_minima, observaciones, estado, precio, id_ubicacion, numero_identificacion) VALUES
('EVT-2026-0001', 'Concierto Música Colombiana',    'Gran concierto de artistas nacionales',   'musica',  'Teatro Municipal Enrique Buenaventura', '2026-11-15 19:00', '2026-11-15 23:00', 500,  0, 'Evento importante',   'Programado',   50000, 1, '900111222'),
('EVT-2026-0002', 'Festival de Teatro Alternativo', 'Presentación de obras experimentales',   'teatro',  'Teatro La Candelaria',                   '2026-12-01 18:30', '2026-12-01 22:30', 300, 18, 'Para público adulto', 'Programado',   30000, 2, '900333444'),
('EVT-2026-0003', 'Obra de Teatro Infantil',        'Función especial para niños y familias', 'teatro',  'Teatro Jorge Isaacs',                    '2026-11-22 10:00', '2026-11-22 12:00', 200,  0, 'Apto para menores',   'En Boletería', 15000, 3, '900111222'),
('EVT-2026-0004', 'Recital de Poesía',              'Poetas nacionales comparten sus obras',  'teatro',  'Teatro La Candelaria',                   '2026-11-20 19:00', '2026-11-20 21:00', 100,  0, 'Evento literario',    'Programado',   20000, 2, '900333444'),
('EVT-2026-0005', 'Noche de Comedia en Medellín',   'Stand-up con humoristas invitados',      'comedia', 'Teatro Pablo Tobón Uribe',               '2026-10-30 20:00', '2026-10-30 22:30', 250, 16,
 'Cancelado por el agente. Causa: Fuerza mayor o clima. Detalle: tormenta eléctrica en la ciudad.', 'Cancelado', 35000, 4, '900333444');

-- ==================================================================================================================
-- RESERVAS  (valor_total lo calcula el trigger: numero_entradas × precio del evento + tarifa de Wompi)
-- La causa de las canceladas va en observaciones, con el mismo formato que escribe la web.
-- ==================================================================================================================

INSERT INTO RESERVA (numero_entradas, observaciones, estado, numero_identificacion, codigo_evento) VALUES
(2, 'Asientos preferidos',  'Confirmada', '1000000002', 'EVT-2026-0001'),   -- 1: 100.000 + 3.987 de tarifa = 103.987
(3, 'Entrada para familia', 'Reservada',  '1000000002', 'EVT-2026-0003'),   -- 2:  45.000 + 2.252 = 47.252
(1, 'Entrada estándar',     'Confirmada', '1000000003', 'EVT-2026-0002'),   -- 3:  30.000 + 1.779 = 31.779
(1, 'Cancelada por el cliente. Causa: No puede asistir.',
                            'Cancelada',  '1000000002', 'EVT-2026-0004'),   -- 4
(2, 'Cancelada por el administrador. Causa: Otra causa. Detalle: el evento se canceló.',
                            'Cancelada',  '1000000003', 'EVT-2026-0005');   -- 5

-- ==================================================================================================================
-- MÉTODOS DE PAGO Y PAGOS
-- ==================================================================================================================

INSERT INTO METODO_PAGO (tipo, proveedor, referencia_visible, token_pasarela, activo, numero_identificacion) VALUES
('Tarjeta crédito', 'Visa',  '4242', 'tok_test_visa_4242',  TRUE, '1000000002'),   -- 1
('Billetera digital', 'Nequi', NULL, 'tok_test_nequi_0001', TRUE, '1000000003');   -- 2

INSERT INTO PAGO (monto, referencia_transaccion, estado, id_reserva, id_metodo) VALUES
(103987, 'TX-2026-000001', 'Aprobado', 1, 1),   -- igual al valor_total de la reserva 1
( 31779, 'TX-2026-000002', 'Aprobado', 3, 2);   -- igual al valor_total de la reserva 3

COMMIT;
