import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'url' // Import for ES Module path resolution
import { defineConfig } from 'vite'
// import WindiCSS from 'vite-plugin-windicss' // WindiCSS is deprecated, consider Tailwind CSS JIT or UnoCSS

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true,
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)), // ES Module way
    },
  },
  server: { // Added server configuration
    port: 3000, // Explicitly set frontend port, though often defaults to this or 5173
    proxy: {
      '/api': { // Proxy requests from /api
        target: 'http://localhost:8157', // Your backend server address
        changeOrigin: true, // Recommended for virtual hosted sites
        rewrite: (path) => path.replace(/^\/api/, ''), // Rewrite /api/chat to /chat
      },
    },
  },
  envDir: '../config', // Point to the config directory at root level
  cacheDir: fileURLToPath(new URL('../node_modules/.vite', import.meta.url)), // ES Module way
})
