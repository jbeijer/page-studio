/**
 * Utility module for handling storage with IndexedDB
 */

const DB_NAME = 'PageStudioDB';
const DB_VERSION = 2; // Incrementing for schema changes
const DOCUMENT_STORE = 'documents';
const TEMPLATE_STORE = 'templates';
const MASTER_PAGE_STORE = 'masterPages';

/**
 * Open the database connection
 * @returns {Promise<IDBDatabase>} Database connection
 */
export function openDatabase() {
  return new Promise((resolve, reject) => {
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
      
      // Update document schema for v2+
      if (oldVersion < 2 && db.objectStoreNames.contains(DOCUMENT_STORE)) {
        // We can't directly modify the schema, but when old documents are loaded,
        // the application code will ensure the new masterPages array and page.overrides
        // objects are properly initialized
      }
    };
  });
}

/**
 * Save a document to IndexedDB
 * @param {Object} document - Document to save
 * @returns {Promise<string>} Document ID
 */
export async function saveDocument(document) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DOCUMENT_STORE], 'readwrite');
    const store = transaction.objectStore(DOCUMENT_STORE);
    
    // Prepare the document for storage (convert Date objects to strings)
    const storageDoc = {
      ...document,
      created: document.created.toISOString(),
      lastModified: new Date().toISOString()
    };
    
    // For master pages, convert created and lastModified dates to ISO strings
    if (storageDoc.masterPages && Array.isArray(storageDoc.masterPages)) {
      storageDoc.masterPages = storageDoc.masterPages.map(masterPage => ({
        ...masterPage,
        created: masterPage.created instanceof Date ? masterPage.created.toISOString() : masterPage.created,
        lastModified: masterPage.lastModified instanceof Date ? masterPage.lastModified.toISOString() : masterPage.lastModified
      }));
    }
    
    const request = store.put(storageDoc);
    
    request.onsuccess = () => {
      resolve(document.id);
    };
    
    request.onerror = (event) => {
      reject(`Error saving document: ${event.target.error}`);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Load a document from IndexedDB
 * @param {string} documentId - ID of the document to load
 * @returns {Promise<Object>} Loaded document
 */
export async function loadDocument(documentId) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DOCUMENT_STORE], 'readonly');
    const store = transaction.objectStore(DOCUMENT_STORE);
    const request = store.get(documentId);
    
    request.onsuccess = (event) => {
      if (event.target.result) {
        // Convert string dates back to Date objects
        const doc = event.target.result;
        doc.created = new Date(doc.created);
        doc.lastModified = new Date(doc.lastModified);
        
        // Convert master page dates
        if (doc.masterPages && Array.isArray(doc.masterPages)) {
          doc.masterPages = doc.masterPages.map(masterPage => ({
            ...masterPage,
            created: new Date(masterPage.created),
            lastModified: new Date(masterPage.lastModified)
          }));
        } else {
          // Initialize masterPages array if missing (for backward compatibility)
          doc.masterPages = [];
        }
        
        // Ensure all pages have the overrides property (for backward compatibility)
        if (doc.pages && Array.isArray(doc.pages)) {
          doc.pages = doc.pages.map(page => ({
            ...page,
            overrides: page.overrides || {}
          }));
        }
        
        resolve(doc);
      } else {
        reject(`Document with ID ${documentId} not found`);
      }
    };
    
    request.onerror = (event) => {
      reject(`Error loading document: ${event.target.error}`);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get a list of all document summaries
 * @param {number} limit - Maximum number of documents to retrieve
 * @returns {Promise<Array<Object>>} List of document summaries
 */
export async function getDocumentList(limit = 100) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DOCUMENT_STORE], 'readonly');
    const store = transaction.objectStore(DOCUMENT_STORE);
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
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Delete a document from IndexedDB
 * @param {string} documentId - ID of the document to delete
 * @returns {Promise<void>}
 */
export async function deleteDocument(documentId) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DOCUMENT_STORE], 'readwrite');
    const store = transaction.objectStore(DOCUMENT_STORE);
    const request = store.delete(documentId);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = (event) => {
      reject(`Error deleting document: ${event.target.error}`);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Save a template to IndexedDB
 * @param {Object} template - Template to save
 * @returns {Promise<string>} Template ID
 */
export async function saveTemplate(template) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TEMPLATE_STORE], 'readwrite');
    const store = transaction.objectStore(TEMPLATE_STORE);
    
    // Prepare the template for storage
    const storageTemplate = {
      ...template,
      created: new Date().toISOString()
    };
    
    const request = store.put(storageTemplate);
    
    request.onsuccess = () => {
      resolve(template.id);
    };
    
    request.onerror = (event) => {
      reject(`Error saving template: ${event.target.error}`);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get a list of all templates
 * @returns {Promise<Array<Object>>} List of templates
 */
export async function getTemplateList() {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TEMPLATE_STORE], 'readonly');
    const store = transaction.objectStore(TEMPLATE_STORE);
    const request = store.getAll();
    
    request.onsuccess = (event) => {
      const templates = event.target.result.map(template => ({
        ...template,
        created: new Date(template.created)
      }));
      resolve(templates);
    };
    
    request.onerror = (event) => {
      reject(`Error listing templates: ${event.target.error}`);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Save a master page to a separate store (for sharing across documents)
 * @param {Object} masterPage - Master page to save
 * @param {string} documentId - ID of the source document
 * @returns {Promise<string>} Master page ID
 */
export async function saveMasterPage(masterPage, documentId) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MASTER_PAGE_STORE], 'readwrite');
    const store = transaction.objectStore(MASTER_PAGE_STORE);
    
    // Prepare the master page for storage
    const storageMasterPage = {
      ...masterPage,
      documentId,
      created: masterPage.created instanceof Date ? masterPage.created.toISOString() : masterPage.created,
      lastModified: masterPage.lastModified instanceof Date 
        ? masterPage.lastModified.toISOString() 
        : new Date().toISOString()
    };
    
    const request = store.put(storageMasterPage);
    
    request.onsuccess = () => {
      resolve(masterPage.id);
    };
    
    request.onerror = (event) => {
      reject(`Error saving master page: ${event.target.error}`);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Load a master page from the master pages store
 * @param {string} masterPageId - ID of the master page to load
 * @returns {Promise<Object>} Loaded master page
 */
export async function loadMasterPage(masterPageId) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MASTER_PAGE_STORE], 'readonly');
    const store = transaction.objectStore(MASTER_PAGE_STORE);
    const request = store.get(masterPageId);
    
    request.onsuccess = (event) => {
      if (event.target.result) {
        // Convert string dates back to Date objects
        const masterPage = event.target.result;
        masterPage.created = new Date(masterPage.created);
        masterPage.lastModified = new Date(masterPage.lastModified);
        resolve(masterPage);
      } else {
        reject(`Master page with ID ${masterPageId} not found`);
      }
    };
    
    request.onerror = (event) => {
      reject(`Error loading master page: ${event.target.error}`);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get a list of all available master pages
 * @param {string} [documentId] - Optional filter by document ID
 * @returns {Promise<Array<Object>>} List of master pages
 */
export async function getMasterPageList(documentId = null) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MASTER_PAGE_STORE], 'readonly');
    const store = transaction.objectStore(MASTER_PAGE_STORE);
    
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
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Delete a master page from the master pages store
 * @param {string} masterPageId - ID of the master page to delete
 * @returns {Promise<void>}
 */
export async function deleteMasterPage(masterPageId) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MASTER_PAGE_STORE], 'readwrite');
    const store = transaction.objectStore(MASTER_PAGE_STORE);
    const request = store.delete(masterPageId);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = (event) => {
      reject(`Error deleting master page: ${event.target.error}`);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}