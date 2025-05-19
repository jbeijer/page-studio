/**
 * Tests for GridService
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import gridService from './GridService';
import documentService from './DocumentService';
import { get } from 'svelte/store';
import { currentDocument } from '$lib/stores/document';

// Mock the svelte/store module
vi.mock('svelte/store', () => ({
  get: vi.fn(),
  derived: vi.fn(),
  writable: vi.fn()
}));

// Mock DocumentService
vi.mock('./DocumentService', () => ({
  default: {
    updateDocumentMetadata: vi.fn()
  }
}));

// Mock the app/environment browser
vi.mock('$app/environment', () => ({
  browser: true
}));

describe('GridService', () => {
  // Mock elements and canvas
  let mockCanvasElement;
  let mockCanvas;
  let mockContainer;
  
  beforeEach(() => {
    // Setup DOM elements for testing
    mockCanvasElement = document.createElement('canvas');
    mockCanvasElement.width = 800;
    mockCanvasElement.height = 600;
    
    mockContainer = document.createElement('div');
    mockContainer.appendChild(mockCanvasElement);
    document.body.appendChild(mockContainer);
    
    // Mock getBoundingClientRect
    mockCanvasElement.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 10,
      top: 10,
      width: 800,
      height: 600
    });
    
    mockContainer.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 900,
      height: 700
    });
    
    // Create mock canvas object
    mockCanvas = {
      getObjects: vi.fn().mockReturnValue([]),
      remove: vi.fn(),
      renderAll: vi.fn()
    };
    
    // Reset service
    gridService.cleanup();
  });
  
  afterEach(() => {
    // Clean up
    if (mockContainer && mockContainer.parentNode) {
      mockContainer.parentNode.removeChild(mockContainer);
    }
    
    // Reset mocks
    vi.resetAllMocks();
    
    // Reset service
    gridService.cleanup();
  });
  
  it('should initialize with canvas reference', () => {
    // Initialize with canvas and canvas element
    gridService.initialize({
      canvas: mockCanvas,
      canvasElement: mockCanvasElement,
      width: 800,
      height: 600
    });
    
    // Verify service is initialized
    expect(gridService.initialized).toBe(true);
    expect(gridService.canvas).toBe(mockCanvas);
    expect(gridService.canvasElement).toBe(mockCanvasElement);
    expect(gridService.canvasWidth).toBe(800);
    expect(gridService.canvasHeight).toBe(600);
  });
  
  it('should render grid when grid is enabled', () => {
    // Mock document with grid enabled
    const mockDocument = {
      metadata: {
        grid: {
          enabled: true,
          size: 10,
          color: '#cccccc',
          opacity: 0.5,
          subdivisions: 2,
          units: 'mm'
        }
      }
    };
    
    // Set mock to return our document
    get.mockReturnValue(mockDocument);
    
    // Initialize service
    gridService.initialize({
      canvas: mockCanvas,
      canvasElement: mockCanvasElement,
      width: 800,
      height: 600
    });
    
    // Render grid
    const result = gridService.renderGrid();
    
    // Verify grid was rendered
    expect(result).toBe(true);
    
    // Check if a grid overlay exists
    const gridOverlay = document.getElementById('canvas-grid-overlay');
    expect(gridOverlay).toBeTruthy();
    
    // Verify canvas was rendered
    expect(mockCanvas.renderAll).toHaveBeenCalled();
  });
  
  it('should not render grid when grid is disabled', () => {
    // Mock document with grid disabled
    const mockDocument = {
      metadata: {
        grid: {
          enabled: false,
          size: 10,
          color: '#cccccc',
          opacity: 0.5
        }
      }
    };
    
    // Set mock to return our document
    get.mockReturnValue(mockDocument);
    
    // Initialize service
    gridService.initialize({
      canvas: mockCanvas,
      canvasElement: mockCanvasElement,
      width: 800,
      height: 600
    });
    
    // Render grid
    const result = gridService.renderGrid();
    
    // Verify grid was "rendered" (returning true but not creating overlay)
    expect(result).toBe(true);
    
    // Check that no grid overlay exists
    const gridOverlay = document.getElementById('canvas-grid-overlay');
    expect(gridOverlay).toBeFalsy();
    
    // Verify canvas was still rendered
    expect(mockCanvas.renderAll).toHaveBeenCalled();
  });
  
  it('should toggle grid visibility', () => {
    // Mock document
    const mockDocument = {
      metadata: {
        grid: {
          enabled: false,
          size: 10,
          color: '#cccccc',
          opacity: 0.5
        }
      }
    };
    
    // Set mock to return our document
    get.mockReturnValue(mockDocument);
    
    // Initialize service
    gridService.initialize({
      canvas: mockCanvas,
      canvasElement: mockCanvasElement,
      width: 800,
      height: 600
    });
    
    // Toggle grid on
    const result = gridService.toggleGrid(true);
    
    // Verify toggle was successful
    expect(result).toBe(true);
    
    // Check that DocumentService was called to update metadata
    expect(documentService.updateDocumentMetadata).toHaveBeenCalledWith({
      grid: {
        enabled: true,
        size: 10,
        color: '#cccccc',
        opacity: 0.5
      }
    });
  });
  
  it('should update grid properties', () => {
    // Mock document
    const mockDocument = {
      metadata: {
        grid: {
          enabled: true,
          size: 10,
          color: '#cccccc',
          opacity: 0.5,
          subdivisions: 2
        }
      }
    };
    
    // Set mock to return our document
    get.mockReturnValue(mockDocument);
    
    // Initialize service
    gridService.initialize({
      canvas: mockCanvas,
      canvasElement: mockCanvasElement,
      width: 800,
      height: 600
    });
    
    // Update grid properties
    const result = gridService.updateGridProperties({
      size: 20,
      color: '#ff0000'
    });
    
    // Verify update was successful
    expect(result).toBe(true);
    
    // Check that DocumentService was called to update metadata
    expect(documentService.updateDocumentMetadata).toHaveBeenCalledWith({
      grid: {
        enabled: true,
        size: 20,
        color: '#ff0000',
        opacity: 0.5,
        subdivisions: 2
      }
    });
  });
  
  it('should convert values from document units to pixels', () => {
    // Initialize service with custom conversion factor
    gridService.initialize({
      pxPerMm: 4
    });
    
    // Test mm to px conversion
    expect(gridService.convertToPixels(10, 'mm')).toBe(40);
    
    // Test cm to px conversion
    expect(gridService.convertToPixels(1, 'cm')).toBe(40);
    
    // Test in to px conversion
    expect(gridService.convertToPixels(1, 'in')).toBeCloseTo(101.6);
    
    // Test px to px (no conversion)
    expect(gridService.convertToPixels(100, 'px')).toBe(100);
  });
  
  it('should snap points to grid', () => {
    // Mock document with grid enabled and snap enabled
    const mockDocument = {
      metadata: {
        grid: {
          enabled: true,
          size: 10,
          snap: true
        }
      }
    };
    
    // Set mock to return our document
    get.mockReturnValue(mockDocument);
    
    // Mock getGridSize to return a fixed value
    const getGridSizeSpy = vi.spyOn(gridService, 'getGridSize')
      .mockReturnValue(20);
    
    // Initialize service
    gridService.initialize({});
    
    // Test snapping
    const point = { x: 28, y: 33 };
    const snapped = gridService.snapToGrid(point);
    
    // Should snap to nearest 20px increment
    expect(snapped).toEqual({ x: 20, y: 40 });
    
    // Clean up spy
    getGridSizeSpy.mockRestore();
  });
  
  it('should not snap when snap is disabled', () => {
    // Mock document with grid enabled but snap disabled
    const mockDocument = {
      metadata: {
        grid: {
          enabled: true,
          size: 10,
          snap: false
        }
      }
    };
    
    // Set mock to return our document
    get.mockReturnValue(mockDocument);
    
    // Initialize service
    gridService.initialize({});
    
    // Test not snapping
    const point = { x: 28, y: 33 };
    const snapped = gridService.snapToGrid(point);
    
    // Should return original point
    expect(snapped).toBe(point);
  });
  
  it('should clean up resources', () => {
    // Create a spy for document.getElementById
    const getElementByIdSpy = vi.spyOn(document, 'getElementById')
      .mockReturnValue({
        remove: vi.fn()
      });
    
    // Initialize service
    gridService.initialize({
      canvas: mockCanvas,
      canvasElement: mockCanvasElement
    });
    
    // Clean up
    gridService.cleanup();
    
    // Verify canvas is null
    expect(gridService.canvas).toBe(null);
    expect(gridService.canvasElement).toBe(null);
    
    // Verify grid overlay was removed
    expect(getElementByIdSpy).toHaveBeenCalledWith('canvas-grid-overlay');
    
    // Verify canvas objects were checked
    expect(mockCanvas.getObjects).toHaveBeenCalled();
    
    // Clean up spy
    getElementByIdSpy.mockRestore();
  });
});