import { currentDocument } from '$lib/stores/document';
import { get } from 'svelte/store';

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
    return context.canvasComponent;
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
          const canvasComponent = getCanvasComponent();
          if (canvasComponent && canvasComponent.saveCurrentPage) {
            canvasComponent.saveCurrentPage();
          }
          
          const documentManager = getDocumentManager();
          if (documentManager) {
            await documentManager.forceSave();
            console.log("Auto-saved document:", doc.id);
          }
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
      const documentManager = getDocumentManager();
      if (documentManager) {
        await documentManager.forceSave();
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
      
      const canvasComponent = getCanvasComponent();
      if (canvasComponent && canvasComponent.saveCurrentPage) {
        canvasComponent.saveCurrentPage();
      }
      
      // We don't await this to avoid blocking the page close,
      // but the browser will typically wait for this operation to complete
      try {
        const documentManager = getDocumentManager();
        if (documentManager) {
          documentManager.forceSave();
        }
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
    const canvasComponent = getCanvasComponent();
    if (canvasComponent && canvasComponent.saveCurrentPage) {
      console.log("Component unmounting, saving current page");
      canvasComponent.saveCurrentPage();
    }
    
    // Force a final document save
    console.log("Component unmounting, saving entire document");
    const documentManager = getDocumentManager();
    if (documentManager) {
      documentManager.forceSave().catch(err => {
        console.error("Error saving document on unmount:", err);
      });
    }
    
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