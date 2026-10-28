import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// A porta 5173 é a única origem liberada no CORS do Backend. Com strictPort o Vite
// falha se a porta estiver ocupada, em vez de subir em outra porta sem aviso.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
