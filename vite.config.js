import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/mito1-digital-studenthandbook/',
  build: {
    rollupOptions: {
      input: {
        main:    resolve(__dirname, 'index.html'),
        admin:   resolve(__dirname, 'admin/index.html'),
        approve: resolve(__dirname, 'approve.html'),
        auth:    resolve(__dirname, 'auth.html'),
        teacher: resolve(__dirname, 'teacher.html'),
      }
    }
  }
})