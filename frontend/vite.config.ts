import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Загружаем переменные окружения
  const env = loadEnv(mode, process.cwd(), '')

  return {
    esbuild: {
      drop: ['console', 'debugger'],
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
        '~': path.resolve(__dirname, './src'),
      },
    },
    // Передаем DOMAIN из .env как VITE_DOMAIN
    define: {
      'import.meta.env.DOMAIN': JSON.stringify(env.DOMAIN || ''),
    },
    server: {
      host: '0.0.0.0',  // Позволяет доступ с других устройств в сети
      port: 5175,       // Порт для React
      proxy: {
        '/api': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          secure: false,
        },
        '/chat': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          secure: false,
        },
        '/auth': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          secure: false,
        },
        '/static': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          secure: false,
        },
        '/paid_gallery': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          secure: false,
        },
        '/media': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          secure: false,
        },
        '/voices': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          secure: false,
        },
        '/user_voices': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          secure: false,
        },
        '/default_character_voices': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          secure: false,
        },
        '/avatars': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
