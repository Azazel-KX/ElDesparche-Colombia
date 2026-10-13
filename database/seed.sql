-- ==================================================================================================================
-- ElDesparche - Datos de prueba (DESARROLLO LOCAL)
-- Requiere haber ejecutado antes database/schema.sql. Ejecutar una sola vez sobre una base vacía.
-- Los eventos, lugares y niveles salen de frontend/data/eventos.json.
-- Contraseña de TODAS las cuentas de prueba: Desparche2026!   (solo para desarrollo; no usar en producción)
--   admin@eldesparche.test | cliente1@eldesparche.test | cliente2@eldesparche.test
--   empresa1@eldesparche.test | empresa2@eldesparche.test
-- ==================================================================================================================

BEGIN;

-- Geografía --------------------------------------------------------------------------------------------------------
INSERT INTO PAIS (id_pais, nombre) VALUES (1, 'Colombia');

INSERT INTO DEPARTAMENTO (id_departamento, codigo_dane, nombre, id_pais) VALUES
  (1, '11', 'Bogotá D.C.', 1),
  (2, '05', 'Antioquia', 1),
  (3, '76', 'Valle del Cauca', 1),
  (4, '08', 'Atlántico', 1),
  (5, '68', 'Santander', 1),
  (6, '25', 'Cundinamarca', 1),
  (7, '13', 'Bolívar', 1);

INSERT INTO CIUDAD (id_ciudad, codigo_dane, nombre, id_departamento) VALUES
  (1, '11001', 'Bogotá', 1),
  (2, '05001', 'Medellín', 2),
  (3, '76001', 'Cali', 3),
  (4, '08001', 'Barranquilla', 4),
  (5, '68001', 'Bucaramanga', 5),
  (6, '25326', 'Guatavita', 6),
  (7, '13001', 'Cartagena', 7);

-- Categorías -------------------------------------------------------------------------------------------------------
INSERT INTO CATEGORIA (id_categoria, nombre) VALUES
  (1, 'Música'),
  (2, 'Circo'),
  (3, 'Danza'),
  (4, 'Teatro'),
  (5, 'Comedia');

-- Ubicaciones (usuarios y lugares) --------------------------------------------------------------------------------
INSERT INTO UBICACION (id_ubicacion, direccion, coordenadas, id_ciudad) VALUES
  (1, 'Calle 100 # 15-20', ST_SetSRID(ST_MakePoint(-74.042, 4.686), 4326)::geography, 1),
  (2, 'Carrera 7 # 45-12', ST_SetSRID(ST_MakePoint(-74.064, 4.638), 4326)::geography, 1),
  (3, 'Carrera 43A # 14-50', ST_SetSRID(ST_MakePoint(-75.571, 6.209), 4326)::geography, 2),
  (4, 'Avenida 6N # 25-30', ST_SetSRID(ST_MakePoint(-76.53, 3.465), 4326)::geography, 3),
  (5, 'Calle 72 # 10-34', ST_SetSRID(ST_MakePoint(-74.059, 4.659), 4326)::geography, 1),
  (6, 'Parque La Florida, Bogotá', ST_SetSRID(ST_MakePoint(-74.0721, 4.711), 4326)::geography, 1),
  (7, 'Movistar Arena Medellín, Medellín', ST_SetSRID(ST_MakePoint(-75.5812, 6.2442), 4326)::geography, 2),
  (8, 'Parque El Country, Bogotá', ST_SetSRID(ST_MakePoint(-74.0579, 4.6604), 4326)::geography, 1),
  (9, 'Centro de Eventos Valle Pacífico, Cali', ST_SetSRID(ST_MakePoint(-76.532, 3.4516), 4326)::geography, 3),
  (10, 'Cali Exposhow, Cali', ST_SetSRID(ST_MakePoint(-76.5246, 3.4172), 4326)::geography, 3),
  (11, 'Teatro Amira de la Rosa, Barranquilla', ST_SetSRID(ST_MakePoint(-74.7813, 10.9685), 4326)::geography, 4),
  (12, 'Coliseo El Campin Norte, Bucaramanga', ST_SetSRID(ST_MakePoint(-73.1198, 7.1254), 4326)::geography, 5),
  (13, 'Parque Norte, Medellín', ST_SetSRID(ST_MakePoint(-75.5701, 6.2602), 4326)::geography, 2),
  (14, 'Estadio Atanasio Girardot, Medellín', ST_SetSRID(ST_MakePoint(-75.59, 6.2567), 4326)::geography, 2),
  (15, 'Teatro Jorge Eliécer Gaitán, Bogotá', ST_SetSRID(ST_MakePoint(-74.0739, 4.6122), 4326)::geography, 1),
  (16, 'Parque de la Música, Cali', ST_SetSRID(ST_MakePoint(-76.5417, 3.4333), 4326)::geography, 3),
  (17, 'Hacienda La Fragua, Guatavita Reservoirs', ST_SetSRID(ST_MakePoint(-73.832, 4.934), 4326)::geography, 6);

-- Usuarios (todos con la contraseña de prueba) ----------------------------------------------------------------------
INSERT INTO USUARIO (numero_identificacion, tipo_identificacion, nombres, apellidos, tipo_usuario, correo, contrasena_hash, id_ubicacion) VALUES
  ('1000000001', 'CC',  'Ana María',   'Administradora Prueba', 'ADMIN',   'admin@eldesparche.test',    crypt('Desparche2026!', gen_salt('bf', 10)), 1),
  ('1000000002', 'CC',  'Camilo',      'Rojas Prueba',          'CLIENTE', 'cliente1@eldesparche.test', crypt('Desparche2026!', gen_salt('bf', 10)), 2),
  ('1000000003', 'CC',  'Laura',       'Gómez Prueba',          'CLIENTE', 'cliente2@eldesparche.test', crypt('Desparche2026!', gen_salt('bf', 10)), 3),
  ('900111222',  'NIT', 'Pacífico',    'Producciones',          'EMPRESA', 'empresa1@eldesparche.test', crypt('Desparche2026!', gen_salt('bf', 10)), 4),
  ('900333444',  'NIT', 'Capital',     'Eventos',               'EMPRESA', 'empresa2@eldesparche.test', crypt('Desparche2026!', gen_salt('bf', 10)), 5);

INSERT INTO ADMIN (numero_identificacion, salario, horario) VALUES ('1000000001', 3500000, 'Completa');

INSERT INTO CLIENTE (numero_identificacion, fecha_nacimiento, alias) VALUES
  ('1000000002', '1998-05-14', 'camilo_r'),
  ('1000000003', '2001-11-03', 'laurag');

INSERT INTO EMPRESA (numero_identificacion, nit, razon_social, nombre_comercial, descripcion, comision_fija) VALUES
  ('900111222', '900111222-1', 'Pacífico Producciones S.A.S.', 'Pacífico Producciones', 'Producción de eventos musicales y de danza en el suroccidente.', 5000),
  ('900333444', '900333444-5', 'Capital Eventos Ltda.',        'Capital Eventos',        'Conciertos y teatro en Bogotá y Cundinamarca.', 7500);

INSERT INTO TELEFONO_USUARIO (numero_identificacion, telefono) VALUES
  ('1000000001', '3001112233'), ('1000000002', '3101234567'), ('1000000003', '3209876543'),
  ('900111222', '6024445566'), ('900333444', '6017778899');

INSERT INTO CATEGORIA_CLIENTE (id_cliente, id_categoria) VALUES ('1000000002', 1), ('1000000002', 3), ('1000000003', 4);
INSERT INTO CATEGORIA_EMPRESA (id_empresa, id_categoria) VALUES ('900111222', 1), ('900111222', 3), ('900333444', 1), ('900333444', 4);

-- Lugares ----------------------------------------------------------------------------------------------------------
INSERT INTO LUGAR (id_lugar, nombre, capacidad_maxima, url_imagen, id_ubicacion) VALUES
  (1, 'Parque La Florida', 85000, 'img/27459.png', 6),
  (2, 'Movistar Arena Medellín', 14000, 'img/6554e.png', 7),
  (3, 'Parque El Country', 30000, 'img/d7016.png', 8),
  (4, 'Centro de Eventos Valle Pacífico', 5000, 'img/12935.png', 9),
  (5, 'Cali Exposhow', 40000, 'img/337fd.png', 10),
  (6, 'Teatro Amira de la Rosa', 1200, 'img/5fb48.png', 11),
  (7, 'Coliseo El Campin Norte', 8000, 'img/67c1c.png', 12),
  (8, 'Parque Norte', 20000, 'img/7d702.png', 13),
  (9, 'Estadio Atanasio Girardot', 45000, 'img/33202.png', 14),
  (10, 'Teatro Jorge Eliécer Gaitán', 3500, 'img/1c2e7.png', 15),
  (11, 'Parque de la Música', 25000, 'img/94bcf.png', 16),
  (12, 'Hacienda La Fragua', 2000, 'img/1cbb3.png', 17);

-- Eventos ----------------------------------------------------------------------------------------------------------
INSERT INTO EVENTO (codigo, nombre, descripcion, id_categoria, url_imagen, fecha_hora_inicio, fecha_hora_fin, capacidad_total, edad_minima, observaciones, estado, id_creador, id_lugar) VALUES
  ('EVT-001', 'Festival Estéreo Picnic', 'Cuatro días de música, cultura y experiencias inolvidables. Artistas nacionales e internacionales se encuentran en Bogotá para celebrar una nueva edición del festival más grande del país.', 1, 'img/27459.png', '2027-03-20 16:00:00', '2027-03-23 02:00:00', 85000, 14, 'Ingreso para mayores de 14 años. Apertura de puertas a las 2:00 p. m.', 'En Boletería', '900333444', 1),
  ('EVT-002', 'Morat - Antes de que amanezca', 'Morat regresa a Colombia con su tour más íntimo y personal. Una noche cargada de emoción, canciones y momentos irrepetibles.', 1, 'img/6554e.png', '2026-10-18 20:00:00', '2026-10-19 00:00:00', 14000, 0, 'No se permite ingreso de menores de 12 años sin acompañante.', 'En Vivo', '900111222', 2),
  ('EVT-003', 'Jazz al Parque', 'El festival de jazz más importante de Bogotá vuelve al parque para deleitar a los amantes de la música con lo mejor del género.', 1, 'img/d7016.png', '2026-11-07 14:00:00', '2026-11-08 22:00:00', 30000, 0, 'Evento gratuito. Aforo limitado.', 'Programado', '1000000002', 3),
  ('EVT-004', 'Circo del Sol - KOOZA', 'El Circo del Sol trae a Colombia KOOZA, un show de acrobacias, humor y magia que conquista todos los sentidos.', 2, 'img/12935.png', '2026-12-14 19:00:00', '2026-12-14 22:00:00', 5000, 0, 'Espectáculo apto para todas las edades.', 'En Boletería', '900111222', 4),
  ('EVT-005', 'Festival Mundial de Salsa', 'La capital mundial de la salsa celebró su tradicional festival con los mejores bailarines y orquestas del planeta.', 3, 'img/337fd.png', '2026-09-25 16:00:00', '2026-09-28 04:00:00', 40000, 0, 'Evento finalizado. Gracias por su participación.', 'Finalizado', '900111222', 5),
  ('EVT-006', 'Macondo, la obra', 'Una adaptación teatral de la obra cumbre de García Márquez. Una producción colombiana que recorre los 100 años de Macondo en escena.', 4, 'img/5fb48.png', '2026-10-02 19:30:00', '2026-10-02 22:00:00', 1200, 0, 'Se recomienda llegar 30 minutos antes de la función.', 'Programado', '900111222', 6),
  ('EVT-007', 'Lokillo - Eso era antes', 'La gira Eso era antes de Lokillo fue cancelada por causas de fuerza mayor. Contacta al punto de venta para tu reembolso.', 5, 'img/67c1c.png', '2026-11-16 20:00:00', '2026-11-16 23:00:00', 8000, 0, 'Evento cancelado. Se realizarán devoluciones en los próximos 10 días hábiles.', 'Cancelado', '900333444', 7),
  ('EVT-008', 'Ritvales 2026', 'El festival de experiencias alternativas más esperado del año vuelve a Medellín con una propuesta que une música, arte y tecnología.', 1, 'img/7d702.png', '2026-11-01 17:00:00', '2026-11-02 03:00:00', 20000, 0, 'Menores de 16 años deben ir acompañados de un adulto.', 'Programado', '900111222', 8),
  ('EVT-009', 'Zona Estéreo Urbano 2026', 'Una noche de electrónica, rap y pop urbano en el corazón de Medellín. El festival que unifica todos los géneros urbanos en una sola tarima.', 1, 'img/33202.png', '2026-10-08 18:00:00', '2026-10-09 01:00:00', 45000, 0, 'Evento con consumo mínimo en zonas VIP.', 'En Boletería', '900111222', 9),
  ('EVT-010', 'Batallas Épicas de Rap', 'Las mejores batallas de rap freestyle de Colombia se dan cita en Bogotá. Competencia oficial con clasificación nacional.', 1, 'img/1c2e7.png', '2026-10-12 17:00:00', '2026-10-12 23:00:00', 3500, 0, 'Evento abierto a todos los públicos. Menores deben ir con adulto.', 'Programado', '900333444', 10),
  ('EVT-011', 'Cali Salsa Festival', 'El ritmo de Cali al máximo. Un festival que reúne las mejores orquestas y bailarines de salsa de todo el mundo en la sucursal del cielo.', 3, 'img/94bcf.png', '2026-10-19 15:00:00', '2026-10-20 02:00:00', 25000, 0, 'Espectáculo de salsa caleña con artistas internacionales.', 'Programado', '900111222', 11),
  ('EVT-012', 'Concierto Acústico Campestre', 'Una jornada de música acústica y naturaleza en los alrededores del embalse del Tominé. Un descanso del ruido de la ciudad.', 1, 'img/1cbb3.png', '2026-11-02 11:00:00', '2026-11-02 19:00:00', 2000, 0, 'Evento al aire libre. Se recomienda ropa cómoda y protector solar.', 'Programado', '900333444', 12);

-- Niveles de entrada -----------------------------------------------------------------------------------------------
INSERT INTO NIVEL_ENTRADA (nombre, precio, cupo, codigo_evento) VALUES
  ('General', 480000, 3642, 'EVT-001'),
  ('VIP', 960000, 200, 'EVT-001'),
  ('General', 165000, 1000, 'EVT-002'),
  ('VIP', 330000, 200, 'EVT-002'),
  ('Gratuita', 0, 30000, 'EVT-003'),
  ('General', 210000, 820, 'EVT-004'),
  ('General', 85000, 100, 'EVT-005'),
  ('General', 72000, 350, 'EVT-006'),
  ('General', 68000, 100, 'EVT-007'),
  ('General', 295000, 7200, 'EVT-008'),
  ('General', 120000, 12000, 'EVT-009'),
  ('General', 45000, 900, 'EVT-010'),
  ('General', 95000, 5600, 'EVT-011'),
  ('General', 55000, 420, 'EVT-012');

-- Organizadores y patrocinadores ------------------------------------------------------------------------------------
INSERT INTO ORGANIZA (id_empresa, codigo_evento, rol) VALUES
  ('900111222', 'EVT-001', 'patrocinador'),
  ('900333444', 'EVT-002', 'coorganizador');

-- Causas de cancelación y cancelación del evento 7 (estado Cancelado) ------------------------------------------------
INSERT INTO CAUSA_CANCELACION (id_causa, nombre, aplica_a, requiere_detalle) VALUES
  (1, 'Baja venta de boletas',          'EVENTO', FALSE),
  (2, 'Fuerza mayor',                   'AMBOS',  TRUE),
  (3, 'Cambio de planes del cliente',   'TICKET', FALSE),
  (4, 'Error al realizar la reserva',   'TICKET', FALSE);

INSERT INTO CANCELACION_EVENTO (codigo_evento, motivo, id_causa) VALUES
  ('EVT-007', 'Cancelado por baja venta de boletas.', 1);

-- Verificación biométrica aprobada (requisito para tener tickets) ---------------------------------------------------
INSERT INTO VERIFICACION (id_verificacion, tipo, estado, numero_identificacion) VALUES
  (1, 'Biométrica', 'Aprobada', '1000000002'),
  (2, 'Biométrica', 'Aprobada', '1000000003');

INSERT INTO VERIF_BIOMETRICA (id_verificacion, url_documento_frente, url_documento_reverso, url_selfie,
                              puntaje_coincidencia, prueba_vida, numero_documento_leido, fecha_nacimiento_leida,
                              fecha_vencimiento_doc, fecha_autorizacion_datos) VALUES
  (1, 'mock/doc-frente-1.png', 'mock/doc-reverso-1.png', 'mock/selfie-1.png', 97.50, TRUE, '1000000002', '1998-05-14', '2030-01-01', NOW()),
  (2, 'mock/doc-frente-2.png', 'mock/doc-reverso-2.png', 'mock/selfie-2.png', 95.10, TRUE, '1000000003', '2001-11-03', '2031-01-01', NOW());

-- Pagos --------------------------------------------------------------------------------------------------------------
INSERT INTO PROVEEDOR_PAGO (id_proveedor, nombre) VALUES (1, 'Wompi'), (2, 'PayU');

INSERT INTO METODO_PAGO (id_metodo, tipo, id_proveedor, referencia_visible, token_pasarela, id_cliente) VALUES
  (1, 'Tarjeta crédito', 1, '4242', 'tok_prueba_cliente1_0001', '1000000002'),
  (2, 'Transferencia bancaria', 2, '1111', 'tok_prueba_cliente2_0001', '1000000003');

-- Tickets (reservas) de prueba ---------------------------------------------------------------------------------------
-- Los ids de nivel se resuelven por evento y nombre para no depender del orden de inserción.
INSERT INTO TICKET (precio_pagado, estado, id_cliente, id_nivel)
SELECT ne.precio, t.estado::estado_ticket_t, t.cliente, ne.id_nivel
  FROM (VALUES
          ('EVT-001', 'General', 'Reservado',  '1000000002'),
          ('EVT-009', 'General', 'Confirmado', '1000000002'),
          ('EVT-005', 'General', 'Usado',      '1000000002'),
          ('EVT-002', 'VIP',     'Confirmado', '1000000003'),
          ('EVT-004', 'General', 'Reservado',  '1000000003')
       ) AS t(evento, nivel, estado, cliente)
  JOIN NIVEL_ENTRADA ne ON ne.codigo_evento = t.evento AND ne.nombre = t.nivel::nivel_entrada_t;

INSERT INTO PAGO (monto, referencia_transaccion, estado, id_ticket, id_metodo)
SELECT t.precio_pagado, 'REF-PRUEBA-' || t.id_ticket, 'Aprobado', t.id_ticket,
       CASE WHEN t.id_cliente = '1000000002' THEN 1 ELSE 2 END
  FROM TICKET t WHERE t.estado IN ('Confirmado', 'Usado');

INSERT INTO RESENA (calificacion, comentario, id_cliente, codigo_evento)
VALUES (5, 'Excelente producción y buena organización.', '1000000002', 'EVT-005');

-- Reinicio de las secuencias (se insertaron ids explícitos) -------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('pais', 'id_pais'),                    (SELECT MAX(id_pais) FROM PAIS));
SELECT setval(pg_get_serial_sequence('departamento', 'id_departamento'),    (SELECT MAX(id_departamento) FROM DEPARTAMENTO));
SELECT setval(pg_get_serial_sequence('ciudad', 'id_ciudad'),                (SELECT MAX(id_ciudad) FROM CIUDAD));
SELECT setval(pg_get_serial_sequence('categoria', 'id_categoria'),          (SELECT MAX(id_categoria) FROM CATEGORIA));
SELECT setval(pg_get_serial_sequence('ubicacion', 'id_ubicacion'),          (SELECT MAX(id_ubicacion) FROM UBICACION));
SELECT setval(pg_get_serial_sequence('lugar', 'id_lugar'),                  (SELECT MAX(id_lugar) FROM LUGAR));
SELECT setval(pg_get_serial_sequence('causa_cancelacion', 'id_causa'),      (SELECT MAX(id_causa) FROM CAUSA_CANCELACION));
SELECT setval(pg_get_serial_sequence('verificacion', 'id_verificacion'),    (SELECT MAX(id_verificacion) FROM VERIFICACION));
SELECT setval(pg_get_serial_sequence('proveedor_pago', 'id_proveedor'),     (SELECT MAX(id_proveedor) FROM PROVEEDOR_PAGO));
SELECT setval(pg_get_serial_sequence('metodo_pago', 'id_metodo'),           (SELECT MAX(id_metodo) FROM METODO_PAGO));

COMMIT;
