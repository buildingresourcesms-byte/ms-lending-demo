import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // relative asset paths so the build works on any host (Netlify, GitHub
  // Pages subpaths) and even when opened directly from a folder.
  base: './',
  plugins: [react(), tailwindcss()],
  // honor a harness-assigned PORT (preview tooling) when present; otherwise 5173
  server: process.env.PORT ? { port: Number(process.env.PORT) } : undefined,
})
