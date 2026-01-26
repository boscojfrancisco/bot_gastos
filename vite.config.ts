
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Fix: Access process.cwd() with type assertion to avoid TypeScript error where 'process' is typed for browser
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Provide API_KEY to the client-side code from the environment
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || '')
    },
    server: {
      host: true
    },
    build: {
      outDir: 'dist',
    }
  }
})
