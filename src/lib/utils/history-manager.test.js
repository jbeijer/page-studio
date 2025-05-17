import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import HistoryManager from './history-manager';

// Mock Fabric.js canvas
const createMockCanvas = () => ({
  clear: vi.fn(),
  toJSON: vi.fn(() => ({ objects: [{ id: 'mock-obj-1' }] })),
  loadFromJSON: vi.fn((json, callback) => callback && callback()),
  renderAll: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
});

describe('HistoryManager', () => {
  let canvas;
  let historyManager;
  let onChangeMock;
  
  beforeEach(() => {
    canvas = createMockCanvas();
    onChangeMock = vi.fn();
    historyManager = new HistoryManager(canvas, { 
      maxStates: 5, 
      onChange: onChangeMock 
    });
    
    // Clear the initial state to start fresh
    historyManager.undoStack = [];
    historyManager.redoStack = [];
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('should initialize correctly', () => {
    expect(historyManager.canvas).toBe(canvas);
    expect(historyManager.maxStates).toBe(5);
    expect(historyManager.onChange).toBe(onChangeMock);
    expect(canvas.on).toHaveBeenCalledTimes(3); // object:added, object:removed, object:modified
  });
  
  it('should save states to the undo stack', () => {
    const mockState = JSON.stringify({ objects: [{ id: 'state-1' }] });
    canvas.toJSON.mockReturnValueOnce({ objects: [{ id: 'state-1' }] });
    
    historyManager.saveState();
    
    expect(historyManager.undoStack).toHaveLength(1);
    expect(historyManager.undoStack[0]).toBe(mockState);
    expect(onChangeMock).toHaveBeenCalledWith({ 
      canUndo: false, // because we need at least 2 states to undo
      canRedo: false 
    });
    
    // Add another state
    canvas.toJSON.mockReturnValueOnce({ objects: [{ id: 'state-2' }] });
    historyManager.saveState();
    
    expect(historyManager.undoStack).toHaveLength(2);
    expect(onChangeMock).toHaveBeenCalledWith({ 
      canUndo: true, // now we have 2 states, so we can undo
      canRedo: false 
    });
  });
  
  it('should limit the stack size to maxStates', () => {
    // Save more than maxStates
    for (let i = 0; i < 10; i++) {
      canvas.toJSON.mockReturnValueOnce({ objects: [{ id: `state-${i}` }] });
      historyManager.saveState();
    }
    
    expect(historyManager.undoStack).toHaveLength(5); // limited by maxStates
  });
  
  it('should restore states correctly', () => {
    // Add a test state
    const state = JSON.stringify({ objects: [{ id: 'test-state' }] });
    
    historyManager.restoreState(state);
    
    expect(canvas.clear).toHaveBeenCalled();
    expect(canvas.loadFromJSON).toHaveBeenCalledWith(JSON.parse(state), expect.any(Function));
    expect(canvas.renderAll).toHaveBeenCalled();
  });
  
  it('should handle undo correctly', () => {
    // Setup: Save two states
    canvas.toJSON
      .mockReturnValueOnce({ objects: [{ id: 'state-1' }] })
      .mockReturnValueOnce({ objects: [{ id: 'state-2' }] });
    
    historyManager.saveState(); // state-1
    historyManager.saveState(); // state-2
    
    // Mock the restore function
    const restoreSpy = vi.spyOn(historyManager, 'restoreState');
    
    // Perform undo
    historyManager.undo();
    
    // Verify state-1 was restored
    expect(historyManager.undoStack).toHaveLength(1);
    expect(historyManager.redoStack).toHaveLength(1);
    expect(restoreSpy).toHaveBeenCalled();
  });
  
  it('should handle redo correctly', () => {
    // Setup: Save two states and undo
    canvas.toJSON
      .mockReturnValueOnce({ objects: [{ id: 'state-1' }] })
      .mockReturnValueOnce({ objects: [{ id: 'state-2' }] });
    
    historyManager.saveState(); // state-1
    historyManager.saveState(); // state-2
    historyManager.undo(); // undo to state-1
    
    // Mock the restore function
    const restoreSpy = vi.spyOn(historyManager, 'restoreState');
    
    // Perform redo
    historyManager.redo();
    
    // Verify state-2 was restored
    expect(historyManager.undoStack).toHaveLength(2);
    expect(historyManager.redoStack).toHaveLength(0);
    expect(restoreSpy).toHaveBeenCalled();
  });
  
  it('should clear redo stack when a new action is performed', () => {
    // Setup: Save two states, undo, then save a new state
    canvas.toJSON
      .mockReturnValueOnce({ objects: [{ id: 'state-1' }] })
      .mockReturnValueOnce({ objects: [{ id: 'state-2' }] })
      .mockReturnValueOnce({ objects: [{ id: 'state-3' }] });
    
    historyManager.saveState(); // state-1
    historyManager.saveState(); // state-2
    historyManager.undo(); // undo to state-1, state-2 is in redoStack
    
    expect(historyManager.redoStack).toHaveLength(1);
    
    // Save a new state
    historyManager.saveState(); // state-3
    
    // The redo stack should be cleared
    expect(historyManager.redoStack).toHaveLength(0);
  });
  
  it('should dispose event listeners correctly', () => {
    historyManager.dispose();
    
    expect(canvas.off).toHaveBeenCalledTimes(3); // All 3 events should be unbound
  });
});