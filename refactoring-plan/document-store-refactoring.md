# Refactoring Plan for document.js Store

## Current Structure

The `document.js` store file currently contains about 450 lines of code with multiple store definitions and helper functions. This file is responsible for:

1. Managing the current document store
2. Tracking the current page
3. Managing the document list
4. Creating new documents
5. Managing master pages
6. Handling document metadata
7. Page manipulation functions

## Proposed Modular Structure

We'll split this file into six smaller modules:

### 1. documentStore.js (~80 lines)

This module will contain the core document stores:

```javascript
import { writable, derived } from 'svelte/store';

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
 * Derived store for the currently active page object
 */
export const activePage = derived(
  [currentDocument, currentPage],
  ([$currentDocument, $currentPage]) => {
    if (!$currentDocument || !$currentPage) return null;
    return $currentDocument.pages.find(page => page.id === $currentPage) || null;
  }
);

/**
 * Updates the document list with a new document
 * @param {Document} document - Document to add/update
 */
export function updateDocumentList(document) {
  // Implementation
}

/**
 * Clear current document and page
 */
export function clearCurrentDocument() {
  currentDocument.set(null);
  currentPage.set(null);
}
```

### 2. documentFactory.js (~100 lines)

This module will handle creating new documents:

```javascript
import { currentDocument, currentPage } from './documentStore.js';

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
  // Current implementation
}

/**
 * Creates a new page object
 * @param {string} pageId - ID for the new page
 * @param {string|null} masterPageId - ID of master page to apply
 * @returns {Page} New page object
 */
export function createPage(pageId, masterPageId = null) {
  // Current implementation
}

/**
 * Sets the current document and activates the first page
 * @param {Document} document - Document to set as current
 */
export function setCurrentDocument(document) {
  if (!document) return;
  
  currentDocument.set(document);
  
  if (document.pages.length > 0) {
    currentPage.set(document.pages[0].id);
  }
}

/**
 * Create default document metadata
 * @returns {DocumentMetadata} Default metadata
 */
export function createDefaultMetadata() {
  // Current implementation
}
```

### 3. pageOperations.js (~80 lines)

This module will handle page operations:

```javascript
import { currentDocument, currentPage } from './documentStore.js';
import { createPage } from './documentFactory.js';

/**
 * Adds a new page to the current document
 * @param {string|null} masterPageId - Optional master page ID to apply
 * @returns {string} ID of the new page
 */
export function addPage(masterPageId = null) {
  // Current implementation
}

/**
 * Deletes a page from the current document
 * @param {string} pageId - ID of the page to delete
 * @returns {boolean} Success status
 */
export function deletePage(pageId) {
  // Current implementation
}

/**
 * Duplicates a page in the current document
 * @param {string} pageId - ID of the page to duplicate
 * @returns {string|null} ID of the new page or null if failed
 */
export function duplicatePage(pageId) {
  // Current implementation
}

/**
 * Changes the master page of a document page
 * @param {string} pageId - ID of the page to modify
 * @param {string|null} masterPageId - ID of the master page to apply
 */
export function setPageMasterPage(pageId, masterPageId) {
  // Current implementation
}
```

### 4. masterPageOperations.js (~100 lines)

This module will handle master page operations:

```javascript
import { currentDocument } from './documentStore.js';

/**
 * Creates a new master page
 * @param {string} name - Name of the master page
 * @param {string|null} canvasJSON - Optional initial canvas JSON
 * @returns {string} ID of the new master page
 */
export function createMasterPage(name, canvasJSON = null) {
  // Current implementation
}

/**
 * Updates an existing master page
 * @param {string} masterPageId - ID of the master page to update
 * @param {object} updates - Properties to update
 * @returns {boolean} Success status
 */
export function updateMasterPage(masterPageId, updates) {
  // Current implementation
}

/**
 * Deletes a master page
 * @param {string} masterPageId - ID of the master page to delete
 * @returns {boolean} Success status
 */
export function deleteMasterPage(masterPageId) {
  // Current implementation
}

/**
 * Gets a master page by ID
 * @param {string} masterPageId - ID of the master page
 * @returns {MasterPage|null} Master page object or null
 */
export function getMasterPage(masterPageId) {
  // Current implementation
}

/**
 * Applies a master page override
 * @param {string} pageId - ID of the page
 * @param {string} objectId - ID of the master object
 */
export function applyMasterPageOverride(pageId, objectId) {
  // Current implementation
}
```

### 5. documentMetadata.js (~50 lines)

This module will handle document metadata:

```javascript
import { currentDocument } from './documentStore.js';

/**
 * Updates document metadata
 * @param {object} metadata - New metadata values
 */
export function updateMetadata(metadata) {
  // Current implementation
}

/**
 * Sets the document title
 * @param {string} title - New document title
 */
export function setDocumentTitle(title) {
  // Current implementation
}

/**
 * Updates grid settings
 * @param {object} gridSettings - New grid settings
 */
export function updateGridSettings(gridSettings) {
  // Current implementation
}

/**
 * Updates ruler settings
 * @param {object} rulerSettings - New ruler settings
 */
export function updateRulerSettings(rulerSettings) {
  // Current implementation
}
```

### 6. index.js (~50 lines)

This module will re-export everything from the other modules:

```javascript
// Re-export all stores and functions
export * from './documentStore.js';
export * from './documentFactory.js';
export * from './pageOperations.js';
export * from './masterPageOperations.js';
export * from './documentMetadata.js';

// You can add any unified functions here that might need multiple modules
```

## Implementation Steps

1. Create the new file structure in `src/lib/stores/document/`
2. Extract each group of functions to their respective files
3. Create the index file to maintain the same external API
4. Update any imports in other files to use either specific modules or the index file
5. Test each module individually
6. Test the integrated solution

## Benefits

1. Each module has a clear, focused responsibility
2. Better organization of document-related functionality
3. Easier to maintain and understand
4. Makes testing more manageable
5. Reduces cognitive load when working on a specific feature
6. Better separation of concerns between document management, page operations, and master page operations