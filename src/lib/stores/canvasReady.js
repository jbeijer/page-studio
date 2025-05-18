import { writable, derived } from 'svelte/store';
import { currentDocument, currentPage } from './document.js';

/**
 * Store for canvas readiness state
 * Tracks whether the canvas is ready for automatic operations
 * such as autosave, forceSave, guide refreshing, etc.
 */
export const canvasReady = writable(false);

/**
 * Extended readiness store with detailed status information
 * This is useful for debugging and for more granular control
 */
export const canvasReadyStatus = writable({
  hasCanvas: false,
  hasDocument: false,
  hasPage: false,
  isFullyInitialized: false,
  hasActiveObjects: false,
  hasError: false,
  errorMessage: null,
  lastUpdated: new Date().toISOString()
});

/**
 * Update the canvas ready status with detailed information
 * @param {Object} status - The status object with detailed information
 */
export function updateCanvasReadyStatus(status) {
  canvasReadyStatus.update(currentStatus => ({
    ...currentStatus,
    ...status,
    lastUpdated: new Date().toISOString()
  }));
  
  // Also update the simple canvasReady flag based on the detailed status
  const isReady = status.hasCanvas && status.hasDocument && status.hasPage && 
                 !status.hasError && status.isFullyInitialized;
  
  canvasReady.set(isReady);
  return isReady;
}

/**
 * Derived store that combines document and page readiness
 * Use this to determine if document operations are possible
 */
export const documentReady = derived(
  [currentDocument, currentPage],
  ([$currentDocument, $currentPage]) => {
    const isReady = !!$currentDocument && !!$currentPage;
    return {
      hasDocument: !!$currentDocument,
      hasPage: !!$currentPage, 
      isReady,
      documentId: $currentDocument ? $currentDocument.id : null,
      pageId: $currentPage,
      pageCount: $currentDocument ? $currentDocument.pages.length : 0,
      lastUpdated: new Date().toISOString()
    };
  }
);

/**
 * Reset the canvas ready state
 * Useful when navigating away from editor or on component cleanup
 */
export function resetCanvasReady() {
  canvasReady.set(false);
  
  canvasReadyStatus.set({
    hasCanvas: false,
    hasDocument: false,
    hasPage: false,
    isFullyInitialized: false,
    hasActiveObjects: false,
    hasError: false,
    errorMessage: null,
    lastUpdated: new Date().toISOString()
  });
}
