import { defineConfig } from 'vite';

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
    outDir: 'dist'
  }
});
