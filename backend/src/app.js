const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { corsOrigins } = require("./config/env");
const authRoutes = require("./routes/authRoutes");
const ciudadRoutes = require("./routes/ciudadRoutes");
const { errorHandler, noEncontrado } = require("./middlewares/errorHandler");

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: corsOrigins.length ? corsOrigins : false }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => res.json({ estado: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/ciudades", ciudadRoutes);

app.use(noEncontrado);
app.use(errorHandler);

module.exports = app;
