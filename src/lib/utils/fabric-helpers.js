/**
 * Fabric.js Helper Utilities
 * Provides compatibility functions for working with different versions of fabric.js
 */
import * as fabricModule from 'fabric';

// Handle different module export patterns
const fabric = fabricModule.fabric || fabricModule.default || fabricModule;

/**
 * Detect which version of fabric.js is being used
 * @returns {string} A string representing the version range ("5.x" or "6.x")
 */
export function detectFabricVersion() {
  if (!fabric) return "unknown";
  
  // Fabric 6.x will have specific features
  const isV6 = typeof fabric.version === 'string' && fabric.version.startsWith('6');
  
  // Default to 5.x
  return isV6 ? "6.x" : "5.x";
}

/**
 * Get text object factory based on current fabric version
 * @returns {Function} A function that can create text objects
 */
export function getTextObjectFactory() {
  // Check what text classes are available
  const hasTextbox = !!fabric.Textbox;
  const hasIText = !!fabric.IText;
  const hasText = !!fabric.Text;
  
  console.log("Fabric helper: Available text classes:", {
    Textbox: hasTextbox,
    IText: hasIText,
    Text: hasText
  });
  
  // Choose the best available text class
  if (hasTextbox) {
    return (text, options) => new fabric.Textbox(text, options);
  } else if (hasIText) {
    return (text, options) => new fabric.IText(text, options);
  } else if (hasText) {
    return (text, options) => new fabric.Text(text, options);
  } else {
    console.error("ERROR: No suitable text class found in fabric.js");
    return null;
  }
}

/**
 * Creates a fabric Canvas instance
 * @param {HTMLElement} element - The canvas element
 * @param {Object} options - Canvas options
 * @returns {Object} The fabric Canvas instance
 */
export function createCanvas(element, options) {
  try {
    return new fabric.Canvas(element, options);
  } catch (error) {
    console.error("Failed to create Canvas:", error);
    
    // Try alternative initialization
    const version = detectFabricVersion();
    console.log("Attempting alternative canvas initialization for fabric version", version);
    
    // Try initialize with StaticCanvas as fallback
    if (fabric.StaticCanvas) {
      console.log("Using StaticCanvas as fallback");
      return new fabric.StaticCanvas(element, options);
    }
    
    throw error;
  }
}

export default {
  detectFabricVersion,
  getTextObjectFactory,
  createCanvas
};