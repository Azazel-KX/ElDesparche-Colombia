import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: '.',
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
        misReservas: resolve(import.meta.dirname, 'mis-reservas.html')
      }
    }
  }
});
