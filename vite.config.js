import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/mito1-digital-studenthandbook/',
  build: {
    rollupOptions: {
      input: {
        main:  resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
      }
    }
  }
})