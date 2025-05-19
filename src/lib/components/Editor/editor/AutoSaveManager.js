import { currentDocument } from '$lib/stores/document';
import { canvasReady } from '$lib/stores/canvasReady.js';
import { get } from 'svelte/store';
import documentService from '$lib/services/DocumentService';

/**
 * Creates an auto-save manager for the editor
 * 
 * @param {Object} context - The context object containing documentManager
 * @param {Object} options - Auto-save options
 * @returns {Object} - Auto-save manager functions
 */
export function createAutoSaveManager(context, options = {}) {
  const AUTO_SAVE_DELAY_MS = options.autoSaveDelay || 30000; // Default: 30 seconds
  const FORCE_SAVE_INTERVAL_MS = options.forceSaveInterval || 15000; // Default: 15 seconds
  
  let autoSaveInterval = null;
  let forceSaveInterval = null;
  let beforeUnloadHandler = null;
  
  // Get document manager from context
  function getDocumentManager() {
    return context.documentManager;
  }
  
  // Get canvas component from context
  function getCanvasComponent() {
    if (context.canvasComponent) {
      return context.canvasComponent;
    }
    
    // Fallback to global canvas reference
    if (typeof window !== 'undefined' && window.$canvas) {
      // Create a safer wrapper with proper checks
      return {
        getCanvas: function() {
          if (!window.$canvas) {
            console.warn('AutoSaveManager: $canvas global reference is missing');
            return null;
          }
          return window.$canvas;
        },
        saveCurrentPage: function() {
          // Try to call saveCurrentPage if exists on window.$canvas
          if (window.$canvas && typeof window.$canvas.saveCurrentPage === 'function') {
            try {
              window.$canvas.saveCurrentPage();
              return true;
            } catch (err) {
              console.error('AutoSaveManager: Error in saveCurrentPage:', err);
              return false;
            }
          }
          
          console.warn('AutoSaveManager: Using fallback saveCurrentPage through global canvas');
          return false;
        },
        isCanvasReadyForAutoOps: function() {
          // Safer version that checks for existence
          if (window.$canvas && typeof window.$canvas.isCanvasReadyForAutoOps === 'function') {
            try {
              return window.$canvas.isCanvasReadyForAutoOps();
            } catch (err) {
              console.warn('AutoSaveManager: Error checking canvas readiness:', err);
              return false;
            }
          }
          return window.$canvas ? true : false; // Assume ready if canvas exists
        }
      };
    }
    
    // Last resort - return a safe dummy object to prevent null errors
    console.warn('AutoSaveManager: No canvas component available, using dummy object');
    return {
      getCanvas: () => null,
      saveCurrentPage: () => false,
      isCanvasReadyForAutoOps: () => false
    };
  }
  
  /**
   * Sets up auto-save functionality
   */
  function setupAutoSave() {
    clearAutoSave();
    
    autoSaveInterval = setInterval(async () => {
      const doc = get(currentDocument);
      if (doc) {
        try {
          // Use DocumentService to save the current page if canvas is ready
          if (get(canvasReady)) {
            documentService.saveCurrentPage();
          } else {
            console.warn("AutoSaveManager: Canvas not ready for autosave, skipping saveCurrentPage");
          }
          
          // Force save the entire document
          await documentService.forceSave();
          console.log("Auto-saved document:", doc.id);
        } catch (err) {
          console.error("Auto-save failed:", err);
        }
      }
    }, AUTO_SAVE_DELAY_MS);
  }
  
  /**
   * Sets up periodic force-save functionality
   */
  function setupForceSave() {
    clearForceSave();
    
    forceSaveInterval = setInterval(async () => {
      try {
        await documentService.forceSave();
      } catch (error) {
        console.error("Force save error:", error);
      }
    }, FORCE_SAVE_INTERVAL_MS);
  }
  
  /**
   * Sets up page unload handler to save before user leaves
   */
  function setupBeforeUnloadHandler() {
    clearBeforeUnloadHandler();
    
    beforeUnloadHandler = (event) => {
      console.log("User is leaving page, forcing document save");
      
      // Save current page if canvas is ready
      if (get(canvasReady)) {
        try {
          documentService.saveCurrentPage();
        } catch (err) {
          console.error("Error saving current page on page unload:", err);
        }
      }
      
      // We don't await this to avoid blocking the page close,
      // but the browser will typically wait for this operation to complete
      try {
        documentService.forceSave();
      } catch (err) {
        console.error("Error saving document on page unload:", err);
      }
      
      // Chrome requires returnValue to be set to show the dialog
      event.preventDefault();
      event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      return event.returnValue;
    };
    
    window.addEventListener('beforeunload', beforeUnloadHandler);
  }
  
  /**
   * Clears auto-save interval if it exists
   */
  function clearAutoSave() {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
      autoSaveInterval = null;
    }
  }
  
  /**
   * Clears force-save interval if it exists
   */
  function clearForceSave() {
    if (forceSaveInterval) {
      clearInterval(forceSaveInterval);
      forceSaveInterval = null;
    }
  }
  
  /**
   * Removes the beforeunload event handler
   */
  function clearBeforeUnloadHandler() {
    if (beforeUnloadHandler) {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      beforeUnloadHandler = null;
    }
  }
  
  /**
   * Initializes all auto-save systems
   */
  function initialize() {
    setupAutoSave();
    setupForceSave();
    setupBeforeUnloadHandler();
  }
  
  /**
   * Performs cleanup when component unmounts
   */
  function cleanup() {
    // Final save when component unmounts
    if (get(canvasReady)) {
      try {
        console.log("Component unmounting, saving current page");
        documentService.saveCurrentPage();
      } catch (err) {
        console.error("Error saving current page during cleanup:", err);
      }
    }
    
    // Force a final document save
    console.log("Component unmounting, saving entire document");
    documentService.forceSave().catch(err => {
      console.error("Error saving document on unmount:", err);
    });
    
    // Clear intervals and event listeners
    clearAutoSave();
    clearForceSave();
    clearBeforeUnloadHandler();
  }
  
  return {
    initialize,
    cleanup,
    setupAutoSave,
    setupForceSave,
    setupBeforeUnloadHandler,
    clearAutoSave,
    clearForceSave,
    clearBeforeUnloadHandler
  };
}

export default createAutoSaveManager;