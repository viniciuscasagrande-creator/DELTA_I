import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@delta-erp/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@delta-erp/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@delta-erp/validators': path.resolve(__dirname, '../../packages/validators/src/index.ts'),
      '@delta-erp/auth-client': path.resolve(__dirname, '../../packages/auth-client/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          if (id.includes('/src/pages/') || id.includes('\\src\\pages\\') || id.includes('/src/data/') || id.includes('\\src\\data\\')) {
            return 'erp-modules';
          }
        },
      },
    },
  },
});
