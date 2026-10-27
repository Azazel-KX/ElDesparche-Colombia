// Prepara los archivos que necesitan DbGate y pgAdmin para conectarse a la base de Neon (docker-compose.neon.yml).
// Lee la DATABASE_URL de backend/.env y escribe, en la carpeta docker/ de la raíz (Git no la sube):
//   docker/.env.neon                    usuario, clave y servidor para DbGate
//   docker/pgadmin-neon-servers.json    la conexión ya registrada en pgAdmin (sin la clave)
//
// Uso (desde backend/):  npm run neon:herramientas
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function preparar() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("backend/.env no tiene DATABASE_URL. Pega ahí la cadena de conexión de Neon (ver GUIA_NEON.md).");
    process.exit(1);
  }

  const u = new URL(url);
  const datos = {
    servidor: u.hostname,
    puerto: u.port || "5432",
    base: decodeURIComponent(u.pathname.slice(1)),
    usuario: decodeURIComponent(u.username),
    clave: decodeURIComponent(u.password),
  };

  const carpeta = path.join(__dirname, "..", "..", "docker");
  fs.mkdirSync(carpeta, { recursive: true });

  fs.writeFileSync(path.join(carpeta, ".env.neon"), [
    "CONNECTIONS=neon",
    "LABEL_neon=Neon - ElDesparche",
    "ENGINE_neon=postgres@dbgate-plugin-postgres",
    `SERVER_neon=${datos.servidor}`,
    `PORT_neon=${datos.puerto}`,
    `USER_neon=${datos.usuario}`,
    `PASSWORD_neon=${datos.clave}`,
    `DATABASE_neon=${datos.base}`,
    "USE_SSL_neon=1",
    "",
  ].join("\n"));

  fs.writeFileSync(path.join(carpeta, "pgadmin-neon-servers.json"), JSON.stringify({
    Servers: {
      1: {
        Name: "Neon - ElDesparche",
        Group: "Servers",
        Host: datos.servidor,
        Port: Number(datos.puerto),
        MaintenanceDB: datos.base,
        Username: datos.usuario,
        SSLMode: "require",
      },
    },
  }, null, 2) + "\n");

  console.log(`Listo: docker/.env.neon y docker/pgadmin-neon-servers.json (servidor ${datos.servidor}).`);
}

preparar();
