import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src'), '@shared': path.resolve(__dirname, 'shared') } },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: { manualChunks: { charts: ['recharts'], vendor: ['react', 'react-dom', '@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tooltip', 'sonner'] } },
    },
  },
})
