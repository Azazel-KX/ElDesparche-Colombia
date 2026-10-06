/* Genera data/eventos.json a partir del array EVENTOS que ya existe en
   js/script.js, con una estructura ampliada. */
const fs = require('fs');

const src = fs.readFileSync('js/script.js', 'utf8');
const i = src.indexOf('var EVENTOS = [');
/* EVENTOS termina donde empieza la siguiente declaracion, que ahora
   es DESTACADOS (antes era DEPARTAMENTOS). */
const j = src.indexOf('var DESTACADOS');
const EVENTOS = eval(src.slice(i + 'var EVENTOS = '.length, j).trim().replace(/;\s*$/, ''));

const kd = src.indexOf('var DEPARTAMENTOS');
const kc = src.indexOf('var CIUDADES');
const ke = src.indexOf('/* ===', kc);
/* Los paréntesis son necesarios: sin ellos eval lee «{...}» como un
   bloque de código en vez de como un objeto. */
const DEPARTAMENTOS = eval('(' + src.slice(kd + 'var DEPARTAMENTOS = '.length, kc).trim().replace(/;\s*$/, '') + ')');
const CIUDADES = eval('(' + src.slice(kc + 'var CIUDADES = '.length, ke).trim().replace(/;\s*$/, '') + ')');

/* Categoría y departamento: propuestos a partir del contenido de cada
   evento. Revísalos y ajústalos si alguno no encaja. */
const CATEGORIA = {
  1: 'musica', 2: 'musica', 3: 'musica', 4: 'circo', 5: 'danza', 6: 'teatro',
  7: 'comedia', 8: 'musica', 9: 'musica', 10: 'musica', 11: 'danza', 12: 'musica'
};
const DEPARTAMENTO_DE_CIUDAD = {
  'Bogotá': 'Bogotá D.C.', 'Medellín': 'Antioquia', 'Cali': 'Valle del Cauca',
  'Barranquilla': 'Atlántico', 'Bucaramanga': 'Santander',
  'Guatavita Reservoirs': 'Cundinamarca'
};
/* Los del carrusel de portada: se leen de js/script.js para no tener la
   lista en dos sitios. */
const kda = src.indexOf('var DESTACADOS = [');
const DESTACADOS = eval(src.slice(kda + 'var DESTACADOS = '.length, src.indexOf(']', kda) + 1));

const slug = t => t.toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const ESTADOS = {
  'Programado':   { clave: 'programado',  reservable: true  },
  'En Boletería': { clave: 'boleteria',   reservable: true  },
  'En Vivo':      { clave: 'vivo',        reservable: true  },
  'Finalizado':   { clave: 'finalizado',  reservable: false },
  'Cancelado':    { clave: 'cancelado',   reservable: false }
};

const eventos = EVENTOS.map(e => ({
  id: e.id,
  slug: slug(e.titulo),
  url: 'evento.html?id=' + e.id,
  titulo: e.titulo,
  descripcion: e.descripcion,
  categoria: CATEGORIA[e.id] || null,
  destacado: DESTACADOS.includes(e.id),
  prioridad: DESTACADOS.includes(e.id) ? DESTACADOS.indexOf(e.id) + 1 : 0,
  estado: {
    etiqueta: e.estado,
    clave: ESTADOS[e.estado].clave,
    reservable: ESTADOS[e.estado].reservable
  },
  fecha: {
    textoCorto: e.fechaCorta,
    inicio: e.fechaInicio,
    fin: e.fechaFin
  },
  lugar: {
    nombre: e.lugar,
    ciudad: e.ciudad,
    departamento: DEPARTAMENTO_DE_CIUDAD[e.ciudad] || null,
    pais: 'Colombia',
    lat: e.lat,
    lon: e.lon
  },
  entrada: {
    precio: e.precio,
    moneda: 'COP',
    gratis: e.precio === 0,
    disponibles: e.disponibles,
    capacidad: e.capacidad
  },
  medios: {
    imagen: e.imagen,
    alt: 'Imagen promocional del evento ' + e.titulo + ' en ' + e.ciudad
  },
  observaciones: e.observaciones
}));

/* Catálogo de filtros, con la misma idea que usa Eventario: una lista de
   filtros declarados, cada uno con su tipo, para que el buscador se pueda
   construir recorriendo este array en vez de escribirlo a mano. */
const categoriasUsadas = [...new Set(eventos.map(e => e.categoria))].filter(Boolean).sort();
const ETIQUETA_CATEGORIA = {
  musica: 'Música', teatro: 'Teatro', danza: 'Danza',
  circo: 'Circo', comedia: 'Comedia'
};

const filtros = [
  {
    clave: 'busqueda', tipo: 'texto', etiqueta: 'Buscar eventos por nombre o ciudad',
    marcador: 'Buscar eventos', minimoCaracteres: 0,
    buscaEn: ['titulo', 'lugar.ciudad', 'lugar.nombre']
  },
  {
    clave: 'ubicacion', tipo: 'jerarquico', etiqueta: '¿Dónde?',
    niveles: [
      { clave: 'pais', etiqueta: 'País', campo: 'lugar.pais' },
      { clave: 'departamento', etiqueta: 'Departamento', campo: 'lugar.departamento', dependeDe: 'pais' },
      { clave: 'ciudad', etiqueta: 'Ciudad', campo: 'lugar.ciudad', dependeDe: 'departamento' }
    ],
    opciones: { paises: Object.keys(DEPARTAMENTOS), departamentos: DEPARTAMENTOS, ciudades: CIUDADES }
  },
  {
    clave: 'categoria', tipo: 'lista', etiqueta: 'Categoría', campo: 'categoria',
    opciones: categoriasUsadas.map(c => ({ valor: c, etiqueta: ETIQUETA_CATEGORIA[c] || c }))
  },
  {
    clave: 'estado', tipo: 'lista', etiqueta: 'Estado', campo: 'estado.clave',
    opciones: Object.entries(ESTADOS).map(([k, v]) => ({ valor: v.clave, etiqueta: k }))
  },
  {
    clave: 'precio', tipo: 'opcion', etiqueta: 'Precio', campo: 'entrada.gratis',
    opciones: [
      { valor: 'todos',  etiqueta: 'Todos',         condicion: null },
      { valor: 'gratis', etiqueta: 'Entrada libre', condicion: { 'entrada.gratis': true } },
      { valor: 'pago',   etiqueta: 'Con boletería', condicion: { 'entrada.gratis': false } }
    ]
  },
  {
    clave: 'fecha', tipo: 'rango-fechas', etiqueta: '¿Cuándo?',
    campo: 'fecha.inicio', marcador: { desde: 'Desde', hasta: 'Hasta' }
  }
];

const salida = {
  version: '1.0',
  moneda: 'COP',
  idioma: 'es-CO',
  total: eventos.length,
  destacados: DESTACADOS,
  filtros,
  eventos
};

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/eventos.json', JSON.stringify(salida, null, 2) + '\n', 'utf8');
console.log('data/eventos.json escrito');
console.log('  eventos:', eventos.length, '| destacados:', DESTACADOS.length, '| filtros:', filtros.length);
console.log('  categorias:', categoriasUsadas.join(', '));
