import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// TMDB_KEY from .env, only read here on the dev server, never sent to the browser
const { TMDB_KEY = '' } = loadEnv('development', process.cwd(), '')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // same relay as nginx in Docker: /tmdb/... -> api.themoviedb.org/3/... with the key added
    proxy: {
      '/tmdb': {
        target: 'https://api.themoviedb.org',
        changeOrigin: true,
        rewrite: (path) => {
          const url = new URL(path.replace(/^\/tmdb/, '/3'), 'http://localhost')
          url.searchParams.set('api_key', TMDB_KEY)
          return url.pathname + url.search
        },
      },
    },
  },
})
