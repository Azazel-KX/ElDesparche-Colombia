const express = require("express");

// Lectura del cuerpo JSON de las peticiones.
// - El API en general admite 100 KB (evita payloads enormes).
// - Los paneles (/api/admin y /api/agente) mandan imágenes de eventos y logos como data URL (hasta 2 MB ya
//   decodificadas, unos 2.7 MB en base64), así que admiten hasta 3 MB. Ese parser va DESPUÉS de comprobar el token:
//   un anónimo nunca puede hacer que el servidor lea 3 MB.
const jsonGeneral = express.json({ limit: "100kb" });
const jsonPanel = express.json({ limit: "3mb" });

const RUTAS_PANEL = /^\/api\/(admin|agente)(\/|$)/;

// El parser general se salta las rutas de los paneles (ellas traen el suyo)
const jsonSegunRuta = (req, res, next) => (RUTAS_PANEL.test(req.path) ? next() : jsonGeneral(req, res, next));

module.exports = { jsonSegunRuta, jsonPanel };
