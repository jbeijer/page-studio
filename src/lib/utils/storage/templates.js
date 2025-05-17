/**
 * Template storage operations
 * 
 * This module provides functions for template CRUD operations.
 */

import { 
  TEMPLATE_STORE, 
  executeStoreOperation, 
  getById, 
  putRecord, 
  deleteRecord 
} from './database.js';

import { normalizeDate } from './validation.js';

/**
 * Save a template to storage
 * @param {Object} template - Template to save
 * @returns {Promise<string>} Template ID
 */
export async function saveTemplate(template) {
  if (!template || !template.id) {
    throw new Error('Invalid template: Missing ID');
  }
  
  // Prepare template for storage
  const storageTemplate = {
    ...template,
    created: normalizeDate(template.created || new Date())
  };
  
  // Save to database
  try {
    await putRecord(TEMPLATE_STORE, storageTemplate);
    return template.id;
  } catch (err) {
    console.error(`Error saving template ${template.id}:`, err);
    throw err;
  }
}

/**
 * Load a template from storage
 * @param {string} templateId - ID of the template to load
 * @returns {Promise<Object>} Loaded template
 */
export async function loadTemplate(templateId) {
  try {
    // Get template from database
    const template = await getById(TEMPLATE_STORE, templateId);
    
    // Convert dates to Date objects
    template.created = new Date(template.created);
    
    return template;
  } catch (err) {
    console.error(`Error loading template ${templateId}:`, err);
    throw err;
  }
}

/**
 * Get a list of all templates
 * @param {string} [category] - Optional filter by category
 * @returns {Promise<Array<Object>>} List of templates
 */
export async function getTemplateList(category = null) {
  return executeStoreOperation(TEMPLATE_STORE, 'readonly', (store, transaction, resolve, reject) => {
    let request;
    
    if (category) {
      const index = store.index('category');
      request = index.getAll(category);
    } else {
      request = store.getAll();
    }
    
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
  });
}

/**
 * Delete a template
 * @param {string} templateId - ID of the template to delete
 * @returns {Promise<void>}
 */
export async function deleteTemplate(templateId) {
  return deleteRecord(TEMPLATE_STORE, templateId);
}