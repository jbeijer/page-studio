import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/setupTests.js'],
    server: {
      deps: {
        inline: ['svelte']
      }
    },
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.d.ts']
    }
  }
});