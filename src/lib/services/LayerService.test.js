/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fabric } from 'fabric';
import layerService from './LayerService';
import documentService from './DocumentService';

// Mock documentService
vi.mock('./DocumentService', () => ({
  default: {
    saveCurrentPage: vi.fn(),
    forceSave: vi.fn(),
    initialize: vi.fn()
  }
}));

// Mock fabric.js ActiveSelection
vi.mock('fabric', async () => ({
  fabric: {
    ActiveSelection: vi.fn().mockImplementation(() => ({
      type: 'activeSelection',
      forEachObject: vi.fn(callback => {
        const mockObjects = [
          { id: 'obj1', type: 'rect' },
          { id: 'obj2', type: 'rect' }
        ];
        mockObjects.forEach(callback);
      })
    }))
  }
}));

describe('LayerService', () => {
  let mockCanvas;
  let mockObject;
  let mockMasterObject;
  let mockSelection;
  
  beforeEach(() => {
    // Create mock canvas
    mockCanvas = {
      add: vi.fn(),
      remove: vi.fn(),
      getObjects: vi.fn().mockReturnValue([
        { id: 'obj1' },
        { id: 'obj2' },
        { id: 'obj3' }
      ]),
      bringForward: vi.fn(),
      sendBackward: vi.fn(),
      bringToFront: vi.fn(),
      sendToBack: vi.fn(),
      getActiveObject: vi.fn(),
      renderAll: vi.fn(),
      requestRenderAll: vi.fn()
    };
    
    // Create a mock regular object
    mockObject = {
      id: 'regular-obj',
      type: 'rect',
      fromMaster: false
    };
    
    // Create a mock master object
    mockMasterObject = {
      id: 'master-obj',
      type: 'rect',
      fromMaster: true,
      overridden: false
    };
    
    // Create a mock selection
    mockSelection = {
      id: 'selection',
      type: 'activeSelection',
      forEachObject: vi.fn()
    };
    
    // Initialize the service
    layerService.initialize({
      canvas: mockCanvas
    });
  });
  
  afterEach(() => {
    vi.resetAllMocks();
    layerService.cleanup();
  });
  
  it('should initialize with the provided canvas', () => {
    expect(layerService.canvas).toBe(mockCanvas);
    expect(layerService.initialized).toBe(true);
  });
  
  it('should check if an object can be manipulated', () => {
    expect(layerService.canManipulateObject(mockObject)).toBe(true);
    expect(layerService.canManipulateObject(mockMasterObject)).toBe(false);
    
    // Test with overridden master object
    const overriddenMasterObject = {
      ...mockMasterObject,
      overridden: true
    };
    expect(layerService.canManipulateObject(overriddenMasterObject)).toBe(true);
  });
  
  it('should handle bringing objects forward', () => {
    // Test with no active object
    mockCanvas.getActiveObject.mockReturnValueOnce(null);
    expect(layerService.bringForward()).toBe(false);
    
    // Test with regular object
    mockCanvas.getActiveObject.mockReturnValueOnce(mockObject);
    expect(layerService.bringForward()).toBe(true);
    expect(mockCanvas.bringForward).toHaveBeenCalledWith(mockObject);
    expect(documentService.saveCurrentPage).toHaveBeenCalled();
    
    // Test with master object
    mockCanvas.getActiveObject.mockReturnValueOnce(mockMasterObject);
    expect(layerService.bringForward()).toBe(false);
    
    // Test with selection
    mockCanvas.getActiveObject.mockReturnValueOnce(mockSelection);
    expect(layerService.bringForward()).toBe(true);
    expect(mockSelection.forEachObject).toHaveBeenCalled();
  });
  
  it('should handle sending objects backward', () => {
    // Test with no active object
    mockCanvas.getActiveObject.mockReturnValueOnce(null);
    expect(layerService.sendBackward()).toBe(false);
    
    // Test with regular object
    mockCanvas.getActiveObject.mockReturnValueOnce(mockObject);
    expect(layerService.sendBackward()).toBe(true);
    expect(mockCanvas.sendBackward).toHaveBeenCalledWith(mockObject);
    expect(documentService.saveCurrentPage).toHaveBeenCalled();
  });
  
  it('should handle bringing objects to front', () => {
    // Test with regular object
    mockCanvas.getActiveObject.mockReturnValueOnce(mockObject);
    expect(layerService.bringToFront()).toBe(true);
    expect(mockCanvas.bringToFront).toHaveBeenCalledWith(mockObject);
    expect(documentService.saveCurrentPage).toHaveBeenCalled();
  });
  
  it('should handle sending objects to back', () => {
    // Test with regular object
    mockCanvas.getActiveObject.mockReturnValueOnce(mockObject);
    expect(layerService.sendToBack()).toBe(true);
    expect(mockCanvas.sendToBack).toHaveBeenCalledWith(mockObject);
    expect(documentService.saveCurrentPage).toHaveBeenCalled();
  });
  
  it('should get the object layer index', () => {
    const obj = { id: 'obj2' };
    mockCanvas.getObjects.mockReturnValueOnce([
      { id: 'obj1' },
      { id: 'obj2' },
      { id: 'obj3' }
    ]);
    
    expect(layerService.getObjectLayerIndex(obj)).toBe(1);
  });
  
  it('should check if an object is at the top layer', () => {
    const topObj = { id: 'obj3' };
    const middleObj = { id: 'obj2' };
    const objects = [
      { id: 'obj1' },
      { id: 'obj2' },
      { id: 'obj3' }
    ];
    
    mockCanvas.getObjects.mockReturnValueOnce(objects);
    expect(layerService.isObjectAtTop(topObj)).toBe(true);
    
    mockCanvas.getObjects.mockReturnValueOnce(objects);
    expect(layerService.isObjectAtTop(middleObj)).toBe(false);
  });
  
  it('should check if an object is at the bottom layer', () => {
    const bottomObj = { id: 'obj1' };
    const middleObj = { id: 'obj2' };
    const objects = [
      { id: 'obj1' },
      { id: 'obj2' },
      { id: 'obj3' }
    ];
    
    mockCanvas.getObjects.mockReturnValueOnce(objects);
    expect(layerService.isObjectAtBottom(bottomObj)).toBe(true);
    
    mockCanvas.getObjects.mockReturnValueOnce(objects);
    expect(layerService.isObjectAtBottom(middleObj)).toBe(false);
  });
  
  it('should move an object to a specific index', () => {
    const obj = { id: 'obj1' };
    
    expect(layerService.moveObjectToIndex(obj, 2)).toBe(true);
    expect(mockCanvas.remove).toHaveBeenCalledWith(obj);
    expect(mockCanvas.add).toHaveBeenCalledWith(obj);
    expect(documentService.saveCurrentPage).toHaveBeenCalled();
  });
  
  it('should clean up resources properly', () => {
    layerService.cleanup();
    
    expect(layerService.canvas).toBeNull();
    expect(layerService.initialized).toBe(false);
  });
});