# Storage and Utilities Refactoring Plan

## Current Issues
- storage.js is 615 lines, difficult to maintain
- Multiple data management responsibilities in one file
- Some utility functions are oversized and try to do too much
- Code duplication across utility files
- Inconsistent error handling approaches

## Refactoring Goals
- Break up large utility files into smaller, focused modules
- Create consistent patterns for common operations
- Improve error handling and logging
- Reduce code duplication
- Keep modules under 300 lines each

## Storage Module Reorganization

### 1. storage/index.js
**Purpose**: Main export file
**Target size**: 50-100 lines
**Responsibilities**:
- Re-export functions from specialized modules
- Provide simple API for common operations
- Centralized error handling
- Define shared types

### 2. storage/database.js
**Purpose**: Database management
**Target size**: 150-200 lines
**Responsibilities**:
- IndexedDB initialization
- Database schema management
- Connection management
- Upgrade handling

### 3. storage/documents.js
**Purpose**: Document CRUD operations
**Target size**: 200-250 lines
**Responsibilities**:
- Document creation
- Document retrieval
- Document updating
- Document deletion
- Document listing

### 4. storage/pages.js
**Purpose**: Page data management
**Target size**: 150-200 lines
**Responsibilities**:
- Page data storage
- Canvas JSON serialization
- Page metadata management
- Optimization for large pages

### 5. storage/recovery.js
**Purpose**: Data recovery utilities
**Target size**: 100-150 lines
**Responsibilities**:
- Error recovery procedures
- Data validation
- Corruption detection
- Backup management

### 6. storage/verification.js
**Purpose**: Data verification utilities
**Target size**: 100-150 lines
**Responsibilities**:
- Data integrity checks
- Consistency validation
- Error reporting
- Diagnostic tools

## Utility Functions Reorganization

### 1. utils/string.js
**Purpose**: String manipulation utilities
**Target size**: 50-100 lines
**Responsibilities**:
- Formatting helpers
- String validation
- String transformation
- Common patterns

### 2. utils/array.js
**Purpose**: Array manipulation utilities
**Target size**: 50-100 lines
**Responsibilities**:
- Array filtering
- Array transformation
- Common array patterns
- Array utility functions

### 3. utils/validation.js
**Purpose**: Data validation utilities
**Target size**: 100-150 lines
**Responsibilities**:
- Input validation
- Type checking
- Schema validation
- Error messages

### 4. utils/async.js
**Purpose**: Async operation utilities
**Target size**: 50-100 lines
**Responsibilities**:
- Promise wrappers
- Retry mechanisms
- Timeout handling
- Async utility functions

### 5. utils/logging.js
**Purpose**: Logging utilities
**Target size**: 50-100 lines
**Responsibilities**:
- Console logging with levels
- Error formatting
- Debug information
- Performance monitoring

## Implementation Example: Storage Modules

### storage/index.js

```javascript
/**
 * Main storage API
 * Re-exports functionality from specialized modules
 */
import * as database from './database.js';
import * as documents from './documents.js';
import * as pages from './pages.js';
import * as recovery from './recovery.js';
import * as verification from './verification.js';
import { handleStorageError } from '../utils/errors.js';
import { log } from '../utils/logging.js';

// Database initialization
export async function initializeStorage() {
  try {
    await database.initializeDatabase();
    log.info('Storage system initialized successfully');
    return true;
  } catch (error) {
    handleStorageError('Failed to initialize storage', error);
    return false;
  }
}

// Document operations
export async function loadDocument(documentId) {
  try {
    return await documents.getDocument(documentId);
  } catch (error) {
    handleStorageError(`Failed to load document ${documentId}`, error);
    throw error;
  }
}

export async function saveDocument(document) {
  try {
    return await documents.saveDocument(document);
  } catch (error) {
    handleStorageError('Failed to save document', error);
    throw error;
  }
}

export async function getDocumentList() {
  try {
    return await documents.listDocuments();
  } catch (error) {
    handleStorageError('Failed to retrieve document list', error);
    return [];
  }
}

export async function deleteDocument(documentId) {
  try {
    return await documents.deleteDocument(documentId);
  } catch (error) {
    handleStorageError(`Failed to delete document ${documentId}`, error);
    throw error;
  }
}

// Page operations
export async function savePage(documentId, pageId, canvasJSON) {
  try {
    return await pages.savePage(documentId, pageId, canvasJSON);
  } catch (error) {
    handleStorageError(`Failed to save page ${pageId}`, error);
    throw error;
  }
}

export async function loadPage(documentId, pageId) {
  try {
    return await pages.getPage(documentId, pageId);
  } catch (error) {
    handleStorageError(`Failed to load page ${pageId}`, error);
    throw error;
  }
}

// Recovery operations
export async function verifyDocumentIntegrity(documentId) {
  try {
    return await verification.verifyDocument(documentId);
  } catch (error) {
    handleStorageError(`Integrity check failed for document ${documentId}`, error);
    return { valid: false, errors: [error.message] };
  }
}

export async function recoverDocument(documentId) {
  try {
    return await recovery.recoverDocument(documentId);
  } catch (error) {
    handleStorageError(`Recovery failed for document ${documentId}`, error);
    throw error;
  }
}
```

### storage/database.js

```javascript
/**
 * IndexedDB management module
 * Handles database initialization and connection
 */
import { log } from '../utils/logging.js';

// Database constants
const DB_NAME = 'pageStudioDB';
const DB_VERSION = 1;
const DOCUMENT_STORE = 'documents';
const PAGE_STORE = 'pages';

// Database instance
let db = null;

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>} The database instance
 */
export async function initializeDatabase() {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      log.error('Database error:', event.target.error);
      reject(new Error('Could not open IndexedDB'));
    };
    
    request.onsuccess = (event) => {
      db = event.target.result;
      log.info('Database opened successfully');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(DOCUMENT_STORE)) {
        const documentStore = db.createObjectStore(DOCUMENT_STORE, { keyPath: 'id' });
        documentStore.createIndex('created', 'created', { unique: false });
        documentStore.createIndex('lastModified', 'lastModified', { unique: false });
        log.info('Document store created');
      }
      
      if (!db.objectStoreNames.contains(PAGE_STORE)) {
        const pageStore = db.createObjectStore(PAGE_STORE, { keyPath: ['documentId', 'pageId'] });
        pageStore.createIndex('documentId', 'documentId', { unique: false });
        log.info('Page store created');
      }
    };
  });
}

/**
 * Get a transaction for the specified stores
 * @param {string[]} stores - The stores to include in the transaction
 * @param {string} mode - The transaction mode ('readonly' or 'readwrite')
 * @returns {IDBTransaction} The transaction
 */
export async function getTransaction(stores, mode = 'readonly') {
  if (!db) {
    db = await initializeDatabase();
  }
  
  return db.transaction(stores, mode);
}

/**
 * Close the database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    log.info('Database connection closed');
  }
}

/**
 * Clear all data from the database
 * @returns {Promise<void>}
 */
export async function clearDatabase() {
  const tx = await getTransaction([DOCUMENT_STORE, PAGE_STORE], 'readwrite');
  
  return new Promise((resolve, reject) => {
    let documentClearRequest = tx.objectStore(DOCUMENT_STORE).clear();
    let pageClearRequest = tx.objectStore(PAGE_STORE).clear();
    
    tx.oncomplete = () => {
      log.info('Database cleared successfully');
      resolve();
    };
    
    tx.onerror = (event) => {
      log.error('Error clearing database:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Helper function to wrap IndexedDB requests in promises
 * @param {IDBRequest} request - The IndexedDB request
 * @returns {Promise<any>} A promise that resolves with the request result
 */
export function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}
```

### storage/documents.js

```javascript
/**
 * Document operations module
 * Handles document CRUD operations
 */
import { getTransaction, promisifyRequest } from './database.js';
import { validateDocument } from './verification.js';
import { log } from '../utils/logging.js';

const DOCUMENT_STORE = 'documents';
const PAGE_STORE = 'pages';

/**
 * Save a document to the database
 * @param {Object} document - The document to save
 * @returns {Promise<string>} The document ID
 */
export async function saveDocument(document) {
  // Validate document
  const validation = validateDocument(document);
  if (!validation.valid) {
    throw new Error(`Invalid document: ${validation.errors.join(', ')}`);
  }
  
  // Update modification timestamp
  document.lastModified = new Date();
  
  // Start transaction
  const tx = await getTransaction([DOCUMENT_STORE, PAGE_STORE], 'readwrite');
  const documentStore = tx.objectStore(DOCUMENT_STORE);
  const pageStore = tx.objectStore(PAGE_STORE);
  
  return new Promise((resolve, reject) => {
    // Save document metadata
    const request = documentStore.put(document);
    
    request.onsuccess = async () => {
      try {
        // Save pages separately for better performance
        for (const page of document.pages) {
          const pageData = {
            documentId: document.id,
            pageId: page.id,
            canvasJSON: page.canvasJSON,
            masterPageId: page.masterPageId,
            overrides: page.overrides || {}
          };
          
          await promisifyRequest(pageStore.put(pageData));
        }
        
        log.info(`Document ${document.id} saved successfully`);
        resolve(document.id);
      } catch (error) {
        log.error(`Error saving pages for document ${document.id}:`, error);
        reject(error);
      }
    };
    
    request.onerror = (event) => {
      log.error(`Error saving document ${document.id}:`, event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Get a document from the database
 * @param {string} documentId - The document ID
 * @returns {Promise<Object>} The document
 */
export async function getDocument(documentId) {
  const tx = await getTransaction([DOCUMENT_STORE, PAGE_STORE]);
  const documentStore = tx.objectStore(DOCUMENT_STORE);
  const pageStore = tx.objectStore(PAGE_STORE);
  
  return new Promise((resolve, reject) => {
    const request = documentStore.get(documentId);
    
    request.onsuccess = async (event) => {
      const document = event.target.result;
      
      if (!document) {
        reject(new Error(`Document ${documentId} not found`));
        return;
      }
      
      try {
        // Load pages from separate store
        const pageIndex = pageStore.index('documentId');
        const pagesRequest = pageIndex.getAll(documentId);
        
        const pages = await promisifyRequest(pagesRequest);
        
        // Restore pages to document
        document.pages = document.pages.map(page => {
          const pageData = pages.find(p => p.pageId === page.id);
          
          if (pageData) {
            return {
              ...page,
              canvasJSON: pageData.canvasJSON,
              masterPageId: pageData.masterPageId,
              overrides: pageData.overrides || {}
            };
          }
          
          return page;
        });
        
        log.info(`Document ${documentId} loaded successfully`);
        resolve(document);
      } catch (error) {
        log.error(`Error loading pages for document ${documentId}:`, error);
        reject(error);
      }
    };
    
    request.onerror = (event) => {
      log.error(`Error loading document ${documentId}:`, event.target.error);
      reject(event.target.error);
    };
  });
}

// Additional document operations here...
```

## Implementation Example: Utility Modules

### utils/logging.js

```javascript
/**
 * Logging utility
 * Provides standardized logging capabilities
 */

// Log levels
export const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level (can be changed at runtime)
let currentLogLevel = LogLevel.INFO;

// Enable/disable logging to console
let loggingEnabled = true;

// Set the current log level
export function setLogLevel(level) {
  if (Object.values(LogLevel).includes(level)) {
    currentLogLevel = level;
    info(`Log level set to ${getLogLevelName(level)}`);
  } else {
    warn(`Invalid log level: ${level}`);
  }
}

// Enable or disable logging
export function enableLogging(enabled) {
  loggingEnabled = enabled;
}

// Get the name of a log level
function getLogLevelName(level) {
  return Object.keys(LogLevel).find(key => LogLevel[key] === level) || 'UNKNOWN';
}

// Format the current timestamp
function getTimestamp() {
  return new Date().toISOString();
}

// Base logging function
function logMessage(level, ...args) {
  if (!loggingEnabled || level > currentLogLevel) return;
  
  const timestamp = getTimestamp();
  const levelName = getLogLevelName(level);
  
  if (level === LogLevel.ERROR) {
    console.error(`[${timestamp}] [${levelName}]`, ...args);
  } else if (level === LogLevel.WARN) {
    console.warn(`[${timestamp}] [${levelName}]`, ...args);
  } else if (level === LogLevel.INFO) {
    console.info(`[${timestamp}] [${levelName}]`, ...args);
  } else {
    console.log(`[${timestamp}] [${levelName}]`, ...args);
  }
}

// Error logging
export function error(...args) {
  logMessage(LogLevel.ERROR, ...args);
}

// Warning logging
export function warn(...args) {
  logMessage(LogLevel.WARN, ...args);
}

// Info logging
export function info(...args) {
  logMessage(LogLevel.INFO, ...args);
}

// Debug logging
export function debug(...args) {
  logMessage(LogLevel.DEBUG, ...args);
}

// Group logs for readability
export function group(name) {
  if (!loggingEnabled) return;
  console.group(name);
}

export function groupEnd() {
  if (!loggingEnabled) return;
  console.groupEnd();
}

// Export a combined log object
export const log = {
  error,
  warn,
  info,
  debug,
  group,
  groupEnd,
  setLevel: setLogLevel,
  enable: enableLogging,
  level: LogLevel
};
```

### utils/async.js

```javascript
/**
 * Async utility functions
 * Helpers for managing asynchronous operations
 */
import { log } from './logging.js';

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - The number of milliseconds to sleep
 * @returns {Promise<void>} A promise that resolves after the specified time
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async function with exponential backoff
 * @param {Function} fn - The async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 100)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 5000)
 * @returns {Promise<any>} The result of the function
 */
export async function retry(fn, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const baseDelay = options.baseDelay || 100;
  const maxDelay = options.maxDelay || 5000;
  
  let retryCount = 0;
  let lastError = null;
  
  while (retryCount <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (retryCount === maxRetries) {
        log.error(`Retry failed after ${maxRetries} attempts:`, error);
        throw error;
      }
      
      const delay = Math.min(
        baseDelay * Math.pow(2, retryCount),
        maxDelay
      );
      
      log.warn(`Attempt ${retryCount + 1} failed, retrying in ${delay}ms`, error);
      await sleep(delay);
      retryCount++;
    }
  }
}

/**
 * Run an async function with a timeout
 * @param {Function} fn - The async function to run
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} errorMessage - Custom error message
 * @returns {Promise<any>} The result of the function
 */
export async function withTimeout(fn, timeoutMs, errorMessage = 'Operation timed out') {
  return Promise.race([
    fn(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

/**
 * Execute multiple promises and return all results, even if some fail
 * @param {Array<Promise>} promises - The promises to execute
 * @returns {Promise<Array<{status: string, value?: any, error?: Error}>>} Results
 */
export async function settleAll(promises) {
  return Promise.all(
    promises.map(promise => 
      promise
        .then(value => ({ status: 'fulfilled', value }))
        .catch(error => ({ status: 'rejected', error }))
    )
  );
}

/**
 * Creates a debounced function that delays execution
 * @param {Function} fn - The function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay) {
  let timeout;
  
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Creates a throttled function that limits execution rate
 * @param {Function} fn - The function to throttle
 * @param {number} limit - Minimum time between executions in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(fn, limit) {
  let inThrottle = false;
  
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
```

## Implementation Strategy

1. **Start with utility modules**:
   - Create base utility modules first
   - Implement logging and error handling
   - Test independently

2. **Create storage module hierarchy**:
   - Define interfaces
   - Implement lower-level modules first
   - Build higher-level modules on top

3. **Migrate functionality**:
   - Move functions from existing files to new modules
   - Update imports
   - Test after each migration

4. **Update dependencies**:
   - Update import paths throughout the application
   - Fix any broken references
   - Ensure backward compatibility

5. **Refactor using new utilities**:
   - Update existing code to use new utilities
   - Remove duplicate code
   - Apply consistent patterns

## Expected Outcomes

- Improved maintainability with smaller, focused modules
- Consistent error handling and logging
- Better testability through proper separation of concerns
- Reduced code duplication
- Clearer API boundaries
- All modules under 300 lines