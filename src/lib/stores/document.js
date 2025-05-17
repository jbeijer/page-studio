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
  const docId = `doc-${now.getTime()}`;
  
  const pages = [];
  
  // Create initial pages
  for (let i = 0; i < pageCount; i++) {
    pages.push({
      id: `page-${i + 1}`,
      canvasJSON: null,
      masterPageId: null,
      overrides: {}
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
      columnGap: 10
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
 */
export function addPage() {
  currentDocument.update(doc => {
    if (!doc) return doc;
    
    const newPageId = `page-${doc.pages.length + 1}`;
    
    doc.pages.push({
      id: newPageId,
      canvasJSON: null,
      masterPageId: null,
      overrides: {}
    });
    
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