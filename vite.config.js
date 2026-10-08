import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
  preview: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
    allowedHosts:true
  }
})
