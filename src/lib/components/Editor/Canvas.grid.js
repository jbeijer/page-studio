/**
 * Grid rendering utilities for Canvas component
 * @module Canvas.grid
 */

import { browser } from '$app/environment';

/**
 * Creates SVG element with appropriate namespace
 * @param {string} elementName - SVG element type to create
 * @param {Object} attributes - Key-value pairs of attributes to set
 * @returns {SVGElement} The created SVG element
 */
function createSvgElement(elementName, attributes = {}) {
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
 * @param {number} params.x1 - Starting x coordinate
 * @param {number} params.y1 - Starting y coordinate
 * @param {number} params.x2 - Ending x coordinate
 * @param {number} params.y2 - Ending y coordinate 
 * @param {string} params.color - Line color
 * @param {number} params.opacity - Opacity value (0-1) 
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
 * @param {string} params.id - Pattern ID
 * @param {number} params.size - Pattern size
 * @param {string} params.color - Line color
 * @param {number} params.opacity - Opacity value
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
 * @param {HTMLElement} params.canvasElement - The canvas element
 * @param {number} params.width - Canvas width
 * @param {number} params.height - Canvas height
 * @param {Object} params.containerRect - Canvas container bounding rect
 * @param {Object} params.canvasRect - Canvas bounding rect
 * @param {boolean} [params.debug=false] - Enable debug visual helpers
 * @returns {HTMLDivElement} Created grid overlay element
 */
function createGridOverlay({canvasElement, width, height, containerRect, canvasRect, debug = false}) {
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
 * Render grid using SVG for pixel-perfect alignment
 * @param {Object} params - Configuration
 * @param {Object} params.canvas - Fabric.js canvas
 * @param {HTMLElement} params.canvasElement - Canvas DOM element
 * @param {boolean} params.isMounted - Component mount status
 * @param {number} params.width - Canvas width
 * @param {number} params.height - Canvas height
 * @param {Object} params.currentDocument - Current document data
 * @param {Function} params.convertToPixels - Unit conversion function
 * @returns {void}
 */
export function renderGrid({
  canvas, 
  canvasElement, 
  isMounted, 
  width, 
  height, 
  currentDocument, 
  convertToPixels
}) {
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