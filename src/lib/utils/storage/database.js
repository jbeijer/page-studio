/**
 * Database module for IndexedDB operations
 * 
 * This module provides the core database functionality for storage operations.
 */

// Database configuration
export const DB_NAME = 'PageStudioDB';
export const DB_VERSION = 2;

// Store names
export const DOCUMENT_STORE = 'documents';
export const TEMPLATE_STORE = 'templates';
export const MASTER_PAGE_STORE = 'masterPages';

/**
 * Open the database connection
 * @returns {Promise<IDBDatabase>} Database connection
 */
export function openDatabase() {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
    
      request.onerror = (event) => {
        reject(`Error opening database: ${event.target.error}`);
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        
        // Create documents store (v1+)
        if (!db.objectStoreNames.contains(DOCUMENT_STORE)) {
          const documentStore = db.createObjectStore(DOCUMENT_STORE, { keyPath: 'id' });
          documentStore.createIndex('lastModified', 'lastModified', { unique: false });
          documentStore.createIndex('title', 'title', { unique: false });
        }
        
        // Create templates store (v1+)
        if (!db.objectStoreNames.contains(TEMPLATE_STORE)) {
          const templateStore = db.createObjectStore(TEMPLATE_STORE, { keyPath: 'id' });
          templateStore.createIndex('category', 'category', { unique: false });
          templateStore.createIndex('name', 'name', { unique: false });
        }
        
        // Create master pages store (v2+)
        if (oldVersion < 2 && !db.objectStoreNames.contains(MASTER_PAGE_STORE)) {
          const masterPageStore = db.createObjectStore(MASTER_PAGE_STORE, { keyPath: 'id' });
          masterPageStore.createIndex('name', 'name', { unique: false });
          masterPageStore.createIndex('documentId', 'documentId', { unique: false });
          masterPageStore.createIndex('lastModified', 'lastModified', { unique: false });
        }
      };
    } catch (err) {
      reject(`Critical database error: ${err.message}`);
    }
  });
}

/**
 * Execute a database operation with automatic open/close handling
 * @param {string} storeName - Name of the object store
 * @param {string} mode - Transaction mode ('readonly' or 'readwrite')
 * @param {Function} operation - Function to execute with the store
 * @returns {Promise<any>} Result of the operation
 */
export async function executeStoreOperation(storeName, mode, operation) {
  let db = null;
  
  try {
    db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], mode);
        const store = transaction.objectStore(storeName);
        
        // Execute the operation with the store
        operation(store, transaction, resolve, reject);
        
        transaction.oncomplete = () => {
          if (db) db.close();
        };
        
        transaction.onerror = (event) => {
          reject(`Transaction error: ${event.target.error}`);
        };
      } catch (err) {
        reject(`Error in store operation: ${err.message}`);
      }
    });
  } catch (err) {
    if (db) db.close();
    throw err;
  }
}

/**
 * Creates a request completion promise
 * @param {IDBRequest} request - The IndexedDB request
 * @param {Function} [processResult] - Optional function to process the result
 * @returns {Promise<any>} Promise that resolves with the result
 */
export function createRequestPromise(request, processResult = null) {
  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      const result = event.target.result;
      resolve(processResult ? processResult(result) : result);
    };
    
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Get all records from a store
 * @param {string} storeName - Name of the object store
 * @returns {Promise<Array>} Array of all records
 */
export async function getAllFromStore(storeName) {
  return executeStoreOperation(storeName, 'readonly', (store, transaction, resolve, reject) => {
    const request = store.getAll();
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onerror = (event) => {
      reject(`Error getting all from ${storeName}: ${event.target.error}`);
    };
  });
}

/**
 * Get a record by ID
 * @param {string} storeName - Name of the object store
 * @param {string} id - Record ID
 * @returns {Promise<Object>} The record
 */
export async function getById(storeName, id) {
  return executeStoreOperation(storeName, 'readonly', (store, transaction, resolve, reject) => {
    const request = store.get(id);
    
    request.onsuccess = (event) => {
      if (event.target.result) {
        resolve(event.target.result);
      } else {
        reject(`Record with ID ${id} not found in ${storeName}`);
      }
    };
    
    request.onerror = (event) => {
      reject(`Error getting record from ${storeName}: ${event.target.error}`);
    };
  });
}

/**
 * Store a record
 * @param {string} storeName - Name of the object store
 * @param {Object} record - Record to store
 * @returns {Promise<string>} ID of the stored record
 */
export async function putRecord(storeName, record) {
  return executeStoreOperation(storeName, 'readwrite', (store, transaction, resolve, reject) => {
    if (!record || !record.id) {
      return reject(`Invalid record: Missing ID for ${storeName}`);
    }
    
    const request = store.put(record);
    
    request.onsuccess = () => {
      // Verify storage worked correctly by reading back
      const verifyRequest = store.get(record.id);
      
      verifyRequest.onsuccess = (event) => {
        if (event.target.result) {
          resolve(record.id);
        } else {
          reject(`Verification failed: Record not found after storage in ${storeName}`);
        }
      };
      
      verifyRequest.onerror = (event) => {
        reject(`Verification error in ${storeName}: ${event.target.error}`);
      };
    };
    
    request.onerror = (event) => {
      reject(`Error storing record in ${storeName}: ${event.target.error}`);
    };
  });
}

/**
 * Delete a record
 * @param {string} storeName - Name of the object store
 * @param {string} id - ID of the record to delete
 * @returns {Promise<void>}
 */
export async function deleteRecord(storeName, id) {
  return executeStoreOperation(storeName, 'readwrite', (store, transaction, resolve, reject) => {
    const request = store.delete(id);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = (event) => {
      reject(`Error deleting record from ${storeName}: ${event.target.error}`);
    };
  });
}