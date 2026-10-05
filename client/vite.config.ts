import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const api = loadEnv(mode, '..', 'VITE_').VITE_API_TARGET ?? 'http://localhost:3000';
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      // In sviluppo API, file e WebSocket passano dal server Express: stessa origine, stessi cookie.
      proxy: {
        '/api': api,
        '/socket.io': { target: api, ws: true },
      },
    },
  };
});
