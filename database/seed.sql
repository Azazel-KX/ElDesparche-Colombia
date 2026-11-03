-- ==================================================================================================================
-- ElDesparche — SEMILLA (datos de ejemplo)                                              database/seed.sql
-- ==================================================================================================================
--
-- ¿QUÉ ES?
--   El esquema (schema_ElDesparche.sql) crea las tablas vacías; este archivo las llena con datos de ejemplo para
--   poder ver y probar la web. Es la ÚNICA semilla del proyecto: no hay que elegir entre varias.
--
-- ¿CÓMO SE CARGA?   Después del esquema y sobre una base recién creada (la guía completa está en database/README.md):
--       docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/seed.sql
--   o, sin psql (también para Neon), desde backend/:   npm run bd:cargar
--   Todo corre en UNA transacción (BEGIN ... COMMIT): si algo falla, no queda nada a medias.
--
-- ¿QUÉ TRAE?
--   8 países · 33 departamentos · 46 ciudades · 47 sitios para eventos
--   2 administradores · 10 agentes · 33 clientes   (45 usuarios, cada uno en exactamente un subtipo)
--   68 eventos (EVT-2026-0001 a 0068, en todos los estados, con las fotos de frontend/img)
--   283 reservas (en los 4 estados; un evento casi agotado y otro agotado)
--
-- ¿EN QUÉ ORDEN ESTÁ?   Primero lo que no depende de nada y después lo que apunta a lo anterior. Una llave foránea
--   (FK) solo puede apuntar a una fila que ya existe, por eso el orden no se puede cambiar:
--
--       1. GEOGRAFÍA      PAIS → DEPARTAMENTO → CIUDAD → UBICACION
--       2. PERSONAS       USUARIO (+ USUARIO_TELEFONO) y su subtipo: ADMIN, AGENTE o CLIENTE
--       3. EVENTOS        EVENTO  (apunta a una UBICACION y a un AGENTE)
--       4. RESERVAS       RESERVA (apunta a un CLIENTE y a un EVENTO)
--
-- DOS IDEAS PARA LEERLO FÁCIL
--   a) Los datos se escriben con NOMBRES y no con números de id. Por ejemplo, un usuario dice 'Cali' y no
--      id_ciudad = 1. Cada INSERT hace un JOIN para buscar el id real. Así se entiende a simple vista y no se
--      rompe si cambia el orden de las filas.
--   b) Cada tabla se llena con  INSERT ... SELECT ... FROM (VALUES ...) AS v(...) JOIN ...  : el VALUES es la lista
--      de datos (lo que se lee) y el JOIN traduce los nombres a ids.
--
-- CUENTAS DE PRUEBA (todas con la contraseña  Desparche2026!  y el dominio  @eldesparche.test)
--   admin@, admin2@                  administradores
--   agente1@ a agente10@             agentes   (agente3 y agente10: pendientes de aprobación; agente9: suspendido)
--   cliente1@ a cliente3@            clientes  (cliente3: bloqueado)
--   cliente04@ a cliente33@          clientes  (cliente20: bloqueado; del 29 al 33 viven en el exterior)
--   Una cuenta Pendiente, Suspendida o Bloqueada no puede iniciar sesión.
--
-- FECHAS: las de los eventos son RELATIVAS al día en que se carga (CURRENT_DATE + días), así casi todos quedan en
--   el futuro. Los códigos, en cambio, son fijos. Si la base se cargó hace meses, recárgala para refrescar las fechas.
--
-- PRUEBAS AUTOMÁTICAS: tanto database/pruebas_bd.sql como backend/test cuentan con estos datos tal como están
--   (por ejemplo, las 5 primeras reservas y los eventos EVT-2026-0001 a 0007). Si cambias algo, corre las pruebas.
-- ==================================================================================================================

BEGIN;

-- ==================================================================================================================
-- 0. AYUDAS TEMPORALES (tablas que viven solo durante esta carga; se borran al final)
-- ==================================================================================================================

-- La contraseña de todas las cuentas es la misma. bcrypt es lento a propósito, así que se calcula UNA vez aquí y
-- cada usuario reutiliza el resultado.
CREATE TEMP TABLE _clave AS SELECT crypt('Desparche2026!', gen_salt('bf', 10)) AS hash;

-- ==================================================================================================================
-- 1. GEOGRAFÍA:  PAIS → DEPARTAMENTO → CIUDAD → UBICACION
--    Primero van los 4 departamentos y 7 ciudades principales de Colombia; después, el resto.
-- ==================================================================================================================

-- 1.1 Países
INSERT INTO PAIS (nombre) VALUES
    ('Colombia'),
    ('Perú'),
    ('México'),
    ('Argentina'),
    ('Ecuador'),
    ('Chile'),
    ('España'),
    ('Estados Unidos');

-- 1.2 Departamentos (o estados/regiones): cada uno dice a qué país pertenece
INSERT INTO DEPARTAMENTO (nombre, id_pais)
SELECT v.departamento, p.id_pais
  FROM (VALUES
    ('Valle del Cauca',      'Colombia'),
    ('Cundinamarca',         'Colombia'),
    ('Antioquia',            'Colombia'),
    ('Atlántico',            'Colombia'),
    ('Bolívar',              'Colombia'),
    ('Santander',            'Colombia'),
    ('Risaralda',            'Colombia'),
    ('Caldas',               'Colombia'),
    ('Quindío',              'Colombia'),
    ('Norte de Santander',   'Colombia'),
    ('Nariño',               'Colombia'),
    ('Cauca',                'Colombia'),
    ('Tolima',               'Colombia'),
    ('Magdalena',            'Colombia'),
    ('Huila',                'Colombia'),
    ('Boyacá',               'Colombia'),
    ('Meta',                 'Colombia'),
    ('Lima',                 'Perú'),
    ('Cusco',                'Perú'),
    ('Arequipa',             'Perú'),
    ('Ciudad de México',     'México'),
    ('Jalisco',              'México'),
    ('Nuevo León',           'México'),
    ('Buenos Aires',         'Argentina'),
    ('Córdoba',              'Argentina'),
    ('Santa Fe',             'Argentina'),
    ('Pichincha',            'Ecuador'),
    ('Guayas',               'Ecuador'),
    ('Región Metropolitana', 'Chile'),
    ('Valparaíso',           'Chile'),
    ('Madrid',               'España'),
    ('Cataluña',             'España'),
    ('Florida',              'Estados Unidos')
  ) AS v(departamento, pais)
  JOIN PAIS p ON p.nombre = v.pais;

-- 1.3 Ciudades: cada una dice su departamento (y su país, para ubicar el departamento correcto)
INSERT INTO CIUDAD (nombre, id_departamento)
SELECT v.ciudad, d.id_departamento
  FROM (VALUES
    ('Cali',             'Valle del Cauca',      'Colombia'),
    ('Tuluá',            'Valle del Cauca',      'Colombia'),
    ('Palmira',          'Valle del Cauca',      'Colombia'),
    ('Bogotá D.C.',      'Cundinamarca',         'Colombia'),
    ('Soacha',           'Cundinamarca',         'Colombia'),
    ('Medellín',         'Antioquia',            'Colombia'),
    ('Barranquilla',     'Atlántico',            'Colombia'),
    ('Cartagena',        'Bolívar',              'Colombia'),
    ('Bucaramanga',      'Santander',            'Colombia'),
    ('Pereira',          'Risaralda',            'Colombia'),
    ('Manizales',        'Caldas',               'Colombia'),
    ('Armenia',          'Quindío',              'Colombia'),
    ('Cúcuta',           'Norte de Santander',   'Colombia'),
    ('Pasto',            'Nariño',               'Colombia'),
    ('Popayán',          'Cauca',                'Colombia'),
    ('Ibagué',           'Tolima',               'Colombia'),
    ('Santa Marta',      'Magdalena',            'Colombia'),
    ('Neiva',            'Huila',                'Colombia'),
    ('Tunja',            'Boyacá',               'Colombia'),
    ('Villavicencio',    'Meta',                 'Colombia'),
    ('Envigado',         'Antioquia',            'Colombia'),
    ('Rionegro',         'Antioquia',            'Colombia'),
    ('Chía',             'Cundinamarca',         'Colombia'),
    ('Zipaquirá',        'Cundinamarca',         'Colombia'),
    ('Buga',             'Valle del Cauca',      'Colombia'),
    ('Cartago',          'Valle del Cauca',      'Colombia'),
    ('Buenaventura',     'Valle del Cauca',      'Colombia'),
    ('Soledad',          'Atlántico',            'Colombia'),
    ('Lima',             'Lima',                 'Perú'),
    ('Callao',           'Lima',                 'Perú'),
    ('Cusco',            'Cusco',                'Perú'),
    ('Arequipa',         'Arequipa',             'Perú'),
    ('Ciudad de México', 'Ciudad de México',     'México'),
    ('Guadalajara',      'Jalisco',              'México'),
    ('Monterrey',        'Nuevo León',           'México'),
    ('Buenos Aires',     'Buenos Aires',         'Argentina'),
    ('La Plata',         'Buenos Aires',         'Argentina'),
    ('Córdoba',          'Córdoba',              'Argentina'),
    ('Rosario',          'Santa Fe',             'Argentina'),
    ('Quito',            'Pichincha',            'Ecuador'),
    ('Guayaquil',        'Guayas',               'Ecuador'),
    ('Santiago',         'Región Metropolitana', 'Chile'),
    ('Viña del Mar',     'Valparaíso',           'Chile'),
    ('Madrid',           'Madrid',               'España'),
    ('Barcelona',        'Cataluña',             'España'),
    ('Miami',            'Florida',              'Estados Unidos')
  ) AS v(ciudad, departamento, pais)
  JOIN PAIS         p ON p.nombre = v.pais
  JOIN DEPARTAMENTO d ON d.id_pais = p.id_pais AND d.nombre = v.departamento;

-- 1.4 Ubicaciones: los sitios donde se hacen los eventos (la base admite cualquier coordenada del planeta).
--     Cada sitio lleva una "clave" corta (cali_centro, bogota_candelaria...) que usan los eventos más abajo para
--     referirse a él sin repetir la dirección. La tabla temporal _sitio solo guarda esa clave mientras dura la carga.
CREATE TEMP TABLE _sitio (
    orden     SERIAL,
    clave     VARCHAR(30),
    direccion VARCHAR(200),
    latitud   NUMERIC(9,6),
    longitud  NUMERIC(9,6),
    ciudad    VARCHAR(80)
);

INSERT INTO _sitio (clave, direccion, latitud, longitud, ciudad) VALUES
    ('cali_centro',       'Carrera 5 #6-05, Centro',                               3.451647, -76.532000, 'Cali'),
    ('bogota_candelaria', 'Calle 10 #3-16, La Candelaria',                         4.597900, -74.075800, 'Bogotá D.C.'),
    ('cali_granada',      'Avenida 6N #28-10, Granada',                            3.459500, -76.534000, 'Cali'),
    ('medellin_poblado',  'Carrera 43A #1 Sur-100, El Poblado',                    6.208700, -75.566400, 'Medellín'),
    ('tulua_centro',      'Carrera 25 #26-30, Centro',                             4.084700, -76.195400, 'Tuluá'),
    ('cartagena1',        'Plaza de la Aduana, Centro Histórico',                  10.4236,  -75.5513,   'Cartagena'),
    ('cartagena2',        'Calle del Arsenal #8B-45, Getsemaní',                   10.4204,  -75.5469,   'Cartagena'),
    ('bucara',            'Carrera 27 #36-14, Teatro Santander',                   7.1193,   -73.1227,   'Bucaramanga'),
    ('pereira',           'Plaza de Bolívar, Carrera 7 #18-55',                    4.8133,   -75.6961,   'Pereira'),
    ('manizales',         'Carrera 22 #33-20, Teatro Los Fundadores',              5.0703,   -75.5138,   'Manizales'),
    ('armenia',           'Parque de la Vida, Avenida Bolívar',                    4.5339,   -75.6811,   'Armenia'),
    ('cucuta',            'Avenida 0 #10-44, Centro',                              7.8939,   -72.5078,   'Cúcuta'),
    ('pasto',             'Plaza de Nariño, Calle 18 #25-02',                      1.2136,   -77.2811,   'Pasto'),
    ('popayan',           'Calle 5 #4-68, Centro Histórico',                       2.4448,   -76.6147,   'Popayán'),
    ('ibague',            'Carrera 3 #10-50, Teatro Tolima',                       4.4389,   -75.2322,   'Ibagué'),
    ('santamarta',        'Carrera 1C #20-30, El Rodadero',                        11.2,     -74.23,     'Santa Marta'),
    ('neiva',             'Parque Santander, Calle 8 #5-30',                       2.9273,   -75.2819,   'Neiva'),
    ('tunja',             'Carrera 9 #19-30, Teatro Maldonado',                    5.5353,   -73.3678,   'Tunja'),
    ('villavo',           'Parque Los Libertadores, Calle 38',                     4.142,    -73.6266,   'Villavicencio'),
    ('medellin1',         'Calle 41 #57-30, Parque Norte',                         6.2711,   -75.5689,   'Medellín'),
    ('medellin2',         'Calle 44 #52-165, Plaza Mayor',                         6.2431,   -75.5754,   'Medellín'),
    ('envigado',          'Carrera 43A #37 Sur-05, Parque Principal',              6.1711,   -75.5917,   'Envigado'),
    ('rionegro',          'Calle 49 #50-12, Parque San Nicolás',                   6.1552,   -75.3743,   'Rionegro'),
    ('barranquilla1',     'Vía 40 #73-290, Puerta de Oro',                         11.0154,  -74.8078,   'Barranquilla'),
    ('barranquilla2',     'Carrera 54 #54-41, Teatro Amira de la Rosa',            10.9885,  -74.7961,   'Barranquilla'),
    ('bogota1',           'Calle 10 #5-32, Teatro Colón',                          4.5964,   -74.0742,   'Bogotá D.C.'),
    ('bogota2',           'Calle 63 #11-97, Chapinero',                            4.6486,   -74.0627,   'Bogotá D.C.'),
    ('bogota3',           'Calle 63 #59A-06, Parque Simón Bolívar',                4.658,    -74.0937,   'Bogotá D.C.'),
    ('chia',              'Carrera 11 #11-30, Parque Principal',                   4.8614,   -74.0326,   'Chía'),
    ('zipaquira',         'Plaza de los Comuneros, Centro',                        5.0225,   -74.0046,   'Zipaquirá'),
    ('cali1',             'Calle 5 #38-71, Coliseo del Pueblo',                    3.4311,   -76.547,    'Cali'),
    ('cali2',             'Calle 9 #23-40, Plaza de Toros Cañaveralejo',           3.429,    -76.547,    'Cali'),
    ('palmira',           'Calle 29 #26-30, Teatro Municipal',                     3.5394,   -76.3036,   'Palmira'),
    ('tulua',             'Calle 26 #24-18, Centro Cultural',                      4.084,    -76.195,    'Tuluá'),
    ('buga',              'Plaza de la Basílica del Señor de los Milagros',        3.9009,   -76.2978,   'Buga'),
    ('cartago',           'Calle 11 #5-20, Parque Principal',                      4.7464,   -75.9117,   'Cartago'),
    ('soledad',           'Calle 30 #19-24, Parque Cultural',                      10.9184,  -74.7646,   'Soledad'),
    ('buenaventura',      'Malecón Bahía de la Cruz',                              3.8801,   -77.0312,   'Buenaventura'),
    ('lima',              'Avenida Javier Prado Este 1500, San Borja',             -12.0903, -77.0071,   'Lima'),
    ('cdmx',              'Avenida Paseo de la Reforma 50, Cuauhtémoc',            19.4284,  -99.1676,   'Ciudad de México'),
    ('buenosaires',       'Avenida Corrientes 1530, Teatro San Martín',            -34.604,  -58.3869,   'Buenos Aires'),
    ('santiago',          'Avenida Libertador Bernardo O''Higgins 1000, Centro',   -33.444,  -70.65,     'Santiago'),
    ('quito',             'Avenida Patria y 12 de Octubre, Parque La Carolina',    -0.183,   -78.484,    'Quito'),
    ('guayaquil',         'Malecón 2000, Avenida Simón Bolívar',                   -2.196,   -79.88,     'Guayaquil'),
    ('madrid',            'Calle de Alcalá 20, Teatro de la Zarzuela',             40.418,   -3.699,     'Madrid'),
    ('barcelona',         'Avinguda de la Reina Maria Cristina, Recinto Montjuïc', 41.3711,  2.1527,     'Barcelona'),
    ('miami',             '601 Biscayne Boulevard, Bayfront Park',                 25.774,   -80.186,    'Miami');

INSERT INTO UBICACION (direccion, latitud, longitud, id_ciudad)
SELECT s.direccion, s.latitud, s.longitud, c.id_ciudad
  FROM _sitio s
  JOIN CIUDAD c ON c.nombre = s.ciudad
 ORDER BY s.orden;

-- ==================================================================================================================
-- 2. PERSONAS:  USUARIO (supertipo) y ADMIN / AGENTE / CLIENTE (subtipos)
--
--    Todo el que entra al sistema es un USUARIO (correo, contraseña, ciudad...). Lo que lo hace administrador, agente
--    o cliente es la fila que tenga en una de las tres tablas de subtipo, que usa el MISMO numero_identificacion como
--    llave primaria. No existe una columna "tipo_usuario".
--    Por eso cada grupo se escribe en tres pasos que se leen en el mismo orden:
--        (1) USUARIO  → (2) USUARIO_TELEFONO  → (3) su subtipo
--    Un trigger revisa al COMMIT que cada usuario quedó en exactamente un subtipo.
--    Las columnas con valores fijos (tipo de documento, estado de la cuenta, jornada) son tipos ENUM del esquema.
-- ==================================================================================================================

-- ------------------------------------------------------------------------------------------------------------------
-- 2.1 Administradores
-- ------------------------------------------------------------------------------------------------------------------

INSERT INTO USUARIO (numero_identificacion, tipo_identificacion, nombre_completo, correo, contrasena_hash, direccion, id_ciudad, estado_usuario)
SELECT v.documento, v.tipo::tipo_identificacion_t, v.nombre, v.correo, clave.hash, v.direccion, c.id_ciudad, v.estado::estado_usuario_t
  FROM (VALUES
    ('1000000001', 'CC', 'Ana María Administradora Prueba', 'admin@eldesparche.test',  'Centro Administrativo, Carrera 7 #32-16', 'Bogotá D.C.', 'Activo'),
    ('1000000011', 'CC', 'Sergio Andrés Valencia Mora',     'admin2@eldesparche.test', 'Calle 26 #13-19',                         'Bogotá D.C.', 'Activo')
  ) AS v(documento, tipo, nombre, correo, direccion, ciudad, estado)
  CROSS JOIN _clave AS clave
  JOIN CIUDAD c ON c.nombre = v.ciudad;

INSERT INTO USUARIO_TELEFONO (numero_identificacion, telefono) VALUES
    ('1000000001', '3001112233'),
    ('1000000011', '3002223344');

INSERT INTO ADMIN (numero_identificacion, salario, horario) VALUES
    ('1000000001', 4500000, 'Completa'),
    ('1000000011', 3800000, 'Tarde');

-- ------------------------------------------------------------------------------------------------------------------
-- 2.2 Agentes (organizan y publican eventos). Su documento es el NIT de la empresa.
--     Pendiente = se registró solo y espera aprobación · Suspendido = un administrador le quitó el acceso
-- ------------------------------------------------------------------------------------------------------------------

INSERT INTO USUARIO (numero_identificacion, tipo_identificacion, nombre_completo, correo, contrasena_hash, direccion, id_ciudad, estado_usuario)
SELECT v.documento, v.tipo::tipo_identificacion_t, v.nombre, v.correo, clave.hash, v.direccion, c.id_ciudad, v.estado::estado_usuario_t
  FROM (VALUES
    ('900111222', 'NIT', 'Pacífico Producciones',          'agente1@eldesparche.test',  'Avenida Principal #100',      'Cali',          'Activo'),
    ('900333444', 'NIT', 'Capital Eventos',                'agente2@eldesparche.test',  'Calle Comercial #50',         'Bogotá D.C.',   'Activo'),
    ('900555666', 'NIT', 'Luna Llena Teatro',              'agente3@eldesparche.test',  'Carrera 50 #20-10',           'Medellín',      'Pendiente'),
    ('901000001', 'NIT', 'Caribe Sound Producciones',      'agente4@eldesparche.test',  'Calle 33 #8-45, Centro',      'Cartagena',     'Activo'),
    ('901000002', 'NIT', 'Andes Cultura',                  'agente5@eldesparche.test',  'Carrera 70 #44-12, Laureles', 'Medellín',      'Activo'),
    ('901000003', 'NIT', 'Eje Cafetero Live',              'agente6@eldesparche.test',  'Avenida Circunvalar #6-30',   'Pereira',       'Activo'),
    ('901000004', 'NIT', 'Santander Escénica',             'agente7@eldesparche.test',  'Carrera 33 #45-60, Cabecera', 'Bucaramanga',   'Activo'),
    ('901000005', 'NIT', 'Carnaval Eventos del Atlántico', 'agente8@eldesparche.test',  'Calle 72 #52-10, El Prado',   'Barranquilla',  'Activo'),
    ('901000006', 'NIT', 'Sur Andino Teatro',              'agente9@eldesparche.test',  'Calle 19 #24-31, Centro',     'Pasto',         'Suspendido'),
    ('901000007', 'NIT', 'Llanos Producciones',            'agente10@eldesparche.test', 'Carrera 22 #8-45, Barzal',    'Villavicencio', 'Pendiente')
  ) AS v(documento, tipo, nombre, correo, direccion, ciudad, estado)
  CROSS JOIN _clave AS clave
  JOIN CIUDAD c ON c.nombre = v.ciudad;

INSERT INTO USUARIO_TELEFONO (numero_identificacion, telefono) VALUES
    ('900111222', '3157778899'),
    ('900333444', '3012223344'),
    ('900555666', '3023334455'),
    ('901000001', '3101000001'),
    ('901000002', '3101000002'),
    ('901000003', '3101000003'),
    ('901000004', '3101000004'),
    ('901000005', '3101000005'),
    ('901000006', '3101000006'),
    ('901000007', '3101000007');

-- comision = porcentaje que cobra la plataforma · experiencia = años en el oficio
INSERT INTO AGENTE (numero_identificacion, nit, razon_social, nombre_comercial, descripcion, comision, experiencia) VALUES
    ('900111222', '900111222-1', 'Pacífico Producciones S.A.S.',          'Pacífico Producciones',          'Conciertos y festivales del suroccidente',           10.00,  8),
    ('900333444', '900333444-5', 'Capital Eventos S.A.S.',                'Capital Eventos',                'Teatro y espectáculos en la capital',                 8.50,  5),
    ('900555666', '900555666-3', 'Corporación Luna Llena',                'Luna Llena Teatro',              'Teatro infantil y de títeres',                        6.00,  7),
    ('901000001', '901000001-6', 'Caribe Sound Producciones S.A.S.',      'Caribe Sound Producciones',      'Festivales y conciertos del Caribe colombiano',       9.00, 11),
    ('901000002', '901000002-3', 'Andes Cultura S.A.S.',                  'Andes Cultura',                  'Teatro, danza y música en Antioquia',                 8.00,  9),
    ('901000003', '901000003-0', 'Eje Cafetero Live S.A.S.',              'Eje Cafetero Live',              'Conciertos y planes al aire libre del Eje Cafetero',  7.50,  6),
    ('901000004', '901000004-8', 'Santander Escénica Ltda.',              'Santander Escénica',             'Obras de teatro y comedia en Santander',              8.00, 12),
    ('901000005', '901000005-5', 'Carnaval Eventos del Atlántico S.A.S.', 'Carnaval Eventos del Atlántico', 'Danza, folclor y música de la costa',                10.00, 15),
    ('901000006', '901000006-2', 'Corporación Sur Andino',                'Sur Andino Teatro',              'Teatro y circo del suroccidente',                     5.00,  4),
    ('901000007', '901000007-1', 'Llanos Producciones S.A.S.',            'Llanos Producciones',            'Música llanera y eventos familiares',                 6.00,  2);

-- ------------------------------------------------------------------------------------------------------------------
-- 2.3 Clientes (compran entradas). Los últimos cinco viven en el exterior (pasaporte o cédula de extranjería).
--     Bloqueado = un administrador le quitó el acceso
-- ------------------------------------------------------------------------------------------------------------------

INSERT INTO USUARIO (numero_identificacion, tipo_identificacion, nombre_completo, correo, contrasena_hash, direccion, id_ciudad, estado_usuario)
SELECT v.documento, v.tipo::tipo_identificacion_t, v.nombre, v.correo, clave.hash, v.direccion, c.id_ciudad, v.estado::estado_usuario_t
  FROM (VALUES
    ('1000000002', 'CC',  'Camilo Rojas Prueba',        'cliente1@eldesparche.test',  'Calle 5 #10-20',   'Cali',             'Activo'),
    ('1000000003', 'CC',  'Laura Gómez Prueba',         'cliente2@eldesparche.test',  'Carrera 10 #5-15', 'Tuluá',            'Activo'),
    ('1000000004', 'CC',  'Mateo Fernández Ruiz',       'cliente3@eldesparche.test',  'Calle 98 #52-115', 'Barranquilla',     'Bloqueado'),
    ('1000000101', 'CC',  'Valentina Ríos Ocampo',      'cliente04@eldesparche.test', 'Calle 10 #20-30',  'Cali',             'Activo'),
    ('1000000102', 'CC',  'Santiago Herrera Lozano',    'cliente05@eldesparche.test', 'Calle 11 #21-31',  'Bogotá D.C.',      'Activo'),
    ('1000000103', 'CC',  'Mariana Castro Peña',        'cliente06@eldesparche.test', 'Calle 12 #22-32',  'Medellín',         'Activo'),
    ('1000000104', 'CC',  'Juan David Ospina Restrepo', 'cliente07@eldesparche.test', 'Calle 13 #23-33',  'Medellín',         'Activo'),
    ('1000000105', 'CC',  'Daniela Vargas Ibarra',      'cliente08@eldesparche.test', 'Calle 14 #24-34',  'Barranquilla',     'Activo'),
    ('1000000106', 'CC',  'Sebastián Mejía Cortés',     'cliente09@eldesparche.test', 'Calle 15 #25-35',  'Bogotá D.C.',      'Activo'),
    ('1000000107', 'CC',  'Camila Torres Navarro',      'cliente10@eldesparche.test', 'Calle 16 #26-36',  'Cartagena',        'Activo'),
    ('1000000108', 'CC',  'Andrés Felipe Gil Salcedo',  'cliente11@eldesparche.test', 'Calle 17 #27-37',  'Cali',             'Activo'),
    ('1000000109', 'CC',  'Isabella Moreno Duque',      'cliente12@eldesparche.test', 'Calle 18 #28-38',  'Pereira',          'Activo'),
    ('1000000110', 'CC',  'Mateo Cárdenas Villa',       'cliente13@eldesparche.test', 'Calle 19 #29-39',  'Bucaramanga',      'Activo'),
    ('1000000111', 'CC',  'Sofía Ramírez Echeverri',    'cliente14@eldesparche.test', 'Calle 20 #30-40',  'Manizales',        'Activo'),
    ('1000000112', 'CC',  'Nicolás Pardo Quiroga',      'cliente15@eldesparche.test', 'Calle 21 #31-41',  'Bogotá D.C.',      'Activo'),
    ('1000000113', 'CC',  'Luciana Duarte Mendoza',     'cliente16@eldesparche.test', 'Calle 22 #32-42',  'Cúcuta',           'Activo'),
    ('1000000114', 'CC',  'Felipe Salazar Ruiz',        'cliente17@eldesparche.test', 'Calle 23 #33-43',  'Cali',             'Activo'),
    ('1000000115', 'CC',  'Gabriela Londoño Arango',    'cliente18@eldesparche.test', 'Calle 24 #34-44',  'Medellín',         'Activo'),
    ('1000000116', 'CC',  'Tomás Arias Bermúdez',       'cliente19@eldesparche.test', 'Calle 25 #35-45',  'Armenia',          'Activo'),
    ('1000000117', 'CC',  'Natalia Quintero Marín',     'cliente20@eldesparche.test', 'Calle 26 #36-46',  'Santa Marta',      'Bloqueado'),
    ('1000000118', 'CC',  'Esteban Rueda Patiño',       'cliente21@eldesparche.test', 'Calle 27 #37-47',  'Ibagué',           'Activo'),
    ('1000000119', 'CC',  'Paula Andrea Cano Zapata',   'cliente22@eldesparche.test', 'Calle 28 #38-48',  'Medellín',         'Activo'),
    ('1000000120', 'CC',  'Julián Bedoya Henao',        'cliente23@eldesparche.test', 'Calle 29 #39-49',  'Pereira',          'Activo'),
    ('1000000121', 'CC',  'Manuela Giraldo Toro',       'cliente24@eldesparche.test', 'Calle 30 #40-50',  'Popayán',          'Activo'),
    ('1000000122', 'CC',  'Alejandro Peña Montoya',     'cliente25@eldesparche.test', 'Calle 31 #41-51',  'Tunja',            'Activo'),
    ('1000000123', 'CC',  'Laura Sofía Pinzón Rojas',   'cliente26@eldesparche.test', 'Calle 32 #42-52',  'Neiva',            'Activo'),
    ('1000000124', 'CC',  'Cristian Beltrán Acosta',    'cliente27@eldesparche.test', 'Calle 33 #43-53',  'Villavicencio',    'Activo'),
    ('1000000125', 'CC',  'Juliana Mora Franco',        'cliente28@eldesparche.test', 'Calle 34 #44-54',  'Tuluá',            'Activo'),
    ('AR8821734',  'PAS', 'Lucía Fernández Paz',        'cliente29@eldesparche.test', 'Calle 35 #45-55',  'Buenos Aires',     'Activo'),
    ('7001234',    'CE',  'Carlos Mendoza Quispe',      'cliente30@eldesparche.test', 'Calle 36 #46-56',  'Lima',             'Activo'),
    ('MX5530918',  'PAS', 'Ximena Ortiz Delgado',       'cliente31@eldesparche.test', 'Calle 37 #47-57',  'Ciudad de México', 'Activo'),
    ('CL7714502',  'PAS', 'Martín Rojas Fuentes',       'cliente32@eldesparche.test', 'Calle 38 #48-58',  'Santiago',         'Activo'),
    ('7002345',    'CE',  'Ana Belén Cevallos Mora',    'cliente33@eldesparche.test', 'Calle 39 #49-59',  'Quito',            'Activo')
  ) AS v(documento, tipo, nombre, correo, direccion, ciudad, estado)
  CROSS JOIN _clave AS clave
  JOIN CIUDAD c ON c.nombre = v.ciudad;

INSERT INTO USUARIO_TELEFONO (numero_identificacion, telefono) VALUES
    ('1000000002', '3105556677'),
    ('1000000002', '6022345678'),
    ('1000000003', '3204448899'),
    ('1000000101', '3111000101'),
    ('1000000102', '3111000102'),
    ('1000000103', '3111000103'),
    ('1000000104', '3111000104'),
    ('1000000105', '3111000105'),
    ('1000000106', '3111000106'),
    ('1000000107', '3111000107'),
    ('1000000108', '3111000108'),
    ('1000000109', '3111000109'),
    ('1000000110', '3111000110'),
    ('1000000111', '3111000111'),
    ('1000000112', '3111000112'),
    ('1000000113', '3111000113'),
    ('1000000114', '3111000114'),
    ('1000000115', '3111000115'),
    ('1000000116', '3111000116'),
    ('1000000117', '3111000117'),
    ('1000000118', '3111000118'),
    ('1000000119', '3111000119'),
    ('1000000120', '3111000120'),
    ('1000000121', '3111000121'),
    ('1000000122', '3111000122'),
    ('1000000123', '3111000123'),
    ('1000000124', '3111000124'),
    ('1000000125', '3111000125');

-- puntos = puntos de fidelidad · publicidad = acepta recibir publicidad
INSERT INTO CLIENTE (numero_identificacion, fecha_nacimiento, alias, puntos, publicidad) VALUES
    ('1000000002', '1995-03-12', 'camilo_r',      120, TRUE),
    ('1000000003', '1998-07-30', 'laura_g',        40, FALSE),
    ('1000000004', '1992-08-28', 'mateofr',         0, FALSE),
    ('1000000101', '1999-02-14', 'vale_rios',      80, TRUE),
    ('1000000102', '1996-06-03', 'santi_h',       150, TRUE),
    ('1000000103', '2001-11-21', 'mari_castro',    20, FALSE),
    ('1000000104', '1990-04-09', 'jdospina',      310, TRUE),
    ('1000000105', '2000-09-30', 'dani_v',         45, TRUE),
    ('1000000106', '1993-01-17', 'sebas_mejia',     0, FALSE),
    ('1000000107', '1998-12-05', 'cami_torres',    95, TRUE),
    ('1000000108', '1987-07-25', 'afgil',         220, TRUE),
    ('1000000109', '2002-03-08', 'isa_moreno',     60, TRUE),
    ('1000000110', '1995-10-12', 'mateo_c',        15, FALSE),
    ('1000000111', '1997-05-19', 'sofi_ramirez',  180, TRUE),
    ('1000000112', '1985-08-01', 'nico_pardo',    410, TRUE),
    ('1000000113', '2003-01-27', 'lu_duarte',      35, TRUE),
    ('1000000114', '1991-09-14', 'feli_salazar',   70, FALSE),
    ('1000000115', '1994-02-02', 'gabi_londono',  125, TRUE),
    ('1000000116', '1999-07-07', 'tomas_arias',    55, TRUE),
    ('1000000117', '1996-11-29', 'naty_quintero',  90, FALSE),
    ('1000000118', '1989-03-23', 'esteban_r',     260, TRUE),
    ('1000000119', '2000-06-18', 'paula_cano',     40, TRUE),
    ('1000000120', '1992-12-31', 'julian_b',      130, TRUE),
    ('1000000121', '2004-04-04', 'manu_giraldo',   10, TRUE),
    ('1000000122', '1988-10-10', 'ale_pena',      175, FALSE),
    ('1000000123', '1997-01-15', 'lau_pinzon',     85, TRUE),
    ('1000000124', '1994-08-22', 'cris_beltran',   25, TRUE),
    ('1000000125', '2001-05-30', 'juli_mora',      65, TRUE),
    ('AR8821734',  '1992-03-11', 'lucia_fp',       30, TRUE),
    ('7001234',    '1990-09-02', 'carlos_mq',      50, TRUE),
    ('MX5530918',  '1998-06-26', 'xime_ortiz',      0, FALSE),
    ('CL7714502',  '1986-12-13', 'martin_rf',      75, TRUE),
    ('7002345',    '2000-02-20', 'anabelen_cm',    20, TRUE);

-- ==================================================================================================================
-- 3. EVENTOS
--
--    Cada fila es un evento. Columnas de la lista, en orden:
--      codigo · nombre · descripcion · categoria · teatro (nombre del sitio) ·
--      dia (cuántos días desde hoy; negativo = ya pasó) · hora · duracion (en horas) · capacidad · edad (mínima) ·
--      estado · precio (0 = gratis) · sitio (clave de la sección 1.4) · agente (quién lo registró) · imagen · observaciones
--
--    Estados: En revisión y Rechazado (el agente lo envió y el administrador aún no lo aprueba, o lo rechazó) ·
--             Programado, En Boletería, En Vivo y Finalizado (ya publicados) · Cancelado.
--    El motivo de un rechazo o una cancelación se escribe en observaciones.
--    Las fotos son archivos que ya están en frontend/img; un evento sin imagen muestra img/evento-sin-foto.svg.
-- ==================================================================================================================

INSERT INTO EVENTO (codigo, nombre, descripcion, categoria, teatro, fecha_hora_inicio, fecha_hora_fin, capacidad_total, edad_minima,
                    observaciones, estado, precio, id_ubicacion, numero_identificacion, url_imagen, fecha_creacion)
SELECT v.codigo, v.nombre, v.descripcion, v.categoria, v.teatro,
       CURRENT_DATE + v.dia + v.hora::time,                                      -- empieza ese día a esa hora
       CURRENT_DATE + v.dia + v.hora::time + v.duracion * INTERVAL '1 hour',     -- y termina "duración" horas después
       v.capacidad, v.edad, v.observaciones, v.estado::estado_evento_t, v.precio,
       ub.id_ubicacion, v.agente, v.imagen,
       -- fecha en que el agente lo registró: unos 20 a 35 días antes (o antes del evento, si ya pasó)
       NOW() - make_interval(days => GREATEST(-v.dia, 0) + 20 + (substring(v.codigo from '[0-9]+$')::int % 15))
  FROM (VALUES
    ('EVT-2026-0001', 'Concierto Música Colombiana',                          'Gran concierto de artistas nacionales',                       'musica',  'Teatro Municipal Enrique Buenaventura', 25,  '19:00', 4,   500,  0,  'Programado',   50000,  'cali_centro',       '900111222', 'img/6554e.png',            'Evento importante'),
    ('EVT-2026-0002', 'Festival de Teatro Alternativo',                       'Presentación de obras experimentales',                        'teatro',  'Teatro La Candelaria',                  41,  '18:30', 4,   300,  18, 'Programado',   30000,  'bogota_candelaria', '900333444', 'img/5fb48.png',            'Para público adulto'),
    ('EVT-2026-0003', 'Obra de Teatro Infantil',                              'Función especial para niños y familias',                      'teatro',  'Teatro Jorge Isaacs',                   32,  '10:00', 2,   200,  0,  'En Boletería', 15000,  'cali_granada',      '900111222', 'img/12935.png',            'Apto para menores'),
    ('EVT-2026-0004', 'Recital de Poesía',                                    'Poetas nacionales comparten sus obras',                       'teatro',  'Teatro La Candelaria',                  30,  '19:00', 2,   100,  0,  'Programado',   20000,  'bogota_candelaria', '900333444', 'img/1cbb3.png',            'Evento literario'),
    ('EVT-2026-0005', 'Noche de Comedia en Medellín',                         'Stand-up con humoristas invitados',                           'comedia', 'Teatro Pablo Tobón Uribe',              9,   '20:00', 2.5, 250,  16, 'Cancelado',    35000,  'medellin_poblado',  '900333444', 'img/67c1c.png',            'Cancelado por el agente. Causa: Fuerza mayor o clima. Detalle: tormenta eléctrica en la ciudad.'),
    ('EVT-2026-0006', 'Festival de Títeres',                                  'Funciones de títeres para toda la familia',                   'teatro',  'Teatro Jorge Isaacs',                   115, '10:00', 3,   180,  0,  'En revisión',  18000,  'cali_granada',      '900111222', 'img/d7016.png',            'Apertura de puertas a las 9:30 a. m.'),
    ('EVT-2026-0007', 'Concierto de Metal Extremo',                           'Bandas nacionales de metal',                                  'musica',  'Coliseo de Prueba',                     150, '18:00', 5,   900,  18, 'Rechazado',    90000,  'bogota_candelaria', '900333444', 'img/1c2e7.png',            E'Solo para mayores de edad.\nRechazado por el administrador. Motivo: Falta el permiso de la alcaldía.'),
    ('EVT-2026-0008', 'Noches de Salsa en Cali',                              'Orquestas en vivo y pista abierta para bailar toda la noche', 'danza',   'Coliseo del Pueblo',                    12,  '20:00', 5,   600,  18, 'Programado',   45000,  'cali1',             '900111222', 'img/337fd.png',            'Se recomienda llegar temprano'),
    ('EVT-2026-0009', 'Festival Folclórico del Pacífico',                     'Danzas y música tradicional de la costa pacífica',            'danza',   'Plaza de la Basílica',                  38,  '16:00', 6,   800,  0,  'Programado',   25000,  'buga',              '900111222', 'img/94bcf.png',            NULL),
    ('EVT-2026-0010', 'Rock en el Parque Norte',                              'Tarde de bandas locales de rock',                             'musica',  'Parque Norte',                          21,  '15:00', 7,   1500, 14, 'En Boletería', 60000,  'medellin1',         '901000002', 'img/prensa/mundo-01.webp', 'Se permite el ingreso de bebidas sin alcohol'),
    ('EVT-2026-0011', 'Cumbia bajo las Estrellas',                            'Orquestas de cumbia y vallenato en la bahía',                 'musica',  'Plaza de la Aduana',                    27,  '19:30', 4,   900,  0,  'Programado',   38000,  'cartagena1',        '901000001', 'img/33202.png',            NULL),
    ('EVT-2026-0012', 'Festival de Teatro de Getsemaní',                      'Cinco obras en un solo fin de semana',                        'teatro',  'Calle del Arsenal',                     45,  '18:00', 4,   250,  12, 'Programado',   28000,  'cartagena2',        '901000001', 'img/5fb48.png',            NULL),
    ('EVT-2026-0013', 'Stand Up en Bucaramanga',                              'Cuatro comediantes en una noche de risas',                    'comedia', 'Teatro Santander',                      16,  '20:30', 2,   450,  16, 'Programado',   32000,  'bucara',            '901000004', 'img/67c1c.png',            NULL),
    ('EVT-2026-0014', 'Hip Hop al Parque',                                    'Batallas de freestyle y conciertos de rap',                   'musica',  'Parque Simón Bolívar',                  34,  '13:00', 8,   2000, 12, 'Programado',   0,      'bogota3',           '900333444', 'img/1c2e7.png',            'Entrada libre con inscripción'),
    ('EVT-2026-0015', 'Gran Concierto Pop Latino',                            'Los artistas del momento en una sola tarima',                 'musica',  'Parque Simón Bolívar',                  52,  '18:00', 5,   3000, 0,  'Programado',   120000, 'bogota3',           '900333444', 'img/6554e.png',            NULL),
    ('EVT-2026-0016', 'Circo de los Sueños',                                  'Acróbatas, trapecistas y payasos para toda la familia',       'circo',   'Parque Principal',                      19,  '17:00', 3,   350,  0,  'En Boletería', 22000,  'chia',              '900333444', 'img/12935.png',            'Apto para menores'),
    ('EVT-2026-0017', 'Tarde Acústica en el Parque',                          'Música en vivo para disfrutar en manta',                      'musica',  'Parque de la Vida',                     8,   '16:00', 4,   300,  0,  'En Boletería', 15000,  'armenia',           '901000003', 'img/d7016.png',            'Trae tu manta y tu termo'),
    ('EVT-2026-0018', 'Festival de Luces Electrónico',                        'Los mejores DJ con láser y pantallas gigantes',               'musica',  'Puerta de Oro',                         60,  '20:00', 7,   5000, 18, 'Programado',   150000, 'barranquilla1',     '901000005', 'img/7d702.png',            'Solo mayores de edad'),
    ('EVT-2026-0019', 'Carnaval del Atlántico en Concierto',                  'Comparsas y música folclórica de Barranquilla',               'danza',   'Teatro Amira de la Rosa',               70,  '19:00', 4,   700,  0,  'Programado',   42000,  'barranquilla2',     '901000005', 'img/94bcf.png',            NULL),
    ('EVT-2026-0020', 'Opera Prima: Obra Íntima',                             'Función exclusiva con cupos limitados',                       'teatro',  'Teatro Colón',                          14,  '19:30', 2,   40,   16, 'En Boletería', 55000,  'bogota1',           '900333444', 'img/5fb48.png',            'Casi agotado'),
    ('EVT-2026-0021', 'Festival Campestre de Verano',                         'Música, camping y fogata junto al río',                       'musica',  'Parque Principal',                      47,  '12:00', 10,  1200, 0,  'Programado',   70000,  'zipaquira',         '901000003', 'img/1cbb3.png',            NULL),
    ('EVT-2026-0022', 'Noche de Boleros',                                     'Un viaje por los boleros de siempre',                         'musica',  'Teatro Municipal',                      23,  '19:00', 3,   450,  18, 'Programado',   36000,  'palmira',           '900111222', 'img/prensa/mundo-08.webp', NULL),
    ('EVT-2026-0023', 'Maratón de Comedia Paisa',                             'Seis humoristas, una noche, cero descanso',                   'comedia', 'Plaza Mayor',                           33,  '20:00', 3,   1000, 16, 'Programado',   48000,  'medellin2',         '901000002', 'img/67c1c.png',            NULL),
    ('EVT-2026-0024', 'Danza Contemporánea: Raíces',                          'Compañía invitada con obra estrenada este año',               'danza',   'Teatro Los Fundadores',                 29,  '18:30', 2,   400,  0,  'Programado',   30000,  'manizales',         '901000003', 'img/337fd.png',            NULL),
    ('EVT-2026-0025', 'Música Llanera en Vivo',                               'Joropo, arpa y cuatro en el parque',                          'musica',  'Parque Los Libertadores',               36,  '17:00', 5,   800,  0,  'Programado',   20000,  'villavo',           '900111222', 'img/prensa/mundo-09.webp', NULL),
    ('EVT-2026-0026', 'Festival de Colores',                                  'Carrera de colores y música para todos',                      'musica',  'Parque Santander',                      40,  '10:00', 6,   1800, 0,  'Programado',   35000,  'neiva',             '901000003', 'img/prensa/mundo-17.webp', NULL),
    ('EVT-2026-0027', 'Rock Andino',                                          'Bandas de rock de Boyacá y Cundinamarca',                     'musica',  'Teatro Maldonado',                      25,  '19:00', 4,   500,  14, 'Programado',   30000,  'tunja',             '900333444', 'img/prensa/mundo-02.webp', NULL),
    ('EVT-2026-0028', 'Fiesta Electrónica en la Bahía',                       'House y techno frente al mar',                                'musica',  'El Rodadero',                           56,  '21:00', 8,   2500, 18, 'Programado',   110000, 'santamarta',        '901000001', 'img/prensa/mundo-06.webp', 'Solo mayores de edad'),
    ('EVT-2026-0029', 'Teatro en la Plaza',                                   'Función gratuita al aire libre',                              'teatro',  'Plaza de Nariño',                       18,  '17:00', 2,   600,  0,  'Programado',   0,      'pasto',             '900111222', 'img/5fb48.png',            NULL),
    ('EVT-2026-0030', 'Carnaval de Negros y Blancos: Gala',                   'Muestra artística de la tradición nariñense',                 'danza',   'Plaza de Nariño',                       80,  '15:00', 6,   1500, 0,  'Programado',   18000,  'pasto',             '900111222', 'img/94bcf.png',            NULL),
    ('EVT-2026-0031', 'Concierto Sinfónico Popular',                          'Orquesta sinfónica interpreta música colombiana',             'musica',  'Teatro Colón',                          43,  '18:00', 2,   700,  0,  'Programado',   40000,  'bogota1',           '900333444', 'img/27459.png',            NULL),
    ('EVT-2026-0032', 'Noche de Humor en Cúcuta',                             'Dos horas de monólogos',                                      'comedia', 'Avenida 0',                             26,  '20:00', 2,   350,  16, 'Programado',   25000,  'cucuta',            '901000004', 'img/67c1c.png',            NULL),
    ('EVT-2026-0033', 'Festival Pop Rock del Valle',                          'Cinco bandas, una sola noche',                                'musica',  'Plaza de Toros Cañaveralejo',           66,  '18:00', 6,   4000, 14, 'Programado',   95000,  'cali2',             '900111222', 'img/prensa/mundo-04.webp', NULL),
    ('EVT-2026-0034', 'Jazz en el Centro Histórico',                          'Cuartetos de jazz en una casona colonial',                    'musica',  'Centro Histórico',                      31,  '19:30', 3,   60,   16, 'Programado',   45000,  'popayan',           '900333444', 'img/prensa/mundo-12.webp', NULL),
    ('EVT-2026-0035', 'Música del Mundo en Rionegro',                         'Ensambles de cuatro continentes',                             'musica',  'Parque San Nicolás',                    49,  '16:00', 5,   900,  0,  'Programado',   33000,  'rionegro',          '901000002', 'img/prensa/mundo-05.webp', NULL),
    ('EVT-2026-0036', 'Tarde de Circo y Magia',                               'Magos y malabaristas',                                        'circo',   'Parque Principal',                      13,  '16:00', 3,   300,  0,  'En Boletería', 20000,  'envigado',          '901000002', 'img/12935.png',            'Apto para menores'),
    ('EVT-2026-0037', 'Noche de Tambores',                                    'Percusión del Pacífico',                                      'danza',   'Malecón Bahía de la Cruz',              58,  '18:30', 3,   700,  0,  'Programado',   15000,  'buenaventura',      '900111222', 'img/prensa/mundo-10.webp', NULL),
    ('EVT-2026-0038', 'Reggaetón Fest',                                       'Los grandes del género en vivo',                              'musica',  'Vía 40',                                74,  '19:00', 7,   6000, 16, 'Programado',   130000, 'barranquilla1',     '901000005', 'img/prensa/mundo-11.webp', NULL),
    ('EVT-2026-0039', 'Cantautores en Cartago',                               'Voces y guitarras para una noche tranquila',                  'musica',  'Parque Principal',                      22,  '19:00', 3,   280,  0,  'Programado',   12000,  'cartago',           '900111222', 'img/d7016.png',            NULL),
    ('EVT-2026-0040', 'Teatro Musical: La Ciudad Encantada',                  'Musical familiar con orquesta en vivo',                       'teatro',  'Teatro Municipal',                      37,  '16:00', 2,   450,  0,  'Programado',   38000,  'palmira',           '900111222', 'img/5fb48.png',            NULL),
    ('EVT-2026-0041', 'Festival Vallenato en Soledad',                        'Acordeoneros y compositores invitados',                       'musica',  'Parque Cultural',                       63,  '18:00', 6,   1600, 0,  'Programado',   28000,  'soledad',           '901000005', 'img/prensa/mundo-15.webp', NULL),
    ('EVT-2026-0042', 'Gran Baile Popular Tuluá',                             'Orquestas para todas las edades',                             'musica',  'Centro Cultural',                       17,  '20:00', 5,   700,  0,  'Programado',   22000,  'tulua',             '900111222', 'img/prensa/mundo-07.webp', NULL),
    ('EVT-2026-0043', 'Festival de Verano 2026',                              'La fiesta que abrió la temporada',                            'musica',  'Parque Norte',                          -35, '14:00', 8,   1500, 0,  'Finalizado',   55000,  'medellin1',         '901000002', 'img/prensa/mundo-16.webp', NULL),
    ('EVT-2026-0044', 'Noche de Teatro Clásico',                              'Tres actos de teatro clásico',                                'teatro',  'Teatro Colón',                          -28, '19:00', 3,   400,  12, 'Finalizado',   30000,  'bogota1',           '900333444', 'img/5fb48.png',            NULL),
    ('EVT-2026-0045', 'Concierto Aniversario Morat Tributo',                  'Tributo a la banda en vivo',                                  'musica',  'Plaza Mayor',                           -21, '20:00', 3,   1000, 0,  'Finalizado',   50000,  'medellin2',         '901000002', 'img/6554e.png',            NULL),
    ('EVT-2026-0046', 'Salsa al Parque',                                      'Orquestas invitadas en tarde de salsa',                       'danza',   'Coliseo del Pueblo',                    -18, '15:00', 6,   800,  0,  'Finalizado',   28000,  'cali1',             '900111222', 'img/337fd.png',            NULL),
    ('EVT-2026-0047', 'Gran Noche de Comedia',                                'Los humoristas del momento',                                  'comedia', 'Teatro Amira de la Rosa',               -14, '20:00', 2,   600,  16, 'Finalizado',   35000,  'barranquilla2',     '901000005', 'img/67c1c.png',            NULL),
    ('EVT-2026-0048', 'Feria de Circo Callejero',                             'Circo en plaza pública',                                      'circo',   'Plaza de la Aduana',                    -9,  '17:00', 3,   500,  0,  'Finalizado',   10000,  'cartagena1',        '901000001', 'img/12935.png',            NULL),
    ('EVT-2026-0049', 'Fiesta Electrónica Medellín',                          'Cuatro DJ y una pista gigante',                               'musica',  'Plaza Mayor',                           -6,  '21:00', 7,   3000, 18, 'Finalizado',   90000,  'medellin2',         '901000002', 'img/7d702.png',            NULL),
    ('EVT-2026-0050', 'Hip Hop en la Calle',                                  'Cultura urbana: rap, graffiti y baile',                       'musica',  'Chapinero',                             -3,  '16:00', 5,   600,  12, 'Finalizado',   0,      'bogota2',           '900333444', 'img/1c2e7.png',            NULL),
    ('EVT-2026-0051', 'Festival de Música Urbana',                            'Jornada completa de conciertos urbanos',                      'musica',  'Parque Simón Bolívar',                  0,   '10:00', 13,  2500, 0,  'En Vivo',      40000,  'bogota3',           '900333444', 'img/prensa/mundo-13.webp', NULL),
    ('EVT-2026-0052', 'Verbena Popular',                                      'Música y comida típica en el parque',                         'musica',  'Parque Principal',                      0,   '12:00', 11,  1000, 0,  'En Vivo',      12000,  'tulua',             '900111222', 'img/prensa/mundo-18.webp', NULL),
    ('EVT-2026-0053', 'Concierto de Rock Sinfónico',                          'Cancelado antes de la venta',                                 'musica',  'Teatro Santander',                      24,  '19:00', 3,   700,  14, 'Cancelado',    65000,  'bucara',            '901000004', 'img/prensa/mundo-14.webp', 'Cancelado por el agente. Causa: Baja venta de entradas.'),
    ('EVT-2026-0054', 'Festival Gastronómico y Musical',                      'Se canceló por lluvias',                                      'musica',  'Parque de la Vida',                     11,  '12:00', 8,   1000, 0,  'Cancelado',    30000,  'armenia',           '901000003', 'img/prensa/mundo-20.webp', 'Cancelado por el administrador. Causa: Fuerza mayor o clima. Detalle: alerta roja por lluvias.'),
    ('EVT-2026-0055', 'Obra: El Último Acto',                                 'Cancelada por problemas del lugar',                           'teatro',  'Teatro Maldonado',                      15,  '19:00', 2,   300,  12, 'Cancelado',    26000,  'tunja',             '900333444', 'img/5fb48.png',            'Cancelado por el agente. Causa: Problemas técnicos o logísticos. Detalle: el escenario no estará listo.'),
    ('EVT-2026-0056', 'Festival de Jazz del Caribe',                          'Solicitud enviada por el agente',                             'musica',  'Plaza de la Aduana',                    90,  '19:00', 5,   1200, 0,  'En revisión',  60000,  'cartagena1',        '901000001', 'img/prensa/mundo-19.webp', NULL),
    ('EVT-2026-0057', 'Teatro de Sombras',                                    'Solicitud de función familiar',                               'teatro',  'Teatro Los Fundadores',                 75,  '16:00', 2,   250,  0,  'En revisión',  18000,  'manizales',         '901000003', 'img/5fb48.png',            NULL),
    ('EVT-2026-0058', 'Mega Concierto en Plaza Pública',                      'Solicitud rechazada por falta de permisos',                   'musica',  'Plaza de Bolívar',                      100, '18:00', 6,   8000, 0,  'Rechazado',    80000,  'pereira',           '901000003', 'img/prensa/mundo-03.webp', 'Rechazado por el administrador. Motivo: Falta el permiso de la alcaldía para ocupar la plaza.'),
    ('EVT-2026-0059', 'Noche de Terror en el Teatro',                         'Solicitud rechazada por clasificación',                       'teatro',  'Teatro Santander',                      85,  '21:00', 2,   300,  18, 'Rechazado',    25000,  'bucara',            '901000004', 'img/prensa/mundo-08.webp', 'Rechazado por el administrador. Motivo: Falta definir la clasificación por edad y el plan de seguridad.'),
    ('EVT-2026-0060', 'Salsa Latina en Lima',                                 'Noche de salsa con orquestas colombianas invitadas',          'danza',   'Avenida Javier Prado',                  28,  '21:00', 5,   1200, 18, 'Programado',   90000,  'lima',              '900111222', 'img/337fd.png',            NULL),
    ('EVT-2026-0061', 'Festival de Música Colombiana en la Ciudad de México', 'Artistas colombianos en el corazón de México',                'musica',  'Paseo de la Reforma',                   55,  '19:00', 5,   2500, 0,  'Programado',   450000, 'cdmx',              '900333444', 'img/6554e.png',            'Precio en pesos colombianos'),
    ('EVT-2026-0062', 'Tango y Cumbia en Buenos Aires',                       'Dos géneros, un solo escenario',                              'danza',   'Teatro San Martín',                     42,  '20:00', 3,   800,  0,  'Programado',   180000, 'buenosaires',       '901000002', 'img/94bcf.png',            NULL),
    ('EVT-2026-0063', 'Rock Latino en Santiago',                              'Bandas del continente en una sola noche',                     'musica',  'Centro de Santiago',                    64,  '20:00', 6,   3500, 16, 'Programado',   210000, 'santiago',          '900333444', 'img/prensa/mundo-02.webp', NULL),
    ('EVT-2026-0064', 'Comedia sin Fronteras en Quito',                       'Humoristas de cuatro países',                                 'comedia', 'Parque La Carolina',                    35,  '19:30', 2,   500,  16, 'Programado',   70000,  'quito',             '901000004', 'img/67c1c.png',            NULL),
    ('EVT-2026-0065', 'Carnaval en el Malecón de Guayaquil',                  'Comparsas y música en vivo frente al río',                    'danza',   'Malecón 2000',                          72,  '17:00', 6,   2000, 0,  'Programado',   60000,  'guayaquil',         '901000005', 'img/prensa/mundo-15.webp', NULL),
    ('EVT-2026-0066', 'Noche de Zarzuela y Flamenco',                         'Gira de invierno en Madrid',                                  'teatro',  'Teatro de la Zarzuela',                 48,  '20:30', 3,   600,  12, 'Programado',   380000, 'madrid',            '901000002', 'img/5fb48.png',            NULL),
    ('EVT-2026-0067', 'Electrónica en Montjuïc',                              'Festival de música electrónica al aire libre',                'musica',  'Recinto Montjuïc',                      78,  '22:00', 8,   5000, 18, 'Programado',   520000, 'barcelona',         '901000001', 'img/7d702.png',            NULL),
    ('EVT-2026-0068', 'Latin Fest Miami',                                     'Reguetón, salsa y bachata junto a la bahía',                  'musica',  'Bayfront Park',                         68,  '18:00', 7,   4500, 0,  'Programado',   680000, 'miami',             '900111222', 'img/prensa/mundo-11.webp', NULL)
  ) AS v(codigo, nombre, descripcion, categoria, teatro, dia, hora, duracion, capacidad, edad, estado, precio, sitio, agente, imagen, observaciones)
  JOIN _sitio    s  ON s.clave = v.sitio
  JOIN UBICACION ub ON ub.direccion = s.direccion;

-- Los eventos traen su código escrito a mano. Esta secuencia es la que numera los eventos nuevos que se creen
-- desde la web: se deja en el número más alto cargado para que el siguiente sea el 0069.
SELECT setval('evento_numero_seq', (SELECT MAX(SUBSTRING(codigo FROM '[0-9]+$')::int) FROM EVENTO));

-- ==================================================================================================================
-- 4. RESERVAS
--    El valor_total NO se escribe: un trigger lo calcula (numero_entradas × precio del evento).
--    Estados: Reservada (falta que un administrador apruebe el pago) · Confirmada · Usada (ya entró al evento) · Cancelada.
--    La causa de una cancelación va en observaciones, con el mismo formato que escribe la web.
-- ==================================================================================================================

-- 4.1 Cinco reservas escritas a mano sobre los primeros eventos. Son las que esperan las pruebas automáticas.
INSERT INTO RESERVA (numero_entradas, observaciones, estado, numero_identificacion, codigo_evento) VALUES
    (2, 'Asientos preferidos',  'Confirmada', '1000000002', 'EVT-2026-0001'),   -- cliente1: 2 × 50.000 = 100.000
    (3, 'Entrada para familia', 'Reservada',  '1000000002', 'EVT-2026-0003'),   -- cliente1: 3 × 15.000 =  45.000
    (1, 'Entrada estándar',     'Confirmada', '1000000003', 'EVT-2026-0002'),   -- cliente2: 1 × 30.000 =  30.000
    (1, 'Cancelada por el cliente. Causa: No puede asistir.',
                                'Cancelada',  '1000000002', 'EVT-2026-0004'),   -- cliente1 canceló
    (2, 'Cancelada por el administrador. Causa: Otra causa. Detalle: el evento se canceló.',
                                'Cancelada',  '1000000003', 'EVT-2026-0005');   -- el evento 0005 está cancelado

-- 4.2 Reservas para los demás eventos publicados (del 0008 en adelante, sin las solicitudes En revisión ni Rechazado).
--     Son cientos de filas, así que no se escriben a mano: se reparten con una fórmula, SIN azar, para que la base
--     quede igual cada vez que se carga.
--       · cada evento recibe de 2 a 7 reservas
--       · el cliente de cada reserva se escoge dando vueltas por la lista de clientes activos (sin cliente1, que ya
--         tiene las suyas en 4.1)
--       · el estado depende del evento: en uno Cancelado todas quedan Canceladas; en uno Finalizado casi todas quedan
--         Usadas (y alguna Cancelada); en uno En Vivo la mitad entró ya; en los demás se alternan los estados.
INSERT INTO RESERVA (numero_entradas, observaciones, estado, fecha_hora, numero_identificacion, codigo_evento)
WITH eventos_a_reservar AS (               -- i = número de orden del evento (1, 2, 3...)
  SELECT codigo, estado, fecha_hora_inicio, row_number() OVER (ORDER BY codigo) AS i
    FROM EVENTO
   WHERE codigo >= 'EVT-2026-0008' AND estado NOT IN ('En revisión', 'Rechazado')
),
clientes_activos AS (                      -- n = número de orden del cliente (1, 2, 3...)
  SELECT c.numero_identificacion, row_number() OVER (ORDER BY c.numero_identificacion) AS n, count(*) OVER () AS total
    FROM CLIENTE c JOIN USUARIO u USING (numero_identificacion)
   WHERE u.estado_usuario = 'Activo' AND c.numero_identificacion <> '1000000002'
),
reservas_por_evento AS (                   -- j = número de la reserva dentro de su evento (1, 2, 3...)
  SELECT e.*, j FROM eventos_a_reservar e, generate_series(1, 2 + (e.i * 7 % 6)) AS j
)
SELECT 1 + ((r.i + r.j) % 4),                                                      -- de 1 a 4 entradas
       CASE
         WHEN r.estado = 'Cancelado' THEN 'Cancelada por el administrador. Causa: Otra causa. Detalle: el evento se canceló.'
         WHEN r.estado = 'Finalizado' AND r.j % 5 = 4 THEN 'Cancelada por el cliente. Causa: No puede asistir.'
         WHEN r.j % 7 = 3 THEN 'Entrada para familia'
         WHEN r.j % 7 = 5 THEN 'Asientos juntos, por favor'
       END,
       CASE
         WHEN r.estado = 'Cancelado' THEN 'Cancelada'
         WHEN r.estado = 'Finalizado' THEN CASE WHEN r.j % 5 = 4 THEN 'Cancelada' ELSE 'Usada' END
         WHEN r.estado = 'En Vivo' THEN CASE WHEN r.j % 2 = 0 THEN 'Usada' ELSE 'Confirmada' END
         ELSE (ARRAY['Reservada', 'Confirmada', 'Confirmada', 'Cancelada'])[1 + (r.i + r.j) % 4]
       END::estado_reserva_t,
       -- fecha de la reserva: hace unos días, pero nunca después de la víspera del evento
       LEAST(NOW() - make_interval(days => (1 + (r.i * r.j) % 40)::int, hours => ((r.i + r.j) % 20)::int), r.fecha_hora_inicio - INTERVAL '1 day'),
       cl.numero_identificacion,
       r.codigo
  FROM reservas_por_evento r
  JOIN clientes_activos cl ON cl.n = 1 + ((r.i * 5 + r.j * 3) % cl.total);

-- Las que quedaron Canceladas sin causa (por la fórmula de arriba) se registran como canceladas por el cliente
UPDATE RESERVA
   SET observaciones = 'Cancelada por el cliente. Causa: No puede asistir.'
 WHERE estado = 'Cancelada' AND (observaciones IS NULL OR observaciones NOT LIKE 'Cancelad%');

-- 4.3 Dos eventos para ver el estado "sin cupos" en la web: EVT-2026-0020 queda con 2 cupos libres (casi agotado)
--     y EVT-2026-0034 con 0 (agotado). Se calcula cuántas entradas faltan para llegar ahí y se reparten en
--     reservas Confirmadas de hasta 4 entradas.
INSERT INTO RESERVA (numero_entradas, observaciones, estado, numero_identificacion, codigo_evento)
WITH meta(codigo, dejar_libres) AS (VALUES ('EVT-2026-0020', 2), ('EVT-2026-0034', 0)),
faltan_por_vender AS (
  SELECT m.codigo,
         e.capacidad_total - m.dejar_libres
           - COALESCE((SELECT SUM(r.numero_entradas) FROM RESERVA r WHERE r.codigo_evento = m.codigo AND r.estado <> 'Cancelada'), 0) AS faltan
    FROM meta m JOIN EVENTO e USING (codigo)
),
clientes_activos AS (
  SELECT c.numero_identificacion, row_number() OVER (ORDER BY c.numero_identificacion) AS n, count(*) OVER () AS total
    FROM CLIENTE c JOIN USUARIO u USING (numero_identificacion)
   WHERE u.estado_usuario = 'Activo' AND c.numero_identificacion <> '1000000002'
)
SELECT LEAST(4, f.faltan - (k - 1) * 4), 'Compra para el grupo', 'Confirmada', cl.numero_identificacion, f.codigo
  FROM faltan_por_vender f
  CROSS JOIN LATERAL generate_series(1, GREATEST(ceil(f.faltan / 4.0)::int, 0)) AS k
  JOIN clientes_activos cl ON cl.n = 1 + (k * 7 % cl.total);

-- ==================================================================================================================
-- 5. LIMPIEZA
-- ==================================================================================================================

DROP TABLE _sitio;
DROP TABLE _clave;

COMMIT;
