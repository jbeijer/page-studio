/**
 * ToolService.js
 * Service for managing tools and tool-related functionality in the canvas editor
 */

import { get } from 'svelte/store';
import { activeTool, ToolType, currentToolOptions, toolOptions } from '$lib/stores/toolbar';

/**
 * Service for managing tools and tool-related operations
 * Follows the singleton pattern to ensure consistent tool state across the application
 */
class ToolService {
  constructor() {
    this.canvas = null;
    this.currentTool = ToolType.SELECT;
    this.initialized = false;
  }

  /**
   * Initialize the tool service with a canvas
   * @param {Object} options - Configuration options
   * @param {fabric.Canvas} options.canvas - The Fabric.js canvas to manage tools for
   * @returns {ToolService} - This instance for method chaining
   */
  initialize(options = {}) {
    if (this.initialized) {
      console.warn('ToolService has already been initialized');
      return this;
    }
    
    if (!options.canvas) {
      console.error('ToolService initialization failed: canvas is required');
      return this;
    }
    
    this.canvas = options.canvas;
    this.currentTool = get(activeTool);
    
    // Initialize with current tool
    this.setupCanvasForTool(this.currentTool);
    
    // Subscribe to tool changes
    this.unsubscribe = activeTool.subscribe(newTool => {
      this.currentTool = newTool;
      this.setupCanvasForTool(newTool);
    });
    
    this.initialized = true;
    console.log('ToolService initialized successfully');
    return this;
  }

  /**
   * Setup canvas for a specific tool
   * @param {string} toolType - The type of tool to set up for
   * @returns {boolean} - Success status
   */
  setupCanvasForTool(toolType) {
    if (!this.initialized || !this.canvas) {
      console.warn('ToolService not initialized or canvas not available');
      return false;
    }
    
    try {
      console.log(`Setting up canvas for tool: ${toolType}`);
      
      // Reset canvas drawing mode
      this.canvas.isDrawingMode = false;
      
      // Enable/disable selection based on tool
      this.canvas.selection = toolType === ToolType.SELECT;
      
      // Configure objects for this tool
      this._configureCanvasObjects(toolType);
      
      // Reset the cursor
      this.canvas.defaultCursor = 'default';
      
      // Tool-specific setup
      this._setupToolSpecificBehavior(toolType);
      
      // Ensure full re-render
      this._renderCanvas();
      
      console.log(`Canvas setup complete for tool: ${toolType}`);
      return true;
    } catch (error) {
      console.error(`Error setting up canvas for tool ${toolType}:`, error);
      return false;
    }
  }

  /**
   * Configure canvas objects based on the active tool
   * @param {string} toolType - The type of tool
   * @private
   */
  _configureCanvasObjects(toolType) {
    if (!this.canvas) return;
    
    const canvasObjects = this.canvas.getObjects();
    console.log(`Configuring ${canvasObjects.length} objects for tool: ${toolType}`);
    
    canvasObjects.forEach(obj => {
      // Master page objects have special handling
      if (obj.fromMaster) {
        obj.selectable = false; // Master objects are never directly selectable
        obj.evented = true; // But they can receive events for context menu
      } else {
        // For the TEXT tool, make objects selectable for the double-click editing feature
        obj.selectable = toolType === ToolType.SELECT || 
                        (toolType === ToolType.TEXT && obj.type === 'textbox');
        obj.evented = true; // Keep evented true to ensure objects remain visible and can receive events
        
        // Only enable selection for the SELECT tool (and TEXT tool for text objects)
        if (toolType === ToolType.SELECT) {
          obj.hoverCursor = 'move'; // Default cursor for selectable objects
        } else if (toolType === ToolType.TEXT && obj.type === 'textbox') {
          obj.hoverCursor = 'text'; // Text cursor for text objects in TEXT mode
        } else {
          obj.hoverCursor = 'default'; // Change cursor for non-selectable objects
        }
      }
      
      // Ensure all objects are visible
      obj.visible = true;
      obj.opacity = obj.opacity === 0 ? 1 : obj.opacity;
    });
  }

  /**
   * Set up tool-specific behavior
   * @param {string} toolType - The type of tool
   * @private
   */
  _setupToolSpecificBehavior(toolType) {
    if (!this.canvas) return;
    
    switch (toolType) {
      case ToolType.TEXT:
        console.log("Setting text cursor for TEXT tool");
        this.canvas.defaultCursor = 'text';
        
        // Also set the wrapper element cursor if available
        if (this.canvas.wrapperEl) {
          this.canvas.wrapperEl.style.cursor = 'text';
        }
        break;
        
      case ToolType.IMAGE:
        console.log("Setting crosshair cursor for IMAGE tool");
        this.canvas.defaultCursor = 'crosshair';
        
        // Also set the wrapper element cursor if available
        if (this.canvas.wrapperEl) {
          this.canvas.wrapperEl.style.cursor = 'crosshair';
        }
        break;
        
      case ToolType.RECTANGLE:
      case ToolType.ELLIPSE:
      case ToolType.LINE:
        console.log(`Setting crosshair cursor for ${toolType} tool`);
        this.canvas.defaultCursor = 'crosshair';
        
        // Also set the wrapper element cursor if available
        if (this.canvas.wrapperEl) {
          this.canvas.wrapperEl.style.cursor = 'crosshair';
        }
        break;
        
      case ToolType.SELECT:
        // Also set the wrapper element cursor if available
        if (this.canvas.wrapperEl) {
          this.canvas.wrapperEl.style.cursor = 'default';
        }
        break;
    }
  }

  /**
   * Ensure canvas is properly rendered
   * @private
   */
  _renderCanvas() {
    if (!this.canvas) return;
    
    // Initial render
    this.canvas.requestRenderAll();
    this.canvas.renderAll();
    
    // Make another render call after a short delay to ensure everything is visible
    setTimeout(() => {
      console.log("Performing delayed render for tool change");
      this.canvas.requestRenderAll();
      this.canvas.renderAll();
    }, 100);
  }

  /**
   * Get current tool options
   * @returns {Object} - The options for the current tool
   */
  getCurrentToolOptions() {
    return get(currentToolOptions);
  }

  /**
   * Get options for a specific tool
   * @param {string} toolType - The type of tool
   * @returns {Object} - The options for the specified tool
   */
  getToolOptions(toolType) {
    const allOptions = get(toolOptions);
    return allOptions[toolType] || {};
  }

  /**
   * Update options for the current tool
   * @param {Object} options - The new options to apply
   * @returns {ToolService} - This instance for method chaining
   */
  updateCurrentToolOptions(options) {
    if (!options || typeof options !== 'object') return this;
    
    const currentTool = get(activeTool);
    toolOptions.update(currentOptions => {
      return {
        ...currentOptions,
        [currentTool]: {
          ...currentOptions[currentTool],
          ...options
        }
      };
    });
    
    return this;
  }

  /**
   * Update options for a specific tool
   * @param {string} toolType - The type of tool to update options for
   * @param {Object} options - The new options to apply
   * @returns {ToolService} - This instance for method chaining
   */
  updateToolOptions(toolType, options) {
    if (!toolType || !options || typeof options !== 'object') return this;
    
    toolOptions.update(currentOptions => {
      return {
        ...currentOptions,
        [toolType]: {
          ...currentOptions[toolType],
          ...options
        }
      };
    });
    
    return this;
  }

  /**
   * Set the active tool
   * @param {string} toolType - The type of tool to activate
   * @returns {boolean} - Success status
   */
  setActiveTool(toolType) {
    if (!Object.values(ToolType).includes(toolType)) {
      console.error(`Invalid tool type: ${toolType}`);
      return false;
    }
    
    activeTool.set(toolType);
    this.currentTool = toolType;
    
    if (this.initialized && this.canvas) {
      this.setupCanvasForTool(toolType);
    }
    
    return true;
  }

  /**
   * Get the currently active tool
   * @returns {string} - The current tool type
   */
  getActiveTool() {
    return this.currentTool;
  }

  /**
   * Check if a tool is active
   * @param {string} toolType - The tool type to check
   * @returns {boolean} - True if the specified tool is active
   */
  isToolActive(toolType) {
    return this.currentTool === toolType;
  }

  /**
   * Reset options for a specific tool to default values
   * @param {string} toolType - The tool type to reset options for
   * @returns {ToolService} - This instance for method chaining
   */
  resetToolOptions(toolType) {
    if (!Object.values(ToolType).includes(toolType)) {
      console.error(`Invalid tool type: ${toolType}`);
      return this;
    }
    
    const defaultOptions = {
      [ToolType.SELECT]: {
        enableGroupSelection: true,
      },
      [ToolType.TEXT]: {
        fontSize: 16,
        fontFamily: 'Arial',
        fontStyle: 'normal',
        fontWeight: 'normal',
        textAlign: 'left',
        textDecoration: ''
      },
      [ToolType.IMAGE]: {
        preserveAspectRatio: true,
      },
      [ToolType.RECTANGLE]: {
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 1,
        cornerRadius: 0
      },
      [ToolType.ELLIPSE]: {
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 1
      },
      [ToolType.LINE]: {
        stroke: '#000000',
        strokeWidth: 1,
        arrowStart: false,
        arrowEnd: false
      }
    };
    
    toolOptions.update(currentOptions => {
      return {
        ...currentOptions,
        [toolType]: { ...defaultOptions[toolType] }
      };
    });
    
    return this;
  }

  /**
   * Clean up event listeners and reset the service state
   */
  cleanup() {
    if (typeof this.unsubscribe === 'function') {
      this.unsubscribe();
    }
    
    this.canvas = null;
    this.initialized = false;
    
    console.log('ToolService cleaned up');
  }
}

// Create and export singleton instance
const toolService = new ToolService();
export default toolService;