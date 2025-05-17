/**
 * Storage module for PageStudio
 * 
 * This file provides re-exports of storage functionality from the storage/ directory.
 * It maintains backwards compatibility with existing code that imports from this module.
 * 
 * For new code, prefer importing directly from 'storage/index.js'.
 */

// Re-export everything from the storage module
export * from './storage/index.js';

// Legacy export constants for backwards compatibility
export const DB_NAME = 'PageStudioDB';
export const DB_VERSION = 2;
export const DOCUMENT_STORE = 'documents';
export const TEMPLATE_STORE = 'templates';
export const MASTER_PAGE_STORE = 'masterPages';