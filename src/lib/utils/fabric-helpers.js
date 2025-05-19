/**
 * Fabric.js Helper Utilities
 * Utilities for working with Fabric.js 5.x
 */
import { fabric } from 'fabric';

/**
 * Get the current Fabric.js version
 * @returns {string} The Fabric.js version
 */
export function getFabricVersion() {
  return fabric.version || '5.x';
}

/**
 * Create a text object using the most appropriate Fabric.js text class
 * @param {string} text - The text content
 * @param {Object} options - Text object options
 * @returns {Object} A Fabric.js text object
 */
export function createTextObject(text, options) {
  try {
    // Prefer Textbox for editable, multi-line text with wrapping
    return new fabric.Textbox(text, options);
  } catch (error) {
    console.warn("Error creating Textbox, falling back to IText:", error.message);
    
    try {
      // IText for interactive, editable text
      return new fabric.IText(text, options);
    } catch (error) {
      console.warn("Error creating IText, falling back to basic Text:", error.message);
      
      // Basic Text as last resort
      return new fabric.Text(text, options);
    }
  }
}

/**
 * Creates a fabric Canvas instance
 * @param {HTMLElement} element - The canvas element
 * @param {Object} options - Canvas options
 * @returns {Object} The fabric Canvas instance
 */
export function createCanvas(element, options = {}) {
  try {
    // For rendering optimization, set objectCaching by default
    const defaultOptions = { 
      objectCaching: true,
      enableRetinaScaling: true,
      renderOnAddRemove: false, // Better performance with manual rendering
      ...options
    };
    
    return new fabric.Canvas(element, defaultOptions);
  } catch (error) {
    console.error("Failed to create Canvas:", error);
    
    // Try StaticCanvas as fallback for non-interactive canvases
    console.warn("Attempting to create StaticCanvas as fallback");
    return new fabric.StaticCanvas(element, options);
  }
}

/**
 * Create a shadow object
 * @param {Object} options - Shadow options
 * @returns {Object} A Fabric.js Shadow object
 */
export function createShadow(options) {
  return new fabric.Shadow(options);
}

/**
 * Set viewport transform with proper coordinates
 * @param {Object} canvas - The Fabric.js canvas instance
 * @param {number} zoom - Zoom level
 * @param {number} panX - Pan X position
 * @param {number} panY - Pan Y position
 */
export function setViewportTransform(canvas, zoom, panX, panY) {
  canvas.setViewportTransform([zoom, 0, 0, zoom, panX, panY]);
}

/**
 * Find the scale to fit content in a container
 * @param {Object} objectSize - The object dimensions {width, height}
 * @param {Object} containerSize - The container dimensions {width, height}
 * @returns {number} The scale factor to fit the object in the container
 */
export function findScaleToFit(objectSize, containerSize) {
  return fabric.util.findScaleToFit(objectSize, containerSize);
}

/**
 * Transform a point using a transformation matrix
 * @param {Object} point - The point to transform {x, y}
 * @param {Array} transformMatrix - The transformation matrix
 * @returns {Object} The transformed point {x, y}
 */
export function transformPoint(point, transformMatrix) {
  return fabric.util.transformPoint(point, transformMatrix);
}

export default {
  getFabricVersion,
  createTextObject,
  createCanvas,
  createShadow,
  setViewportTransform,
  findScaleToFit,
  transformPoint
};