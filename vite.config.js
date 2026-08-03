import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      includeAssets: ['vite.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'],
      manifest: {
        id: 'fire-tracker',
        name: 'لجنة السلامة',
        short_name: 'لجنة السلامة',
        description: 'نظام إدارة ومتابعة طفايات الحريق',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        theme_color: '#991b1b',
        background_color: '#f3f4f6',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
        shortcuts: [
          { name: 'لوحة التحكم', short_name: 'الرئيسية', url: '/', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'الطفايات', short_name: 'الطفايات', url: '/?view=list', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'التقارير', short_name: 'التقارير', url: '/?view=report', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'فريق العمل', short_name: 'الفريق', url: '/?view=users', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
        ],
      },
    }),
  ],
})
