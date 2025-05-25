/**
 * GridService.js
 * Centralized service for grid management in PageStudio
 * 
 * This service handles all grid-related functionality including:
 * - Rendering SVG grid overlays
 * - Managing grid visibility and properties
 * - Providing grid snap functionality
 */
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { currentDocument } from '$lib/stores/document';
import documentService from './DocumentService';

class GridService {
  constructor() {
    // Core properties
    this.canvas = null;
    this.canvasElement = null;
    this.canvasWidth = 1240;
    this.canvasHeight = 1754;
    this.initialized = false;
    this.pxPerMm = 3.78; // Approximate conversion at 96 DPI
    
    // Bind methods to ensure consistent 'this' context
    this.initialize = this.initialize.bind(this);
    this.renderGrid = this.renderGrid.bind(this);
    this.toggleGrid = this.toggleGrid.bind(this);
    this.updateGridProperties = this.updateGridProperties.bind(this);
    this.getGridSize = this.getGridSize.bind(this);
    this.snapToGrid = this.snapToGrid.bind(this);
    this.convertToPixels = this.convertToPixels.bind(this);
    this.cleanup = this.cleanup.bind(this);
    
    // Private methods
    this._createSvgElement = this._createSvgElement.bind(this);
    this._createSvgLine = this._createSvgLine.bind(this);
    this._createGridPattern = this._createGridPattern.bind(this);
    this._createGridOverlay = this._createGridOverlay.bind(this);
  }

  /**
   * Initialize the grid service
   * @param {Object} options - Initialization options
   * @returns {GridService} This service instance for chaining
   */
  initialize(options = {}) {
    console.log('GridService: Initializing');
    
    this.canvas = options.canvas || null;
    this.canvasElement = options.canvasElement || null;
    this.canvasWidth = options.width || 1240;
    this.canvasHeight = options.height || 1754;
    
    // Use custom conversion factor if provided
    if (options.pxPerMm) {
      this.pxPerMm = options.pxPerMm;
    }
    
    // Store global reference for emergency access
    if (typeof window !== 'undefined') {
      window.$gridService = this;
    }
    
    this.initialized = true;
    return this;
  }
  
  /**
   * Creates SVG element with appropriate namespace
   * @private
   * @param {string} elementName - SVG element type to create
   * @param {Object} attributes - Key-value pairs of attributes to set
   * @returns {SVGElement} The created SVG element
   */
  _createSvgElement(elementName, attributes = {}) {
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
   * @private
   * @param {Object} params - Line parameters
   * @returns {SVGLineElement} The created SVG line
   */
  _createSvgLine({x1, y1, x2, y2, color, opacity}) {
    return this._createSvgElement('line', {
      x1, y1, x2, y2,
      stroke: color,
      'stroke-width': '1',
      'stroke-opacity': opacity
    });
  }
  
  /**
   * Creates a pattern element for grid rendering
   * @private
   * @param {Object} params - Pattern parameters
   * @returns {SVGPatternElement} Created pattern with lines
   */
  _createGridPattern({id, size, color, opacity}) {
    const pattern = this._createSvgElement('pattern', {
      id,
      width: size,
      height: size,
      patternUnits: 'userSpaceOnUse'
    });
    
    // Create horizontal line
    const horizLine = this._createSvgLine({
      x1: '0', y1: '0',
      x2: size, y2: '0',
      color, opacity
    });
    
    // Create vertical line
    const vertLine = this._createSvgLine({
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
   * @private
   * @param {Object} params - Grid configuration
   * @returns {HTMLDivElement} Created grid overlay element
   */
  _createGridOverlay({canvasElement, width, height, containerRect, canvasRect, debug = false}) {
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
   * Render grid using SVG for pixel-perfect alignment
   * @returns {boolean} Success status
   */
  renderGrid() {
    if (!browser || !this.canvasElement || !this.canvas) {
      console.warn('GridService: Cannot render grid - Missing canvas or running on server');
      return false;
    }
    
    // Remove any existing grid overlay
    const existingOverlayGrid = document.getElementById('canvas-grid-overlay');
    if (existingOverlayGrid) {
      existingOverlayGrid.remove();
    }
    
    // Remove old grid objects from canvas
    const existingGridLines = this.canvas.getObjects().filter(obj => obj.gridElement);
    existingGridLines.forEach(line => this.canvas.remove(line));
    
    // Get current document
    const doc = get(currentDocument);
    
    // Check if grid is enabled
    if (!doc?.metadata?.grid?.enabled) {
      this.canvas.renderAll();
      return true;
    }
    
    const { size, color, opacity, subdivisions = 2, units = 'mm' } = doc.metadata.grid;
    
    // Calculate grid size in pixels - using integer pixels
    const gridSize = Math.max(10, Math.floor(this.convertToPixels(size, units)));
    
    // Calculate subdivision size - also with integer pixels
    const subSize = Math.max(1, Math.floor(gridSize / subdivisions));
    
    // Find canvas container
    const canvasContainer = this.canvasElement.parentElement;
    if (!canvasContainer) {
      console.error('GridService: Could not find canvas container');
      return false;
    }
    
    // Ensure container has proper positioning
    canvasContainer.style.position = 'relative';
    
    // Get exact dimensions
    const canvasWidth = Math.floor(this.canvasWidth);
    const canvasHeight = Math.floor(this.canvasHeight);
    
    // Get element positions for perfect alignment
    const canvasRect = this.canvasElement.getBoundingClientRect();
    const containerRect = canvasContainer.getBoundingClientRect();
    
    // Create the grid overlay element
    const gridOverlay = this._createGridOverlay({
      canvasElement: this.canvasElement,
      width: canvasWidth,
      height: canvasHeight,
      containerRect,
      canvasRect,
      debug: typeof window !== 'undefined' && window.DEBUG_GRID_ALIGNMENT
    });
    
    // Create SVG element
    const svg = this._createSvgElement('svg', {
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
    const mainPattern = this._createGridPattern({
      id: 'mainGrid',
      size: gridSize,
      color,
      opacity
    });
    
    svg.appendChild(mainPattern);
    
    // Create subdivision pattern if needed
    if (subdivisions > 1 && subSize > 1) {
      const subPattern = this._createGridPattern({
        id: 'subGrid',
        size: subSize,
        color,
        opacity: opacity * 0.5
      });
      
      svg.appendChild(subPattern);
      
      // Add subdivisions rectangle
      const subRect = this._createSvgElement('rect', {
        width: '100%',
        height: '100%',
        fill: 'url(#subGrid)'
      });
      
      svg.appendChild(subRect);
    }
    
    // Add main grid rectangle
    const mainRect = this._createSvgElement('rect', {
      width: '100%',
      height: '100%',
      fill: 'url(#mainGrid)'
    });
    
    svg.appendChild(mainRect);
    
    // Add SVG to overlay and overlay to container
    gridOverlay.appendChild(svg);
    canvasContainer.appendChild(gridOverlay);
    
    // Output debug info if enabled
    if (typeof window !== 'undefined' && window.DEBUG_GRID_ALIGNMENT) {
      console.log('Canvas rect:', canvasRect);
      console.log('Container rect:', containerRect);
      console.log('Grid size:', gridSize);
      console.log('Sub size:', subSize);
    }
    
    // Render canvas
    this.canvas.renderAll();
    return true;
  }
  
  /**
   * Toggle grid visibility
   * @param {boolean} show - Whether to show or hide the grid
   * @returns {boolean} Success status
   */
  toggleGrid(show) {
    const doc = get(currentDocument);
    
    if (!doc) {
      console.warn('GridService: Cannot toggle grid - No document available');
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
    
    // Update the document using DocumentService
    documentService.updateDocumentMetadata({ 
      grid: updatedDoc.metadata.grid 
    });
    
    // Re-render the grid
    this.renderGrid();
    return true;
  }
  
  /**
   * Update grid properties
   * @param {Object} properties - Grid properties to update
   * @returns {boolean} Success status
   */
  updateGridProperties(properties) {
    const doc = get(currentDocument);
    
    if (!doc) {
      console.warn('GridService: Cannot update grid - No document available');
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
    const updatedGrid = {
      ...updatedDoc.metadata.grid,
      ...properties
    };
    
    // Update the document using DocumentService
    documentService.updateDocumentMetadata({ 
      grid: updatedGrid 
    });
    
    // Re-render the grid
    this.renderGrid();
    return true;
  }
  
  /**
   * Get the current grid size in pixels
   * @returns {number} Grid size in pixels
   */
  getGridSize() {
    const doc = get(currentDocument);
    
    if (!doc?.metadata?.grid) {
      return 0;
    }
    
    const { size, units = 'mm' } = doc.metadata.grid;
    return this.convertToPixels(size, units);
  }
  
  /**
   * Convert a value from document units to pixels
   * @param {number} value - Value to convert
   * @param {string} units - Unit type ('mm', 'cm', 'in', 'px')
   * @returns {number} Converted value in pixels
   */
  convertToPixels(value, units = 'mm') {
    if (units === 'px') return value;
    
    // Standard conversions
    switch (units) {
      case 'mm':
        return value * this.pxPerMm;
      case 'cm':
        return value * this.pxPerMm * 10;
      case 'in':
        return value * this.pxPerMm * 25.4;
      default:
        return value * this.pxPerMm;
    }
  }
  
  /**
   * Snap a point to the nearest grid intersection
   * @param {Object} point - Point with x,y coordinates
   * @param {boolean} forceSnap - Whether to force snapping even if grid snap is disabled
   * @returns {Object} Snapped point with x,y coordinates
   */
  snapToGrid(point, forceSnap = false) {
    const doc = get(currentDocument);
    
    // Return original point if no document or grid not enabled
    if (!doc?.metadata?.grid) return point;
    
    // Check if grid snap is enabled or forced
    if (!forceSnap && !doc.metadata.grid.snap) return point;
    
    // Get grid size in pixels
    const gridSize = this.getGridSize();
    if (gridSize <= 0) return point;
    
    // Get subdivision size if enabled
    let snapSize = gridSize;
    if (doc.metadata.grid.subdivisions > 1) {
      snapSize = gridSize / doc.metadata.grid.subdivisions;
    }
    
    // Round to nearest grid point
    return {
      x: Math.round(point.x / snapSize) * snapSize,
      y: Math.round(point.y / snapSize) * snapSize
    };
  }
  
  /**
   * Snap object bounds to grid
   * @param {fabric.Object} obj - Fabric.js object to snap
   * @returns {fabric.Object} The snapped object
   */
  snapObjectToGrid(obj) {
    if (!obj || !this.canvas) return obj;
    
    const doc = get(currentDocument);
    
    // Skip if no document or grid not enabled or snap not enabled
    if (!doc?.metadata?.grid || !doc.metadata.grid.snap) return obj;
    
    // Get the grid size
    const gridSize = this.getGridSize();
    if (gridSize <= 0) return obj;
    
    // Get subdivision size if enabled
    let snapSize = gridSize;
    if (doc.metadata.grid.subdivisions > 1) {
      snapSize = gridSize / doc.metadata.grid.subdivisions;
    }
    
    // Snap object position to grid
    const snappedPosition = this.snapToGrid({ 
      x: obj.left, 
      y: obj.top 
    });
    
    // Update object position
    obj.set({
      left: snappedPosition.x,
      top: snappedPosition.y
    });
    
    // For specific object types like rectangles, optionally snap width/height
    if (obj.type === 'rect' || obj.type === 'textbox' || obj.type === 'image') {
      const snappedWidth = Math.round(obj.width / snapSize) * snapSize;
      const snappedHeight = Math.round(obj.height / snapSize) * snapSize;
      
      // Only snap to reasonable values to prevent objects from disappearing
      if (snappedWidth >= snapSize && snappedHeight >= snapSize) {
        obj.set({
          width: snappedWidth,
          height: snappedHeight
        });
      }
    }
    
    // Update object coordinates
    obj.setCoords();
    
    return obj;
  }
  
  /**
   * Clean up resources when component unmounts
   */
  cleanup() {
    console.log('GridService: Cleaning up resources');
    
    // Remove any existing grid overlay
    if (browser) {
      const existingOverlayGrid = document.getElementById('canvas-grid-overlay');
      if (existingOverlayGrid) {
        existingOverlayGrid.remove();
      }
    }
    
    // Remove grid objects from canvas if we have canvas access
    if (this.canvas) {
      const existingGridLines = this.canvas.getObjects().filter(obj => obj.gridElement);
      existingGridLines.forEach(line => this.canvas.remove(line));
    }
    
    // Clear references
    this.canvas = null;
    this.canvasElement = null;
  }
}

// Create singleton instance
const gridService = new GridService();

export default gridService;