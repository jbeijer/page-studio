/**
 * Tests for CanvasService
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import canvasService from './CanvasService';
import canvasEventService from './CanvasEventService';
import documentService from './DocumentService';
import { fabric } from 'fabric';
import { get } from 'svelte/store';
import { activeTool, currentToolOptions } from '$lib/stores/toolbar';

// Mock the fabric library
vi.mock('fabric', () => ({
  fabric: {
    Canvas: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      off: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      getObjects: vi.fn().mockReturnValue([]),
      getActiveObject: vi.fn(),
      setActiveObject: vi.fn(),
      bringForward: vi.fn(),
      sendBackwards: vi.fn(),
      bringToFront: vi.fn(),
      sendToBack: vi.fn(),
      requestRenderAll: vi.fn(),
      renderAll: vi.fn(),
      dispose: vi.fn()
    })),
    Image: {
      fromURL: vi.fn()
    },
    Rect: vi.fn(),
    Ellipse: vi.fn(),
    Line: vi.fn(),
    Textbox: vi.fn()
  }
}));

// Mock the svelte/store module
vi.mock('svelte/store', () => ({
  get: vi.fn().mockImplementation(() => ({})),
  derived: vi.fn(),
  writable: vi.fn()
}));

// Mock the DocumentService
vi.mock('./DocumentService', () => ({
  default: {
    initialize: vi.fn(),
    saveCurrentPage: vi.fn(),
    saveSpecificPage: vi.fn(),
    forceSave: vi.fn()
  }
}));

// Mock the CanvasEventService
vi.mock('./CanvasEventService', () => ({
  default: {
    initialize: vi.fn(),
    cleanup: vi.fn(),
    updateToolState: vi.fn()
  }
}));

describe('CanvasService', () => {
  let mockCanvasElement;
  let mockDispatch;
  let mockHistoryManager;
  
  beforeEach(() => {
    // Create mock canvas element
    mockCanvasElement = document.createElement('canvas');
    
    // Create mock dispatch function
    mockDispatch = vi.fn();
    
    // Create mock history manager
    mockHistoryManager = {
      undo: vi.fn(),
      redo: vi.fn(),
      canUndo: vi.fn().mockReturnValue(true),
      canRedo: vi.fn().mockReturnValue(true),
      dispose: vi.fn()
    };
    
    // Reset service before each test
    canvasService.cleanup();
  });
  
  afterEach(() => {
    // Clean up service after each test
    canvasService.cleanup();
    vi.resetAllMocks();
  });
  
  it('should initialize properly', () => {
    // Create mock canvas
    const mockCanvas = new fabric.Canvas();
    
    // Initialize service
    canvasService.initialize(mockCanvas, {
      dispatch: mockDispatch,
      historyManager: mockHistoryManager
    });
    
    // Verify service is initialized
    expect(canvasService.initialized).toBe(true);
    expect(canvasService.canvas).toBe(mockCanvas);
    expect(canvasService.dispatch).toBe(mockDispatch);
    expect(canvasService.historyManager).toBe(mockHistoryManager);
    
    // Verify event service is initialized
    expect(canvasEventService.initialize).toHaveBeenCalled();
  });
  
  it('should create canvas and initialize event service', () => {
    // Initialize canvas
    const canvas = canvasService.createCanvas(mockCanvasElement, {
      width: 800,
      height: 600,
      dispatch: mockDispatch,
      imageInput: document.createElement('input'),
      textFlow: {}
    });
    
    // Verify canvas is created
    expect(fabric.Canvas).toHaveBeenCalledWith(mockCanvasElement, expect.any(Object));
    expect(canvas).toBeTruthy();
    
    // Verify event service is initialized
    expect(canvasEventService.initialize).toHaveBeenCalled();
    
    // Verify document service is initialized
    expect(documentService.initialize).toHaveBeenCalled();
  });
  
  it('should set up event handlers', () => {
    // Create mock canvas
    const mockCanvas = new fabric.Canvas();
    
    // Initialize service with canvas
    canvasService.initialize(mockCanvas, {
      dispatch: mockDispatch
    });
    
    // Verify event service is initialized
    expect(canvasEventService.initialize).toHaveBeenCalledWith(expect.objectContaining({
      canvas: mockCanvas,
      dispatch: mockDispatch
    }));
  });
  
  it('should perform undo operation', () => {
    // Create mock canvas
    const mockCanvas = new fabric.Canvas();
    
    // Initialize service with history manager
    canvasService.initialize(mockCanvas, {
      historyManager: mockHistoryManager
    });
    
    // Perform undo
    const result = canvasService.undo();
    
    // Verify undo was called
    expect(mockHistoryManager.undo).toHaveBeenCalled();
    expect(result).toBe(true);
  });
  
  it('should perform redo operation', () => {
    // Create mock canvas
    const mockCanvas = new fabric.Canvas();
    
    // Initialize service with history manager
    canvasService.initialize(mockCanvas, {
      historyManager: mockHistoryManager
    });
    
    // Perform redo
    const result = canvasService.redo();
    
    // Verify redo was called
    expect(mockHistoryManager.redo).toHaveBeenCalled();
    expect(result).toBe(true);
  });
  
  it('should clean up resources', () => {
    // Create mock canvas
    const mockCanvas = new fabric.Canvas();
    
    // Initialize service with history manager
    canvasService.initialize(mockCanvas, {
      historyManager: mockHistoryManager
    });
    
    // Subscribe to tool store changes (create mock functions)
    canvasService.toolStoreUnsubscribe = vi.fn();
    canvasService.toolOptionsStoreUnsubscribe = vi.fn();
    
    // Clean up service
    canvasService.cleanup();
    
    // Verify event service is cleaned up
    expect(canvasEventService.cleanup).toHaveBeenCalled();
    
    // Verify history manager is disposed
    expect(mockHistoryManager.dispose).toHaveBeenCalled();
    
    // Verify canvas is disposed
    expect(mockCanvas.dispose).toHaveBeenCalled();
    
    // Verify store subscriptions are unsubscribed
    expect(canvasService.toolStoreUnsubscribe).toHaveBeenCalled();
    expect(canvasService.toolOptionsStoreUnsubscribe).toHaveBeenCalled();
  });
  
  it('should bring selected object forward', () => {
    // Create mock canvas
    const mockCanvas = new fabric.Canvas();
    
    // Create mock active object
    const mockObject = { id: 'test' };
    mockCanvas.getActiveObject = vi.fn().mockReturnValue(mockObject);
    
    // Initialize service
    canvasService.initialize(mockCanvas);
    
    // Bring object forward
    canvasService.bringForward();
    
    // Verify bringForward was called
    expect(mockCanvas.bringForward).toHaveBeenCalledWith(mockObject);
  });
  
  it('should send selected object backward', () => {
    // Create mock canvas
    const mockCanvas = new fabric.Canvas();
    
    // Create mock active object
    const mockObject = { id: 'test' };
    mockCanvas.getActiveObject = vi.fn().mockReturnValue(mockObject);
    
    // Initialize service
    canvasService.initialize(mockCanvas);
    
    // Send object backward
    canvasService.sendBackward();
    
    // Verify sendBackwards was called
    expect(mockCanvas.sendBackwards).toHaveBeenCalledWith(mockObject);
  });
  
  it('should bring selected object to front', () => {
    // Create mock canvas
    const mockCanvas = new fabric.Canvas();
    
    // Create mock active object
    const mockObject = { id: 'test' };
    mockCanvas.getActiveObject = vi.fn().mockReturnValue(mockObject);
    
    // Initialize service
    canvasService.initialize(mockCanvas);
    
    // Bring object to front
    canvasService.bringToFront();
    
    // Verify bringToFront was called
    expect(mockCanvas.bringToFront).toHaveBeenCalledWith(mockObject);
  });
  
  it('should send selected object to back', () => {
    // Create mock canvas
    const mockCanvas = new fabric.Canvas();
    
    // Create mock active object
    const mockObject = { id: 'test' };
    mockCanvas.getActiveObject = vi.fn().mockReturnValue(mockObject);
    
    // Initialize service
    canvasService.initialize(mockCanvas);
    
    // Send object to back
    canvasService.sendToBack();
    
    // Verify sendToBack was called
    expect(mockCanvas.sendToBack).toHaveBeenCalledWith(mockObject);
  });
});