import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    base: '/',
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            includeAssets: ['logo-192.png', 'logo-512.png'],
            manifest: {
                name: 'BerruangGawll App',
                short_name: 'BerruangGawll',
                description: 'Aplikasi Operasional CV. Oase Indonesia',
                theme_color: '#0A0A0A',
                background_color: '#0A0A0A',
                display: 'standalone',
                // --- TAMBAHKAN 3 BARIS INI UNTUK MEMAKSA DOMAIN ---
                start_url: '/',
                scope: '/',
                id: '/',
                // -------------------------------------------------
                icons: [
                    {
                        src: '/logo-192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: '/logo-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            },
            devOptions: {
                enabled: true
            }
        })
    ],
    server: {
        watch: {
            ignored: ['**/.vs/**']
        }
    }
})