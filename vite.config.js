import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  
  // Use a simpler server configuration to avoid WebSocket issues
  server: {
    port: 5173,
    strictPort: true, // Fail if port is already in use
    hmr: false,       // Disable HMR (Hot Module Replacement) to avoid WebSocket issues
    cors: true,       // Enable CORS
    fs: {
      strict: false   // Allow serving files from outside the project root
    }
  },
  
  // Build configuration
  build: {
    target: 'esnext',
    sourcemap: true,
    assetsInlineLimit: 0 // Don't inline assets (better for debugging)
  },
  
  // Svelte specific options
  optimizeDeps: {
    include: ['fabric']
  },
  
  // Test configuration
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