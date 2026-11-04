import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@delta-erp/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@delta-erp/validators': path.resolve(__dirname, 'packages/validators/src/index.ts'),
      '@delta-erp/ui': path.resolve(__dirname, 'packages/ui/src/index.ts'),
      '@delta-erp/auth-client': path.resolve(__dirname, 'packages/auth-client/src/index.ts'),
      '@delta-erp/config': path.resolve(__dirname, 'packages/config/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['apps/**/*.spec.ts', 'tests/**/*.spec.ts'],
  },
});
