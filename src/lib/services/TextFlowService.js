/**
 * TextFlowService.js
 * Service for managing text flow between linked textboxes
 */

/**
 * Service for managing text overflow between linked textboxes
 * Follows the singleton pattern to ensure consistent text flow across the application
 */
class TextFlowService {
  constructor() {
    this.canvas = null;
    this.linkedTextboxes = new Map(); // Map of source ID -> target ID array
    this.initialized = false;
  }

  /**
   * Initialize the service with a canvas
   * @param {Object} options - Configuration options
   * @param {fabric.Canvas} options.canvas - The Fabric.js canvas
   * @returns {TextFlowService} - This instance for method chaining
   */
  initialize(options = {}) {
    if (this.initialized) {
      console.warn('TextFlowService has already been initialized');
      return this;
    }
    
    if (!options.canvas) {
      console.error('TextFlowService initialization failed: canvas is required');
      return this;
    }
    
    this.canvas = options.canvas;
    this.linkedTextboxes = new Map();
    this.initialized = true;
    console.log('TextFlowService initialized successfully');
    return this;
  }

  /**
   * Link two textboxes for text flow
   * @param {fabric.Textbox} sourceTextbox - The source textbox
   * @param {fabric.Textbox} targetTextbox - The target textbox
   * @returns {boolean} - Whether the linking was successful
   */
  linkTextboxes(sourceTextbox, targetTextbox) {
    if (!this.initialized) {
      console.warn('TextFlowService not initialized');
      return false;
    }

    if (!sourceTextbox || !targetTextbox) return false;
    if (sourceTextbox === targetTextbox) return false;
    
    try {
      // Ensure textboxes have IDs
      if (!sourceTextbox.id) {
        sourceTextbox.id = `text-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
      
      if (!targetTextbox.id) {
        targetTextbox.id = `text-${Date.now() + 1}-${Math.floor(Math.random() * 1000)}`;
      }
      
      // Set up linked objects in source
      if (!sourceTextbox.linkedObjectIds) {
        sourceTextbox.linkedObjectIds = [];
      }
      
      // Add the target to the source's linked objects
      sourceTextbox.linkedObjectIds.push(targetTextbox.id);
      
      // Update our internal tracking
      if (!this.linkedTextboxes.has(sourceTextbox.id)) {
        this.linkedTextboxes.set(sourceTextbox.id, []);
      }
      
      this.linkedTextboxes.get(sourceTextbox.id).push(targetTextbox.id);
      
      // Visual indicators
      sourceTextbox.set({
        stroke: '#3B82F6',
        strokeWidth: 1,
        strokeDashArray: [5, 5]
      });
      
      targetTextbox.set({
        stroke: '#3B82F6',
        strokeWidth: 1,
        strokeDashArray: [5, 5]
      });
      
      // Set up event handlers
      sourceTextbox.on('changed', () => this.updateTextFlow(sourceTextbox.id));
      sourceTextbox.on('modified', () => this.updateTextFlow(sourceTextbox.id));
      
      // Do initial flow calculation
      this.updateTextFlow(sourceTextbox.id);
      
      if (this.canvas) {
        this.canvas.requestRenderAll();
        this.canvas.renderAll();
      }
      
      return true;
    } catch (error) {
      console.error('Error linking textboxes:', error);
      return false;
    }
  }

  /**
   * Remove link between textboxes
   * @param {string} sourceId - ID of the source textbox
   * @returns {boolean} - Whether the unlinking was successful
   */
  unlinkTextboxes(sourceId) {
    if (!this.initialized) {
      console.warn('TextFlowService not initialized');
      return false;
    }

    if (!this.linkedTextboxes.has(sourceId)) return false;
    
    try {
      const targetIds = this.linkedTextboxes.get(sourceId);
      const sourceTextbox = this.findTextboxById(sourceId);
      
      if (!sourceTextbox) return false;
      
      // Reset visual styling on source
      sourceTextbox.set({
        stroke: '',
        strokeWidth: 0,
        strokeDashArray: []
      });
      
      // Reset visual styling on targets
      targetIds.forEach(targetId => {
        const targetTextbox = this.findTextboxById(targetId);
        if (targetTextbox) {
          targetTextbox.set({
            stroke: '',
            strokeWidth: 0,
            strokeDashArray: []
          });
          // Clear the text in the target
          targetTextbox.set('text', '');
        }
      });
      
      // Clear links in source object
      if (sourceTextbox.linkedObjectIds) {
        sourceTextbox.linkedObjectIds = [];
      }
      
      // Remove from our tracking
      this.linkedTextboxes.delete(sourceId);
      
      if (this.canvas) {
        this.canvas.requestRenderAll();
        this.canvas.renderAll();
      }
      
      return true;
    } catch (error) {
      console.error('Error unlinking textboxes:', error);
      return false;
    }
  }

  /**
   * Calculate and update text flow from a source textbox to all its linked targets
   * @param {string} sourceId - ID of the source textbox
   * @returns {boolean} - Whether the update was successful
   */
  updateTextFlow(sourceId) {
    if (!this.initialized) {
      console.warn('TextFlowService not initialized');
      return false;
    }

    if (!this.linkedTextboxes.has(sourceId)) return false;
    
    try {
      const sourceTextbox = this.findTextboxById(sourceId);
      if (!sourceTextbox) return false;
      
      const targetIds = this.linkedTextboxes.get(sourceId);
      if (!targetIds || targetIds.length === 0) return false;
      
      // Get original complete text from source
      const originalText = sourceTextbox.text;
      
      // Process each linked target
      let currentSource = sourceTextbox;
      
      for (const targetId of targetIds) {
        const targetTextbox = this.findTextboxById(targetId);
        if (!targetTextbox) continue;
        
        // Calculate text that fits in current source
        const { fittingText, overflowText } = this.calculateTextOverflow(currentSource);
        
        // If no overflow, clear target and stop
        if (!overflowText) {
          targetTextbox.set('text', '');
          continue;
        }
        
        // Update source with fitting text (only for intermediate boxes, not the original)
        if (currentSource !== sourceTextbox) {
          currentSource.set('text', fittingText);
        }
        
        // Update target with overflow
        targetTextbox.set('text', overflowText);
        
        // Set target as next source
        currentSource = targetTextbox;
      }
      
      if (this.canvas) {
        this.canvas.requestRenderAll();
        this.canvas.renderAll();
      }
      
      return true;
    } catch (error) {
      console.error('Error updating text flow:', error);
      return false;
    }
  }

  /**
   * Calculate which text fits in a textbox and which overflows
   * @param {fabric.Textbox} textbox - The textbox to calculate overflow for
   * @returns {Object} - Object with fittingText and overflowText
   * @private
   */
  calculateTextOverflow(textbox) {
    if (!textbox || !textbox._textLines) {
      return { fittingText: textbox?.text || '', overflowText: '' };
    }
    
    const text = textbox.text;
    const textLines = textbox._textLines;
    
    // Calculate height constraints
    const maxHeight = textbox.height - (textbox.padding * 2);
    const lineHeight = textbox.lineHeight || 1.16;
    const fontSize = textbox.fontSize || 16;
    const lineHeightPx = fontSize * lineHeight;
    
    // Calculate how many lines fit
    const maxLines = Math.floor(maxHeight / lineHeightPx);
    
    // If all lines fit, there's no overflow
    if (textLines.length <= maxLines) {
      return { fittingText: text, overflowText: '' };
    }
    
    // Split text into lines
    const allLines = text.split('\n');
    
    // If simple line count works, use that
    if (allLines.length >= maxLines) {
      const fittingLines = allLines.slice(0, maxLines);
      const overflowLines = allLines.slice(maxLines);
      
      return {
        fittingText: fittingLines.join('\n'),
        overflowText: overflowLines.join('\n')
      };
    }
    
    // For more complex text with wrapping, use the textLines array from Fabric
    let fittingText = '';
    let overflowText = '';
    let lineIndex = 0;
    
    for (let i = 0; i < Math.min(maxLines, textLines.length); i++) {
      if (i > 0) fittingText += '\n';
      fittingText += textLines[i];
      lineIndex++;
    }
    
    for (let i = lineIndex; i < textLines.length; i++) {
      if (i > lineIndex) overflowText += '\n';
      overflowText += textLines[i];
    }
    
    return { fittingText, overflowText };
  }

  /**
   * Find a textbox on the canvas by its ID
   * @param {string} id - The ID of the textbox to find
   * @returns {fabric.Textbox|null} - The found textbox or null
   */
  findTextboxById(id) {
    if (!this.initialized || !this.canvas) return null;
    
    try {
      const objects = this.canvas.getObjects('textbox');
      return objects.find(obj => obj.id === id) || null;
    } catch (error) {
      console.error('Error finding textbox by ID:', error);
      return null;
    }
  }

  /**
   * Get all textboxes on the canvas
   * @returns {fabric.Textbox[]} - Array of textboxes
   */
  getAllTextboxes() {
    if (!this.initialized || !this.canvas) return [];
    
    try {
      return this.canvas.getObjects('textbox') || [];
    } catch (error) {
      console.error('Error getting all textboxes:', error);
      return [];
    }
  }

  /**
   * Get all linked textboxes
   * @returns {Map} - Map of source ID -> target IDs
   */
  getLinkedTextboxes() {
    return new Map(this.linkedTextboxes);
  }

  /**
   * Check if a textbox has linked targets
   * @param {string} textboxId - ID of the textbox to check
   * @returns {boolean} - Whether the textbox has linked targets
   */
  hasLinkedTargets(textboxId) {
    return this.linkedTextboxes.has(textboxId) && 
           this.linkedTextboxes.get(textboxId).length > 0;
  }

  /**
   * Get target textboxes linked to a source
   * @param {string} sourceId - ID of the source textbox
   * @returns {string[]} - Array of target textbox IDs
   */
  getLinkedTargets(sourceId) {
    if (!this.linkedTextboxes.has(sourceId)) return [];
    return [...this.linkedTextboxes.get(sourceId)];
  }

  /**
   * Update the canvas reference (useful when canvas is recreated)
   * @param {fabric.Canvas} canvas - The new canvas reference
   * @returns {TextFlowService} - This instance for method chaining
   */
  updateCanvas(canvas) {
    if (!canvas) {
      console.error('TextFlowService: Cannot update with null canvas');
      return this;
    }
    
    this.canvas = canvas;
    return this;
  }

  /**
   * Clean up event listeners and reset the service state
   */
  cleanup() {
    // Remove event handlers from all textboxes
    if (this.canvas) {
      const textboxes = this.canvas.getObjects('textbox');
      textboxes.forEach(textbox => {
        textbox.off('changed');
        textbox.off('modified');
      });
    }
    
    this.canvas = null;
    this.linkedTextboxes.clear();
    this.initialized = false;
    
    console.log('TextFlowService cleaned up');
  }
}

// Create and export singleton instance
const textFlowService = new TextFlowService();
export default textFlowService;