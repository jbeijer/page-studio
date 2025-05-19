/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fabric } from 'fabric';
import { get } from 'svelte/store';
import { clipboard } from '$lib/stores/editor';
import objectService from './ObjectService';
import documentService from './DocumentService';
import masterPageService from './MasterPageService';

// Mock Svelte stores
vi.mock('svelte/store', async () => {
  const actual = await vi.importActual('svelte/store');
  return {
    ...actual,
    get: vi.fn()
  };
});

// Mock clipboard store
vi.mock('$lib/stores/editor', () => ({
  clipboard: {
    get: vi.fn(),
    set: vi.fn(),
    subscribe: vi.fn()
  }
}));

// Mock documentService
vi.mock('./DocumentService', () => ({
  default: {
    saveCurrentPage: vi.fn(),
    initialize: vi.fn()
  }
}));

// Mock masterPageService
vi.mock('./MasterPageService', () => ({
  default: {
    overrideMasterObject: vi.fn(),
    initialize: vi.fn()
  }
}));

// Mock fabric.js
vi.mock('fabric', async () => ({
  fabric: {
    ActiveSelection: vi.fn().mockImplementation(() => ({
      type: 'activeSelection',
      forEachObject: vi.fn()
    }))
  }
}));

describe('ObjectService', () => {
  let mockCanvas;
  let mockObject;
  let mockTextObject;
  let mockMasterObject;
  let mockSelection;
  let mockDispatch;
  let mockGenerateId;
  let mockTextFlow;
  
  beforeEach(() => {
    // Create mock canvas
    mockCanvas = {
      getActiveObject: vi.fn(),
      discardActiveObject: vi.fn(),
      setActiveObject: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      getObjects: vi.fn().mockReturnValue([]),
      renderAll: vi.fn(),
      requestRenderAll: vi.fn()
    };
    
    // Create mock functions
    mockDispatch = vi.fn();
    mockGenerateId = vi.fn().mockReturnValue('new-id-12345');
    mockTextFlow = {
      updateTextFlow: vi.fn()
    };
    
    // Create mock objects
    mockObject = {
      id: 'obj1',
      type: 'rect',
      fromMaster: false,
      set: vi.fn(),
      clone: vi.fn().mockImplementation(callback => callback({ 
        id: 'cloned-obj',
        type: 'rect',
        clone: vi.fn() 
      })),
      rotate: vi.fn(),
      scale: vi.fn()
    };
    
    mockTextObject = {
      id: 'text1',
      type: 'textbox',
      text: 'Sample text',
      linkedObjectIds: ['text2'],
      fromMaster: false,
      on: vi.fn(),
      clone: vi.fn().mockImplementation(callback => callback({ 
        id: 'cloned-text',
        type: 'textbox',
        clone: vi.fn(), 
        on: vi.fn() 
      }))
    };
    
    mockMasterObject = {
      id: 'master1',
      type: 'rect',
      fromMaster: true,
      overridable: true,
      overridden: false
    };
    
    mockSelection = {
      id: 'selection',
      type: 'activeSelection',
      forEachObject: vi.fn(callback => {
        callback(mockObject);
        callback(mockTextObject);
      })
    };
    
    // Setup mock clipboard data
    get.mockImplementation(store => {
      if (store === clipboard) {
        return {
          objects: [
            {
              id: 'clipboard-obj',
              type: 'rect',
              clone: vi.fn().mockImplementation(callback => callback({ 
                id: 'pasted-obj',
                type: 'rect' 
              }))
            }
          ],
          isMultiple: false,
          timestamp: Date.now()
        };
      }
      return null;
    });
    
    // Initialize the service
    objectService.initialize({
      canvas: mockCanvas,
      dispatch: mockDispatch,
      generateId: mockGenerateId,
      textFlow: mockTextFlow,
      activeTool: 'select'
    });
  });
  
  afterEach(() => {
    vi.resetAllMocks();
    objectService.cleanup();
  });
  
  it('should initialize with the provided options', () => {
    expect(objectService.canvas).toBe(mockCanvas);
    expect(objectService.dispatch).toBe(mockDispatch);
    expect(objectService.generateId).toBe(mockGenerateId);
    expect(objectService.textFlow).toBe(mockTextFlow);
    expect(objectService.initialized).toBe(true);
  });
  
  it('should rotate objects', () => {
    // Test with no active object
    mockCanvas.getActiveObject.mockReturnValueOnce(null);
    expect(objectService.rotateObject(45)).toBe(false);
    
    // Test with active object
    mockCanvas.getActiveObject.mockReturnValueOnce(mockObject);
    expect(objectService.rotateObject(45)).toBe(true);
    expect(mockObject.rotate).toHaveBeenCalled();
    expect(documentService.saveCurrentPage).toHaveBeenCalled();
  });
  
  it('should scale objects', () => {
    // Test with active object
    mockCanvas.getActiveObject.mockReturnValueOnce(mockObject);
    expect(objectService.scaleObject(1.5, 1.5)).toBe(true);
    expect(mockObject.scale).toHaveBeenCalled();
    expect(documentService.saveCurrentPage).toHaveBeenCalled();
  });
  
  it('should flip objects horizontally and vertically', () => {
    // Test horizontal flip
    mockCanvas.getActiveObject.mockReturnValueOnce(mockObject);
    expect(objectService.flipObject('horizontal')).toBe(true);
    expect(mockObject.set).toHaveBeenCalledWith('flipX', expect.any(Boolean));
    
    // Test vertical flip
    mockCanvas.getActiveObject.mockReturnValueOnce(mockObject);
    expect(objectService.flipObject('vertical')).toBe(true);
    expect(mockObject.set).toHaveBeenCalledWith('flipY', expect.any(Boolean));
    
    // Test invalid direction
    mockCanvas.getActiveObject.mockReturnValueOnce(mockObject);
    expect(objectService.flipObject('invalid')).toBe(false);
  });
  
  it('should delete selected objects', () => {
    // Test with no active object
    mockCanvas.getActiveObject.mockReturnValueOnce(null);
    expect(objectService.deleteSelectedObjects()).toBe(false);
    
    // Test with regular object
    mockCanvas.getActiveObject.mockReturnValueOnce(mockObject);
    expect(objectService.deleteSelectedObjects()).toBe(true);
    expect(mockCanvas.remove).toHaveBeenCalledWith(mockObject);
    expect(documentService.saveCurrentPage).toHaveBeenCalled();
    
    // Test with master object
    mockCanvas.getActiveObject.mockReturnValueOnce(mockMasterObject);
    masterPageService.overrideMasterObject.mockReturnValueOnce({ id: 'overridden-obj' });
    expect(objectService.deleteSelectedObjects()).toBe(true);
    expect(masterPageService.overrideMasterObject).toHaveBeenCalled();
    
    // Test with selection
    mockCanvas.getActiveObject.mockReturnValueOnce(mockSelection);
    expect(objectService.deleteSelectedObjects()).toBe(true);
    expect(mockSelection.forEachObject).toHaveBeenCalled();
  });
  
  it('should get the selected object', () => {
    mockCanvas.getActiveObject.mockReturnValueOnce(mockObject);
    expect(objectService.getSelectedObject()).toBe(mockObject);
  });
  
  it('should check if an object is from a master page', () => {
    expect(objectService.isObjectFromMaster(mockObject)).toBe(false);
    expect(objectService.isObjectFromMaster(mockMasterObject)).toBe(true);
  });
  
  it('should get all master page objects', () => {
    mockCanvas.getObjects.mockReturnValueOnce([mockObject, mockMasterObject]);
    const masterObjects = objectService.getMasterPageObjects();
    expect(masterObjects).toHaveLength(1);
    expect(masterObjects[0]).toBe(mockMasterObject);
  });
  
  it('should copy selected objects', () => {
    // Test with regular object
    mockCanvas.getActiveObject.mockReturnValueOnce(mockObject);
    expect(objectService.copySelectedObjects()).toBe(true);
    expect(mockObject.clone).toHaveBeenCalled();
    expect(clipboard.set).toHaveBeenCalled();
    
    // Test with selection
    mockCanvas.getActiveObject.mockReturnValueOnce(mockSelection);
    expect(objectService.copySelectedObjects()).toBe(true);
    expect(mockSelection.forEachObject).toHaveBeenCalled();
  });
  
  it('should cut selected objects', () => {
    // Mock the copy and delete methods
    const copySpy = vi.spyOn(objectService, 'copySelectedObjects').mockReturnValueOnce(true);
    const deleteSpy = vi.spyOn(objectService, 'deleteSelectedObjects').mockReturnValueOnce(true);
    
    expect(objectService.cutSelectedObjects()).toBe(true);
    expect(copySpy).toHaveBeenCalled();
    expect(deleteSpy).toHaveBeenCalled();
    expect(documentService.saveCurrentPage).toHaveBeenCalled();
    
    // Restore the original methods
    copySpy.mockRestore();
    deleteSpy.mockRestore();
  });
  
  it('should paste objects', () => {
    expect(objectService.pasteObjects()).toBe(true);
    expect(mockCanvas.discardActiveObject).toHaveBeenCalled();
    expect(mockCanvas.add).toHaveBeenCalled();
    expect(mockCanvas.setActiveObject).toHaveBeenCalled();
    expect(mockGenerateId).toHaveBeenCalled();
    expect(documentService.saveCurrentPage).toHaveBeenCalled();
  });
  
  it('should ensure object visibility', () => {
    // Test with regular object
    objectService.ensureObjectVisibility(mockObject);
    expect(mockObject.visible).toBe(true);
    expect(mockObject.evented).toBe(true);
    expect(mockObject.selectable).toBe(true);
    
    // Test with master object
    objectService.ensureObjectVisibility(mockMasterObject);
    expect(mockMasterObject.visible).toBe(true);
    expect(mockMasterObject.evented).toBe(true);
    expect(mockMasterObject.selectable).toBe(false);
    expect(mockMasterObject.hoverCursor).toBe('not-allowed');
  });
  
  it('should update text flow for text objects', () => {
    objectService.updateTextFlow(mockTextObject);
    expect(mockTextFlow.updateTextFlow).toHaveBeenCalledWith(mockTextObject.id);
  });
  
  it('should clean up resources properly', () => {
    objectService.cleanup();
    
    expect(objectService.canvas).toBeNull();
    expect(objectService.dispatch).toBeNull();
    expect(objectService.textFlow).toBeNull();
    expect(objectService.initialized).toBe(false);
  });
});