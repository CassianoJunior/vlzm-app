import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // TODO: Set this to '/repo-name/' if deploying to https://<user>.github.io/<repo-name>/
  // Set to '/' if deploying to https://<user>.github.io/ or using a custom domain
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
