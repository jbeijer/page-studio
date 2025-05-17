/**
 * Master pages storage operations
 * 
 * This module provides functions for master page operations.
 */

import { 
  MASTER_PAGE_STORE, 
  executeStoreOperation, 
  getById, 
  putRecord, 
  deleteRecord 
} from './database.js';

import { normalizeDate } from './validation.js';

/**
 * Save a master page
 * @param {Object} masterPage - Master page to save
 * @param {string} documentId - ID of the source document
 * @returns {Promise<string>} Master page ID
 */
export async function saveMasterPage(masterPage, documentId) {
  if (!masterPage || !masterPage.id) {
    throw new Error('Invalid master page: Missing ID');
  }
  
  if (!documentId) {
    throw new Error('Invalid document ID for master page');
  }
  
  // Prepare master page for storage
  const storageMasterPage = {
    ...masterPage,
    documentId,
    created: normalizeDate(masterPage.created),
    lastModified: normalizeDate(masterPage.lastModified || new Date())
  };
  
  // Save to database
  try {
    await putRecord(MASTER_PAGE_STORE, storageMasterPage);
    return masterPage.id;
  } catch (err) {
    console.error(`Error saving master page ${masterPage.id}:`, err);
    throw err;
  }
}

/**
 * Load a master page
 * @param {string} masterPageId - ID of the master page to load
 * @returns {Promise<Object>} Loaded master page
 */
export async function loadMasterPage(masterPageId) {
  try {
    // Get master page from database
    const masterPage = await getById(MASTER_PAGE_STORE, masterPageId);
    
    // Convert dates to Date objects
    masterPage.created = new Date(masterPage.created);
    masterPage.lastModified = new Date(masterPage.lastModified);
    
    return masterPage;
  } catch (err) {
    console.error(`Error loading master page ${masterPageId}:`, err);
    throw err;
  }
}

/**
 * Get a list of all master pages
 * @param {string} [documentId] - Optional filter by document ID
 * @returns {Promise<Array<Object>>} List of master pages
 */
export async function getMasterPageList(documentId = null) {
  return executeStoreOperation(MASTER_PAGE_STORE, 'readonly', (store, transaction, resolve, reject) => {
    let request;
    
    if (documentId) {
      const index = store.index('documentId');
      request = index.getAll(documentId);
    } else {
      request = store.getAll();
    }
    
    request.onsuccess = (event) => {
      const masterPages = event.target.result.map(masterPage => ({
        ...masterPage,
        created: new Date(masterPage.created),
        lastModified: new Date(masterPage.lastModified)
      }));
      resolve(masterPages);
    };
    
    request.onerror = (event) => {
      reject(`Error listing master pages: ${event.target.error}`);
    };
  });
}

/**
 * Delete a master page
 * @param {string} masterPageId - ID of the master page to delete
 * @returns {Promise<void>}
 */
export async function deleteMasterPage(masterPageId) {
  return deleteRecord(MASTER_PAGE_STORE, masterPageId);
}