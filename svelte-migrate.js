/**
 * Migration script to help convert from Svelte 4 to Svelte 5
 * To use this script, run: node svelte-migrate.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Update svelte.config.js to use legacy mode
const svelteConfigPath = path.join(__dirname, 'svelte.config.js');
const svelteConfig = `import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Configure for compatibility with Svelte 5
  compilerOptions: {
    runes: false
  },
  kit: {
    adapter: adapter(),
    
    // Minimal configuration to avoid issues
    alias: {
      '$lib': './src/lib'
    }
  }
};

export default config;`;

// Write updated svelte.config.js
fs.writeFileSync(svelteConfigPath, svelteConfig);
console.log('✅ Updated svelte.config.js to disable runes mode');

console.log('✅ Migration script completed successfully');