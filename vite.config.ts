import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/wubba-labba/', // Pastikan ada tanda garis miring di awal dan akhir
})