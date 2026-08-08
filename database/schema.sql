-- Extensión para soporte de geolocalización
CREATE EXTENSION IF NOT EXISTS postgis;

-- Tabla de Usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Aliados Comerciales (B2B)
CREATE TABLE business_partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50)
);

-- Tabla de Parches / Eventos
CREATE TABLE parches (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    creator_user_id INT REFERENCES users(id),
    business_id INT REFERENCES business_partners(id),
    price NUMERIC(10,2) DEFAULT 0.00,
    is_verified_only BOOLEAN DEFAULT FALSE,
    location GEOMETRY(Point, 4326),
    scheduled_at TIMESTAMP NOT NULL
);