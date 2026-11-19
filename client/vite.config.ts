import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // local dev: proxy /api to the Node server so the same fetch() calls work
      '/api': 'http://localhost:4000',
    },
  },
})
