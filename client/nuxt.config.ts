// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vite-pwa/nuxt',
  ],

  css: [
    'leaflet/dist/leaflet.css',
  ],

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1',
      mapDefaultLat: 8.0035,
      mapDefaultLng: 124.2621,
      mapDefaultZoom: 16,
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'MSU Lalan - Campus Navigation & Directory',
      short_name: 'MSU Lalan',
      description: 'Mindanao State University Main Campus Geospatial Wayfinding & Directory System',
      theme_color: '#800000',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait-primary',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'osm-map-tiles-cache',
            expiration: {
              maxEntries: 1000,
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days cache for offline maps
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
  },
});
