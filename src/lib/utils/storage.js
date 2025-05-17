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
  console.log("Starting saveDocument for:", document.id);
  
  try {
    if (!document || !document.id) {
      throw new Error("Invalid document object: Missing ID");
    }
    
    if (!document.pages || !Array.isArray(document.pages)) {
      throw new Error("Invalid document object: Missing pages array");
    }
    
    const db = await openDatabase();
    console.log("Database opened successfully");
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([DOCUMENT_STORE], 'readwrite');
        console.log("Transaction created");
        
        const store = transaction.objectStore(DOCUMENT_STORE);
        console.log("Store accessed");
        
        // Deep clone to avoid modifying the original document
        const docClone = JSON.parse(JSON.stringify(document));
        
        // Prepare the document for storage (convert Date objects to strings)
        const storageDoc = {
          ...docClone,
          created: document.created instanceof Date ? document.created.toISOString() : document.created,
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
        
        // Verify each page has proper canvasJSON
        storageDoc.pages = storageDoc.pages.map((page, index) => {
          // If canvasJSON is undefined, set it to null
          if (page.canvasJSON === undefined) {
            console.warn(`Page ${index} (ID: ${page.id}) missing canvasJSON, setting to null`);
            return { ...page, canvasJSON: null };
          }
          
          // Special handling for string-type canvasJSON
          if (typeof page.canvasJSON === 'string') {
            console.log(`Page ${index} (ID: ${page.id}) has string canvasJSON of length ${page.canvasJSON.length}`);
            
            try {
              // Try to parse it to make sure it's valid JSON
              const parsedJSON = JSON.parse(page.canvasJSON);
              const objectCount = parsedJSON.objects ? parsedJSON.objects.length : 0;
              console.log(`  - Valid JSON with ${objectCount} objects`);
              
              // Log if it's suspiciously small
              if (page.canvasJSON.length < 50) {
                console.warn(`  - Warning: Very small JSON, might be empty canvas: ${page.canvasJSON}`);
              }
              
              // It's valid JSON, return as is
              return page;
            } catch (err) {
              console.error(`  - Error parsing canvasJSON for page ${page.id}:`, err);
              console.error(`  - Invalid JSON data:`, page.canvasJSON.substring(0, 100) + '...');
              
              // Set to empty JSON object since it's invalid
              return { ...page, canvasJSON: '{"objects":[],"background":"white"}' };
            }
          }
          
          // For object-type canvasJSON, convert to string
          if (typeof page.canvasJSON === 'object' && page.canvasJSON !== null) {
            try {
              const jsonString = JSON.stringify(page.canvasJSON);
              console.log(`Page ${index} (ID: ${page.id}) has object canvasJSON, converted to string of length ${jsonString.length}`);
              return { ...page, canvasJSON: jsonString };
            } catch (err) {
              console.error(`Error stringifying canvasJSON for page ${page.id}:`, err);
              return { ...page, canvasJSON: '{"objects":[],"background":"white"}' };
            }
          }
          
          return page;
        });
        
        console.log("Putting document in store:", storageDoc.id);
        
        // Final check of pages data before storage
        console.log(`About to store document with ${storageDoc.pages.length} pages:`);
        storageDoc.pages.forEach((page, i) => {
          if (page.canvasJSON) {
            console.log(`DB Store: Page ${i} (${page.id}) canvasJSON length: ${page.canvasJSON.length}`);
            
            // Paranoid check for valid JSON
            try {
              const pageData = JSON.parse(page.canvasJSON);
              console.log(`DB Store: Page ${i} objects: ${pageData.objects ? pageData.objects.length : 0}`);
            } catch (err) {
              console.error(`DB Store: Page ${i} has invalid JSON!`, err);
            }
          } else {
            console.warn(`DB Store: Page ${i} (${page.id}) has no canvasJSON!`);
          }
        });
        
        // Do the actual storage
        const request = store.put(storageDoc);
        
        request.onsuccess = () => {
          console.log("Document saved successfully to IndexedDB:", document.id);
          
          // Verify the data is stored by reading it back
          const verifyRequest = store.get(document.id);
          
          verifyRequest.onsuccess = (event) => {
            if (event.target.result) {
              const storedDoc = event.target.result;
              console.log(`Verification from DB: Document ${storedDoc.id} with ${storedDoc.pages.length} pages`);
              
              // Check pages data
              storedDoc.pages.forEach((page, i) => {
                if (page.canvasJSON) {
                  console.log(`DB Verify: Page ${i} (${page.id}) canvasJSON length: ${page.canvasJSON.length}`);
                  
                  // Check for valid JSON
                  try {
                    const pageData = JSON.parse(page.canvasJSON);
                    console.log(`DB Verify: Page ${i} objects: ${pageData.objects ? pageData.objects.length : 0}`);
                  } catch (err) {
                    console.error(`DB Verify: Page ${i} has invalid JSON after storage!`, err);
                  }
                } else {
                  console.warn(`DB Verify: Page ${i} (${page.id}) has no canvasJSON after storage!`);
                }
              });
            } else {
              console.error(`DB Verify: Document ${document.id} not found after saving!`);
            }
            
            resolve(document.id);
          };
          
          verifyRequest.onerror = (err) => {
            console.error("DB Verify: Error verifying stored document:", err);
            // Still resolve since the initial save succeeded
            resolve(document.id);
          };
        };
        
        request.onerror = (event) => {
          console.error("DB Error: Error in put request:", event.target.error);
          reject(`Error saving document: ${event.target.error}`);
        };
        
        transaction.oncomplete = () => {
          console.log("DB Transaction: Transaction completed");
          db.close();
        };
        
        transaction.onerror = (event) => {
          console.error("DB Transaction: Transaction error:", event.target.error);
          reject(`Transaction error: ${event.target.error}`);
        };
      } catch (err) {
        console.error("Error in transaction setup:", err);
        reject(`Error setting up transaction: ${err.message}`);
      }
    });
  } catch (err) {
    console.error("Error in saveDocument:", err);
    throw err;
  }
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
        
        // Ensure all pages have the overrides property and validate canvasJSON
        if (doc.pages && Array.isArray(doc.pages)) {
          console.log(`Document ${doc.id} has ${doc.pages.length} pages`);
          
          doc.pages = doc.pages.map((page, index) => {
            // Add default overrides if missing (backward compatibility)
            const pageWithOverrides = {
              ...page,
              overrides: page.overrides || {}
            };
            
            // Validate canvasJSON
            if (pageWithOverrides.canvasJSON) {
              console.log(`Loaded page ${index} (${page.id}) has canvasJSON of type ${typeof pageWithOverrides.canvasJSON} and length ${typeof pageWithOverrides.canvasJSON === 'string' ? pageWithOverrides.canvasJSON.length : JSON.stringify(pageWithOverrides.canvasJSON).length}`);
              
              // If it's a string, try to parse it
              if (typeof pageWithOverrides.canvasJSON === 'string') {
                try {
                  // Verify the JSON by parsing it
                  const parsedJSON = JSON.parse(pageWithOverrides.canvasJSON);
                  const objectCount = parsedJSON.objects ? parsedJSON.objects.length : 0;
                  console.log(`  - Page ${page.id} has valid JSON with ${objectCount} objects`);
                } catch (err) {
                  console.error(`  - Error parsing canvasJSON for page ${page.id}:`, err);
                  console.error(`  - First 100 chars: ${pageWithOverrides.canvasJSON.substring(0, 100)}...`);
                  
                  // Reset to default empty canvas since it's invalid
                  pageWithOverrides.canvasJSON = '{"objects":[],"background":"white"}';
                }
              } else if (typeof pageWithOverrides.canvasJSON === 'object' && pageWithOverrides.canvasJSON !== null) {
                // It's already an object, make sure it has the expected structure
                const objectCount = pageWithOverrides.canvasJSON.objects ? pageWithOverrides.canvasJSON.objects.length : 0;
                console.log(`  - Page ${page.id} has object-type JSON with ${objectCount} objects`);
              } else {
                console.warn(`  - Page ${page.id} has unexpected canvasJSON type: ${typeof pageWithOverrides.canvasJSON}`);
                // Reset to default empty canvas
                pageWithOverrides.canvasJSON = '{"objects":[],"background":"white"}';
              }
            } else {
              console.log(`  - Page ${page.id} has no canvasJSON data`);
            }
            
            return pageWithOverrides;
          });
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