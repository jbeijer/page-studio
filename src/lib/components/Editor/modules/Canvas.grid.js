/**
 * Canvas.grid.js
 * Manages grid rendering functionality for the Canvas component
 * 
 * This module provides grid-related functionality using SVG for pixel-perfect alignment.
 */
import { browser } from '$app/environment';

/**
 * Creates SVG element with appropriate namespace
 * @param {string} elementName - SVG element type to create
 * @param {Object} attributes - Key-value pairs of attributes to set
 * @returns {SVGElement} The created SVG element
 */
function createSvgElement(elementName, attributes = {}) {
  if (!browser) return null;
  
  const element = document.createElementNS('http://www.w3.org/2000/svg', elementName);
  
  // Set all attributes
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  
  return element;
}

/**
 * Creates an SVG line with standard attributes 
 * @param {Object} params - Line parameters
 * @returns {SVGLineElement} The created SVG line
 */
function createSvgLine({x1, y1, x2, y2, color, opacity}) {
  return createSvgElement('line', {
    x1, y1, x2, y2,
    stroke: color,
    'stroke-width': '1',
    'stroke-opacity': opacity
  });
}

/**
 * Creates a pattern element for grid rendering
 * @param {Object} params - Pattern parameters
 * @returns {SVGPatternElement} Created pattern with lines
 */
function createGridPattern({id, size, color, opacity}) {
  const pattern = createSvgElement('pattern', {
    id,
    width: size,
    height: size,
    patternUnits: 'userSpaceOnUse'
  });
  
  // Create horizontal line
  const horizLine = createSvgLine({
    x1: '0', y1: '0',
    x2: size, y2: '0',
    color, opacity
  });
  
  // Create vertical line
  const vertLine = createSvgLine({
    x1: '0', y1: '0',
    x2: '0', y2: size,
    color, opacity
  });
  
  pattern.appendChild(horizLine);
  pattern.appendChild(vertLine);
  
  return pattern;
}

/**
 * Creates the grid overlay element
 * @param {Object} params - Grid configuration
 * @returns {HTMLDivElement} Created grid overlay element
 */
function createGridOverlay({canvasElement, width, height, containerRect, canvasRect, debug = false}) {
  if (!browser) return null;
  
  // Calculate offset between canvas and container (for pixel-perfect positioning)
  const offsetLeft = canvasRect.left - containerRect.left;
  const offsetTop = canvasRect.top - containerRect.top;
  
  // Create the overlay container
  const gridOverlay = document.createElement('div');
  gridOverlay.id = 'canvas-grid-overlay';
  
  // Apply pixel-perfect positioning
  gridOverlay.style.cssText = `
    position: absolute;
    top: ${Math.floor(offsetTop)}px;
    left: ${Math.floor(offsetLeft)}px;
    width: ${Math.floor(width)}px;
    height: ${Math.floor(height)}px;
    pointer-events: none;
    z-index: 10;
    background-color: transparent;
    transform-origin: 0 0;
    transform: translateZ(0);
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    will-change: transform;
  `;
  
  // Add debug borders if needed
  if (debug) {
    gridOverlay.style.border = '1px solid red';
    canvasElement.style.border = '1px solid blue';
  }
  
  return gridOverlay;
}

/**
 * Create grid management functions for the Canvas component
 * @param {Object} context - Canvas context with shared references and methods
 * @returns {Object} Grid management functions
 */
export function createGridManagement(context) {
  /**
   * Render grid using SVG for pixel-perfect alignment
   * @returns {void}
   */
  function renderGrid() {
    // Get required objects from context
    const canvas = context.canvas;
    const canvasElement = context.canvasElement;
    const isMounted = context.isMounted;
    const width = context.width;
    const height = context.height;
    const currentDocument = context.get ? context.get('currentDocument') : context.currentDocument;
    const convertToPixels = context.convertToPixels;
    
    // Bail out early if not mounted, no canvas, or server-side
    if (!isMounted || !canvas || !browser) {
      return;
    }
    
    // Remove any existing grid overlay
    const existingOverlayGrid = document.getElementById('canvas-grid-overlay');
    if (existingOverlayGrid) {
      existingOverlayGrid.remove();
    }
    
    // Remove old grid objects from canvas
    const existingGridLines = canvas.getObjects().filter(obj => obj.gridElement);
    existingGridLines.forEach(line => canvas.remove(line));
    
    // Check if grid is enabled
    if (!currentDocument?.metadata?.grid?.enabled) {
      canvas.renderAll();
      return;
    }
    
    const { size, color, opacity, subdivisions, units = 'mm' } = currentDocument.metadata.grid;
    
    // Calculate grid size in pixels - using integer pixels
    let gridSize;
    if (convertToPixels) {
      // Convert grid size from document units to pixels using our utility function
      // Math.floor instead of Math.round for exact pixel positioning
      gridSize = Math.max(10, Math.floor(convertToPixels(size, units)));
    } else {
      // Fallback conversion
      const pxPerMm = 3.78; // Approximate conversion at 96 DPI
      gridSize = Math.max(10, Math.floor(size * pxPerMm));
    }
    
    // Calculate subdivision size - also with integer pixels
    const subSize = Math.max(1, Math.floor(gridSize / subdivisions));
    
    // Find canvas container
    const canvasContainer = canvasElement.parentElement;
    if (!canvasContainer) {
      console.error('Could not find canvas container');
      return;
    }
    
    // Ensure container has proper positioning
    canvasContainer.style.position = 'relative';
    
    // Get exact dimensions
    const canvasWidth = Math.floor(width);
    const canvasHeight = Math.floor(height);
    
    // Get element positions for perfect alignment
    const canvasRect = canvasElement.getBoundingClientRect();
    const containerRect = canvasContainer.getBoundingClientRect();
    
    // Create the grid overlay element
    const gridOverlay = createGridOverlay({
      canvasElement,
      width: canvasWidth,
      height: canvasHeight,
      containerRect,
      canvasRect,
      debug: window.DEBUG_GRID_ALIGNMENT
    });
    
    // Create SVG element
    const svg = createSvgElement('svg', {
      width: canvasWidth,
      height: canvasHeight,
      xmlns: 'http://www.w3.org/2000/svg'
    });
    
    // Apply styles
    Object.assign(svg.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      overflow: 'visible',
      pointerEvents: 'none'
    });
    
    // Create main grid pattern
    const mainPattern = createGridPattern({
      id: 'mainGrid',
      size: gridSize,
      color,
      opacity
    });
    
    svg.appendChild(mainPattern);
    
    // Create subdivision pattern if needed
    if (subdivisions > 1 && subSize > 1) {
      const subPattern = createGridPattern({
        id: 'subGrid',
        size: subSize,
        color,
        opacity: opacity * 0.5
      });
      
      svg.appendChild(subPattern);
      
      // Add subdivisions rectangle
      const subRect = createSvgElement('rect', {
        width: '100%',
        height: '100%',
        fill: 'url(#subGrid)'
      });
      
      svg.appendChild(subRect);
    }
    
    // Add main grid rectangle
    const mainRect = createSvgElement('rect', {
      width: '100%',
      height: '100%',
      fill: 'url(#mainGrid)'
    });
    
    svg.appendChild(mainRect);
    
    // Add SVG to overlay and overlay to container
    gridOverlay.appendChild(svg);
    canvasContainer.appendChild(gridOverlay);
    
    // Output debug info if enabled
    if (window.DEBUG_GRID_ALIGNMENT) {
      console.log('Canvas rect:', canvasRect);
      console.log('Container rect:', containerRect);
      console.log('Grid size:', gridSize);
      console.log('Sub size:', subSize);
    }
    
    // Render canvas
    canvas.renderAll();
  }
  
  /**
   * Toggle grid visibility
   * @param {boolean} show - Whether to show or hide the grid
   * @returns {boolean} Success status
   */
  function toggleGrid(show) {
    const doc = context.get ? context.get('currentDocument') : context.currentDocument;
    
    if (!doc) {
      console.warn('Cannot toggle grid: No document available');
      return false;
    }
    
    // Clone the current document to update it
    const updatedDoc = {...doc};
    
    // Ensure the metadata structure exists
    if (!updatedDoc.metadata) updatedDoc.metadata = {};
    if (!updatedDoc.metadata.grid) {
      updatedDoc.metadata.grid = {
        enabled: false,
        size: 10,
        color: '#cccccc',
        opacity: 0.5,
        subdivisions: 2,
        units: 'mm'
      };
    }
    
    // Update the grid enabled setting
    updatedDoc.metadata.grid.enabled = show;
    
    // Update the store
    if (context.currentDocument && context.currentDocument.set) {
      context.currentDocument.set(updatedDoc);
      
      // Re-render the grid
      renderGrid();
      return true;
    }
    
    return false;
  }
  
  /**
   * Update grid properties
   * @param {Object} properties - Grid properties to update
   * @returns {boolean} Success status
   */
  function updateGridProperties(properties) {
    const doc = context.get ? context.get('currentDocument') : context.currentDocument;
    
    if (!doc) {
      console.warn('Cannot update grid: No document available');
      return false;
    }
    
    // Clone the current document to update it
    const updatedDoc = {...doc};
    
    // Ensure the metadata structure exists
    if (!updatedDoc.metadata) updatedDoc.metadata = {};
    if (!updatedDoc.metadata.grid) {
      updatedDoc.metadata.grid = {
        enabled: false,
        size: 10,
        color: '#cccccc',
        opacity: 0.5,
        subdivisions: 2,
        units: 'mm'
      };
    }
    
    // Update the grid properties
    updatedDoc.metadata.grid = {
      ...updatedDoc.metadata.grid,
      ...properties
    };
    
    // Update the store
    if (context.currentDocument && context.currentDocument.set) {
      context.currentDocument.set(updatedDoc);
      
      // Re-render the grid
      renderGrid();
      return true;
    }
    
    return false;
  }
  
  return {
    renderGrid,
    toggleGrid,
    updateGridProperties
  };
}