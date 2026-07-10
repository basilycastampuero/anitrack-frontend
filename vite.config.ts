/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // host: true expone el servidor en 0.0.0.0 — necesario para acceder desde
    // fuera del contenedor Docker (localhost del host -> puerto mapeado).
    host: true,
    // ADR-005: same-origin en producción. En dev, cuando VITE_API_MODE=real,
    // el backend de Odoo se sirve por proxy para que la cookie de sesión funcione.
    proxy: {
      '/api': {
        target: process.env.VITE_ODOO_URL ?? 'http://localhost:8069',
        changeOrigin: true,
      },
      '/web/image': {
        target: process.env.VITE_ODOO_URL ?? 'http://localhost:8069',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts'],
    },
  },
})
