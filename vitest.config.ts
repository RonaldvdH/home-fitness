import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import { preact } from '@preact/preset-vite';

export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: /^react$/, replacement: 'preact/compat' },
      { find: /^react-dom$/, replacement: 'preact/compat' },
      { find: /^react\/jsx-runtime$/, replacement: 'preact/jsx-runtime' },
      { find: /^use-sync-external-store\/shim$/, replacement: 'preact/compat' },
    ],
  },
  plugins: [preact()],
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['tests/**/*.test.{ts,tsx}'],
    server: {
      deps: {
        inline: [/@base-ui\//, /use-sync-external-store/, /@floating-ui\//],
      },
    },
  },
});
