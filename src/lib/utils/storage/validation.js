/**
 * Validation module for storage operations
 * 
 * This module provides utilities for validating data structures and formats.
 */

/**
 * Validate document structure
 * @param {Object} document - Document to validate
 * @returns {Object} Validation result {valid: boolean, errors: string[]}
 */
export function validateDocumentStructure(document) {
  const errors = [];
  
  // Check if document exists
  if (!document) {
    return { valid: false, errors: ['Document is null or undefined'] };
  }
  
  // Check required fields
  if (!document.id) {
    errors.push('Document is missing required ID field');
  }
  
  if (!document.title) {
    errors.push('Document is missing required title field');
  }
  
  if (!document.pages || !Array.isArray(document.pages)) {
    errors.push('Document is missing pages array or pages is not an array');
  } else {
    // Check pages structure
    document.pages.forEach((page, index) => {
      if (!page.id) {
        errors.push(`Page at index ${index} is missing required ID field`);
      }
    });
  }
  
  // Check metadata structure
  if (!document.metadata || typeof document.metadata !== 'object') {
    errors.push('Document is missing metadata object');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate JSON string format
 * @param {string} jsonString - JSON string to validate
 * @returns {Object} Validation result {valid: boolean, error: string, data: Object}
 */
export function validateJsonString(jsonString) {
  if (typeof jsonString !== 'string') {
    return {
      valid: false,
      error: `Invalid JSON: Expected string but got ${typeof jsonString}`,
      data: null
    };
  }
  
  try {
    const data = JSON.parse(jsonString);
    return {
      valid: true,
      error: null,
      data
    };
  } catch (err) {
    return {
      valid: false,
      error: `Invalid JSON: ${err.message}`,
      data: null
    };
  }
}

/**
 * Ensure canvas JSON has the required fields
 * @param {Object|string} json - Canvas JSON data (object or string)
 * @returns {string} Validated and potentially fixed JSON string
 */
export function validateCanvasJson(json) {
  // If it's already a string, validate and parse it
  let data;
  
  if (typeof json === 'string') {
    const result = validateJsonString(json);
    if (!result.valid) {
      // Return default empty canvas JSON if invalid
      return JSON.stringify({
        objects: [],
        background: 'white'
      });
    }
    data = result.data;
  } else if (json === null) {
    // Return default empty canvas JSON if null
    return JSON.stringify({
      objects: [],
      background: 'white'
    });
  } else if (typeof json === 'object') {
    // Use the object directly
    data = json;
  } else {
    // Return default empty canvas JSON for any other type
    return JSON.stringify({
      objects: [],
      background: 'white'
    });
  }
  
  // Ensure objects array exists
  if (!data.objects || !Array.isArray(data.objects)) {
    data.objects = [];
  }
  
  // Ensure background is set
  if (!data.background) {
    data.background = 'white';
  }
  
  // Return as JSON string
  return JSON.stringify(data);
}

/**
 * Check if a date is valid
 * @param {Date|string} date - Date to check
 * @returns {boolean} Whether the date is valid
 */
export function isValidDate(date) {
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  
  if (typeof date === 'string') {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }
  
  return false;
}

/**
 * Ensure consistent date format
 * @param {Date|string} date - Date to normalize
 * @returns {string} ISO date string
 */
export function normalizeDate(date) {
  if (!date) {
    return new Date().toISOString();
  }
  
  if (date instanceof Date) {
    return date.toISOString();
  }
  
  if (typeof date === 'string' && isValidDate(date)) {
    return new Date(date).toISOString();
  }
  
  return new Date().toISOString();
}