/* ==========================================================================
   modelos/catalogos.js
   Catálogos del dominio: categorías, planes, estados y tipos de documento.
   ========================================================================== */

export var CATEGORIAS_EVENTO = [
  ["musica", "Música"], ["teatro", "Teatro"], ["danza", "Danza"], ["circo", "Circo"], ["comedia", "Comedia"]
];

/* musica -> "Música" */
export var NOMBRE_CATEGORIA = CATEGORIAS_EVENTO.reduce(function (mapa, c) {
  mapa[c[0]] = c[1];
  return mapa;
}, {});

export var NOMBRE_PLAN = { parchesote: "Parchesote", parche: "Parche", parchesito: "Parchesito" };

/* Tipos de plan (las categorías del pie de página) y el de cada evento */
export var TIPOS_PARCHE = {
  parchesote: { nombre: "Parchesotes", texto: "Festivales y conciertos" },
  parche: { nombre: "Parches", texto: "Teatro, comedia y cultura" },
  parchesito: { nombre: "Parchesitos", texto: "Familiares, gastronómicos y gratis" }
};

export var PLANES_EVENTO = [
  ["parchesote", "Parchesote (festivales y conciertos)"],
  ["parche", "Parche (teatro, comedia y cultura)"],
  ["parchesito", "Parchesito (familiar, gastronómico o gratis)"]
];

export var ESTADOS_EVENTO = ["Programado", "En Boletería", "En Vivo", "Finalizado", "Cancelado"];

/* Reglas de la base de datos (USUARIO): documento, correo, teléfono */
export var TIPOS_DOCUMENTO = [
  ["CC", "Cédula de ciudadanía"],
  ["CE", "Cédula de extranjería"],
  ["PPT", "Permiso por protección temporal"],
  ["PAS", "Pasaporte"]
];

export var HORARIOS = ["Mañana", "Tarde", "Noche", "Completa"];

export var NIVELES_UBICACION = {
  pais: { lista: "paises", singular: "país", plural: "países", padre: null, max: 60 },
  departamento: { lista: "departamentos", singular: "departamento", plural: "departamentos", padre: "idPais", max: 60 },
  ciudad: { lista: "ciudades", singular: "ciudad", plural: "ciudades", padre: "idDepartamento", max: 80 }
};
