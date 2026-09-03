import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  test: {
    // Acotado a src/ a proposito: los specs de Playwright viven en tests/e2e/
    // y si Vitest los levanta falla con "test.describe() no esperado aca".
    // Es el mismo choque que ya estaba documentado en admin.
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
