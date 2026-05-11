import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const WASM_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
          // Don't cache ONNX models in SW (too large) — browser caches them in OPFS
          globIgnores: ['**/*.onnx', '**/*.onnx.json'],
          runtimeCaching: [
            {
              // Cache arena images from Unsplash at runtime
              urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'unsplash-images',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
        manifest: {
          name: 'MayronCombat — Ultimate Multiverse Brawler',
          short_name: 'MayronCombat',
          description: 'Générateur de combats épiques avec narration IA',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          orientation: 'landscape',
          icons: [
            { src: '/images/pikachu_sf.png', sizes: '192x192', type: 'image/png' },
            { src: '/images/pikachu_sf.png', sizes: '512x512', type: 'image/png' },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      headers: WASM_HEADERS,
    },
    preview: {
      headers: WASM_HEADERS,
    },
  };
});
