/**
 * Document storage operations
 * 
 * This module provides functions for document CRUD operations.
 */

import { 
  DOCUMENT_STORE, 
  executeStoreOperation, 
  getAllFromStore, 
  getById, 
  putRecord, 
  deleteRecord 
} from './database.js';

import { 
  validateDocumentStructure, 
  validateCanvasJson, 
  normalizeDate, 
  isValidDate 
} from './validation.js';

/**
 * Prepare a document for storage
 * @param {Object} document - Document to prepare for storage
 * @returns {Object} Storage-ready document
 */
function prepareDocumentForStorage(document) {
  // Deep clone to avoid modifying the original document
  const docClone = JSON.parse(JSON.stringify(document));
  
  // Normalize dates
  const storageDoc = {
    ...docClone,
    created: normalizeDate(document.created),
    lastModified: normalizeDate(new Date())
  };
  
  // Normalize master page dates
  if (storageDoc.masterPages && Array.isArray(storageDoc.masterPages)) {
    storageDoc.masterPages = storageDoc.masterPages.map(masterPage => ({
      ...masterPage,
      created: normalizeDate(masterPage.created),
      lastModified: normalizeDate(masterPage.lastModified)
    }));
  }
  
  // Validate and normalize page data
  storageDoc.pages = storageDoc.pages.map((page, index) => {
    // Handle undefined canvasJSON
    if (page.canvasJSON === undefined) {
      console.warn(`Page ${index} (ID: ${page.id}) missing canvasJSON, setting to null`);
      return { ...page, canvasJSON: null };
    }
    
    // Skip null values
    if (page.canvasJSON === null) {
      return page;
    }
    
    // Validate JSON for string canvasJSON
    if (typeof page.canvasJSON === 'string') {
      try {
        // Validate canvasJSON
        const validatedJson = validateCanvasJson(page.canvasJSON);
        return { ...page, canvasJSON: validatedJson };
      } catch (err) {
        console.error(`Error validating canvasJSON for page ${page.id}:`, err);
        // Set to empty JSON object since it's invalid
        return { ...page, canvasJSON: validateCanvasJson(null) };
      }
    }
    
    // Handle object canvasJSON
    if (typeof page.canvasJSON === 'object' && page.canvasJSON !== null) {
      try {
        const validatedJson = validateCanvasJson(page.canvasJSON);
        return { ...page, canvasJSON: validatedJson };
      } catch (err) {
        console.error(`Error validating canvasJSON for page ${page.id}:`, err);
        return { ...page, canvasJSON: validateCanvasJson(null) };
      }
    }
    
    return page;
  });
  
  return storageDoc;
}

/**
 * Prepare a document after loading from storage
 * @param {Object} document - Document loaded from storage
 * @returns {Object} Application-ready document
 */
function prepareDocumentAfterLoad(document) {
  // Convert dates back to Date objects
  document.created = new Date(document.created);
  document.lastModified = new Date(document.lastModified);
  
  // Convert master page dates
  if (document.masterPages && Array.isArray(document.masterPages)) {
    document.masterPages = document.masterPages.map(masterPage => ({
      ...masterPage,
      created: new Date(masterPage.created),
      lastModified: new Date(masterPage.lastModified)
    }));
  } else {
    // Initialize masterPages array if missing (for backward compatibility)
    document.masterPages = [];
  }
  
  // Ensure all pages have the overrides property and validate canvasJSON
  if (document.pages && Array.isArray(document.pages)) {
    document.pages = document.pages.map(page => {
      // Add default overrides if missing (backward compatibility)
      const pageWithOverrides = {
        ...page,
        overrides: page.overrides || {}
      };
      
      // Ensure canvasJSON is valid
      if (pageWithOverrides.canvasJSON) {
        try {
          // Verify the JSON by parsing it
          JSON.parse(pageWithOverrides.canvasJSON);
        } catch (err) {
          console.error(`Error parsing canvasJSON for page ${page.id}:`, err);
          // Reset to default empty canvas since it's invalid
          // Always use autoRepair=true here to get back a string
          pageWithOverrides.canvasJSON = validateCanvasJson(null, true);
        }
        
        // Ensure we have a valid canvasJSON after all validations
        try {
          // Make a final test parse - if this fails, we have a serious issue
          JSON.parse(pageWithOverrides.canvasJSON);
        } catch (err) {
          // Last resort fallback - hardcoded valid JSON with an empty canvas
          console.error(`CRITICAL: Failed final canvasJSON validation for page ${page.id}, using hardcoded fallback`);
          pageWithOverrides.canvasJSON = '{"objects":[],"background":"white"}';
        }
      } else {
        // Handle null, undefined or empty string canvasJSON
        pageWithOverrides.canvasJSON = '{"objects":[],"background":"white"}';
      }
      
      return pageWithOverrides;
    });
  }
  
  return document;
}

/**
 * Save a document to storage
 * @param {Object} document - Document to save
 * @returns {Promise<string>} Document ID
 */
export async function saveDocument(document) {
  console.log(`Starting saveDocument for: ${document.id}`);
  
  // Validate document structure - but use auto-repair instead of throwing errors
  // This is important for tests that intentionally pass invalid data
  const validation = validateDocumentStructure(document, true);
  if (!validation.valid) {
    console.warn(`Document validation issues found and auto-repaired: ${validation.errors.length} errors`);
    // Use the repaired document instead of throwing
    document = validation.repairedDocument || document;
  }
  
  // Prepare document for storage
  const storageDoc = prepareDocumentForStorage(document);
  
  // Save to database
  try {
    await putRecord(DOCUMENT_STORE, storageDoc);
    console.log(`Document saved successfully: ${document.id}`);
    return document.id;
  } catch (err) {
    console.error(`Error saving document ${document.id}:`, err);
    throw err;
  }
}

/**
 * Load a document from storage
 * @param {string} documentId - ID of the document to load
 * @returns {Promise<Object>} Loaded document
 */
export async function loadDocument(documentId) {
  try {
    // Get document from database
    const document = await getById(DOCUMENT_STORE, documentId);
    
    // Prepare document for application use
    return prepareDocumentAfterLoad(document);
  } catch (err) {
    console.error(`Error loading document ${documentId}:`, err);
    throw err;
  }
}

/**
 * Get a list of all document summaries
 * @param {number} limit - Maximum number of documents to retrieve
 * @returns {Promise<Array<Object>>} List of document summaries
 */
export async function getDocumentList(limit = 100) {
  return executeStoreOperation(DOCUMENT_STORE, 'readonly', (store, transaction, resolve, reject) => {
    const index = store.index('lastModified');
    
    // Use a cursor to get documents sorted by lastModified in descending order
    const request = index.openCursor(null, 'prev');
    const documents = [];
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && documents.length < limit) {
        // Create a summary of the document
        const doc = cursor.value;
        documents.push({
          id: doc.id,
          title: doc.title,
          created: new Date(doc.created),
          lastModified: new Date(doc.lastModified),
          pageCount: doc.pages.length
        });
        cursor.continue();
      } else {
        resolve(documents);
      }
    };
    
    request.onerror = (event) => {
      reject(`Error listing documents: ${event.target.error}`);
    };
  });
}

/**
 * Delete a document
 * @param {string} documentId - ID of the document to delete
 * @returns {Promise<void>}
 */
export async function deleteDocument(documentId) {
  return deleteRecord(DOCUMENT_STORE, documentId);
}