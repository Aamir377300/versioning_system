import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,           // listen on 0.0.0.0 so Docker exposes it correctly
    watch: {
      usePolling: true,   // required on macOS Docker — native FS events don't cross the VM boundary
    },
  },
})
