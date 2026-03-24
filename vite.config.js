import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // This tells Vite not to warn us until the file hits a massive 1500kb!
    chunkSizeWarningLimit: 1500, 
  }
})