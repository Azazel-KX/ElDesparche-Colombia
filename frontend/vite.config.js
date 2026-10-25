import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

/* La cabecera y el pie son iguales en todas las páginas: viven en parciales/ y cada HTML los pide con un
   comentario (<!--@incluir cabecera-->, <!--@incluir pie--> o <!--@incluir pie-panel-->). Se arman al servir
   la página y al hacer el build, así el HTML final sigue siendo estático (sin parpadeos ni JavaScript extra).
   En parciales/cabecera.html, {{activo:inicio}} se convierte en la marca del enlace de la página actual. */
const CARPETA_PARCIALES = resolve(import.meta.dirname, 'parciales');

/* Página (data-pagina del <body>) -> enlace del menú que se marca, y si esa ES la página (aria-current) */
const MENU_ACTIVO = {
  inicio: ['inicio', true],
  eventos: ['eventos', true],
  evento: ['eventos', false],
  reservar: ['eventos', false],
  confirmacion: ['eventos', false],
  'mis-reservas': ['mis-reservas', true]
};

function incluirParciales() {
  return {
    name: 'incluir-parciales',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const pagina = (/<body[^>]*data-pagina="([^"]+)"/.exec(html) || [])[1];
        const [activo, exacta] = MENU_ACTIVO[pagina] || [];
        return html.replace(/[ \t]*<!--@incluir ([\w-]+)-->/g, (_, nombre) => {
          const texto = readFileSync(resolve(CARPETA_PARCIALES, nombre + '.html'), 'utf8').replace(/\r\n/g, '\n');
          return texto.replace(/\{\{activo:([\w-]+)\}\}/g, (__, enlace) =>
            enlace === activo ? (exacta ? ' class="activo" aria-current="page"' : ' class="activo"') : '');
        });
      }
    },
    configureServer(servidor) {
      /* Si se edita un parcial, el navegador recarga la página */
      servidor.watcher.add(CARPETA_PARCIALES);
      servidor.watcher.on('change', (archivo) => {
        if (archivo.startsWith(CARPETA_PARCIALES)) servidor.ws.send({ type: 'full-reload' });
      });
    }
  };
}

export default defineConfig({
  root: '.',
  plugins: [incluirParciales()],
  server: {
    // 'true' escucha en IPv4 (0.0.0.0) e IPv6 (::) a la vez.
    // cloudflared resuelve 'localhost' y puede elegir ::1; si Vite solo
    // estuviera en 127.0.0.1, el tunel recibiria conexion rechazada.
    host: true,
    port: 5173,
    strictPort: true,
    open: true,
    // Vite rechaza peticiones cuyo Host no reconoce. El tunel de Cloudflare
    // llega con Host: eldesparche.online, asi que hay que permitirlo
    // explicitamente o responde "Blocked request".
    allowedHosts: ['eldesparche.online', '.eldesparche.online', 'localhost'],
    // Cuando exista el backend en el puerto 5000, las llamadas a /api
    // se redirigen solas: fetch('/api/eventos') -> http://localhost:5000/api/eventos
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    // Sitio multipagina: sin esto 'npm run build' solo empaqueta index.html
    // y las demas paginas quedan fuera de dist/.
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        eventos: resolve(import.meta.dirname, 'eventos.html'),
        evento: resolve(import.meta.dirname, 'evento.html'),
        reservar: resolve(import.meta.dirname, 'reservar.html'),
        confirmacion: resolve(import.meta.dirname, 'confirmacion.html'),
        misReservas: resolve(import.meta.dirname, 'mis-reservas.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        agente: resolve(import.meta.dirname, 'agente.html'),
        nosotros: resolve(import.meta.dirname, 'nosotros.html')
      }
    }
  }
});
