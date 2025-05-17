/**
 * Storage module index
 * 
 * This module acts as a single entry point for all storage functions.
 */

// Re-export database operations
export {
  openDatabase,
  executeStoreOperation,
  getAllFromStore,
  getById,
  putRecord,
  deleteRecord,
  DB_NAME,
  DB_VERSION,
  DOCUMENT_STORE,
  TEMPLATE_STORE,
  MASTER_PAGE_STORE
} from './database.js';

// Re-export validation utilities
export {
  validateDocumentStructure,
  validateJsonString,
  validateCanvasJson,
  isValidDate,
  normalizeDate
} from './validation.js';

// Re-export document operations
export {
  saveDocument,
  loadDocument,
  getDocumentList,
  deleteDocument
} from './documents.js';

// Re-export master page operations
export {
  saveMasterPage,
  loadMasterPage,
  getMasterPageList,
  deleteMasterPage
} from './master-pages.js';

// Re-export template operations
export {
  saveTemplate,
  loadTemplate,
  getTemplateList,
  deleteTemplate
} from './templates.js';