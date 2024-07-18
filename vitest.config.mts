import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    target: 'es2020',
    include: /\.(m?[jt]s|[jt]s)$/,
    exclude: [],
  },
  test: {
    include: ['src/**/*.spec.ts'],
    coverage: {
      reporter: ['text', 'json', 'html', 'lcovonly'],
      include: ['src/'],
      exclude: ['**/__tests__/'],
    },
  },
});
