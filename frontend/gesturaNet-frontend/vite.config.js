import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../', '')
  return {
    plugins: [react(), tailwindcss()],
    envDir: '../../',
    envPrefix: ['VITE_', 'BACKEND_', 'ENGINE_', 'FRONTEND_'],
    server: {
      port: parseInt(env.FRONTEND_PORT) || 5173,
      host: env.FRONTEND_HOST || 'localhost'
    }
  }
})
