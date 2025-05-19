/**
 * HistoryService.js
 * Service for managing undo/redo functionality in the canvas editor
 */

/**
 * Service for managing undo/redo history for a Fabric.js canvas
 * Follows the singleton pattern to ensure consistent history state across the application
 */
class HistoryService {
  constructor() {
    this.canvas = null;
    this.maxStates = 30;
    this.onChange = null;
    
    this.undoStack = [];
    this.redoStack = [];
    this.isSaving = false;
    this.isRestoring = false;
    this.initialized = false;
  }

  /**
   * Initialize the history service with a canvas and options
   * @param {Object} options - Configuration options
   * @param {fabric.Canvas} options.canvas - The Fabric.js canvas to manage history for
   * @param {number} [options.maxStates=30] - Maximum number of states to store
   * @param {function} [options.onChange] - Callback when history state changes
   * @returns {HistoryService} - This instance for method chaining
   */
  initialize(options = {}) {
    if (this.initialized) {
      console.warn('HistoryService has already been initialized');
      return this;
    }
    
    if (!options.canvas) {
      console.error('HistoryService initialization failed: canvas is required');
      return this;
    }
    
    this.canvas = options.canvas;
    this.maxStates = options.maxStates || 30;
    this.onChange = options.onChange || (() => {});
    
    this.undoStack = [];
    this.redoStack = [];
    
    // Set up event listeners
    this.setupCanvasEvents();
    
    // Save initial state
    this.saveState();
    
    this.initialized = true;
    console.log('HistoryService initialized successfully');
    return this;
  }

  /**
   * Set up event listeners on the canvas
   * @private
   */
  setupCanvasEvents() {
    if (!this.canvas) return;
    
    const saveState = () => {
      if (!this.isRestoring && !this.isSaving) {
        this.saveState();
      }
    };
    
    // Clean up any existing event handlers first
    this.canvas.off('object:added', saveState);
    this.canvas.off('object:removed', saveState);
    this.canvas.off('object:modified', saveState);
    
    // Add new event handlers
    this.canvas.on('object:added', saveState);
    this.canvas.on('object:removed', saveState);
    this.canvas.on('object:modified', saveState);
  }

  /**
   * Save the current canvas state to the undo stack
   * @returns {boolean} Success status
   */
  saveState() {
    if (!this.initialized || !this.canvas) {
      console.warn('HistoryService not initialized');
      return false;
    }
    
    this.isSaving = true;
    
    try {
      // Clear redo stack when a new action is performed
      this.redoStack = [];
      
      // Get canvas state (deep clone objects with additional properties)
      const state = JSON.stringify(this.canvas.toJSON([
        'id', 'linkedObjectIds', 'fromMaster', 'masterId', 'masterObjectId', 'overridable'
      ]));
      
      // Push to undo stack
      this.undoStack.push(state);
      
      // Limit the stack size
      if (this.undoStack.length > this.maxStates) {
        this.undoStack.shift();
      }
      
      // Notify of changes
      this.notifyChange();
      
      this.isSaving = false;
      return true;
    } catch (error) {
      console.error('Error saving history state:', error);
      this.isSaving = false;
      return false;
    }
  }

  /**
   * Restore a state from the history stacks
   * @param {string} state - JSON state to restore
   * @returns {boolean} Success status
   * @private
   */
  restoreState(state) {
    if (!this.initialized || !this.canvas) {
      console.warn('HistoryService not initialized');
      return false;
    }
    
    if (!state) return false;
    
    this.isRestoring = true;
    
    try {
      // Clear canvas
      this.canvas.clear();
      
      // Parse the state
      const jsonState = JSON.parse(state);
      
      // Load state
      this.canvas.loadFromJSON(jsonState, () => {
        this.canvas.renderAll();
        this.isRestoring = false;
        
        // Notify of changes
        this.notifyChange();
      });
      
      return true;
    } catch (error) {
      console.error('Error restoring history state:', error);
      this.isRestoring = false;
      return false;
    }
  }

  /**
   * Notify listeners about history state changes
   * @private
   */
  notifyChange() {
    if (typeof this.onChange === 'function') {
      this.onChange({
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        undoSteps: this.undoStack.length - 1,
        redoSteps: this.redoStack.length
      });
    }
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
   * @returns {boolean} Success status
   */
  undo() {
    if (!this.initialized) {
      console.warn('HistoryService not initialized');
      return false;
    }
    
    if (!this.canUndo()) return false;
    
    try {
      // Get current state and move to redo stack
      const currentState = this.undoStack.pop();
      this.redoStack.push(currentState);
      
      // Restore the previous state
      const prevState = this.undoStack[this.undoStack.length - 1];
      return this.restoreState(prevState);
    } catch (error) {
      console.error('Error during undo operation:', error);
      return false;
    }
  }

  /**
   * Redo the previously undone action
   * @returns {boolean} Success status
   */
  redo() {
    if (!this.initialized) {
      console.warn('HistoryService not initialized');
      return false;
    }
    
    if (!this.canRedo()) return false;
    
    try {
      // Get state from redo stack
      const state = this.redoStack.pop();
      
      // Add to undo stack
      this.undoStack.push(state);
      
      // Restore the state
      return this.restoreState(state);
    } catch (error) {
      console.error('Error during redo operation:', error);
      return false;
    }
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
      redoSteps: this.redoStack.length,
      initialized: this.initialized
    };
  }

  /**
   * Set a callback function to be called when history state changes
   * @param {function} callback - Function to call when history state changes
   * @returns {HistoryService} - This instance for method chaining
   */
  setChangeListener(callback) {
    if (typeof callback === 'function') {
      this.onChange = callback;
    }
    return this;
  }

  /**
   * Reset history stacks
   * @returns {HistoryService} - This instance for method chaining
   */
  resetHistory() {
    this.undoStack = [];
    this.redoStack = [];
    
    // Save current state as the initial state
    if (this.initialized && this.canvas) {
      this.saveState();
    }
    
    this.notifyChange();
    return this;
  }

  /**
   * Clean up event listeners and reset the service state
   */
  cleanup() {
    if (this.canvas) {
      // Remove event listeners
      this.canvas.off('object:added');
      this.canvas.off('object:removed');
      this.canvas.off('object:modified');
    }
    
    this.canvas = null;
    this.undoStack = [];
    this.redoStack = [];
    this.onChange = null;
    this.isSaving = false;
    this.isRestoring = false;
    this.initialized = false;
    
    console.log('HistoryService cleaned up');
  }
}

// Create and export singleton instance
const historyService = new HistoryService();
export default historyService;