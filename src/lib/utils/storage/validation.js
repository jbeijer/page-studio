/**
 * Validation module for storage operations
 * 
 * This module provides utilities for validating data structures and formats.
 * It includes both validation checks and automatic repair of document structures.
 */

// Import logger for detailed validation logging
import { logger, LOG_LEVELS, LOG_MODULES } from '../debug-logger.js';

/**
 * Default document structure to use for missing fields
 */
const DEFAULT_DOCUMENT = {
  id: null, // This should be provided
  title: 'Untitled Document',
  format: 'A4',
  creator: 'Anonymous',
  created: new Date(),
  lastModified: new Date(),
  metadata: {
    pageSize: { width: 210, height: 297 },
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    columns: 1,
    columnGap: 10,
    grid: {
      enabled: false,
      size: 10,
      color: '#CCCCCC',
      opacity: 0.5,
      snap: false,
      snapThreshold: 5,
      subdivisions: 2
    },
    rulers: {
      enabled: true,
      horizontalVisible: true,
      verticalVisible: true,
      units: 'mm',
      color: '#666666',
      showNumbers: true
    }
  },
  pages: [
    {
      id: 'page-1',
      canvasJSON: JSON.stringify({ objects: [], background: 'white' }),
      masterPageId: null,
      overrides: {},
      guides: { horizontal: [], vertical: [] }
    }
  ],
  masterPages: [],
  styles: {
    colors: [],
    textStyles: [],
    objectStyles: []
  }
};

/**
 * Validate document structure with enhanced validation and auto-repair capabilities
 * @param {Object} document - Document to validate
 * @param {boolean} autoRepair - Whether to automatically repair issues
 * @returns {Object} Validation result {valid: boolean, errors: string[], warnings: string[], repairedDocument: Object}
 */
export function validateDocumentStructure(document, autoRepair = true) {
  const errors = [];
  const warnings = [];
  let repairedDocument = null;
  
  // Check if document exists
  if (!document) {
    logger.error(LOG_MODULES.DOCUMENT, 'Document is null or undefined');
    return { 
      valid: false, 
      errors: ['Document is null or undefined'],
      warnings: [],
      repairedDocument: autoRepair ? { ...DEFAULT_DOCUMENT } : null
    };
  }
  
  // If auto-repair is enabled, create a deep copy to work with
  if (autoRepair) {
    try {
      repairedDocument = JSON.parse(JSON.stringify(document));
    } catch (err) {
      logger.error(LOG_MODULES.DOCUMENT, 'Failed to create document copy for repair', err);
      repairedDocument = { ...document };
    }
  }
  
  // Check required fields
  if (!document.id) {
    errors.push('Document is missing required ID field');
    if (autoRepair && repairedDocument) {
      // Generate a new ID
      repairedDocument.id = `doc-${Date.now()}`;
      warnings.push(`Auto-repaired: Generated new document ID: ${repairedDocument.id}`);
      logger.warn(LOG_MODULES.DOCUMENT, `Auto-repaired: Generated new document ID: ${repairedDocument.id}`);
    }
  }
  
  if (!document.title) {
    errors.push('Document is missing required title field');
    if (autoRepair && repairedDocument) {
      repairedDocument.title = DEFAULT_DOCUMENT.title;
      warnings.push(`Auto-repaired: Set default title: ${DEFAULT_DOCUMENT.title}`);
      logger.warn(LOG_MODULES.DOCUMENT, `Auto-repaired: Set default title: ${DEFAULT_DOCUMENT.title}`);
    }
  }
  
  // Validate dates
  if (!document.created || !isValidDate(document.created)) {
    errors.push('Document has invalid or missing created date');
    if (autoRepair && repairedDocument) {
      repairedDocument.created = new Date();
      warnings.push('Auto-repaired: Set current time as created date');
      logger.warn(LOG_MODULES.DOCUMENT, 'Auto-repaired: Set current time as created date');
    }
  }
  
  if (!document.lastModified || !isValidDate(document.lastModified)) {
    errors.push('Document has invalid or missing lastModified date');
    if (autoRepair && repairedDocument) {
      repairedDocument.lastModified = new Date();
      warnings.push('Auto-repaired: Set current time as lastModified date');
      logger.warn(LOG_MODULES.DOCUMENT, 'Auto-repaired: Set current time as lastModified date');
    }
  }
  
  // Check pages array
  if (!document.pages || !Array.isArray(document.pages)) {
    errors.push('Document is missing pages array or pages is not an array');
    if (autoRepair && repairedDocument) {
      repairedDocument.pages = [...DEFAULT_DOCUMENT.pages];
      warnings.push('Auto-repaired: Created default pages array with one page');
      logger.warn(LOG_MODULES.DOCUMENT, 'Auto-repaired: Created default pages array with one page');
    }
  } else {
    // Check if pages array is empty
    if (document.pages.length === 0) {
      errors.push('Document has empty pages array');
      if (autoRepair && repairedDocument) {
        repairedDocument.pages = [...DEFAULT_DOCUMENT.pages];
        warnings.push('Auto-repaired: Added default page to empty pages array');
        logger.warn(LOG_MODULES.DOCUMENT, 'Auto-repaired: Added default page to empty pages array');
      }
    } else {
      // Check each page structure
      document.pages.forEach((page, index) => {
        // Validate basic page structure
        if (!page) {
          errors.push(`Page at index ${index} is null or undefined`);
          if (autoRepair && repairedDocument && repairedDocument.pages) {
            // Create a default page
            repairedDocument.pages[index] = { 
              ...DEFAULT_DOCUMENT.pages[0],
              id: `page-${index + 1}`
            };
            warnings.push(`Auto-repaired: Created default page at index ${index}`);
            logger.warn(LOG_MODULES.DOCUMENT, `Auto-repaired: Created default page at index ${index}`);
          }
          return;
        }
        
        // Check page ID
        if (!page.id) {
          errors.push(`Page at index ${index} is missing required ID field`);
          if (autoRepair && repairedDocument && repairedDocument.pages && repairedDocument.pages[index]) {
            repairedDocument.pages[index].id = `page-${index + 1}`;
            warnings.push(`Auto-repaired: Generated ID for page at index ${index}: ${repairedDocument.pages[index].id}`);
            logger.warn(LOG_MODULES.DOCUMENT, `Auto-repaired: Generated ID for page at index ${index}: ${repairedDocument.pages[index].id}`);
          }
        }
        
        // Check canvasJSON
        if (page.canvasJSON === undefined) {
          errors.push(`Page at index ${index} (ID: ${page.id}) has undefined canvasJSON`);
          if (autoRepair && repairedDocument && repairedDocument.pages && repairedDocument.pages[index]) {
            repairedDocument.pages[index].canvasJSON = JSON.stringify({ objects: [], background: 'white' });
            warnings.push(`Auto-repaired: Created empty canvasJSON for page at index ${index} (ID: ${page.id})`);
            logger.warn(LOG_MODULES.DOCUMENT, `Auto-repaired: Created empty canvasJSON for page at index ${index} (ID: ${page.id})`);
          }
        } else if (page.canvasJSON !== null && typeof page.canvasJSON === 'string') {
          try {
            // Validate JSON syntax
            JSON.parse(page.canvasJSON);
          } catch (err) {
            errors.push(`Page at index ${index} (ID: ${page.id}) has invalid canvasJSON: ${err.message}`);
            if (autoRepair && repairedDocument && repairedDocument.pages && repairedDocument.pages[index]) {
              repairedDocument.pages[index].canvasJSON = JSON.stringify({ objects: [], background: 'white' });
              warnings.push(`Auto-repaired: Replaced invalid canvasJSON for page at index ${index} (ID: ${page.id})`);
              logger.warn(LOG_MODULES.DOCUMENT, `Auto-repaired: Replaced invalid canvasJSON for page at index ${index} (ID: ${page.id})`);
            }
          }
        }
        
        // Check overrides
        if (!page.overrides || typeof page.overrides !== 'object') {
          errors.push(`Page at index ${index} (ID: ${page.id}) has missing or invalid overrides`);
          if (autoRepair && repairedDocument && repairedDocument.pages && repairedDocument.pages[index]) {
            repairedDocument.pages[index].overrides = {};
            warnings.push(`Auto-repaired: Created empty overrides object for page at index ${index} (ID: ${page.id})`);
            logger.warn(LOG_MODULES.DOCUMENT, `Auto-repaired: Created empty overrides object for page at index ${index} (ID: ${page.id})`);
          }
        }
        
        // Check guides
        if (!page.guides || typeof page.guides !== 'object') {
          errors.push(`Page at index ${index} (ID: ${page.id}) has missing or invalid guides`);
          if (autoRepair && repairedDocument && repairedDocument.pages && repairedDocument.pages[index]) {
            repairedDocument.pages[index].guides = { horizontal: [], vertical: [] };
            warnings.push(`Auto-repaired: Created empty guides for page at index ${index} (ID: ${page.id})`);
            logger.warn(LOG_MODULES.DOCUMENT, `Auto-repaired: Created empty guides for page at index ${index} (ID: ${page.id})`);
          }
        } else {
          if (!Array.isArray(page.guides.horizontal)) {
            errors.push(`Page at index ${index} (ID: ${page.id}) has invalid horizontal guides`);
            if (autoRepair && repairedDocument && repairedDocument.pages && repairedDocument.pages[index]) {
              repairedDocument.pages[index].guides.horizontal = [];
              warnings.push(`Auto-repaired: Created empty horizontal guides array for page at index ${index} (ID: ${page.id})`);
              logger.warn(LOG_MODULES.DOCUMENT, `Auto-repaired: Created empty horizontal guides array for page at index ${index} (ID: ${page.id})`);
            }
          }
          if (!Array.isArray(page.guides.vertical)) {
            errors.push(`Page at index ${index} (ID: ${page.id}) has invalid vertical guides`);
            if (autoRepair && repairedDocument && repairedDocument.pages && repairedDocument.pages[index]) {
              repairedDocument.pages[index].guides.vertical = [];
              warnings.push(`Auto-repaired: Created empty vertical guides array for page at index ${index} (ID: ${page.id})`);
              logger.warn(LOG_MODULES.DOCUMENT, `Auto-repaired: Created empty vertical guides array for page at index ${index} (ID: ${page.id})`);
            }
          }
        }
      });
    }
  }
  
  // Check master pages array
  if (!document.masterPages) {
    errors.push('Document is missing masterPages array');
    if (autoRepair && repairedDocument) {
      repairedDocument.masterPages = [];
      warnings.push('Auto-repaired: Created empty masterPages array');
      logger.warn(LOG_MODULES.DOCUMENT, 'Auto-repaired: Created empty masterPages array');
    }
  } else if (!Array.isArray(document.masterPages)) {
    errors.push('Document masterPages is not an array');
    if (autoRepair && repairedDocument) {
      repairedDocument.masterPages = [];
      warnings.push('Auto-repaired: Converted masterPages to empty array');
      logger.warn(LOG_MODULES.DOCUMENT, 'Auto-repaired: Converted masterPages to empty array');
    }
  } else {
    // Check each master page
    document.masterPages.forEach((masterPage, index) => {
      if (!masterPage) {
        errors.push(`Master page at index ${index} is null or undefined`);
        if (autoRepair && repairedDocument && repairedDocument.masterPages) {
          // Remove null master pages
          repairedDocument.masterPages = repairedDocument.masterPages.filter(Boolean);
          warnings.push(`Auto-repaired: Removed null/undefined master page at index ${index}`);
          logger.warn(LOG_MODULES.DOCUMENT, `Auto-repaired: Removed null/undefined master page at index ${index}`);
        }
        return;
      }
      
      if (!masterPage.id) {
        errors.push(`Master page at index ${index} is missing required ID field`);
        if (autoRepair && repairedDocument && repairedDocument.masterPages && repairedDocument.masterPages[index]) {
          repairedDocument.masterPages[index].id = `master-${Date.now()}-${index}`;
          warnings.push(`Auto-repaired: Generated ID for master page at index ${index}`);
          logger.warn(LOG_MODULES.DOCUMENT, `Auto-repaired: Generated ID for master page at index ${index}`);
        }
      }
      
      if (!masterPage.name) {
        errors.push(`Master page at index ${index} (ID: ${masterPage.id}) is missing required name field`);
        if (autoRepair && repairedDocument && repairedDocument.masterPages && repairedDocument.masterPages[index]) {
          repairedDocument.masterPages[index].name = `Master Page ${index + 1}`;
          warnings.push(`Auto-repaired: Generated name for master page at index ${index}`);
          logger.warn(LOG_MODULES.DOCUMENT, `Auto-repaired: Generated name for master page at index ${index}`);
        }
      }
      
      // Check master page canvasJSON
      if (masterPage.canvasJSON === undefined) {
        errors.push(`Master page at index ${index} (ID: ${masterPage.id}) has undefined canvasJSON`);
        if (autoRepair && repairedDocument && repairedDocument.masterPages && repairedDocument.masterPages[index]) {
          repairedDocument.masterPages[index].canvasJSON = JSON.stringify({ objects: [], background: 'white' });
          warnings.push(`Auto-repaired: Created empty canvasJSON for master page at index ${index} (ID: ${masterPage.id})`);
          logger.warn(LOG_MODULES.DOCUMENT, `Auto-repaired: Created empty canvasJSON for master page at index ${index} (ID: ${masterPage.id})`);
        }
      } else if (masterPage.canvasJSON !== null && typeof masterPage.canvasJSON === 'string') {
        try {
          // Validate JSON syntax
          JSON.parse(masterPage.canvasJSON);
        } catch (err) {
          errors.push(`Master page at index ${index} (ID: ${masterPage.id}) has invalid canvasJSON: ${err.message}`);
          if (autoRepair && repairedDocument && repairedDocument.masterPages && repairedDocument.masterPages[index]) {
            repairedDocument.masterPages[index].canvasJSON = JSON.stringify({ objects: [], background: 'white' });
            warnings.push(`Auto-repaired: Replaced invalid canvasJSON for master page at index ${index} (ID: ${masterPage.id})`);
            logger.warn(LOG_MODULES.DOCUMENT, `Auto-repaired: Replaced invalid canvasJSON for master page at index ${index} (ID: ${masterPage.id})`);
          }
        }
      }
    });
  }
  
  // Check metadata structure
  if (!document.metadata || typeof document.metadata !== 'object') {
    errors.push('Document is missing metadata object');
    if (autoRepair && repairedDocument) {
      repairedDocument.metadata = JSON.parse(JSON.stringify(DEFAULT_DOCUMENT.metadata));
      warnings.push('Auto-repaired: Created default metadata object');
      logger.warn(LOG_MODULES.DOCUMENT, 'Auto-repaired: Created default metadata object');
    }
  } else {
    // Check page size
    if (!document.metadata.pageSize || typeof document.metadata.pageSize !== 'object') {
      errors.push('Document metadata is missing pageSize');
      if (autoRepair && repairedDocument && repairedDocument.metadata) {
        repairedDocument.metadata.pageSize = { width: 210, height: 297 };
        warnings.push('Auto-repaired: Created default pageSize (A4)');
        logger.warn(LOG_MODULES.DOCUMENT, 'Auto-repaired: Created default pageSize (A4)');
      }
    } else {
      if (typeof document.metadata.pageSize.width !== 'number') {
        errors.push('Document pageSize has invalid or missing width');
        if (autoRepair && repairedDocument && repairedDocument.metadata && repairedDocument.metadata.pageSize) {
          repairedDocument.metadata.pageSize.width = 210;
          warnings.push('Auto-repaired: Set default page width (210mm)');
          logger.warn(LOG_MODULES.DOCUMENT, 'Auto-repaired: Set default page width (210mm)');
        }
      }
      if (typeof document.metadata.pageSize.height !== 'number') {
        errors.push('Document pageSize has invalid or missing height');
        if (autoRepair && repairedDocument && repairedDocument.metadata && repairedDocument.metadata.pageSize) {
          repairedDocument.metadata.pageSize.height = 297;
          warnings.push('Auto-repaired: Set default page height (297mm)');
          logger.warn(LOG_MODULES.DOCUMENT, 'Auto-repaired: Set default page height (297mm)');
        }
      }
    }
    
    // Check margins
    if (!document.metadata.margins || typeof document.metadata.margins !== 'object') {
      errors.push('Document metadata is missing margins');
      if (autoRepair && repairedDocument && repairedDocument.metadata) {
        repairedDocument.metadata.margins = { top: 20, right: 20, bottom: 20, left: 20 };
        warnings.push('Auto-repaired: Created default margins');
        logger.warn(LOG_MODULES.DOCUMENT, 'Auto-repaired: Created default margins');
      }
    }
    
    // Check grid
    if (!document.metadata.grid || typeof document.metadata.grid !== 'object') {
      errors.push('Document metadata is missing grid settings');
      if (autoRepair && repairedDocument && repairedDocument.metadata) {
        repairedDocument.metadata.grid = DEFAULT_DOCUMENT.metadata.grid;
        warnings.push('Auto-repaired: Created default grid settings');
        logger.warn(LOG_MODULES.DOCUMENT, 'Auto-repaired: Created default grid settings');
      }
    }
    
    // Check rulers
    if (!document.metadata.rulers || typeof document.metadata.rulers !== 'object') {
      errors.push('Document metadata is missing rulers settings');
      if (autoRepair && repairedDocument && repairedDocument.metadata) {
        repairedDocument.metadata.rulers = DEFAULT_DOCUMENT.metadata.rulers;
        warnings.push('Auto-repaired: Created default rulers settings');
        logger.warn(LOG_MODULES.DOCUMENT, 'Auto-repaired: Created default rulers settings');
      }
    }
  }
  
  // Check styles object
  if (!document.styles || typeof document.styles !== 'object') {
    errors.push('Document is missing styles object');
    if (autoRepair && repairedDocument) {
      repairedDocument.styles = JSON.parse(JSON.stringify(DEFAULT_DOCUMENT.styles));
      warnings.push('Auto-repaired: Created default styles object');
      logger.warn(LOG_MODULES.DOCUMENT, 'Auto-repaired: Created default styles object');
    }
  }
  
  // Log validation summary
  if (errors.length > 0) {
    logger.warn(LOG_MODULES.DOCUMENT, `Document validation found ${errors.length} errors`, { errors });
    
    if (autoRepair) {
      logger.info(LOG_MODULES.DOCUMENT, `Auto-repaired ${warnings.length} issues`, { warnings });
    }
  } else {
    logger.debug(LOG_MODULES.DOCUMENT, 'Document validation successful');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    repairedDocument: autoRepair ? repairedDocument : null
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
 * Default canvas JSON structure to use for empty or invalid canvas data
 */
const DEFAULT_CANVAS_JSON = {
  version: "4.6.0",
  objects: [],
  background: "white"
};

/**
 * Ensure canvas JSON has the required fields and structure
 * @param {Object|string} json - Canvas JSON data (object or string)
 * @param {boolean} autoRepair - Whether to automatically repair issues
 * @returns {Object} Validation result {valid: boolean, repaired: boolean, canvasJSON: string, data: Object, errors: Array<string>}
 */
export function validateCanvasJson(json, autoRepair = true) {
  // Initialize return values
  const result = {
    valid: false,
    repaired: false,
    canvasJSON: null,
    data: null,
    errors: []
  };
  
  // Handle different input types
  if (typeof json === 'string') {
    // Parse JSON string
    const parseResult = validateJsonString(json);
    if (!parseResult.valid) {
      result.errors.push(`Invalid JSON string: ${parseResult.error}`);
      logger.warn(LOG_MODULES.DOCUMENT, `Invalid canvas JSON string: ${parseResult.error}`);
      
      if (autoRepair) {
        result.repaired = true;
        result.canvasJSON = JSON.stringify(DEFAULT_CANVAS_JSON);
        result.data = { ...DEFAULT_CANVAS_JSON };
        logger.info(LOG_MODULES.DOCUMENT, 'Created default canvas JSON for invalid string');
      }
      
      return result;
    }
    
    result.data = parseResult.data;
  } else if (json === null || json === undefined) {
    // Null/undefined input
    result.errors.push(`Canvas JSON is ${json === null ? 'null' : 'undefined'}`);
    logger.warn(LOG_MODULES.DOCUMENT, `Canvas JSON is ${json === null ? 'null' : 'undefined'}`);
    
    if (autoRepair) {
      result.repaired = true;
      result.canvasJSON = JSON.stringify(DEFAULT_CANVAS_JSON);
      result.data = { ...DEFAULT_CANVAS_JSON };
      logger.info(LOG_MODULES.DOCUMENT, `Created default canvas JSON for ${json === null ? 'null' : 'undefined'} input`);
    }
    
    return result;
  } else if (typeof json === 'object') {
    // Object input (already parsed)
    result.data = json;
  } else {
    // Invalid type
    result.errors.push(`Invalid canvas JSON type: ${typeof json}`);
    logger.warn(LOG_MODULES.DOCUMENT, `Invalid canvas JSON type: ${typeof json}`);
    
    if (autoRepair) {
      result.repaired = true;
      result.canvasJSON = JSON.stringify(DEFAULT_CANVAS_JSON);
      result.data = { ...DEFAULT_CANVAS_JSON };
      logger.info(LOG_MODULES.DOCUMENT, `Created default canvas JSON for invalid type: ${typeof json}`);
    }
    
    return result;
  }
  
  // At this point, we have a data object to validate
  // Perform structure validation
  let isDataValid = true;
  let isDataRepaired = false;
  
  // Check fabric.js version (optional)
  if (!result.data.version) {
    result.data.version = "4.6.0";
    isDataRepaired = true;
    logger.debug(LOG_MODULES.DOCUMENT, 'Added missing version to canvas JSON');
  }
  
  // Validate objects array
  if (!result.data.objects) {
    result.errors.push('Canvas JSON missing objects array');
    isDataValid = false;
    
    if (autoRepair) {
      result.data.objects = [];
      isDataRepaired = true;
      logger.info(LOG_MODULES.DOCUMENT, 'Created empty objects array for canvas JSON');
    }
  } else if (!Array.isArray(result.data.objects)) {
    result.errors.push('Canvas JSON objects is not an array');
    isDataValid = false;
    
    if (autoRepair) {
      result.data.objects = [];
      isDataRepaired = true;
      logger.info(LOG_MODULES.DOCUMENT, 'Replaced invalid objects property with empty array');
    }
  } else {
    // Validate each object in the array
    const validObjects = [];
    let objectsRepaired = false;
    
    result.data.objects.forEach((obj, index) => {
      if (!obj || typeof obj !== 'object') {
        result.errors.push(`Invalid object at index ${index}`);
        objectsRepaired = true;
        logger.warn(LOG_MODULES.DOCUMENT, `Removed invalid object at index ${index}`);
        return; // Skip this object
      }
      
      // Check for required object properties
      if (!obj.type) {
        result.errors.push(`Object at index ${index} missing type property`);
        objectsRepaired = true;
        logger.warn(LOG_MODULES.DOCUMENT, `Removed object at index ${index} due to missing type`);
        return; // Skip this object
      }
      
      // Check object position (required for placement)
      let objRepaired = false;
      if (typeof obj.left !== 'number') {
        obj.left = 0;
        objRepaired = true;
      }
      
      if (typeof obj.top !== 'number') {
        obj.top = 0;
        objRepaired = true;
      }
      
      // ID property (important for many operations)
      if (!obj.id) {
        obj.id = `obj-${Date.now()}-${index}`;
        objRepaired = true;
      }
      
      // Check for required fabric.js properties based on object type
      switch (obj.type) {
        case 'text':
          // Text objects require text content
          if (!obj.text) {
            obj.text = 'Text content';
            objRepaired = true;
            logger.debug(LOG_MODULES.DOCUMENT, `Added default text content for text object at index ${index}`);
          }
          // Font family and size are critical for text rendering
          if (!obj.fontFamily) {
            obj.fontFamily = 'Arial';
            objRepaired = true;
          }
          if (typeof obj.fontSize !== 'number') {
            obj.fontSize = 16;
            objRepaired = true;
          }
          break;
          
        case 'image':
          // Image objects require src
          if (!obj.src) {
            result.errors.push(`Image object at index ${index} missing src property`);
            // We can't repair missing image sources effectively
            // Will need to use a placeholder or remove the object
            objRepaired = true;
            logger.warn(LOG_MODULES.DOCUMENT, `Image object at index ${index} missing src - will be removed`);
            return; // Skip this object
          }
          break;
          
        case 'rect':
        case 'circle':
        case 'polygon':
        case 'path':
          // Shape objects require dimensions
          if (typeof obj.width !== 'number') {
            obj.width = 100;
            objRepaired = true;
          }
          if (typeof obj.height !== 'number') {
            obj.height = 100;
            objRepaired = true;
          }
          // Ensure fill property exists
          if (obj.fill === undefined) {
            obj.fill = obj.type === 'rect' ? '#f0f0f0' : '#000000';
            objRepaired = true;
          }
          break;
          
        case 'group':
          // Groups should have objects array
          if (!Array.isArray(obj.objects)) {
            obj.objects = [];
            objRepaired = true;
            logger.debug(LOG_MODULES.DOCUMENT, `Created empty objects array for group at index ${index}`);
          } else {
            // Validate each object in the group (without recursion to avoid complexity)
            // Just check if objects exist and have required type property
            obj.objects = obj.objects.filter(groupObj => {
              if (!groupObj || typeof groupObj !== 'object' || !groupObj.type) {
                objRepaired = true;
                logger.debug(LOG_MODULES.DOCUMENT, `Removed invalid object from group at index ${index}`);
                return false;
              }
              return true;
            });
          }
          break;
      }
      
      // Repair common properties that should exist for all object types
      if (obj.angle === undefined) {
        obj.angle = 0;
        objRepaired = true;
      }
      
      if (obj.scaleX === undefined) {
        obj.scaleX = 1;
        objRepaired = true;
      }
      
      if (obj.scaleY === undefined) {
        obj.scaleY = 1;
        objRepaired = true;
      }
      
      if (obj.opacity === undefined) {
        obj.opacity = 1;
        objRepaired = true;
      }
      
      // Add custom properties needed by the editor
      if (obj.fromMaster === undefined && obj.masterId) {
        obj.fromMaster = true;
        objRepaired = true;
      }
      
      // Add the valid object to our array
      validObjects.push(obj);
      
      if (objRepaired) {
        objectsRepaired = true;
        logger.debug(LOG_MODULES.DOCUMENT, `Repaired properties for ${obj.type} object at index ${index}`);
      }
    });
    
    if (objectsRepaired) {
      result.data.objects = validObjects;
      isDataRepaired = true;
    }
  }
  
  // Validate background
  if (!result.data.background) {
    result.data.background = 'white';
    isDataRepaired = true;
    logger.debug(LOG_MODULES.DOCUMENT, 'Added default white background to canvas JSON');
  }
  
  // Check for other optional but useful fabric.js properties
  if (result.data.defaultCursor === undefined) {
    result.data.defaultCursor = 'default';
    isDataRepaired = true;
  }
  
  // Update result based on validation
  result.valid = isDataValid;
  result.repaired = isDataRepaired;
  result.canvasJSON = JSON.stringify(result.data);
  
  if (isDataRepaired) {
    logger.info(LOG_MODULES.DOCUMENT, 'Canvas JSON repaired with validation fixes');
  }
  
  // For backward compatibility when autoRepair=true, return the JSON string directly
  // This matches the behavior of the previous function
  if (autoRepair) {
    return result.canvasJSON;
  }
  
  return result;
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