import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        home:   'index.html',
        painel: 'painel.html',
        pedido: 'pedido.html',
        ajuda:  'ajuda.html',
      }
    }
  }
})
