/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'antd',
      'antd/locale/vi_VN',
      'antd/locale/en_US',
      'react-i18next',
      'i18next',
      '@ant-design/icons',
      '@fullcalendar/react',
    ],
  },
  server: {
    port: 3000, // Serve the frontend on port 3000
    host: 'localhost',
    hmr: {
      clientPort: 3000,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
