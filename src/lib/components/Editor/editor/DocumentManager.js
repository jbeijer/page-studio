import { createDocument, setCurrentDocument, currentDocument, currentPage, addPage, updateDocument } from '$lib/stores/document';
import { saveDocument, loadDocument } from '$lib/utils/storage';
import { get } from 'svelte/store';
import documentService from '$lib/services/DocumentService';

/**
 * Creates a document management system
 * 
 * @param {Object} context - The context object containing reference to canvas component
 * @returns {Object} - Document management functions
 */
export function createDocumentManager(context) {
  // Get a canvas component reference from context
  function getCanvasComponent() {
    // First try direct context reference
    if (context && context.canvasComponent) {
      return context.canvasComponent;
    }
    
    // Fallback to global canvas reference
    if (typeof window !== 'undefined' && window.$canvas) {
      // Create a safer wrapper with proper checks
      return {
        getCanvas: function() {
          if (!window.$canvas) {
            console.warn('DocumentManager: $canvas global reference is missing');
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
              console.error('DocumentManager: Error in saveCurrentPage:', err);
              return false;
            }
          }
          
          console.warn('DocumentManager: Using fallback saveCurrentPage through global canvas');
          return false;
        },
        isCanvasReadyForAutoOps: function() {
          // Safer version that checks for existence
          if (window.$canvas && typeof window.$canvas.isCanvasReadyForAutoOps === 'function') {
            try {
              return window.$canvas.isCanvasReadyForAutoOps();
            } catch (err) {
              console.warn('DocumentManager: Error checking canvas readiness:', err);
              return false;
            }
          }
          return window.$canvas ? true : false; // Assume ready if canvas exists
        }
      };
    }
    
    // Last resort - return a safe dummy object to prevent null errors
    console.warn('DocumentManager: No canvas component available, using dummy object');
    return {
      getCanvas: () => null,
      saveCurrentPage: () => false,
      isCanvasReadyForAutoOps: () => false
    };
  }
  
  /**
   * Creates a new empty document
   * 
   * @param {Object} options - Document options (title, format, pageCount)
   * @returns {Object} - The newly created document
   */
  async function createNewDocument(options = { title: 'Untitled Document', format: 'A4', pageCount: 1 }) {
    console.log("============================================================");
    console.log("STARTING NEW DOCUMENT CREATION WITH DOCUMENTSERVICE");
    console.log("============================================================");
    
    // First, reset canvas completely - critical to prevent content leaking from previous document
    const canvasComponent = getCanvasComponent();
    if (canvasComponent && canvasComponent.resetCanvas && typeof canvasComponent.resetCanvas === 'function') {
      console.log("CRITICAL: Resetting canvas before creating new document to prevent object persistence");
      try {
        const resetResult = canvasComponent.resetCanvas();
        console.log(`Canvas reset result: ${resetResult ? 'success' : 'failed'}`);
      } catch (resetErr) {
        console.error("Error during pre-creation canvas reset:", resetErr);
      }
    }
    
    // Clear global state
    if (typeof window !== 'undefined') {
      // Save the previous document ID for transition handling
      const currentDoc = window.$document;
      if (currentDoc && currentDoc.id) {
        window._previousDocumentId = currentDoc.id;
      }
    }
    
    // Use the DocumentService to create a new document
    const newDoc = await documentService.createNewDocument(options);
    
    console.log("============================================================");
    console.log("COMPLETED NEW DOCUMENT CREATION");
    console.log("============================================================");
    
    return newDoc;
  }
  
  /**
   * Loads a document by ID
   * 
   * @param {string} docId - The document ID to load
   * @returns {Promise<Object|null>} - The loaded document or null if failed
   */
  async function loadDocumentById(docId) {
    if (!docId) {
      console.error("Cannot load document: No document ID provided");
      return null;
    }
    
    try {
      console.log(`Using DocumentService to load document with ID: ${docId}`);
      
      // Reset canvas before loading
      const canvasComponent = getCanvasComponent();
      if (canvasComponent && canvasComponent.resetCanvas && typeof canvasComponent.resetCanvas === 'function') {
        console.log("Resetting canvas before loading document");
        try {
          const resetResult = canvasComponent.resetCanvas();
          console.log(`Canvas reset result: ${resetResult ? 'success' : 'failed'}`);
        } catch (resetErr) {
          console.error("Error during pre-load canvas reset:", resetErr);
        }
      }
      
      // Use the DocumentService to load the document
      return await documentService.loadDocumentById(docId);
    } catch (err) {
      console.error('Error loading document:', err);
      createNewDocument();
      return null;
    }
  }
  
  /**
   * Ensures a document has a valid structure
   * Repairs any missing or incorrect properties
   * 
   * @param {Object} doc - The document to validate/repair
   */
  function ensureValidDocumentStructure(doc) {
    if (!doc) return;
    
    console.log("Validating document structure");
    
    // Ensure the document has a pages array
    if (!doc.pages) {
      console.warn("Document missing pages array, creating empty array");
      doc.pages = [];
    }
    
    // Ensure pages array is actually an array
    if (!Array.isArray(doc.pages)) {
      console.warn("Document pages is not an array, converting to array");
      doc.pages = Object.values(doc.pages) || [];
    }
    
    // Add a page if pages array is empty
    if (doc.pages.length === 0) {
      console.warn("Document has no pages, adding a default page");
      doc.pages.push({
        id: 'page-1',
        canvasJSON: JSON.stringify({
          version: "4.6.0",
          objects: [],
          background: "white"
        }),
        masterPageId: null,
        overrides: {},
        guides: {
          horizontal: [],
          vertical: []
        }
      });
    }
    
    // Ensure each page has required properties
    doc.pages.forEach((page, index) => {
      if (!page.id) {
        console.warn(`Page at index ${index} missing ID, generating new ID`);
        page.id = `page-${index + 1}`;
      }
      
      if (!page.canvasJSON) {
        console.warn(`Page ${page.id} missing canvasJSON, setting empty canvas`);
        page.canvasJSON = JSON.stringify({
          version: "4.6.0",
          objects: [],
          background: "white"
        });
      }
      
      if (!page.overrides) {
        console.warn(`Page ${page.id} missing overrides, initializing empty object`);
        page.overrides = {};
      }
      
      if (!page.guides) {
        console.warn(`Page ${page.id} missing guides, initializing empty arrays`);
        page.guides = { horizontal: [], vertical: [] };
      }
    });
    
    // Ensure masterPages exists
    if (!doc.masterPages) {
      console.warn("Document missing masterPages array, creating empty array");
      doc.masterPages = [];
    }
    
    // Ensure metadata exists
    if (!doc.metadata) {
      console.warn("Document missing metadata, creating default metadata");
      doc.metadata = {
        pageSize: { width: 210, height: 297 },
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        columns: 1,
        columnGap: 10,
        grid: {
          enabled: false,
          size: 10,
          color: '#CCCCCC',
          opacity: 0.5,
          snap: false,
          snapThreshold: 5,
          subdivisions: 2
        },
        rulers: {
          enabled: true,
          horizontalVisible: true,
          verticalVisible: true,
          units: 'mm',
          color: '#666666',
          showNumbers: true
        }
      };
    }
    
    // Add created and lastModified dates if missing
    if (!doc.created || !isValidDate(doc.created)) {
      console.warn("Document has invalid created date, setting to current date");
      doc.created = new Date();
    }
    
    if (!doc.lastModified || !isValidDate(doc.lastModified)) {
      console.warn("Document has invalid lastModified date, setting to current date");
      doc.lastModified = new Date();
    }
    
    console.log("Document structure validation complete");
  }
  
  /**
   * Check if a date is valid
   * @param {Date|string} date - Date to check
   * @returns {boolean} Whether the date is valid
   */
  function isValidDate(date) {
    if (date instanceof Date) {
      return !isNaN(date.getTime());
    }
    
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }
    
    return false;
  }
  
  /**
   * Checks and fixes canvas objects if they're missing
   * 
   * @param {Object} loadedDocument - The loaded document
   */
  function checkAndFixCanvasObjects(loadedDocument) {
    const canvasComponent = getCanvasComponent();
    
    if (canvasComponent && canvasComponent.getCanvas) {
      const canvas = canvasComponent.getCanvas();
      if (canvas) {
        const objects = canvas.getObjects();
        console.log(`Currently ${objects.length} objects visible on canvas after loading`);
        
        // Even if no objects are visible, we'll try to create them from saved data
        if (loadedDocument && loadedDocument.pages && loadedDocument.pages.length > 0) {
          const curPageId = get(currentPage);
          
          // Find current page data
          const curPageData = loadedDocument.pages.find(p => p.id === curPageId);
          if (curPageData && curPageData.canvasJSON) {
            try {
              // Parse JSON data
              const jsonData = JSON.parse(curPageData.canvasJSON);
              const jsonObjectCount = jsonData.objects ? jsonData.objects.length : 0;
              
              console.log(`Current page JSON has ${jsonObjectCount} objects that should be visible`);
              
              // If canvas is empty but we should have objects, force recreate them
              if (objects.length === 0 && jsonObjectCount > 0) {
                console.log("CRITICAL: Objects missing from canvas. Forcing recreation from JSON.");
                
                // Use the recovery function from the Canvas component
                if (canvasComponent && canvasComponent.recoverObjectsFromJson) {
                  const recoveredCount = canvasComponent.recoverObjectsFromJson(curPageData.canvasJSON);
                  console.log(`Recovered ${recoveredCount} objects using Canvas recovery function`);
                  
                  // Update saved page to reflect fixes
                  if (recoveredCount > 0 && canvasComponent.saveCurrentPage) {
                    setTimeout(() => {
                      console.log("Saving recovered objects");
                      canvasComponent.saveCurrentPage();
                    }, 300);
                  }
                } else {
                  console.error("Canvas recovery function not available");
                }
              }
            } catch (err) {
              console.error("Error parsing page JSON:", err);
            }
          }
        }
        
        // Make sure all objects are correctly configured for visibility
        canvas.getObjects().forEach(obj => {
          // Ensure all objects have critical visibility properties set
          obj.visible = true;
          obj.evented = true;
          obj.opacity = obj.opacity === 0 ? 1 : obj.opacity;
        });
        
        // Render multiple times with delays to ensure visibility
        canvas.requestRenderAll();
        canvas.renderAll();
        
        // Additional render cycles
        setTimeout(() => {
          console.log("First delayed render cycle");
          canvas.requestRenderAll();
          canvas.renderAll();
          
          setTimeout(() => {
            console.log("Second delayed render cycle");
            canvas.requestRenderAll();
            canvas.renderAll();
            
            // Final verification
            const finalObjects = canvas.getObjects();
            console.log(`After delayed render cycles: ${finalObjects.length} objects on canvas`);
          }, 500);
        }, 500);
      }
    }
  }
  
  /**
   * Adds a new page to the document
   * 
   * @param {string|null} masterPageId - Optional master page ID to apply 
   * @returns {string} ID of the newly created page
   */
  function handleAddPage(masterPageId = null) {
    const canvasComponent = getCanvasComponent();
    
    console.log("Using DocumentService to add a new page" + (masterPageId ? ` with master page ${masterPageId}` : ""));
    
    // Save current page before adding a new one
    documentService.saveCurrentPage();
    
    // Add a new page using the document service
    return documentService.addPage(masterPageId);
  }
  
  /**
   * Saves the current document
   * 
   * @returns {Promise<{success: boolean, error: string|null}>} - Result object
   */
  async function handleSave() {
    console.log("DocumentManager: Using DocumentService to save document");
    
    try {
      // Save current page first
      documentService.saveCurrentPage();
      
      // Force save the entire document
      const saveResult = await documentService.forceSave();
      
      return { success: saveResult, error: saveResult ? null : "Failed to save document" };
    } catch (err) {
      console.error('Error saving document:', err);
      return { success: false, error: err.message || "An unknown error occurred" };
    }
  }
  
  /**
   * Force saves the current document (typically used for auto-save)
   * 
   * @returns {Promise<boolean>} - Success status
   */
  async function forceSave() {
    console.log("DocumentManager: Force saving using DocumentService");
    
    // Get a reference to the canvas component
    const canvasComponent = getCanvasComponent();
    
    // Save the current page first if canvas is ready and we can do so
    const isCanvasReady = canvasComponent && canvasComponent.isCanvasReadyForAutoOps ?
      canvasComponent.isCanvasReadyForAutoOps() : true;
      
    if (isCanvasReady && canvasComponent && canvasComponent.saveCurrentPage) {
      console.log("Force Save: Saving current page before document save");
      canvasComponent.saveCurrentPage();
    }
    
    // Use the document service to force save
    return await documentService.forceSave();
  }
  
  /**
   * Updates the document title
   * 
   * @param {string} title - The new document title
   */
  function updateDocumentTitle(title) {
    console.log(`Using DocumentService to update document title to "${title}"`);
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

export default createDocumentManager;