/**
 * getServices.js
 * 
 * This module provides a utility function to get services from context.
 * Components can use this to access the centralized services.
 */
import { getContext } from 'svelte';

// Context key for services
const SERVICES_CONTEXT_KEY = 'pageStudioServices';

/**
 * Gets PageStudio services from the Svelte context
 * 
 * @returns {Object} Object containing services and status
 * @property {Object} documentService - Document management service
 * @property {Object} canvasService - Canvas operations service
 * @property {Object} masterPageService - Master page management service
 * @property {Object} servicesReady - Store containing service ready status
 * @property {Object} allServicesReady - Derived store for overall readiness
 */
export function getServices() {
  const services = getContext(SERVICES_CONTEXT_KEY);
  
  if (!services) {
    console.error('getServices: Services not found in context. Make sure ServiceProvider is a parent component.');
    
    // Return dummy objects to prevent null errors
    return {
      documentService: {
        initialize: () => console.error('Document service not available'),
        saveCurrentPage: () => console.error('Document service not available')
      },
      canvasService: {
        initialize: () => console.error('Canvas service not available'),
        createObject: () => console.error('Canvas service not available')
      },
      masterPageService: {
        initialize: () => console.error('Master page service not available'),
        applyMasterPage: () => console.error('Master page service not available')
      },
      servicesReady: { subscribe: () => () => {} },
      allServicesReady: { subscribe: () => () => {} }
    };
  }
  
  return services;
}

export default getServices;