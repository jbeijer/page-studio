/**
 * ToolService.test.js
 * Tests for the ToolService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import toolService from './ToolService';
import { ToolType, activeTool, toolOptions } from '$lib/stores/toolbar';

// Mock Svelte stores
vi.mock('svelte/store', async () => {
  const actual = await vi.importActual('svelte/store');
  return {
    ...actual,
    get: vi.fn()
  };
});

// Mock toolbar store
vi.mock('$lib/stores/toolbar', () => {
  const mockStore = {
    subscribe: vi.fn(callback => {
      callback(ToolType.SELECT);
      return () => {};
    }),
    set: vi.fn(),
    update: vi.fn()
  };

  return {
    activeTool: mockStore,
    toolOptions: mockStore,
    currentToolOptions: mockStore,
    ToolType: {
      SELECT: 'select',
      TEXT: 'text',
      IMAGE: 'image',
      RECTANGLE: 'rectangle',
      ELLIPSE: 'ellipse',
      LINE: 'line'
    }
  };
});

describe('ToolService', () => {
  let mockCanvas;
  
  beforeEach(() => {
    // Reset the service
    toolService.cleanup();
    
    // Create a mock canvas
    mockCanvas = {
      isDrawingMode: false,
      selection: false,
      defaultCursor: 'default',
      wrapperEl: {
        style: {
          cursor: 'default'
        }
      },
      getObjects: vi.fn().mockReturnValue([
        { type: 'rect', selectable: false, evented: false, visible: true, opacity: 1 },
        { type: 'textbox', selectable: false, evented: false, visible: true, opacity: 1 }
      ]),
      requestRenderAll: vi.fn(),
      renderAll: vi.fn()
    };
    
    // Mock the get function for Svelte stores
    const { get } = require('svelte/store');
    get.mockImplementation(store => {
      if (store === activeTool) return ToolType.SELECT;
      if (store === toolOptions) {
        return {
          [ToolType.SELECT]: { enableGroupSelection: true },
          [ToolType.TEXT]: { fontSize: 16, fontFamily: 'Arial' }
        };
      }
      return {};
    });
  });
  
  afterEach(() => {
    toolService.cleanup();
    vi.clearAllMocks();
  });
  
  it('should initialize with default values', () => {
    toolService.initialize({ canvas: mockCanvas });
    
    expect(toolService.initialized).toBe(true);
    expect(toolService.canvas).toBe(mockCanvas);
    expect(toolService.currentTool).toBe(ToolType.SELECT);
  });
  
  it('should not initialize without a canvas', () => {
    toolService.initialize({});
    
    expect(toolService.initialized).toBe(false);
  });
  
  it('should warn if already initialized', () => {
    // Spy on console.warn
    const consoleWarnSpy = vi.spyOn(console, 'warn');
    
    // Initialize once
    toolService.initialize({ canvas: mockCanvas });
    
    // Try to initialize again
    toolService.initialize({ canvas: mockCanvas });
    
    expect(consoleWarnSpy).toHaveBeenCalledWith('ToolService has already been initialized');
    
    // Restore original console.warn
    consoleWarnSpy.mockRestore();
  });
  
  it('should setup canvas for SELECT tool', () => {
    toolService.initialize({ canvas: mockCanvas });
    
    toolService.setupCanvasForTool(ToolType.SELECT);
    
    expect(mockCanvas.selection).toBe(true);
    expect(mockCanvas.defaultCursor).toBe('default');
    expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    expect(mockCanvas.renderAll).toHaveBeenCalled();
  });
  
  it('should setup canvas for TEXT tool', () => {
    toolService.initialize({ canvas: mockCanvas });
    
    toolService.setupCanvasForTool(ToolType.TEXT);
    
    expect(mockCanvas.selection).toBe(false);
    expect(mockCanvas.defaultCursor).toBe('text');
    expect(mockCanvas.wrapperEl.style.cursor).toBe('text');
    expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    expect(mockCanvas.renderAll).toHaveBeenCalled();
  });
  
  it('should configure objects correctly for different tools', () => {
    toolService.initialize({ canvas: mockCanvas });
    
    // For SELECT tool
    toolService.setupCanvasForTool(ToolType.SELECT);
    
    // Check that object configuration was called
    expect(mockCanvas.getObjects).toHaveBeenCalled();
    
    // For TEXT tool
    toolService.setupCanvasForTool(ToolType.TEXT);
    
    // Check that object configuration was called again
    expect(mockCanvas.getObjects).toHaveBeenCalledTimes(2);
  });
  
  it('should subscribe to tool changes during initialization', () => {
    toolService.initialize({ canvas: mockCanvas });
    
    expect(activeTool.subscribe).toHaveBeenCalled();
  });
  
  it('should set active tool', () => {
    toolService.initialize({ canvas: mockCanvas });
    
    const result = toolService.setActiveTool(ToolType.TEXT);
    
    expect(result).toBe(true);
    expect(activeTool.set).toHaveBeenCalledWith(ToolType.TEXT);
    expect(toolService.currentTool).toBe(ToolType.TEXT);
  });
  
  it('should not set invalid tool type', () => {
    toolService.initialize({ canvas: mockCanvas });
    
    const consoleErrorSpy = vi.spyOn(console, 'error');
    const result = toolService.setActiveTool('invalid-tool');
    
    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid tool type: invalid-tool');
    
    consoleErrorSpy.mockRestore();
  });
  
  it('should update tool options', () => {
    toolService.initialize({ canvas: mockCanvas });
    
    toolService.updateToolOptions(ToolType.TEXT, { fontSize: 20 });
    
    expect(toolOptions.update).toHaveBeenCalled();
  });
  
  it('should update current tool options', () => {
    toolService.initialize({ canvas: mockCanvas });
    
    toolService.updateCurrentToolOptions({ enableGroupSelection: false });
    
    expect(toolOptions.update).toHaveBeenCalled();
  });
  
  it('should reset tool options', () => {
    toolService.initialize({ canvas: mockCanvas });
    
    toolService.resetToolOptions(ToolType.TEXT);
    
    expect(toolOptions.update).toHaveBeenCalled();
  });
  
  it('should not reset options for invalid tool type', () => {
    toolService.initialize({ canvas: mockCanvas });
    
    const consoleErrorSpy = vi.spyOn(console, 'error');
    toolService.resetToolOptions('invalid-tool');
    
    expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid tool type: invalid-tool');
    
    consoleErrorSpy.mockRestore();
  });
  
  it('should get active tool correctly', () => {
    toolService.initialize({ canvas: mockCanvas });
    
    const activeTool = toolService.getActiveTool();
    
    expect(activeTool).toBe(ToolType.SELECT);
  });
  
  it('should check if tool is active correctly', () => {
    toolService.initialize({ canvas: mockCanvas });
    
    expect(toolService.isToolActive(ToolType.SELECT)).toBe(true);
    expect(toolService.isToolActive(ToolType.TEXT)).toBe(false);
  });
  
  it('should clean up properly', () => {
    // Create a mock unsubscribe function
    const mockUnsubscribe = vi.fn();
    activeTool.subscribe.mockReturnValueOnce(mockUnsubscribe);
    
    // Initialize and clean up
    toolService.initialize({ canvas: mockCanvas });
    toolService.cleanup();
    
    expect(toolService.initialized).toBe(false);
    expect(toolService.canvas).toBe(null);
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});