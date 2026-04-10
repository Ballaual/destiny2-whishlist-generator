import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __APP_COMMIT__: JSON.stringify(process.env.VITE_APP_COMMIT || 'dev')
  }
})
