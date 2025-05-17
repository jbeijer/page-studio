/**
 * Helper utility to make legacy Svelte component API work with Svelte 5
 * This is a temporary solution until the codebase is fully migrated to runes
 */

// Helper to create a proxy for props that works with both Svelte 4 and 5
export function createProps(props = {}) {
  // Just return the props object directly
  return props;
}

export default createProps;