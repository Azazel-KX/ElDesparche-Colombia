-- ==================================================================================================================
-- ElDesparche — Semilla grande de demostración (SEED DEMO)
-- Se carga DESPUÉS de database/seed.sql (suma datos, no los reemplaza):
--     docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/seed.sql
--     docker exec -i desparche_db_container psql -U postgres -d desparche_db < database/seed_demo.sql
-- Trae: 8 países más (con departamentos y ciudades), 21 ciudades de Colombia y 9 del exterior con sitios para eventos, 7 agentes, 30 clientes
-- (5 del exterior), 1 administrador, 61 eventos (de EVT-2026-0008 a EVT-2026-0059, con las fotos de frontend/img) y cientos
-- de reservas en todos los estados. Contraseña de todas las cuentas nuevas: Desparche2026!
-- Cuentas: admin2@, agente4@ a agente10@ (agente9 suspendido, agente10 pendiente) y cliente04@ a cliente33@
-- eldesparche.test. Las fechas de los eventos son relativas al día en que se carga.
-- NO la uses con las pruebas automáticas del backend (npm test): esas esperan solo los datos de seed.sql.
-- Se ejecuta en una sola transacción: los triggers diferidos (herencia total) se validan al COMMIT.
-- ==================================================================================================================

BEGIN;

CREATE TEMP TABLE _clave AS SELECT crypt('Desparche2026!', gen_salt('bf', 10)) AS hash;

-- ==================================================================================================================
-- GEOGRAFÍA
-- ==================================================================================================================

INSERT INTO PAIS (nombre) VALUES
('Perú'),
('México'),
('Argentina'),
('Ecuador'),
('Chile'),
('España'),
('Estados Unidos');

INSERT INTO DEPARTAMENTO (nombre, id_pais)
SELECT d.nombre, p.id_pais
  FROM (VALUES
  ('Bolívar', 'Colombia'),
  ('Santander', 'Colombia'),
  ('Risaralda', 'Colombia'),
  ('Caldas', 'Colombia'),
  ('Quindío', 'Colombia'),
  ('Norte de Santander', 'Colombia'),
  ('Nariño', 'Colombia'),
  ('Cauca', 'Colombia'),
  ('Tolima', 'Colombia'),
  ('Magdalena', 'Colombia'),
  ('Huila', 'Colombia'),
  ('Boyacá', 'Colombia'),
  ('Meta', 'Colombia'),
  ('Lima', 'Perú'),
  ('Cusco', 'Perú'),
  ('Arequipa', 'Perú'),
  ('Ciudad de México', 'México'),
  ('Jalisco', 'México'),
  ('Nuevo León', 'México'),
  ('Buenos Aires', 'Argentina'),
  ('Córdoba', 'Argentina'),
  ('Santa Fe', 'Argentina'),
  ('Pichincha', 'Ecuador'),
  ('Guayas', 'Ecuador'),
  ('Región Metropolitana', 'Chile'),
  ('Valparaíso', 'Chile'),
  ('Madrid', 'España'),
  ('Cataluña', 'España'),
  ('Florida', 'Estados Unidos')
  ) AS d(nombre, pais)
  JOIN PAIS p ON p.nombre = d.pais;

INSERT INTO CIUDAD (nombre, id_departamento)
SELECT c.nombre, d.id_departamento
  FROM (VALUES
  ('Cartagena', 'Bolívar', 'Colombia'),
  ('Bucaramanga', 'Santander', 'Colombia'),
  ('Pereira', 'Risaralda', 'Colombia'),
  ('Manizales', 'Caldas', 'Colombia'),
  ('Armenia', 'Quindío', 'Colombia'),
  ('Cúcuta', 'Norte de Santander', 'Colombia'),
  ('Pasto', 'Nariño', 'Colombia'),
  ('Popayán', 'Cauca', 'Colombia'),
  ('Ibagué', 'Tolima', 'Colombia'),
  ('Santa Marta', 'Magdalena', 'Colombia'),
  ('Neiva', 'Huila', 'Colombia'),
  ('Tunja', 'Boyacá', 'Colombia'),
  ('Villavicencio', 'Meta', 'Colombia'),
  ('Envigado', 'Antioquia', 'Colombia'),
  ('Rionegro', 'Antioquia', 'Colombia'),
  ('Chía', 'Cundinamarca', 'Colombia'),
  ('Zipaquirá', 'Cundinamarca', 'Colombia'),
  ('Buga', 'Valle del Cauca', 'Colombia'),
  ('Cartago', 'Valle del Cauca', 'Colombia'),
  ('Buenaventura', 'Valle del Cauca', 'Colombia'),
  ('Soledad', 'Atlántico', 'Colombia'),
  ('Lima', 'Lima', 'Perú'),
  ('Callao', 'Lima', 'Perú'),
  ('Cusco', 'Cusco', 'Perú'),
  ('Arequipa', 'Arequipa', 'Perú'),
  ('Ciudad de México', 'Ciudad de México', 'México'),
  ('Guadalajara', 'Jalisco', 'México'),
  ('Monterrey', 'Nuevo León', 'México'),
  ('Buenos Aires', 'Buenos Aires', 'Argentina'),
  ('La Plata', 'Buenos Aires', 'Argentina'),
  ('Córdoba', 'Córdoba', 'Argentina'),
  ('Rosario', 'Santa Fe', 'Argentina'),
  ('Quito', 'Pichincha', 'Ecuador'),
  ('Guayaquil', 'Guayas', 'Ecuador'),
  ('Santiago', 'Región Metropolitana', 'Chile'),
  ('Viña del Mar', 'Valparaíso', 'Chile'),
  ('Madrid', 'Madrid', 'España'),
  ('Barcelona', 'Cataluña', 'España'),
  ('Miami', 'Florida', 'Estados Unidos')
  ) AS c(nombre, departamento, pais)
  JOIN PAIS p ON p.nombre = c.pais
  JOIN DEPARTAMENTO d ON d.id_pais = p.id_pais AND d.nombre = c.departamento;

-- Sitios de los eventos (la base admite cualquier coordenada del planeta; los nombres de ciudad son únicos)
CREATE TEMP TABLE _ub (clave VARCHAR(30), direccion VARCHAR(200), latitud NUMERIC(9,6), longitud NUMERIC(9,6), ciudad VARCHAR(80));
INSERT INTO _ub VALUES
  ('cartagena1', 'Plaza de la Aduana, Centro Histórico', 10.4236, -75.5513, 'Cartagena'),
  ('cartagena2', 'Calle del Arsenal #8B-45, Getsemaní', 10.4204, -75.5469, 'Cartagena'),
  ('bucara', 'Carrera 27 #36-14, Teatro Santander', 7.1193, -73.1227, 'Bucaramanga'),
  ('pereira', 'Plaza de Bolívar, Carrera 7 #18-55', 4.8133, -75.6961, 'Pereira'),
  ('manizales', 'Carrera 22 #33-20, Teatro Los Fundadores', 5.0703, -75.5138, 'Manizales'),
  ('armenia', 'Parque de la Vida, Avenida Bolívar', 4.5339, -75.6811, 'Armenia'),
  ('cucuta', 'Avenida 0 #10-44, Centro', 7.8939, -72.5078, 'Cúcuta'),
  ('pasto', 'Plaza de Nariño, Calle 18 #25-02', 1.2136, -77.2811, 'Pasto'),
  ('popayan', 'Calle 5 #4-68, Centro Histórico', 2.4448, -76.6147, 'Popayán'),
  ('ibague', 'Carrera 3 #10-50, Teatro Tolima', 4.4389, -75.2322, 'Ibagué'),
  ('santamarta', 'Carrera 1C #20-30, El Rodadero', 11.2, -74.23, 'Santa Marta'),
  ('neiva', 'Parque Santander, Calle 8 #5-30', 2.9273, -75.2819, 'Neiva'),
  ('tunja', 'Carrera 9 #19-30, Teatro Maldonado', 5.5353, -73.3678, 'Tunja'),
  ('villavo', 'Parque Los Libertadores, Calle 38', 4.142, -73.6266, 'Villavicencio'),
  ('medellin1', 'Calle 41 #57-30, Parque Norte', 6.2711, -75.5689, 'Medellín'),
  ('medellin2', 'Calle 44 #52-165, Plaza Mayor', 6.2431, -75.5754, 'Medellín'),
  ('envigado', 'Carrera 43A #37 Sur-05, Parque Principal', 6.1711, -75.5917, 'Envigado'),
  ('rionegro', 'Calle 49 #50-12, Parque San Nicolás', 6.1552, -75.3743, 'Rionegro'),
  ('barranquilla1', 'Vía 40 #73-290, Puerta de Oro', 11.0154, -74.8078, 'Barranquilla'),
  ('barranquilla2', 'Carrera 54 #54-41, Teatro Amira de la Rosa', 10.9885, -74.7961, 'Barranquilla'),
  ('bogota1', 'Calle 10 #5-32, Teatro Colón', 4.5964, -74.0742, 'Bogotá D.C.'),
  ('bogota2', 'Calle 63 #11-97, Chapinero', 4.6486, -74.0627, 'Bogotá D.C.'),
  ('bogota3', 'Calle 63 #59A-06, Parque Simón Bolívar', 4.658, -74.0937, 'Bogotá D.C.'),
  ('chia', 'Carrera 11 #11-30, Parque Principal', 4.8614, -74.0326, 'Chía'),
  ('zipaquira', 'Plaza de los Comuneros, Centro', 5.0225, -74.0046, 'Zipaquirá'),
  ('cali1', 'Calle 5 #38-71, Coliseo del Pueblo', 3.4311, -76.547, 'Cali'),
  ('cali2', 'Calle 9 #23-40, Plaza de Toros Cañaveralejo', 3.429, -76.547, 'Cali'),
  ('palmira', 'Calle 29 #26-30, Teatro Municipal', 3.5394, -76.3036, 'Palmira'),
  ('tulua', 'Calle 26 #24-18, Centro Cultural', 4.084, -76.195, 'Tuluá'),
  ('buga', 'Plaza de la Basílica del Señor de los Milagros', 3.9009, -76.2978, 'Buga'),
  ('cartago', 'Calle 11 #5-20, Parque Principal', 4.7464, -75.9117, 'Cartago'),
  ('soledad', 'Calle 30 #19-24, Parque Cultural', 10.9184, -74.7646, 'Soledad'),
  ('buenaventura', 'Malecón Bahía de la Cruz', 3.8801, -77.0312, 'Buenaventura'),
  ('lima', 'Avenida Javier Prado Este 1500, San Borja', -12.0903, -77.0071, 'Lima'),
  ('cdmx', 'Avenida Paseo de la Reforma 50, Cuauhtémoc', 19.4284, -99.1676, 'Ciudad de México'),
  ('buenosaires', 'Avenida Corrientes 1530, Teatro San Martín', -34.604, -58.3869, 'Buenos Aires'),
  ('santiago', 'Avenida Libertador Bernardo O''Higgins 1000, Centro', -33.444, -70.65, 'Santiago'),
  ('quito', 'Avenida Patria y 12 de Octubre, Parque La Carolina', -0.183, -78.484, 'Quito'),
  ('guayaquil', 'Malecón 2000, Avenida Simón Bolívar', -2.196, -79.88, 'Guayaquil'),
  ('madrid', 'Calle de Alcalá 20, Teatro de la Zarzuela', 40.418, -3.699, 'Madrid'),
  ('barcelona', 'Avinguda de la Reina Maria Cristina, Recinto Montjuïc', 41.3711, 2.1527, 'Barcelona'),
  ('miami', '601 Biscayne Boulevard, Bayfront Park', 25.774, -80.186, 'Miami');

INSERT INTO UBICACION (direccion, latitud, longitud, id_ciudad)
SELECT u.direccion, u.latitud, u.longitud, c.id_ciudad
  FROM _ub u
  JOIN CIUDAD c ON c.nombre = u.ciudad;

-- ==================================================================================================================
-- USUARIOS (supertipo), teléfonos y subtipos
-- ==================================================================================================================

INSERT INTO USUARIO (numero_identificacion, tipo_identificacion, nombre_completo, correo, contrasena_hash, direccion, id_ciudad) VALUES
  ('901000001', 'NIT', 'Caribe Sound Producciones', 'agente4@eldesparche.test', (SELECT hash FROM _clave), 'Calle 33 #8-45, Centro', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Cartagena' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('901000002', 'NIT', 'Andes Cultura', 'agente5@eldesparche.test', (SELECT hash FROM _clave), 'Carrera 70 #44-12, Laureles', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Medellín' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('901000003', 'NIT', 'Eje Cafetero Live', 'agente6@eldesparche.test', (SELECT hash FROM _clave), 'Avenida Circunvalar #6-30', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Pereira' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('901000004', 'NIT', 'Santander Escénica', 'agente7@eldesparche.test', (SELECT hash FROM _clave), 'Carrera 33 #45-60, Cabecera', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Bucaramanga' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('901000005', 'NIT', 'Carnaval Eventos del Atlántico', 'agente8@eldesparche.test', (SELECT hash FROM _clave), 'Calle 72 #52-10, El Prado', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Barranquilla' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('901000006', 'NIT', 'Sur Andino Teatro', 'agente9@eldesparche.test', (SELECT hash FROM _clave), 'Calle 19 #24-31, Centro', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Pasto' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('901000007', 'NIT', 'Llanos Producciones', 'agente10@eldesparche.test', (SELECT hash FROM _clave), 'Carrera 22 #8-45, Barzal', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Villavicencio' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000011', 'CC', 'Sergio Andrés Valencia Mora', 'admin2@eldesparche.test', (SELECT hash FROM _clave), 'Calle 26 #13-19', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Bogotá D.C.' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000101', 'CC', 'Valentina Ríos Ocampo', 'cliente04@eldesparche.test', (SELECT hash FROM _clave), 'Calle 10 #20-30', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Cali' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000102', 'CC', 'Santiago Herrera Lozano', 'cliente05@eldesparche.test', (SELECT hash FROM _clave), 'Calle 11 #21-31', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Bogotá D.C.' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000103', 'CC', 'Mariana Castro Peña', 'cliente06@eldesparche.test', (SELECT hash FROM _clave), 'Calle 12 #22-32', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Medellín' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000104', 'CC', 'Juan David Ospina Restrepo', 'cliente07@eldesparche.test', (SELECT hash FROM _clave), 'Calle 13 #23-33', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Medellín' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000105', 'CC', 'Daniela Vargas Ibarra', 'cliente08@eldesparche.test', (SELECT hash FROM _clave), 'Calle 14 #24-34', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Barranquilla' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000106', 'CC', 'Sebastián Mejía Cortés', 'cliente09@eldesparche.test', (SELECT hash FROM _clave), 'Calle 15 #25-35', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Bogotá D.C.' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000107', 'CC', 'Camila Torres Navarro', 'cliente10@eldesparche.test', (SELECT hash FROM _clave), 'Calle 16 #26-36', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Cartagena' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000108', 'CC', 'Andrés Felipe Gil Salcedo', 'cliente11@eldesparche.test', (SELECT hash FROM _clave), 'Calle 17 #27-37', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Cali' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000109', 'CC', 'Isabella Moreno Duque', 'cliente12@eldesparche.test', (SELECT hash FROM _clave), 'Calle 18 #28-38', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Pereira' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000110', 'CC', 'Mateo Cárdenas Villa', 'cliente13@eldesparche.test', (SELECT hash FROM _clave), 'Calle 19 #29-39', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Bucaramanga' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000111', 'CC', 'Sofía Ramírez Echeverri', 'cliente14@eldesparche.test', (SELECT hash FROM _clave), 'Calle 20 #30-40', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Manizales' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000112', 'CC', 'Nicolás Pardo Quiroga', 'cliente15@eldesparche.test', (SELECT hash FROM _clave), 'Calle 21 #31-41', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Bogotá D.C.' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000113', 'CC', 'Luciana Duarte Mendoza', 'cliente16@eldesparche.test', (SELECT hash FROM _clave), 'Calle 22 #32-42', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Cúcuta' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000114', 'CC', 'Felipe Salazar Ruiz', 'cliente17@eldesparche.test', (SELECT hash FROM _clave), 'Calle 23 #33-43', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Cali' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000115', 'CC', 'Gabriela Londoño Arango', 'cliente18@eldesparche.test', (SELECT hash FROM _clave), 'Calle 24 #34-44', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Medellín' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000116', 'CC', 'Tomás Arias Bermúdez', 'cliente19@eldesparche.test', (SELECT hash FROM _clave), 'Calle 25 #35-45', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Armenia' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000117', 'CC', 'Natalia Quintero Marín', 'cliente20@eldesparche.test', (SELECT hash FROM _clave), 'Calle 26 #36-46', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Santa Marta' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000118', 'CC', 'Esteban Rueda Patiño', 'cliente21@eldesparche.test', (SELECT hash FROM _clave), 'Calle 27 #37-47', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Ibagué' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000119', 'CC', 'Paula Andrea Cano Zapata', 'cliente22@eldesparche.test', (SELECT hash FROM _clave), 'Calle 28 #38-48', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Medellín' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000120', 'CC', 'Julián Bedoya Henao', 'cliente23@eldesparche.test', (SELECT hash FROM _clave), 'Calle 29 #39-49', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Pereira' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000121', 'CC', 'Manuela Giraldo Toro', 'cliente24@eldesparche.test', (SELECT hash FROM _clave), 'Calle 30 #40-50', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Popayán' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000122', 'CC', 'Alejandro Peña Montoya', 'cliente25@eldesparche.test', (SELECT hash FROM _clave), 'Calle 31 #41-51', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Tunja' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000123', 'CC', 'Laura Sofía Pinzón Rojas', 'cliente26@eldesparche.test', (SELECT hash FROM _clave), 'Calle 32 #42-52', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Neiva' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000124', 'CC', 'Cristian Beltrán Acosta', 'cliente27@eldesparche.test', (SELECT hash FROM _clave), 'Calle 33 #43-53', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Villavicencio' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('1000000125', 'CC', 'Juliana Mora Franco', 'cliente28@eldesparche.test', (SELECT hash FROM _clave), 'Calle 34 #44-54', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Tuluá' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('AR8821734', 'PAS', 'Lucía Fernández Paz', 'cliente29@eldesparche.test', (SELECT hash FROM _clave), 'Calle 35 #45-55', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Buenos Aires' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('7001234', 'CE', 'Carlos Mendoza Quispe', 'cliente30@eldesparche.test', (SELECT hash FROM _clave), 'Calle 36 #46-56', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Lima' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('MX5530918', 'PAS', 'Ximena Ortiz Delgado', 'cliente31@eldesparche.test', (SELECT hash FROM _clave), 'Calle 37 #47-57', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Ciudad de México' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('CL7714502', 'PAS', 'Martín Rojas Fuentes', 'cliente32@eldesparche.test', (SELECT hash FROM _clave), 'Calle 38 #48-58', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Santiago' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1)),
  ('7002345', 'CE', 'Ana Belén Cevallos Mora', 'cliente33@eldesparche.test', (SELECT hash FROM _clave), 'Calle 39 #49-59', (SELECT c.id_ciudad FROM CIUDAD c JOIN DEPARTAMENTO d USING (id_departamento) JOIN PAIS p USING (id_pais) WHERE c.nombre = 'Quito' ORDER BY (p.nombre = 'Colombia') DESC LIMIT 1));

UPDATE USUARIO SET estado_usuario = 'Suspendido' WHERE numero_identificacion = '901000006';
UPDATE USUARIO SET estado_usuario = 'Pendiente'  WHERE numero_identificacion = '901000007';
UPDATE USUARIO SET estado_usuario = 'Bloqueado'  WHERE numero_identificacion = '1000000117';

INSERT INTO USUARIO_TELEFONO (numero_identificacion, telefono) VALUES
  ('901000001', '3101000001'),
  ('901000002', '3101000002'),
  ('901000003', '3101000003'),
  ('901000004', '3101000004'),
  ('901000005', '3101000005'),
  ('901000006', '3101000006'),
  ('901000007', '3101000007'),
  ('1000000011', '3002223344'),
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

INSERT INTO ADMIN (numero_identificacion, salario, horario) VALUES
  ('1000000011', 3800000, 'Tarde');

INSERT INTO AGENTE (numero_identificacion, nit, razon_social, nombre_comercial, descripcion, logo_url, comision, experiencia) VALUES
  ('901000001', '901000001-6', 'Caribe Sound Producciones S.A.S.', 'Caribe Sound Producciones', 'Festivales y conciertos del Caribe colombiano', NULL, 9.00, 11),
  ('901000002', '901000002-3', 'Andes Cultura S.A.S.', 'Andes Cultura', 'Teatro, danza y música en Antioquia', NULL, 8.00, 9),
  ('901000003', '901000003-0', 'Eje Cafetero Live S.A.S.', 'Eje Cafetero Live', 'Conciertos y planes al aire libre del Eje Cafetero', NULL, 7.50, 6),
  ('901000004', '901000004-8', 'Santander Escénica Ltda.', 'Santander Escénica', 'Obras de teatro y comedia en Santander', NULL, 8.00, 12),
  ('901000005', '901000005-5', 'Carnaval Eventos del Atlántico S.A.S.', 'Carnaval Eventos del Atlántico', 'Danza, folclor y música de la costa', NULL, 10.00, 15),
  ('901000006', '901000006-2', 'Corporación Sur Andino', 'Sur Andino Teatro', 'Teatro y circo del suroccidente', NULL, 5.00, 4),
  ('901000007', '901000007-1', 'Llanos Producciones S.A.S.', 'Llanos Producciones', 'Música llanera y eventos familiares', NULL, 6.00, 2);

INSERT INTO CLIENTE (numero_identificacion, fecha_nacimiento, foto_perfil, alias, puntos, publicidad) VALUES
  ('1000000101', '1999-02-14', NULL, 'vale_rios', 80, TRUE),
  ('1000000102', '1996-06-03', NULL, 'santi_h', 150, TRUE),
  ('1000000103', '2001-11-21', NULL, 'mari_castro', 20, FALSE),
  ('1000000104', '1990-04-09', NULL, 'jdospina', 310, TRUE),
  ('1000000105', '2000-09-30', NULL, 'dani_v', 45, TRUE),
  ('1000000106', '1993-01-17', NULL, 'sebas_mejia', 0, FALSE),
  ('1000000107', '1998-12-05', NULL, 'cami_torres', 95, TRUE),
  ('1000000108', '1987-07-25', NULL, 'afgil', 220, TRUE),
  ('1000000109', '2002-03-08', NULL, 'isa_moreno', 60, TRUE),
  ('1000000110', '1995-10-12', NULL, 'mateo_c', 15, FALSE),
  ('1000000111', '1997-05-19', NULL, 'sofi_ramirez', 180, TRUE),
  ('1000000112', '1985-08-01', NULL, 'nico_pardo', 410, TRUE),
  ('1000000113', '2003-01-27', NULL, 'lu_duarte', 35, TRUE),
  ('1000000114', '1991-09-14', NULL, 'feli_salazar', 70, FALSE),
  ('1000000115', '1994-02-02', NULL, 'gabi_londono', 125, TRUE),
  ('1000000116', '1999-07-07', NULL, 'tomas_arias', 55, TRUE),
  ('1000000117', '1996-11-29', NULL, 'naty_quintero', 90, FALSE),
  ('1000000118', '1989-03-23', NULL, 'esteban_r', 260, TRUE),
  ('1000000119', '2000-06-18', NULL, 'paula_cano', 40, TRUE),
  ('1000000120', '1992-12-31', NULL, 'julian_b', 130, TRUE),
  ('1000000121', '2004-04-04', NULL, 'manu_giraldo', 10, TRUE),
  ('1000000122', '1988-10-10', NULL, 'ale_pena', 175, FALSE),
  ('1000000123', '1997-01-15', NULL, 'lau_pinzon', 85, TRUE),
  ('1000000124', '1994-08-22', NULL, 'cris_beltran', 25, TRUE),
  ('1000000125', '2001-05-30', NULL, 'juli_mora', 65, TRUE),
  ('AR8821734', '1992-03-11', NULL, 'lucia_fp', 30, TRUE),
  ('7001234', '1990-09-02', NULL, 'carlos_mq', 50, TRUE),
  ('MX5530918', '1998-06-26', NULL, 'xime_ortiz', 0, FALSE),
  ('CL7714502', '1986-12-13', NULL, 'martin_rf', 75, TRUE),
  ('7002345', '2000-02-20', NULL, 'anabelen_cm', 20, TRUE);

-- ==================================================================================================================
-- EVENTOS (las fotos son las de frontend/img; los códigos siguen a los de seed.sql)
-- ==================================================================================================================

INSERT INTO EVENTO (codigo, nombre, descripcion, categoria, teatro, fecha_hora_inicio, fecha_hora_fin, capacidad_total, edad_minima,
                    observaciones, estado, precio, id_ubicacion, numero_identificacion, url_imagen, fecha_creacion)
SELECT v.codigo, v.nombre, v.descripcion, v.categoria, v.teatro,
       CURRENT_DATE + v.dia + v.hora::time,
       CURRENT_DATE + v.dia + v.hora::time + make_interval(hours => v.duracion),
       v.capacidad, v.edad, v.observaciones, v.estado::estado_evento_t, v.precio, ub.id_ubicacion, v.agente, v.imagen,
       NOW() - make_interval(days => GREATEST(-v.dia, 0) + 20 + (substring(v.codigo from '[0-9]+$')::int % 15))
  FROM (VALUES
  ('EVT-2026-0008', 'Noches de Salsa en Cali', 'Orquestas en vivo y pista abierta para bailar toda la noche', 'danza', 'Coliseo del Pueblo', 12, '20:00', 5, 600, 18, 'Programado', 45000, 'cali1', '900111222', 'img/337fd.png', 'Se recomienda llegar temprano'),
  ('EVT-2026-0009', 'Festival Folclórico del Pacífico', 'Danzas y música tradicional de la costa pacífica', 'danza', 'Plaza de la Basílica', 38, '16:00', 6, 800, 0, 'Programado', 25000, 'buga', '900111222', 'img/94bcf.png', NULL),
  ('EVT-2026-0010', 'Rock en el Parque Norte', 'Tarde de bandas locales de rock', 'musica', 'Parque Norte', 21, '15:00', 7, 1500, 14, 'En Boletería', 60000, 'medellin1', '901000002', 'img/prensa/mundo-01.webp', 'Se permite el ingreso de bebidas sin alcohol'),
  ('EVT-2026-0011', 'Cumbia bajo las Estrellas', 'Orquestas de cumbia y vallenato en la bahía', 'musica', 'Plaza de la Aduana', 27, '19:30', 4, 900, 0, 'Programado', 38000, 'cartagena1', '901000001', 'img/33202.png', NULL),
  ('EVT-2026-0012', 'Festival de Teatro de Getsemaní', 'Cinco obras en un solo fin de semana', 'teatro', 'Calle del Arsenal', 45, '18:00', 4, 250, 12, 'Programado', 28000, 'cartagena2', '901000001', 'img/5fb48.png', NULL),
  ('EVT-2026-0013', 'Stand Up en Bucaramanga', 'Cuatro comediantes en una noche de risas', 'comedia', 'Teatro Santander', 16, '20:30', 2, 450, 16, 'Programado', 32000, 'bucara', '901000004', 'img/67c1c.png', NULL),
  ('EVT-2026-0014', 'Hip Hop al Parque', 'Batallas de freestyle y conciertos de rap', 'musica', 'Parque Simón Bolívar', 34, '13:00', 8, 2000, 12, 'Programado', 0, 'bogota3', '900333444', 'img/1c2e7.png', 'Entrada libre con inscripción'),
  ('EVT-2026-0015', 'Gran Concierto Pop Latino', 'Los artistas del momento en una sola tarima', 'musica', 'Parque Simón Bolívar', 52, '18:00', 5, 3000, 0, 'Programado', 120000, 'bogota3', '900333444', 'img/6554e.png', NULL),
  ('EVT-2026-0016', 'Circo de los Sueños', 'Acróbatas, trapecistas y payasos para toda la familia', 'circo', 'Parque Principal', 19, '17:00', 3, 350, 0, 'En Boletería', 22000, 'chia', '900333444', 'img/12935.png', 'Apto para menores'),
  ('EVT-2026-0017', 'Tarde Acústica en el Parque', 'Música en vivo para disfrutar en manta', 'musica', 'Parque de la Vida', 8, '16:00', 4, 300, 0, 'En Boletería', 15000, 'armenia', '901000003', 'img/d7016.png', 'Trae tu manta y tu termo'),
  ('EVT-2026-0018', 'Festival de Luces Electrónico', 'Los mejores DJ con láser y pantallas gigantes', 'musica', 'Puerta de Oro', 60, '20:00', 7, 5000, 18, 'Programado', 150000, 'barranquilla1', '901000005', 'img/7d702.png', 'Solo mayores de edad'),
  ('EVT-2026-0019', 'Carnaval del Atlántico en Concierto', 'Comparsas y música folclórica de Barranquilla', 'danza', 'Teatro Amira de la Rosa', 70, '19:00', 4, 700, 0, 'Programado', 42000, 'barranquilla2', '901000005', 'img/94bcf.png', NULL),
  ('EVT-2026-0020', 'Opera Prima: Obra Íntima', 'Función exclusiva con cupos limitados', 'teatro', 'Teatro Colón', 14, '19:30', 2, 40, 16, 'En Boletería', 55000, 'bogota1', '900333444', 'img/5fb48.png', 'Casi agotado'),
  ('EVT-2026-0021', 'Festival Campestre de Verano', 'Música, camping y fogata junto al río', 'musica', 'Parque Principal', 47, '12:00', 10, 1200, 0, 'Programado', 70000, 'zipaquira', '901000003', 'img/1cbb3.png', NULL),
  ('EVT-2026-0022', 'Noche de Boleros', 'Un viaje por los boleros de siempre', 'musica', 'Teatro Municipal', 23, '19:00', 3, 450, 18, 'Programado', 36000, 'palmira', '900111222', 'img/prensa/mundo-08.webp', NULL),
  ('EVT-2026-0023', 'Maratón de Comedia Paisa', 'Seis humoristas, una noche, cero descanso', 'comedia', 'Plaza Mayor', 33, '20:00', 3, 1000, 16, 'Programado', 48000, 'medellin2', '901000002', 'img/67c1c.png', NULL),
  ('EVT-2026-0024', 'Danza Contemporánea: Raíces', 'Compañía invitada con obra estrenada este año', 'danza', 'Teatro Los Fundadores', 29, '18:30', 2, 400, 0, 'Programado', 30000, 'manizales', '901000003', 'img/337fd.png', NULL),
  ('EVT-2026-0025', 'Música Llanera en Vivo', 'Joropo, arpa y cuatro en el parque', 'musica', 'Parque Los Libertadores', 36, '17:00', 5, 800, 0, 'Programado', 20000, 'villavo', '900111222', 'img/prensa/mundo-09.webp', NULL),
  ('EVT-2026-0026', 'Festival de Colores', 'Carrera de colores y música para todos', 'musica', 'Parque Santander', 40, '10:00', 6, 1800, 0, 'Programado', 35000, 'neiva', '901000003', 'img/prensa/mundo-17.webp', NULL),
  ('EVT-2026-0027', 'Rock Andino', 'Bandas de rock de Boyacá y Cundinamarca', 'musica', 'Teatro Maldonado', 25, '19:00', 4, 500, 14, 'Programado', 30000, 'tunja', '900333444', 'img/prensa/mundo-02.webp', NULL),
  ('EVT-2026-0028', 'Fiesta Electrónica en la Bahía', 'House y techno frente al mar', 'musica', 'El Rodadero', 56, '21:00', 8, 2500, 18, 'Programado', 110000, 'santamarta', '901000001', 'img/prensa/mundo-06.webp', 'Solo mayores de edad'),
  ('EVT-2026-0029', 'Teatro en la Plaza', 'Función gratuita al aire libre', 'teatro', 'Plaza de Nariño', 18, '17:00', 2, 600, 0, 'Programado', 0, 'pasto', '900111222', 'img/5fb48.png', NULL),
  ('EVT-2026-0030', 'Carnaval de Negros y Blancos: Gala', 'Muestra artística de la tradición nariñense', 'danza', 'Plaza de Nariño', 80, '15:00', 6, 1500, 0, 'Programado', 18000, 'pasto', '900111222', 'img/94bcf.png', NULL),
  ('EVT-2026-0031', 'Concierto Sinfónico Popular', 'Orquesta sinfónica interpreta música colombiana', 'musica', 'Teatro Colón', 43, '18:00', 2, 700, 0, 'Programado', 40000, 'bogota1', '900333444', 'img/27459.png', NULL),
  ('EVT-2026-0032', 'Noche de Humor en Cúcuta', 'Dos horas de monólogos', 'comedia', 'Avenida 0', 26, '20:00', 2, 350, 16, 'Programado', 25000, 'cucuta', '901000004', 'img/67c1c.png', NULL),
  ('EVT-2026-0033', 'Festival Pop Rock del Valle', 'Cinco bandas, una sola noche', 'musica', 'Plaza de Toros Cañaveralejo', 66, '18:00', 6, 4000, 14, 'Programado', 95000, 'cali2', '900111222', 'img/prensa/mundo-04.webp', NULL),
  ('EVT-2026-0034', 'Jazz en el Centro Histórico', 'Cuartetos de jazz en una casona colonial', 'musica', 'Centro Histórico', 31, '19:30', 3, 60, 16, 'Programado', 45000, 'popayan', '900333444', 'img/prensa/mundo-12.webp', NULL),
  ('EVT-2026-0035', 'Música del Mundo en Rionegro', 'Ensambles de cuatro continentes', 'musica', 'Parque San Nicolás', 49, '16:00', 5, 900, 0, 'Programado', 33000, 'rionegro', '901000002', 'img/prensa/mundo-05.webp', NULL),
  ('EVT-2026-0036', 'Tarde de Circo y Magia', 'Magos y malabaristas', 'circo', 'Parque Principal', 13, '16:00', 3, 300, 0, 'En Boletería', 20000, 'envigado', '901000002', 'img/12935.png', 'Apto para menores'),
  ('EVT-2026-0037', 'Noche de Tambores', 'Percusión del Pacífico', 'danza', 'Malecón Bahía de la Cruz', 58, '18:30', 3, 700, 0, 'Programado', 15000, 'buenaventura', '900111222', 'img/prensa/mundo-10.webp', NULL),
  ('EVT-2026-0038', 'Reggaetón Fest', 'Los grandes del género en vivo', 'musica', 'Vía 40', 74, '19:00', 7, 6000, 16, 'Programado', 130000, 'barranquilla1', '901000005', 'img/prensa/mundo-11.webp', NULL),
  ('EVT-2026-0039', 'Cantautores en Cartago', 'Voces y guitarras para una noche tranquila', 'musica', 'Parque Principal', 22, '19:00', 3, 280, 0, 'Programado', 12000, 'cartago', '900111222', 'img/d7016.png', NULL),
  ('EVT-2026-0040', 'Teatro Musical: La Ciudad Encantada', 'Musical familiar con orquesta en vivo', 'teatro', 'Teatro Municipal', 37, '16:00', 2, 450, 0, 'Programado', 38000, 'palmira', '900111222', 'img/5fb48.png', NULL),
  ('EVT-2026-0041', 'Festival Vallenato en Soledad', 'Acordeoneros y compositores invitados', 'musica', 'Parque Cultural', 63, '18:00', 6, 1600, 0, 'Programado', 28000, 'soledad', '901000005', 'img/prensa/mundo-15.webp', NULL),
  ('EVT-2026-0042', 'Gran Baile Popular Tuluá', 'Orquestas para todas las edades', 'musica', 'Centro Cultural', 17, '20:00', 5, 700, 0, 'Programado', 22000, 'tulua', '900111222', 'img/prensa/mundo-07.webp', NULL),
  ('EVT-2026-0060', 'Salsa Latina en Lima', 'Noche de salsa con orquestas colombianas invitadas', 'danza', 'Avenida Javier Prado', 28, '21:00', 5, 1200, 18, 'Programado', 90000, 'lima', '900111222', 'img/337fd.png', NULL),
  ('EVT-2026-0061', 'Festival de Música Colombiana en la Ciudad de México', 'Artistas colombianos en el corazón de México', 'musica', 'Paseo de la Reforma', 55, '19:00', 5, 2500, 0, 'Programado', 450000, 'cdmx', '900333444', 'img/6554e.png', 'Precio en pesos colombianos'),
  ('EVT-2026-0062', 'Tango y Cumbia en Buenos Aires', 'Dos géneros, un solo escenario', 'danza', 'Teatro San Martín', 42, '20:00', 3, 800, 0, 'Programado', 180000, 'buenosaires', '901000002', 'img/94bcf.png', NULL),
  ('EVT-2026-0063', 'Rock Latino en Santiago', 'Bandas del continente en una sola noche', 'musica', 'Centro de Santiago', 64, '20:00', 6, 3500, 16, 'Programado', 210000, 'santiago', '900333444', 'img/prensa/mundo-02.webp', NULL),
  ('EVT-2026-0064', 'Comedia sin Fronteras en Quito', 'Humoristas de cuatro países', 'comedia', 'Parque La Carolina', 35, '19:30', 2, 500, 16, 'Programado', 70000, 'quito', '901000004', 'img/67c1c.png', NULL),
  ('EVT-2026-0065', 'Carnaval en el Malecón de Guayaquil', 'Comparsas y música en vivo frente al río', 'danza', 'Malecón 2000', 72, '17:00', 6, 2000, 0, 'Programado', 60000, 'guayaquil', '901000005', 'img/prensa/mundo-15.webp', NULL),
  ('EVT-2026-0066', 'Noche de Zarzuela y Flamenco', 'Gira de invierno en Madrid', 'teatro', 'Teatro de la Zarzuela', 48, '20:30', 3, 600, 12, 'Programado', 380000, 'madrid', '901000002', 'img/5fb48.png', NULL),
  ('EVT-2026-0067', 'Electrónica en Montjuïc', 'Festival de música electrónica al aire libre', 'musica', 'Recinto Montjuïc', 78, '22:00', 8, 5000, 18, 'Programado', 520000, 'barcelona', '901000001', 'img/7d702.png', NULL),
  ('EVT-2026-0068', 'Latin Fest Miami', 'Reguetón, salsa y bachata junto a la bahía', 'musica', 'Bayfront Park', 68, '18:00', 7, 4500, 0, 'Programado', 680000, 'miami', '900111222', 'img/prensa/mundo-11.webp', NULL),
  ('EVT-2026-0043', 'Festival de Verano 2026', 'La fiesta que abrió la temporada', 'musica', 'Parque Norte', -35, '14:00', 8, 1500, 0, 'Finalizado', 55000, 'medellin1', '901000002', 'img/prensa/mundo-16.webp', NULL),
  ('EVT-2026-0044', 'Noche de Teatro Clásico', 'Tres actos de teatro clásico', 'teatro', 'Teatro Colón', -28, '19:00', 3, 400, 12, 'Finalizado', 30000, 'bogota1', '900333444', 'img/5fb48.png', NULL),
  ('EVT-2026-0045', 'Concierto Aniversario Morat Tributo', 'Tributo a la banda en vivo', 'musica', 'Plaza Mayor', -21, '20:00', 3, 1000, 0, 'Finalizado', 50000, 'medellin2', '901000002', 'img/6554e.png', NULL),
  ('EVT-2026-0046', 'Salsa al Parque', 'Orquestas invitadas en tarde de salsa', 'danza', 'Coliseo del Pueblo', -18, '15:00', 6, 800, 0, 'Finalizado', 28000, 'cali1', '900111222', 'img/337fd.png', NULL),
  ('EVT-2026-0047', 'Gran Noche de Comedia', 'Los humoristas del momento', 'comedia', 'Teatro Amira de la Rosa', -14, '20:00', 2, 600, 16, 'Finalizado', 35000, 'barranquilla2', '901000005', 'img/67c1c.png', NULL),
  ('EVT-2026-0048', 'Feria de Circo Callejero', 'Circo en plaza pública', 'circo', 'Plaza de la Aduana', -9, '17:00', 3, 500, 0, 'Finalizado', 10000, 'cartagena1', '901000001', 'img/12935.png', NULL),
  ('EVT-2026-0049', 'Fiesta Electrónica Medellín', 'Cuatro DJ y una pista gigante', 'musica', 'Plaza Mayor', -6, '21:00', 7, 3000, 18, 'Finalizado', 90000, 'medellin2', '901000002', 'img/7d702.png', NULL),
  ('EVT-2026-0050', 'Hip Hop en la Calle', 'Cultura urbana: rap, graffiti y baile', 'musica', 'Chapinero', -3, '16:00', 5, 600, 12, 'Finalizado', 0, 'bogota2', '900333444', 'img/1c2e7.png', NULL),
  ('EVT-2026-0051', 'Festival de Música Urbana', 'Jornada completa de conciertos urbanos', 'musica', 'Parque Simón Bolívar', 0, '10:00', 13, 2500, 0, 'En Vivo', 40000, 'bogota3', '900333444', 'img/prensa/mundo-13.webp', NULL),
  ('EVT-2026-0052', 'Verbena Popular', 'Música y comida típica en el parque', 'musica', 'Parque Principal', 0, '12:00', 11, 1000, 0, 'En Vivo', 12000, 'tulua', '900111222', 'img/prensa/mundo-18.webp', NULL),
  ('EVT-2026-0053', 'Concierto de Rock Sinfónico', 'Cancelado antes de la venta', 'musica', 'Teatro Santander', 24, '19:00', 3, 700, 14, 'Cancelado', 65000, 'bucara', '901000004', 'img/prensa/mundo-14.webp', 'Cancelado por el agente. Causa: Baja venta de entradas.'),
  ('EVT-2026-0054', 'Festival Gastronómico y Musical', 'Se canceló por lluvias', 'musica', 'Parque de la Vida', 11, '12:00', 8, 1000, 0, 'Cancelado', 30000, 'armenia', '901000003', 'img/prensa/mundo-20.webp', 'Cancelado por el administrador. Causa: Fuerza mayor o clima. Detalle: alerta roja por lluvias.'),
  ('EVT-2026-0055', 'Obra: El Último Acto', 'Cancelada por problemas del lugar', 'teatro', 'Teatro Maldonado', 15, '19:00', 2, 300, 12, 'Cancelado', 26000, 'tunja', '900333444', 'img/5fb48.png', 'Cancelado por el agente. Causa: Problemas técnicos o logísticos. Detalle: el escenario no estará listo.'),
  ('EVT-2026-0056', 'Festival de Jazz del Caribe', 'Solicitud enviada por el agente', 'musica', 'Plaza de la Aduana', 90, '19:00', 5, 1200, 0, 'En revisión', 60000, 'cartagena1', '901000001', 'img/prensa/mundo-19.webp', NULL),
  ('EVT-2026-0057', 'Teatro de Sombras', 'Solicitud de función familiar', 'teatro', 'Teatro Los Fundadores', 75, '16:00', 2, 250, 0, 'En revisión', 18000, 'manizales', '901000003', 'img/5fb48.png', NULL),
  ('EVT-2026-0058', 'Mega Concierto en Plaza Pública', 'Solicitud rechazada por falta de permisos', 'musica', 'Plaza de Bolívar', 100, '18:00', 6, 8000, 0, 'Rechazado', 80000, 'pereira', '901000003', 'img/prensa/mundo-03.webp', 'Rechazado por el administrador. Motivo: Falta el permiso de la alcaldía para ocupar la plaza.'),
  ('EVT-2026-0059', 'Noche de Terror en el Teatro', 'Solicitud rechazada por clasificación', 'teatro', 'Teatro Santander', 85, '21:00', 2, 300, 18, 'Rechazado', 25000, 'bucara', '901000004', 'img/prensa/mundo-08.webp', 'Rechazado por el administrador. Motivo: Falta definir la clasificación por edad y el plan de seguridad.')
  ) AS v(codigo, nombre, descripcion, categoria, teatro, dia, hora, duracion, capacidad, edad, estado, precio, clave_ub, agente, imagen, observaciones)
  JOIN _ub u ON u.clave = v.clave_ub
  JOIN UBICACION ub ON ub.direccion = u.direccion;

SELECT setval('evento_numero_seq', (SELECT MAX(SUBSTRING(codigo FROM '[0-9]+$')::int) FROM EVENTO));

-- ==================================================================================================================
-- RESERVAS
-- Para cada evento publicado (no las solicitudes) se reparten de 2 a 7 reservas entre los clientes activos, de forma
-- repetible (sin azar). Los eventos que ya pasaron quedan con entradas usadas; los cancelados, con reservas canceladas.
-- ==================================================================================================================

INSERT INTO RESERVA (numero_entradas, observaciones, estado, fecha_hora, numero_identificacion, codigo_evento)
WITH ev AS (
  SELECT codigo, estado, fecha_hora_inicio, row_number() OVER (ORDER BY codigo) AS i
    FROM EVENTO
   WHERE codigo >= 'EVT-2026-0008' AND estado NOT IN ('En revisión', 'Rechazado')
),
cl AS (
  SELECT c.numero_identificacion, row_number() OVER (ORDER BY c.numero_identificacion) AS n, count(*) OVER () AS total
    FROM CLIENTE c JOIN USUARIO u USING (numero_identificacion)
   WHERE u.estado_usuario = 'Activo' AND c.numero_identificacion <> '1000000002'
),
r AS (
  SELECT ev.*, j FROM ev, generate_series(1, 2 + (ev.i * 7 % 6)) AS j
)
SELECT 1 + ((r.i + r.j) % 4),
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
       LEAST(NOW() - make_interval(days => (1 + (r.i * r.j) % 40)::int, hours => ((r.i + r.j) % 20)::int), r.fecha_hora_inicio - interval '1 day'),
       cl.numero_identificacion,
       r.codigo
  FROM r JOIN cl ON cl.n = 1 + ((r.i * 5 + r.j * 3) % cl.total);

-- Las que quedaron canceladas por el cliente llevan su causa
UPDATE RESERVA
   SET observaciones = 'Cancelada por el cliente. Causa: No puede asistir.'
 WHERE estado = 'Cancelada' AND (observaciones IS NULL OR observaciones NOT LIKE 'Cancelad%');

-- Un evento casi agotado (quedan 2 cupos) y otro agotado, para ver el estado "sin cupos"
INSERT INTO RESERVA (numero_entradas, observaciones, estado, numero_identificacion, codigo_evento)
WITH meta(codigo, dejar) AS (VALUES ('EVT-2026-0020', 2), ('EVT-2026-0034', 0)),
libres AS (
  SELECT m.codigo,
         e.capacidad_total - m.dejar - COALESCE((SELECT SUM(r.numero_entradas) FROM RESERVA r WHERE r.codigo_evento = m.codigo AND r.estado <> 'Cancelada'), 0) AS faltan
    FROM meta m JOIN EVENTO e USING (codigo)
),
cl AS (
  SELECT c.numero_identificacion, row_number() OVER (ORDER BY c.numero_identificacion) AS n, count(*) OVER () AS total
    FROM CLIENTE c JOIN USUARIO u USING (numero_identificacion)
   WHERE u.estado_usuario = 'Activo' AND c.numero_identificacion <> '1000000002'
)
SELECT LEAST(4, l.faltan - (k - 1) * 4), 'Compra para el grupo', 'Confirmada', cl.numero_identificacion, l.codigo
  FROM libres l
  CROSS JOIN LATERAL generate_series(1, GREATEST(ceil(l.faltan / 4.0)::int, 0)) AS k
  JOIN cl ON cl.n = 1 + (k * 7 % cl.total);

COMMIT;
