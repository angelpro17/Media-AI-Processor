import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                timeout: 120_000,
                configure: (proxy) => {
                    proxy.on('proxyReq', (proxyReq) => {
                        // Remove default timeout for large uploads
                        proxyReq.socket?.setTimeout(0);
                    });
                },
            },
        },
    },
})
