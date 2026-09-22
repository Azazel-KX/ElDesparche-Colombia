/* ============================================================================
   Datos de la aplicación · El Desparche
   ========================================================================= */
'use strict';

/** Ruta base de los recursos gráficos. */
const ASSETS = 'assets';

/** Imágenes de los eventos, en el mismo orden que el catálogo. */
const EVENT_IMAGES = [
  ASSETS + '/27459.png', // Festival Estéreo Picnic
  ASSETS + '/6554e.png', // Morat
  ASSETS + '/d7016.png', // Jazz al Parque
  ASSETS + '/12935.png', // Circo del Sol
  ASSETS + '/337fd.png', // Festival Mundial de Salsa
  ASSETS + '/5fb48.png', // Macondo
  ASSETS + '/67c1c.png', // Lokillo
  ASSETS + '/7d702.png', // Ritvales
  ASSETS + '/33202.png', // Zona Estéreo
  ASSETS + '/1c2e7.png', // Batallas Épicas
  ASSETS + '/94bcf.png', // Cali Salsa Festival
  ASSETS + '/1cbb3.png'  // Concierto Acústico
];

/** Catálogo de eventos. */
const EVENTS = [
  {
    id: 1,
    title: 'Festival Estéreo Picnic',
    city: 'Bogotá',
    venue: 'Parque La Florida',
    date: '20-23 mar 2027',
    dateStart: '20 de marzo de 2027 · 4:00 p. m.',
    dateEnd: '23 de marzo de 2027 · 2:00 a. m.',
    price: '$480.000 COP',
    capacity: '85.000 personas',
    available: 3842,
    totalCapacity: 85000,
    observations: 'Ingreso para mayores de 14 años. Apertura de puertas a las 2:00 p. m.',
    status: 'En Boletería',
    description: 'Cuatro días de música, cultura y experiencias inolvidables. Artistas nacionales e internacionales se encuentran en Bogotá para celebrar una nueva edición del festival más grande del país.',
    img: EVENT_IMAGES[0],
    lat: 4.7110,
    lng: -74.0721
  },
  {
    id: 2,
    title: 'Morat · Antes de que amanezca',
    city: 'Medellín',
    venue: 'Movistar Arena Medellín',
    date: '18 oct 2026',
    dateStart: '18 de octubre de 2026 · 8:00 p. m.',
    dateEnd: '19 de octubre de 2026 · 12:00 a. m.',
    price: '$165.000 COP',
    capacity: '14.000 personas',
    available: 1200,
    totalCapacity: 14000,
    observations: 'No se permite ingreso de menores de 12 años sin acompañante.',
    status: 'En Vivo',
    description: 'Morat regresa a Colombia con su tour más íntimo y personal. Una noche cargada de emoción, canciones y momentos irrepetibles.',
    img: EVENT_IMAGES[1],
    lat: 6.2442,
    lng: -75.5812
  },
  {
    id: 3,
    title: 'Jazz al Parque',
    city: 'Bogotá',
    venue: 'Parque El Country',
    date: '7-8 nov 2026',
    dateStart: '7 de noviembre de 2026 · 2:00 p. m.',
    dateEnd: '8 de noviembre de 2026 · 10:00 p. m.',
    price: 'Entrada libre',
    capacity: '30.000 personas',
    available: 30000,
    totalCapacity: 30000,
    observations: 'Evento gratuito. Aforo limitado.',
    status: 'Programado',
    description: 'El festival de jazz más importante de Bogotá vuelve al parque para deleitar a los amantes de la música con lo mejor del género.',
    img: EVENT_IMAGES[2],
    lat: 4.6604,
    lng: -74.0579
  },
  {
    id: 4,
    title: 'Circo del Sol · KOOZA',
    city: 'Cali',
    venue: 'Centro de Eventos Valle Pacífico',
    date: '14 dic 2026',
    dateStart: '14 de diciembre de 2026 · 7:00 p. m.',
    dateEnd: '14 de diciembre de 2026 · 10:00 p. m.',
    price: '$210.000 COP',
    capacity: '5.000 personas',
    available: 820,
    totalCapacity: 5000,
    observations: 'Espectáculo apto para todas las edades.',
    status: 'En Boletería',
    description: 'El Circo del Sol trae a Colombia KOOZA, un show de acrobacias, humor y magia que conquista todos los sentidos.',
    img: EVENT_IMAGES[3],
    lat: 3.4516,
    lng: -76.5320
  },
  {
    id: 5,
    title: 'Festival Mundial de Salsa',
    city: 'Cali',
    venue: 'Cali Exposhow',
    date: '25-28 sep 2026',
    dateStart: '25 de septiembre de 2026 · 4:00 p. m.',
    dateEnd: '28 de septiembre de 2026 · 4:00 a. m.',
    price: '$85.000 COP',
    capacity: '40.000 personas',
    available: 0,
    totalCapacity: 40000,
    observations: 'Evento finalizado. Gracias por su participación.',
    status: 'Finalizado',
    description: 'La capital mundial de la salsa celebró su tradicional festival con los mejores bailarines y orquestas del planeta.',
    img: EVENT_IMAGES[4],
    lat: 3.4172,
    lng: -76.5246
  },
  {
    id: 6,
    title: 'Macondo, la obra',
    city: 'Barranquilla',
    venue: 'Teatro Amira de la Rosa',
    date: '2 oct 2026',
    dateStart: '2 de octubre de 2026 · 7:30 p. m.',
    dateEnd: '2 de octubre de 2026 · 10:00 p. m.',
    price: '$72.000 COP',
    capacity: '1.200 personas',
    available: 350,
    totalCapacity: 1200,
    observations: 'Se recomienda llegar 30 minutos antes de la función.',
    status: 'Programado',
    description: 'Una adaptación teatral de la obra cumbre de García Márquez. Una producción colombiana que recorre los 100 años de Macondo en escena.',
    img: EVENT_IMAGES[5],
    lat: 10.9685,
    lng: -74.7813
  },
  {
    id: 7,
    title: 'Lokillo · Eso era antes',
    city: 'Bucaramanga',
    venue: 'Coliseo El Campin Norte',
    date: '16 nov 2026',
    dateStart: '16 de noviembre de 2026 · 8:00 p. m.',
    dateEnd: '16 de noviembre de 2026 · 11:00 p. m.',
    price: '$68.000 COP',
    capacity: '8.000 personas',
    available: 0,
    totalCapacity: 8000,
    observations: 'Evento cancelado. Se realizarán devoluciones en los próximos 10 días hábiles.',
    status: 'Cancelado',
    description: 'La gira Eso era antes de Lokillo fue cancelada por causas de fuerza mayor. Contacta al punto de venta para tu reembolso.',
    img: EVENT_IMAGES[6],
    lat: 7.1254,
    lng: -73.1198
  },
  {
    id: 8,
    title: 'Ritvales 2026',
    city: 'Medellín',
    venue: 'Parque Norte',
    date: '1-2 nov 2026',
    dateStart: '1 de noviembre de 2026 · 5:00 p. m.',
    dateEnd: '2 de noviembre de 2026 · 3:00 a. m.',
    price: '$295.000 COP',
    capacity: '20.000 personas',
    available: 7200,
    totalCapacity: 20000,
    observations: 'Menores de 16 años deben ir acompañados de un adulto.',
    status: 'Programado',
    description: 'El festival de experiencias alternativas más esperado del año vuelve a Medellín con una propuesta que une música, arte y tecnología.',
    img: EVENT_IMAGES[7],
    lat: 6.2602,
    lng: -75.5701
  },
  {
    id: 9,
    title: 'Zona Estéreo Urbano 2026',
    city: 'Medellín',
    venue: 'Estadio Atanasio Girardot',
    date: '8 oct 2026',
    dateStart: '8 de octubre de 2026 · 6:00 p. m.',
    dateEnd: '9 de octubre de 2026 · 1:00 a. m.',
    price: '$120.000 COP',
    capacity: '45.000 personas',
    available: 12000,
    totalCapacity: 45000,
    observations: 'Evento con consumo mínimo en zonas VIP.',
    status: 'En Boletería',
    description: 'Una noche de electrónica, rap y pop urbano en el corazón de Medellín. El festival que unifica todos los géneros urbanos en una sola tarima.',
    img: EVENT_IMAGES[8],
    lat: 6.2567,
    lng: -75.5900
  },
  {
    id: 10,
    title: 'Batallas Épicas de Rap',
    city: 'Bogotá',
    venue: 'Teatro Jorge Eliécer Gaitán',
    date: '12 oct 2026',
    dateStart: '12 de octubre de 2026 · 5:00 p. m.',
    dateEnd: '12 de octubre de 2026 · 11:00 p. m.',
    price: '$45.000 COP',
    capacity: '3.500 personas',
    available: 900,
    totalCapacity: 3500,
    observations: 'Evento abierto a todos los públicos. Menores deben ir con adulto.',
    status: 'Programado',
    description: 'Las mejores batallas de rap freesyle de Colombia se dan cita en Bogotá. Competencia oficial con clasificación nacional.',
    img: EVENT_IMAGES[9],
    lat: 4.6122,
    lng: -74.0739
  },
  {
    id: 11,
    title: 'Cali Salsa Festival',
    city: 'Cali',
    venue: 'Parque de la Música',
    date: '19 oct 2026',
    dateStart: '19 de octubre de 2026 · 3:00 p. m.',
    dateEnd: '20 de octubre de 2026 · 2:00 a. m.',
    price: '$95.000 COP',
    capacity: '25.000 personas',
    available: 5600,
    totalCapacity: 25000,
    observations: 'Espectáculo de salsa caleña con artistas internacionales.',
    status: 'Programado',
    description: 'El ritmo de Cali al máximo. Un festival que reúne las mejores orquestas y bailarines de salsa de todo el mundo en la sucursal del cielo.',
    img: EVENT_IMAGES[10],
    lat: 3.4333,
    lng: -76.5417
  },
  {
    id: 12,
    title: 'Concierto Acústico Campestre',
    city: 'Guatavita Reservoirs',
    venue: 'Hacienda La Fragua',
    date: '2 nov 2026',
    dateStart: '2 de noviembre de 2026 · 11:00 a. m.',
    dateEnd: '2 de noviembre de 2026 · 7:00 p. m.',
    price: '$55.000 COP',
    capacity: '2.000 personas',
    available: 420,
    totalCapacity: 2000,
    observations: 'Evento al aire libre. Se recomienda ropa cómoda y protector solar.',
    status: 'Programado',
    description: 'Una jornada de música acústica y naturaleza en los alrededores del embalse del Tominé. Un descanso del ruido de la ciudad.',
    img: EVENT_IMAGES[11],
    lat: 4.9340,
    lng: -73.8320
  }
];

/* -- Catálogos de filtros ------------------------------------------------- */

const CITIES = ['Todas', 'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga', 'Guatavita Reservoirs'];
const STATUSES = ['Todos', 'Programado', 'En Boletería', 'En Vivo', 'Finalizado', 'Cancelado'];
const DATES = ['Todas las fechas', 'Próximos 7 días', 'Este mes', 'Próximo mes'];
const TYPES = ['Concierto', 'Festival', 'Teatro', 'Deportes', 'Stand-up'];
const COUNTRIES = ['Colombia', 'México', 'Argentina'];

/** Departamentos por país. */
const DEPARTMENTS = {
  'Colombia': ['Antioquia', 'Cundinamarca', 'Valle del Cauca', 'Santander'],
  'México': ['CDMX', 'Jalisco'],
  'Argentina': ['Buenos Aires']
};

/** Ciudades por departamento. */
const CITIES_BY_DEPT = {
  'Antioquia': ['Medellín'],
  'Cundinamarca': ['Bogotá'],
  'Valle del Cauca': ['Cali'],
  'Santander': ['Bucaramanga'],
  'CDMX': ['Ciudad de México'],
  'Jalisco': ['Guadalajara'],
  'Buenos Aires': ['Buenos Aires']
};

/** Resultados por página en el listado. */
const PAGE_SIZE = 12;
