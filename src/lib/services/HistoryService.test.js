/**
 * HistoryService.test.js
 * Tests for the HistoryService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import historyService from './HistoryService';

// Mock fabric
vi.mock('fabric', () => {
  return {
    fabric: {
      Canvas: vi.fn(() => ({
        on: vi.fn(),
        off: vi.fn(),
        clear: vi.fn(),
        renderAll: vi.fn(),
        toJSON: vi.fn(() => ({ objects: [] })),
        loadFromJSON: vi.fn((data, callback) => callback()),
        getObjects: vi.fn(() => []),
      }))
    }
  };
});

describe('HistoryService', () => {
  let mockCanvas;
  let mockOnChange;
  
  beforeEach(() => {
    // Reset the service
    historyService.cleanup();
    
    // Create a mock canvas
    mockCanvas = {
      on: vi.fn(),
      off: vi.fn(),
      clear: vi.fn(),
      renderAll: vi.fn(),
      toJSON: vi.fn(() => ({ objects: [] })),
      loadFromJSON: vi.fn((data, callback) => callback()),
      getObjects: vi.fn(() => []),
    };
    
    // Create a mock onChange callback
    mockOnChange = vi.fn();
  });
  
  afterEach(() => {
    historyService.cleanup();
  });
  
  it('should initialize with default values', () => {
    historyService.initialize({ canvas: mockCanvas });
    
    expect(historyService.initialized).toBe(true);
    expect(historyService.canvas).toBe(mockCanvas);
    expect(historyService.maxStates).toBe(30);
    expect(historyService.undoStack.length).toBe(1); // Initial state
    expect(historyService.redoStack.length).toBe(0);
  });
  
  it('should initialize with custom options', () => {
    historyService.initialize({
      canvas: mockCanvas,
      maxStates: 50,
      onChange: mockOnChange
    });
    
    expect(historyService.initialized).toBe(true);
    expect(historyService.canvas).toBe(mockCanvas);
    expect(historyService.maxStates).toBe(50);
    expect(historyService.onChange).toBe(mockOnChange);
  });
  
  it('should not initialize without a canvas', () => {
    historyService.initialize({ maxStates: 50 });
    
    expect(historyService.initialized).toBe(false);
  });
  
  it('should warn if already initialized', () => {
    // Spy on console.warn
    const consoleWarnSpy = vi.spyOn(console, 'warn');
    
    // Initialize once
    historyService.initialize({ canvas: mockCanvas });
    
    // Try to initialize again
    historyService.initialize({ canvas: mockCanvas });
    
    expect(consoleWarnSpy).toHaveBeenCalledWith('HistoryService has already been initialized');
    
    // Restore original console.warn
    consoleWarnSpy.mockRestore();
  });
  
  it('should set up canvas event listeners', () => {
    historyService.initialize({ canvas: mockCanvas });
    
    expect(mockCanvas.on).toHaveBeenCalledTimes(3);
    expect(mockCanvas.on).toHaveBeenCalledWith('object:added', expect.any(Function));
    expect(mockCanvas.on).toHaveBeenCalledWith('object:removed', expect.any(Function));
    expect(mockCanvas.on).toHaveBeenCalledWith('object:modified', expect.any(Function));
  });
  
  it('should save state correctly', () => {
    historyService.initialize({ canvas: mockCanvas });
    
    // Clear the initial state
    historyService.undoStack = [];
    
    // Mock toJSON to return a specific state
    mockCanvas.toJSON.mockReturnValueOnce({ objects: [{ id: 'test' }] });
    
    // Save state
    const result = historyService.saveState();
    
    expect(result).toBe(true);
    expect(historyService.undoStack.length).toBe(1);
    expect(JSON.parse(historyService.undoStack[0])).toEqual({ objects: [{ id: 'test' }] });
  });
  
  it('should limit history stack size', () => {
    historyService.initialize({
      canvas: mockCanvas,
      maxStates: 3
    });
    
    // Clear initial state and add some test states
    historyService.undoStack = [
      JSON.stringify({ objects: [{ id: 'state1' }] }),
      JSON.stringify({ objects: [{ id: 'state2' }] }),
      JSON.stringify({ objects: [{ id: 'state3' }] })
    ];
    
    // Add a new state, which should remove the oldest one
    mockCanvas.toJSON.mockReturnValueOnce({ objects: [{ id: 'state4' }] });
    historyService.saveState();
    
    expect(historyService.undoStack.length).toBe(3);
    expect(JSON.parse(historyService.undoStack[0])).toEqual({ objects: [{ id: 'state2' }] });
    expect(JSON.parse(historyService.undoStack[2])).toEqual({ objects: [{ id: 'state4' }] });
  });
  
  it('should handle undo correctly', () => {
    historyService.initialize({ canvas: mockCanvas, onChange: mockOnChange });
    
    // Set up test states
    historyService.undoStack = [
      JSON.stringify({ objects: [{ id: 'state1' }] }),
      JSON.stringify({ objects: [{ id: 'state2' }] })
    ];
    historyService.redoStack = [];
    
    // Perform undo
    const result = historyService.undo();
    
    expect(result).toBe(true);
    expect(historyService.undoStack.length).toBe(1);
    expect(historyService.redoStack.length).toBe(1);
    expect(mockCanvas.loadFromJSON).toHaveBeenCalled();
    expect(mockOnChange).toHaveBeenCalled();
  });
  
  it('should handle redo correctly', () => {
    historyService.initialize({ canvas: mockCanvas, onChange: mockOnChange });
    
    // Set up test states
    historyService.undoStack = [
      JSON.stringify({ objects: [{ id: 'state1' }] })
    ];
    historyService.redoStack = [
      JSON.stringify({ objects: [{ id: 'state2' }] })
    ];
    
    // Perform redo
    const result = historyService.redo();
    
    expect(result).toBe(true);
    expect(historyService.undoStack.length).toBe(2);
    expect(historyService.redoStack.length).toBe(0);
    expect(mockCanvas.loadFromJSON).toHaveBeenCalled();
    expect(mockOnChange).toHaveBeenCalled();
  });
  
  it('should not undo when nothing to undo', () => {
    historyService.initialize({ canvas: mockCanvas });
    
    // Set up a single state (nothing to undo)
    historyService.undoStack = [
      JSON.stringify({ objects: [{ id: 'state1' }] })
    ];
    
    // Try to undo
    const result = historyService.undo();
    
    expect(result).toBe(false);
    expect(mockCanvas.loadFromJSON).not.toHaveBeenCalled();
  });
  
  it('should not redo when nothing to redo', () => {
    historyService.initialize({ canvas: mockCanvas });
    
    // Empty redo stack
    historyService.redoStack = [];
    
    // Try to redo
    const result = historyService.redo();
    
    expect(result).toBe(false);
    expect(mockCanvas.loadFromJSON).not.toHaveBeenCalled();
  });
  
  it('should reset history stacks', () => {
    historyService.initialize({ canvas: mockCanvas, onChange: mockOnChange });
    
    // Set up test states
    historyService.undoStack = [
      JSON.stringify({ objects: [{ id: 'state1' }] }),
      JSON.stringify({ objects: [{ id: 'state2' }] })
    ];
    historyService.redoStack = [
      JSON.stringify({ objects: [{ id: 'state3' }] })
    ];
    
    // Reset history
    historyService.resetHistory();
    
    expect(historyService.undoStack.length).toBe(1); // Initial state
    expect(historyService.redoStack.length).toBe(0);
    expect(mockOnChange).toHaveBeenCalled();
  });
  
  it('should get correct history status', () => {
    historyService.initialize({ canvas: mockCanvas });
    
    // Set up test states
    historyService.undoStack = [
      JSON.stringify({ objects: [{ id: 'state1' }] }),
      JSON.stringify({ objects: [{ id: 'state2' }] })
    ];
    historyService.redoStack = [
      JSON.stringify({ objects: [{ id: 'state3' }] })
    ];
    
    // Get status
    const status = historyService.getHistoryStatus();
    
    expect(status).toEqual({
      canUndo: true,
      canRedo: true,
      undoSteps: 1, // undoStack.length - 1
      redoSteps: 1,
      initialized: true
    });
  });
  
  it('should clean up properly', () => {
    // Initialize service
    historyService.initialize({ canvas: mockCanvas });
    
    // Clean up
    historyService.cleanup();
    
    expect(historyService.initialized).toBe(false);
    expect(historyService.canvas).toBe(null);
    expect(historyService.undoStack).toEqual([]);
    expect(historyService.redoStack).toEqual([]);
    expect(mockCanvas.off).toHaveBeenCalledTimes(3);
  });
  
  it('should set change listener', () => {
    historyService.initialize({ canvas: mockCanvas });
    
    // Set a new change listener
    const newListener = vi.fn();
    historyService.setChangeListener(newListener);
    
    // Force a change notification
    historyService.notifyChange();
    
    expect(newListener).toHaveBeenCalled();
  });
});