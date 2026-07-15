import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // The registry is a symlinked workspace package importing React itself;
    // dedupe so only one React instance ends up in the bundle.
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    exclude: ['@bart-ui/registry'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
