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
      masterPageId: null
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
      masterPageId: null
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
 */

/**
 * Master Page type definition
 * @typedef {Object} MasterPage
 * @property {string} id - Master page ID
 * @property {string} name - Master page name
 * @property {Object} canvasJSON - Fabric.js canvas JSON
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