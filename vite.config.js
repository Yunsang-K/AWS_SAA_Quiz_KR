import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    allowedHosts: ['.up.railway.app'],
  },
  preview: {
    allowedHosts: ['.up.railway.app'],
  },
})
