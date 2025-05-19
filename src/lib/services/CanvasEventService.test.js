/**
 * Tests for CanvasEventService
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import canvasEventService from './CanvasEventService';
import { fabric } from 'fabric';
import { ToolType } from '$lib/stores/toolbar';

describe('CanvasEventService', () => {
  let mockCanvas;
  let mockDispatch;
  
  beforeEach(() => {
    // Create mock canvas
    mockCanvas = {
      on: vi.fn(),
      off: vi.fn(),
      getPointer: vi.fn().mockReturnValue({ x: 100, y: 100 }),
      add: vi.fn(),
      getObjects: vi.fn().mockReturnValue([]),
      getActiveObject: vi.fn(),
      setActiveObject: vi.fn(),
      requestRenderAll: vi.fn(),
      renderAll: vi.fn()
    };
    
    // Create mock dispatch function
    mockDispatch = vi.fn();
    
    // Reset service before each test
    canvasEventService.cleanup();
  });
  
  afterEach(() => {
    // Clean up service after each test
    canvasEventService.cleanup();
    vi.resetAllMocks();
  });
  
  it('should initialize properly', () => {
    // Initialize service
    canvasEventService.initialize({
      canvas: mockCanvas,
      dispatch: mockDispatch,
      activeTool: ToolType.SELECT
    });
    
    // Verify service is initialized
    expect(canvasEventService.initialized).toBe(true);
    expect(canvasEventService.canvas).toBe(mockCanvas);
    expect(canvasEventService.dispatch).toBe(mockDispatch);
    
    // Verify event handlers are registered
    expect(mockCanvas.on).toHaveBeenCalled();
  });
  
  it('should register event handlers', () => {
    // Initialize service
    canvasEventService.initialize({
      canvas: mockCanvas,
      dispatch: mockDispatch
    });
    
    // Verify event handlers are registered
    expect(mockCanvas.on).toHaveBeenCalledWith('mouse:down', expect.any(Function));
    expect(mockCanvas.on).toHaveBeenCalledWith('mouse:move', expect.any(Function));
    expect(mockCanvas.on).toHaveBeenCalledWith('mouse:up', expect.any(Function));
    expect(mockCanvas.on).toHaveBeenCalledWith('mouse:dblclick', expect.any(Function));
    expect(mockCanvas.on).toHaveBeenCalledWith('selection:created', expect.any(Function));
    expect(mockCanvas.on).toHaveBeenCalledWith('selection:updated', expect.any(Function));
    expect(mockCanvas.on).toHaveBeenCalledWith('selection:cleared', expect.any(Function));
  });
  
  it('should remove event handlers', () => {
    // Initialize service
    canvasEventService.initialize({
      canvas: mockCanvas,
      dispatch: mockDispatch
    });
    
    // Remove event handlers
    canvasEventService.removeEventHandlers();
    
    // Verify event handlers are removed
    expect(mockCanvas.off).toHaveBeenCalledWith('mouse:down');
    expect(mockCanvas.off).toHaveBeenCalledWith('mouse:move');
    expect(mockCanvas.off).toHaveBeenCalledWith('mouse:up');
    expect(mockCanvas.off).toHaveBeenCalledWith('mouse:dblclick');
    expect(mockCanvas.off).toHaveBeenCalledWith('selection:created');
    expect(mockCanvas.off).toHaveBeenCalledWith('selection:updated');
    expect(mockCanvas.off).toHaveBeenCalledWith('selection:cleared');
  });
  
  it('should clean up resources', () => {
    // Initialize service
    canvasEventService.initialize({
      canvas: mockCanvas,
      dispatch: mockDispatch
    });
    
    // Clean up service
    canvasEventService.cleanup();
    
    // Verify service is cleaned up
    expect(canvasEventService.canvas).toBe(null);
    expect(canvasEventService.dispatch).toBe(null);
    
    // Verify event handlers are removed
    expect(mockCanvas.off).toHaveBeenCalled();
  });
  
  it('should handle object selection', () => {
    // Mock active object
    const mockObject = {
      type: 'textbox',
      id: 'test-id',
      linkedObjectIds: []
    };
    
    mockCanvas.getActiveObject.mockReturnValue(mockObject);
    
    // Initialize service
    canvasEventService.initialize({
      canvas: mockCanvas,
      dispatch: mockDispatch
    });
    
    // Trigger object selection
    canvasEventService.handleObjectSelected();
    
    // Verify dispatch is called with correct object
    expect(mockDispatch).toHaveBeenCalledWith('objectselected', {
      object: mockObject,
      objectType: 'textbox',
      fromMaster: false,
      masterId: null,
      masterObjectId: null,
      overridable: null
    });
  });
  
  it('should handle selection cleared', () => {
    // Initialize service
    canvasEventService.initialize({
      canvas: mockCanvas,
      dispatch: mockDispatch
    });
    
    // Trigger selection cleared
    canvasEventService.handleSelectionCleared();
    
    // Verify dispatch is called with null object
    expect(mockDispatch).toHaveBeenCalledWith('objectselected', {
      object: null,
      objectType: null
    });
  });
  
  it('should handle right click on master object', () => {
    // Mock master object
    const mockMasterObject = {
      type: 'textbox',
      fromMaster: true,
      masterId: 'master-id',
      masterObjectId: 'master-object-id'
    };
    
    // Mock event
    const mockEvent = {
      e: {
        preventDefault: vi.fn(),
        clientX: 200,
        clientY: 300
      },
      target: mockMasterObject
    };
    
    // Initialize service
    canvasEventService.initialize({
      canvas: mockCanvas,
      dispatch: mockDispatch
    });
    
    // Trigger right click
    canvasEventService.handleRightClick(mockEvent);
    
    // Verify context menu is shown
    expect(canvasEventService.contextMenuState.showContextMenu).toBe(true);
    expect(canvasEventService.contextMenuState.contextMenuX).toBe(200);
    expect(canvasEventService.contextMenuState.contextMenuY).toBe(300);
    expect(canvasEventService.contextMenuState.contextMenuObject).toBe(mockMasterObject);
    
    // Verify dispatch is called
    expect(mockDispatch).toHaveBeenCalledWith('masterObjectRightClick', {
      object: mockMasterObject,
      x: 200,
      y: 300
    });
  });
  
  it('should update tool state', () => {
    // Initialize service
    canvasEventService.initialize({
      canvas: mockCanvas,
      dispatch: mockDispatch,
      activeTool: ToolType.SELECT,
      currentToolOptions: {}
    });
    
    // Update tool state
    canvasEventService.updateToolState({
      activeTool: ToolType.TEXT,
      currentToolOptions: {
        fontFamily: 'Arial',
        fontSize: 16
      }
    });
    
    // Verify tool state is updated
    expect(canvasEventService.activeTool).toBe(ToolType.TEXT);
    expect(canvasEventService.currentToolOptions).toEqual({
      fontFamily: 'Arial',
      fontSize: 16
    });
  });
});