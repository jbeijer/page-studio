import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    
    // Minimal configuration to avoid issues
    alias: {
      '$lib': './src/lib'
    }
  }
};

export default config;