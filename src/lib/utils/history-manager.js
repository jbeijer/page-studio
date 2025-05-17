/**
 * Manages undo/redo history for a Fabric.js canvas
 */
export default class HistoryManager {
  /**
   * @param {fabric.Canvas} canvas - The Fabric.js canvas to manage history for
   * @param {Object} options - Configuration options
   * @param {number} options.maxStates - Maximum number of states to store
   * @param {function} options.onChange - Callback when history state changes
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.maxStates = options.maxStates || 30;
    this.onChange = options.onChange || (() => {});
    
    this.undoStack = [];
    this.redoStack = [];
    this.isSaving = false;
    this.isRestoring = false;
    
    // Bind fabric events to save history states
    this.setupCanvasEvents();
  }
  
  /**
   * Set up event listeners on the canvas
   */
  setupCanvasEvents() {
    const saveState = () => {
      if (!this.isRestoring && !this.isSaving) {
        this.saveState();
      }
    };
    
    this.canvas.on('object:added', saveState);
    this.canvas.on('object:removed', saveState);
    this.canvas.on('object:modified', saveState);
    
    // Save initial state
    this.saveState();
  }
  
  /**
   * Remove event listeners
   */
  dispose() {
    this.canvas.off('object:added');
    this.canvas.off('object:removed');
    this.canvas.off('object:modified');
  }
  
  /**
   * Save the current canvas state to the undo stack
   */
  saveState() {
    this.isSaving = true;
    
    // Clear redo stack when a new action is performed
    this.redoStack = [];
    
    // Get canvas state (deep clone objects)
    const state = JSON.stringify(this.canvas.toJSON(['id', 'linkedObjectIds', 'fromMaster', 'masterId', 'masterObjectId', 'overridable']));
    
    // Push to undo stack
    this.undoStack.push(state);
    
    // Limit the stack size
    if (this.undoStack.length > this.maxStates) {
      this.undoStack.shift();
    }
    
    // Notify of changes
    this.onChange({
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    });
    
    this.isSaving = false;
  }
  
  /**
   * Restore a state from the history stacks
   * @param {string} state - JSON state to restore
   */
  restoreState(state) {
    if (!state) return;
    
    this.isRestoring = true;
    
    // Clear canvas
    this.canvas.clear();
    
    // Load state
    this.canvas.loadFromJSON(JSON.parse(state), () => {
      this.canvas.renderAll();
      this.isRestoring = false;
      
      // Notify of changes
      this.onChange({
        canUndo: this.canUndo(),
        canRedo: this.canRedo()
      });
    });
  }
  
  /**
   * Check if undo is available
   * @returns {boolean} Whether undo is available
   */
  canUndo() {
    return this.undoStack.length > 1; // Keep at least one state (current)
  }
  
  /**
   * Check if redo is available
   * @returns {boolean} Whether redo is available
   */
  canRedo() {
    return this.redoStack.length > 0;
  }
  
  /**
   * Undo the last action
   */
  undo() {
    if (!this.canUndo()) return;
    
    // Get current state and move to redo stack
    const currentState = this.undoStack.pop();
    this.redoStack.push(currentState);
    
    // Restore the previous state
    const prevState = this.undoStack[this.undoStack.length - 1];
    this.restoreState(prevState);
  }
  
  /**
   * Redo the previously undone action
   */
  redo() {
    if (!this.canRedo()) return;
    
    // Get state from redo stack
    const state = this.redoStack.pop();
    
    // Add to undo stack
    this.undoStack.push(state);
    
    // Restore the state
    this.restoreState(state);
  }
  
  /**
   * Gets history state information
   * @returns {Object} History state info
   */
  getHistoryStatus() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoSteps: this.undoStack.length - 1,
      redoSteps: this.redoStack.length
    };
  }
}