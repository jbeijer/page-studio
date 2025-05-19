/**
 * ServiceIntegration.js
 * 
 * This module provides integration between the legacy components/modules
 * and the new service-based architecture. It serves as an adapter layer
 * that ensures compatibility during the migration process.
 */
import { get } from 'svelte/store';
import { currentDocument, currentPage } from '$lib/stores/document';
import { canvasReady } from '$lib/stores/canvasReady';
import documentService from './DocumentService';
import canvasService from './CanvasService';
import masterPageService from './MasterPageService';

/**
 * Creates a legacy-compatible document manager that interfaces with the new DocumentService
 * 
 * @param {Object} context - The context object containing canvas component reference
 * @returns {Object} - Legacy-compatible document manager functions
 */
export function createLegacyDocumentManager(context) {
  /**
   * Creates a new empty document
   * 
   * @param {Object} options - Document options (title, format, pageCount)
   * @returns {Object} - The newly created document
   */
  async function createNewDocument(options = { title: 'Untitled Document', format: 'A4', pageCount: 1 }) {
    console.log("Legacy document manager: Creating new document");
    
    // First, reset canvas completely to prevent content leakage
    const canvasComponent = context.canvasComponent;
    if (canvasComponent && canvasComponent.resetCanvas && typeof canvasComponent.resetCanvas === 'function') {
      console.log("Resetting canvas before creating new document");
      try {
        canvasComponent.resetCanvas();
      } catch (resetErr) {
        console.error("Error during pre-creation canvas reset:", resetErr);
      }
    }
    
    // Call the new document service method
    const newDoc = await documentService.createNewDocument(options);
    
    // Return the newly created document
    return newDoc;
  }

  /**
   * Loads a document by ID
   * 
   * @param {string} docId - The document ID to load
   * @returns {Promise<Object|null>} - The loaded document or null if failed
   */
  async function loadDocumentById(docId) {
    console.log(`Legacy document manager: Loading document with ID: ${docId}`);
    
    // Reset canvas before loading to prevent content leakage
    const canvasComponent = context.canvasComponent;
    if (canvasComponent && canvasComponent.resetCanvas && typeof canvasComponent.resetCanvas === 'function') {
      console.log("Resetting canvas before loading document");
      try {
        canvasComponent.resetCanvas();
      } catch (resetErr) {
        console.error("Error during pre-load canvas reset:", resetErr);
      }
    }
    
    // Use the new document service to load the document
    return await documentService.loadDocumentById(docId);
  }

  /**
   * Adds a new page to the document
   * 
   * @param {string|null} masterPageId - Optional master page ID to apply
   */
  function handleAddPage(masterPageId = null) {
    console.log("Legacy document manager: Adding new page");
    
    // Save current page before adding a new one
    documentService.saveCurrentPage();
    
    // Add a new page using the document service
    const pageId = documentService.addPage(masterPageId);
    
    return pageId;
  }

  /**
   * Saves the current document
   * 
   * @returns {Promise<{success: boolean, error: string|null}>} - Result object
   */
  async function handleSave() {
    console.log("Legacy document manager: Saving document");
    
    try {
      // Save current page first
      if (get(canvasReady) && canvasService.canvas) {
        documentService.saveCurrentPage();
      }
      
      // Force save the entire document
      await documentService.forceSave();
      
      return { success: true, error: null };
    } catch (err) {
      console.error('Error saving document:', err);
      return { success: false, error: err.message || "An unknown error occurred" };
    }
  }

  /**
   * Force saves the document (used for auto-save)
   * 
   * @returns {Promise<boolean>} - Success status
   */
  async function forceSave() {
    console.log("Legacy document manager: Force saving document");
    return await documentService.forceSave();
  }

  /**
   * Updates the document title
   * 
   * @param {string} title - The new document title
   */
  function updateDocumentTitle(title) {
    console.log(`Legacy document manager: Updating document title to "${title}"`);
    documentService.updateDocumentTitle(title);
  }

  return {
    createNewDocument,
    loadDocumentById,
    handleAddPage,
    handleSave,
    forceSave,
    updateDocumentTitle
  };
}

/**
 * Creates a legacy-compatible auto-save manager that interfaces with the new services
 * 
 * @param {Object} context - The context object containing documentManager reference
 * @param {Object} options - Auto-save options
 * @returns {Object} - Legacy-compatible auto-save manager functions
 */
export function createLegacyAutoSaveManager(context, options = {}) {
  const AUTO_SAVE_DELAY_MS = options.autoSaveDelay || 30000; // Default: 30 seconds
  const FORCE_SAVE_INTERVAL_MS = options.forceSaveInterval || 15000; // Default: 15 seconds
  
  let autoSaveInterval = null;
  let forceSaveInterval = null;
  let beforeUnloadHandler = null;
  
  /**
   * Sets up auto-save functionality
   */
  function setupAutoSave() {
    clearAutoSave();
    
    autoSaveInterval = setInterval(async () => {
      const doc = get(currentDocument);
      if (doc) {
        try {
          // Use document service to save the current page and document
          if (get(canvasReady)) {
            documentService.saveCurrentPage();
          }
          
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
        documentService.saveCurrentPage();
      }
      
      // We don't await this to avoid blocking the page close
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
      console.log("Component unmounting, saving current page");
      documentService.saveCurrentPage();
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

/**
 * Creates a legacy-compatible canvas wrapper that interfaces with the new CanvasService
 * 
 * @param {Object} canvas - Fabric.js canvas instance
 * @returns {Object} - Legacy-compatible canvas functions
 */
export function createLegacyCanvasWrapper(canvas) {
  canvasService.initialize(canvas);
  documentService.initialize(canvas);
  masterPageService.initialize(canvas);
  
  return {
    // Layer management
    bringForward: () => canvasService.bringForward(),
    sendBackward: () => canvasService.sendBackward(),
    bringToFront: () => canvasService.bringToFront(),
    sendToBack: () => canvasService.sendToBack(),
    
    // Object manipulation
    deleteSelectedObjects: () => canvasService.deleteSelectedObjects(),
    copySelectedObjects: () => canvasService.copySelectedObjects(),
    cutSelectedObjects: () => {
      canvasService.copySelectedObjects();
      canvasService.deleteSelectedObjects();
    },
    pasteObjects: () => canvasService.pasteObjects(),
    
    // Document management
    saveCurrentPage: () => documentService.saveCurrentPage(),
    loadPage: (pageId, shouldSaveFirst = true) => {
      if (shouldSaveFirst) {
        documentService.saveCurrentPage();
      }
      return documentService.switchToPage(pageId);
    },
    
    // Master page operations
    applyMasterPage: (pageId, masterId) => masterPageService.applyMasterPage(pageId, masterId),
    overrideMasterObject: (obj) => masterPageService.overrideMasterObject(obj),
  };
}

export default {
  createLegacyDocumentManager,
  createLegacyAutoSaveManager,
  createLegacyCanvasWrapper
};