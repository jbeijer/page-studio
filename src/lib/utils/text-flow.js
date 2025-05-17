/**
 * TextFlow utility for managing text overflow between linked textboxes
 */
export class TextFlow {
  /**
   * Create a new TextFlow instance
   * @param {fabric.Canvas} canvas - The Fabric.js canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.linkedTextboxes = new Map(); // Map of source ID -> target ID array
  }
  
  /**
   * Link two textboxes for text flow
   * @param {fabric.Textbox} sourceTextbox - The source textbox
   * @param {fabric.Textbox} targetTextbox - The target textbox
   * @returns {boolean} - Whether the linking was successful
   */
  linkTextboxes(sourceTextbox, targetTextbox) {
    if (!sourceTextbox || !targetTextbox) return false;
    if (sourceTextbox === targetTextbox) return false;
    
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
      this.canvas.renderAll();
    }
    
    return true;
  }
  
  /**
   * Remove link between textboxes
   * @param {string} sourceId - ID of the source textbox
   * @returns {boolean} - Whether the unlinking was successful
   */
  unlinkTextboxes(sourceId) {
    if (!this.linkedTextboxes.has(sourceId)) return false;
    
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
      this.canvas.renderAll();
    }
    
    return true;
  }
  
  /**
   * Calculate and update text flow from a source textbox to all its linked targets
   * @param {string} sourceId - ID of the source textbox
   */
  updateTextFlow(sourceId) {
    if (!this.linkedTextboxes.has(sourceId)) return;
    
    const sourceTextbox = this.findTextboxById(sourceId);
    if (!sourceTextbox) return;
    
    const targetIds = this.linkedTextboxes.get(sourceId);
    if (!targetIds || targetIds.length === 0) return;
    
    // Get original complete text from source
    const originalText = sourceTextbox.text;
    
    // Process each linked target
    let currentSourceText = originalText;
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
      currentSourceText = overflowText;
    }
  }
  
  /**
   * Calculate which text fits in a textbox and which overflows
   * @param {fabric.Textbox} textbox - The textbox to calculate overflow for
   * @returns {Object} - Object with fittingText and overflowText
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
    if (!this.canvas) return null;
    
    const objects = this.canvas.getObjects('textbox');
    return objects.find(obj => obj.id === id) || null;
  }
  
  /**
   * Get all textboxes on the canvas
   * @returns {fabric.Textbox[]} - Array of textboxes
   */
  getAllTextboxes() {
    if (!this.canvas) return [];
    return this.canvas.getObjects('textbox') || [];
  }
}

/**
 * Create a text flow manager for a canvas
 * @param {fabric.Canvas} canvas - The Fabric.js canvas
 * @returns {TextFlow} - A TextFlow instance
 */
export function createTextFlow(canvas) {
  return new TextFlow(canvas);
}

export default TextFlow;