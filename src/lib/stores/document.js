import { writable } from 'svelte/store';

/**
 * Store for current document
 * @type {import('svelte/store').Writable<Document|null>}
 */
export const currentDocument = writable(null);

/**
 * Store for currently active page ID
 * @type {import('svelte/store').Writable<string|null>}
 */
export const currentPage = writable(null);

/**
 * Store for list of documents (summaries)
 * @type {import('svelte/store').Writable<DocumentSummary[]>}
 */
export const documentList = writable([]);

/**
 * Create a new document with default values
 * @param {object} options - Document options
 * @param {string} options.title - Document title
 * @param {string} options.format - Page format (e.g., 'A4', 'A5')
 * @param {number} options.width - Page width in mm
 * @param {number} options.height - Page height in mm
 * @param {number} options.pageCount - Initial number of pages
 * @returns {Document} New document object
 */
export function createDocument({ 
  title = 'Untitled Document', 
  format = 'A4',
  width = 210, 
  height = 297, 
  pageCount = 1 
}) {
  const now = new Date();
  
  // Create a truly unique ID that's different from any previous document
  // Using multiple random components and a timestamp to ensure uniqueness
  const timestamp = now.getTime();
  const randomPart1 = Math.floor(Math.random() * 1000000);
  const randomPart2 = Math.floor(Math.random() * 1000000);
  // Create hash-like ID by combining timestamp and two random components
  const docId = `doc-${timestamp}-${randomPart1}-${randomPart2}`;
  
  // Force clearing any document-related globals before creating a new document
  if (typeof window !== 'undefined') {
    // Save the previous document ID for transition handling
    window._previousDocumentId = window.$document?.id || null;
    
    // Log the creation of a new document with unique ID
    console.log(`Creating new document with ID ${docId}, saved previous ID: ${window._previousDocumentId}`);
    console.log(`Using highly unique ID format with multiple random components: ${docId}`);
    
    // Clear ALL potentially corrupting global state - very aggressive cleanup
    window._previousPageBackup = null;
    window.$emergencyBackup = null;
    window._canvasObjects = null;
    window._pageSaveTimeout && clearTimeout(window._pageSaveTimeout);
    
    // Reset any other potentially conflicting global state
    if (window.$globalContext) {
      try {
        // Clear any stored page references
        if (window.$globalContext.currentPage) {
          window.$globalContext.currentPage = null;
        }
      } catch (err) {
        console.warn("Error cleaning global context:", err);
      }
    }
    
    // Clear canvas internal references if they exist - multi-step aggressive cleanup
    if (window.$canvas) {
      try {
        console.log("Performing complete canvas internal state reset for new document");
        
        // First - remove all event handlers that might be tied to previous document
        window.$canvas.off && window.$canvas.off();
        
        // Second - aggressively clear all internal arrays and state
        if (window.$canvas._objects) window.$canvas._objects = [];
        if (window.$canvas._objectsToRender) window.$canvas._objectsToRender = [];
        
        // Third - reset additional internal state that might persist
        if (window.$canvas._activeObject) window.$canvas._activeObject = null;
        if (window.$canvas._hoveredTarget) window.$canvas._hoveredTarget = null;
        if (window.$canvas._currentTransform) window.$canvas._currentTransform = null;
        
        // Fourth - explicitly clear the canvas multiple times
        window.$canvas.clear && window.$canvas.clear();
        if (window.$canvas.backgroundColor) window.$canvas.backgroundColor = 'white';
        
        // Force a render cycle
        window.$canvas.requestRenderAll && window.$canvas.requestRenderAll();
        window.$canvas.renderAll && window.$canvas.renderAll();
        
        // Multiple delayed renders for thorough clearing
        setTimeout(() => {
          if (window.$canvas) {
            // Clear again for safety
            window.$canvas.clear && window.$canvas.clear();
            if (window.$canvas.backgroundColor) window.$canvas.backgroundColor = 'white';
            
            // Reset internal arrays again
            if (window.$canvas._objects) window.$canvas._objects = [];
            if (window.$canvas._objectsToRender) window.$canvas._objectsToRender = [];
            
            // Force render
            window.$canvas.requestRenderAll && window.$canvas.requestRenderAll();
            window.$canvas.renderAll && window.$canvas.renderAll();
          }
        }, 50);
        
        // Final third cycle for absolute certainty
        setTimeout(() => {
          if (window.$canvas) {
            window.$canvas.clear && window.$canvas.clear();
            window.$canvas.requestRenderAll && window.$canvas.requestRenderAll();
            window.$canvas.renderAll && window.$canvas.renderAll();
          }
        }, 100);
        
        console.log("Canvas reset for new document completed successfully");
      } catch (err) {
        console.warn("Error clearing canvas during document creation:", err);
      }
    }
  }
  
  const pages = [];
  
  // Create initial pages with explicit empty canvas JSON to prevent content leakage
  for (let i = 0; i < pageCount; i++) {
    pages.push({
      id: `page-${i + 1}`,
      // Initialize with explicit empty canvas instead of null
      canvasJSON: JSON.stringify({
        "version": "5.3.0",
        "objects": [],
        "background": "white"
      }),
      masterPageId: null,
      overrides: {},
      guides: {
        horizontal: [], // Array of y-positions for horizontal guides
        vertical: []    // Array of x-positions for vertical guides
      }
    });
  }
  
  return {
    id: docId,
    title,
    format,
    creator: 'Anonymous',
    created: now,
    lastModified: now,
    metadata: {
      pageSize: {
        width,
        height
      },
      margins: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      },
      columns: 1,
      columnGap: 10,
      grid: {
        enabled: false,
        size: 10, // Grid size in mm
        color: '#CCCCCC',
        opacity: 0.5,
        snap: false,
        snapThreshold: 5, // How close objects need to be to snap (in px)
        subdivisions: 2 // Number of subdivisions between main grid lines
      },
      rulers: {
        enabled: true,
        horizontalVisible: true,
        verticalVisible: true,
        units: 'mm', // 'mm', 'cm', 'inch', 'px'
        color: '#666666',
        showNumbers: true
      }
    },
    pages,
    masterPages: [],
    styles: {
      colors: [],
      textStyles: [],
      objectStyles: []
    }
  };
}

/**
 * Set the current document and update current page
 * @param {Document} document - Document to set as current
 */
export function setCurrentDocument(document) {
  currentDocument.set(document);
  
  if (document && document.pages.length > 0) {
    currentPage.set(document.pages[0].id);
  } else {
    currentPage.set(null);
  }
}

/**
 * Update an existing document
 * @param {Document} document - Document to update
 */
export function updateDocument(document) {
  document.lastModified = new Date();
  currentDocument.set(document);
  
  // Update the document list if this document is in it
  documentList.update(list => {
    const index = list.findIndex(doc => doc.id === document.id);
    if (index >= 0) {
      list[index] = {
        id: document.id,
        title: document.title,
        created: document.created,
        lastModified: document.lastModified,
        pageCount: document.pages.length
      };
    }
    return list;
  });
}

/**
 * Add a new page to the current document
 * @param {string|null} [masterPageId=null] - Optional master page ID to apply to the new page
 */
export function addPage(masterPageId = null) {
  currentDocument.update(doc => {
    if (!doc) return doc;
    
    const newPageId = `page-${doc.pages.length + 1}`;
    
    // Create the new page
    const newPage = {
      id: newPageId,
      canvasJSON: null, // Empty canvas for new pages
      masterPageId: masterPageId, // Apply master page if specified
      overrides: {},
      guides: {
        horizontal: [], // Array of y-positions for horizontal guides
        vertical: []    // Array of x-positions for vertical guides
      }
    };
    
    // If masterPageId is provided, check if it exists
    if (masterPageId) {
      const masterPage = doc.masterPages.find(mp => mp.id === masterPageId);
      if (!masterPage) {
        console.warn(`Master page with ID ${masterPageId} not found`);
        newPage.masterPageId = null;
      }
    }
    
    // Add the new page to the document
    doc.pages.push(newPage);
    doc.lastModified = new Date();
    
    // Set the new page as the current page
    currentPage.set(newPageId);
    
    return doc;
  });
}

/**
 * Remove a page from the current document
 * @param {string} pageId - ID of the page to remove
 */
export function removePage(pageId) {
  currentDocument.update(doc => {
    if (!doc) return doc;
    
    const pageIndex = doc.pages.findIndex(p => p.id === pageId);
    if (pageIndex === -1) return doc;
    
    // Remove the page
    doc.pages.splice(pageIndex, 1);
    
    // If the removed page was the current page, select another one
    currentPage.update(currentPageId => {
      if (currentPageId === pageId) {
        // Select the previous page, or the first page if this was the first
        return doc.pages.length > 0 
          ? doc.pages[Math.max(0, pageIndex - 1)].id 
          : null;
      }
      return currentPageId;
    });
    
    doc.lastModified = new Date();
    return doc;
  });
}

/**
 * Creates a new master page
 * @param {Object} options - Master page options
 * @param {string} options.name - Master page name
 * @param {string} [options.description=''] - Master page description 
 * @param {string|null} [options.basedOn=null] - ID of parent master page
 * @returns {string} ID of the created master page
 */
export function createMasterPage({ name, description = '', basedOn = null }) {
  let newMasterPageId = null;
  
  currentDocument.update(doc => {
    if (!doc) return doc;
    
    const now = new Date();
    newMasterPageId = `master-${now.getTime()}`;
    
    const newMasterPage = {
      id: newMasterPageId,
      name,
      description,
      basedOn,
      canvasJSON: null,
      created: now,
      lastModified: now
    };
    
    // If basedOn is specified, copy the canvas from parent master page
    if (basedOn) {
      const parentMaster = doc.masterPages.find(mp => mp.id === basedOn);
      if (parentMaster) {
        newMasterPage.canvasJSON = parentMaster.canvasJSON;
        // Ensure basedOn is correctly set
        newMasterPage.basedOn = basedOn;
      }
    }
    
    doc.masterPages.push(newMasterPage);
    doc.lastModified = now;
    
    return doc;
  });
  
  return newMasterPageId;
}

/**
 * Updates an existing master page
 * @param {string} masterPageId - ID of the master page to update
 * @param {Object} updates - Properties to update
 */
export function updateMasterPage(masterPageId, updates) {
  currentDocument.update(doc => {
    if (!doc) return doc;
    
    const masterIndex = doc.masterPages.findIndex(mp => mp.id === masterPageId);
    if (masterIndex === -1) return doc;
    
    // Update the master page
    doc.masterPages[masterIndex] = {
      ...doc.masterPages[masterIndex],
      ...updates,
      lastModified: new Date()
    };
    
    // If the canvas was updated, propagate changes to all pages using this master
    if (updates.canvasJSON) {
      doc.pages.forEach(page => {
        if (page.masterPageId === masterPageId) {
          // Skip overridden objects
          // This will be implemented fully in the applyMasterPage function
        }
      });
    }
    
    doc.lastModified = new Date();
    return doc;
  });
}

/**
 * Removes a master page
 * @param {string} masterPageId - ID of the master page to remove
 * @param {boolean} [clearReferences=false] - Whether to clear references in pages
 */
export function removeMasterPage(masterPageId, clearReferences = false) {
  currentDocument.update(doc => {
    if (!doc) return doc;
    
    const masterIndex = doc.masterPages.findIndex(mp => mp.id === masterPageId);
    if (masterIndex === -1) return doc;
    
    // Check if any child master pages are based on this one
    const childMasters = doc.masterPages.filter(mp => mp.basedOn === masterPageId);
    
    // For each child, update basedOn to this master's parent or null
    childMasters.forEach(childMaster => {
      const index = doc.masterPages.findIndex(mp => mp.id === childMaster.id);
      if (index !== -1) {
        doc.masterPages[index].basedOn = doc.masterPages[masterIndex].basedOn || null;
      }
    });
    
    // If clearReferences is true, remove the master page reference from all pages
    if (clearReferences) {
      doc.pages.forEach((page, index) => {
        if (page.masterPageId === masterPageId) {
          doc.pages[index].masterPageId = null;
        }
      });
    }
    
    // Remove the master page
    doc.masterPages.splice(masterIndex, 1);
    doc.lastModified = new Date();
    
    return doc;
  });
}

/**
 * Applies a master page to one or more document pages
 * @param {string} masterPageId - ID of the master page to apply
 * @param {string[]} pageIds - IDs of the pages to apply the master page to
 */
export function applyMasterPage(masterPageId, pageIds) {
  currentDocument.update(doc => {
    if (!doc) return doc;
    
    // Find the master page
    const masterPage = doc.masterPages.find(mp => mp.id === masterPageId);
    if (!masterPage) return doc;
    
    // Apply to all specified pages
    pageIds.forEach(pageId => {
      const pageIndex = doc.pages.findIndex(p => p.id === pageId);
      if (pageIndex !== -1) {
        doc.pages[pageIndex].masterPageId = masterPageId;
        
        // Initialize or reset overrides
        if (!doc.pages[pageIndex].overrides) {
          doc.pages[pageIndex].overrides = {};
        }
      }
    });
    
    doc.lastModified = new Date();
    return doc;
  });
}

/**
 * Records an override of a master page object on a specific page
 * @param {string} pageId - ID of the page with the override
 * @param {string} masterObjectId - ID of the master object being overridden
 * @param {boolean} isOverridden - Whether the object is overridden
 */
export function setMasterObjectOverride(pageId, masterObjectId, isOverridden) {
  currentDocument.update(doc => {
    if (!doc) return doc;
    
    const pageIndex = doc.pages.findIndex(p => p.id === pageId);
    if (pageIndex === -1) return doc;
    
    // Ensure overrides object exists
    if (!doc.pages[pageIndex].overrides) {
      doc.pages[pageIndex].overrides = {};
    }
    
    // Set override status
    if (isOverridden) {
      doc.pages[pageIndex].overrides[masterObjectId] = true;
    } else {
      delete doc.pages[pageIndex].overrides[masterObjectId];
    }
    
    doc.lastModified = new Date();
    return doc;
  });
}

/**
 * Document type definition
 * @typedef {Object} Document
 * @property {string} id - Unique document ID
 * @property {string} title - Document title
 * @property {string} format - Page format (e.g., 'A4', 'A5')
 * @property {string} creator - Document creator
 * @property {Date} created - Creation date
 * @property {Date} lastModified - Last modification date
 * @property {Object} metadata - Document metadata
 * @property {Object} metadata.pageSize - Page size in mm
 * @property {number} metadata.pageSize.width - Page width
 * @property {number} metadata.pageSize.height - Page height
 * @property {Object} metadata.margins - Page margins in mm
 * @property {number} metadata.margins.top - Top margin
 * @property {number} metadata.margins.right - Right margin
 * @property {number} metadata.margins.bottom - Bottom margin
 * @property {number} metadata.margins.left - Left margin
 * @property {number} metadata.columns - Number of columns
 * @property {number} metadata.columnGap - Gap between columns in mm
 * @property {Array<Page>} pages - Document pages
 * @property {Array<MasterPage>} masterPages - Master pages
 * @property {Object} styles - Document styles
 */

/**
 * Page type definition
 * @typedef {Object} Page
 * @property {string} id - Page ID
 * @property {Object|null} canvasJSON - Fabric.js canvas JSON
 * @property {string|null} masterPageId - ID of the applied master page
 * @property {Object} overrides - Map of overridden master objects
 * @property {Object.<string, boolean>} overrides.masterId - Map of overridden master object IDs
 */

/**
 * Master Page type definition
 * @typedef {Object} MasterPage
 * @property {string} id - Master page ID
 * @property {string} name - Master page name
 * @property {string} description - Master page description
 * @property {string|null} basedOn - ID of parent master page (for inheritance)
 * @property {Object|string} canvasJSON - Fabric.js canvas JSON
 * @property {Date} created - Creation date
 * @property {Date} lastModified - Last modification date
 */

/**
 * Document Summary type definition
 * @typedef {Object} DocumentSummary
 * @property {string} id - Document ID
 * @property {string} title - Document title
 * @property {Date} created - Creation date
 * @property {Date} lastModified - Last modification date
 * @property {number} pageCount - Number of pages
 */