import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const backendTarget = env.VITE_BACKEND_URL || 'http://localhost:8000';
  const websocketTarget = backendTarget.replace(/^http/, 'ws');

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true
        },
        '/ws': {
          target: websocketTarget,
          ws: true
        },
        '/tap': {
          target: websocketTarget,
          ws: true
        }
      }
    }
  };
});
