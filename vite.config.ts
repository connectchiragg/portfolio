import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import glsl from 'vite-plugin-glsl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), glsl()],
  server: {
    host: '127.0.0.1',
  },
  build: {
    target: 'es2022',
  },
})
