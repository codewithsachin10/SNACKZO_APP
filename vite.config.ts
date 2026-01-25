import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit to allow large chunks
      },
      manifest: {
        name: 'Snackzo Delivery',
        short_name: 'Snackzo',
        description: 'Fastest Hostel Delivery Service',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon'
          },
          {
            src: 'favicon.ico',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable' // Placeholder: User should replace with real 192.png
          },
          {
            src: 'favicon.ico',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Placeholder: User should replace with real 512.png
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
