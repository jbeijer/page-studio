import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextFlow, createTextFlow } from './text-flow';

describe('TextFlow', () => {
  let mockCanvas;
  let textFlow;
  let mockSourceTextbox;
  let mockTargetTextbox;
  
  beforeEach(() => {
    // Mock canvas
    mockCanvas = {
      renderAll: vi.fn(),
      getObjects: vi.fn().mockReturnValue([])
    };
    
    // Create TextFlow instance
    textFlow = new TextFlow(mockCanvas);
    
    // Mock textboxes
    mockSourceTextbox = {
      id: 'source-1',
      text: 'This is a long text that should overflow to the next textbox and demonstrate the text flow functionality.',
      _textLines: [
        'This is a long text',
        'that should overflow',
        'to the next textbox',
        'and demonstrate the',
        'text flow functionality.'
      ],
      height: 80,
      padding: 5,
      lineHeight: 1.16,
      fontSize: 16,
      on: vi.fn(),
      set: vi.fn(),
      linkedObjectIds: []
    };
    
    mockTargetTextbox = {
      id: 'target-1',
      text: '',
      _textLines: [],
      height: 80,
      padding: 5,
      lineHeight: 1.16,
      fontSize: 16,
      on: vi.fn(),
      set: vi.fn()
    };
    
    // Update mock canvas getObjects to return our textboxes
    mockCanvas.getObjects.mockImplementation((type) => {
      if (type === 'textbox') {
        return [mockSourceTextbox, mockTargetTextbox];
      }
      return [];
    });
  });
  
  describe('constructor', () => {
    it('should initialize with a canvas and empty linkedTextboxes map', () => {
      expect(textFlow.canvas).toBe(mockCanvas);
      expect(textFlow.linkedTextboxes instanceof Map).toBe(true);
      expect(textFlow.linkedTextboxes.size).toBe(0);
    });
  });
  
  describe('linkTextboxes', () => {
    it('should link two textboxes for text flow', () => {
      const result = textFlow.linkTextboxes(mockSourceTextbox, mockTargetTextbox);
      
      expect(result).toBe(true);
      expect(textFlow.linkedTextboxes.has('source-1')).toBe(true);
      expect(textFlow.linkedTextboxes.get('source-1')).toContain('target-1');
      expect(mockSourceTextbox.set).toHaveBeenCalled();
      expect(mockTargetTextbox.set).toHaveBeenCalled();
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });
    
    it('should not link a textbox to itself', () => {
      const result = textFlow.linkTextboxes(mockSourceTextbox, mockSourceTextbox);
      
      expect(result).toBe(false);
      expect(textFlow.linkedTextboxes.has('source-1')).toBe(false);
    });
    
    it('should handle missing textboxes', () => {
      const result = textFlow.linkTextboxes(null, mockTargetTextbox);
      
      expect(result).toBe(false);
      expect(textFlow.linkedTextboxes.size).toBe(0);
    });
  });
  
  describe('unlinkTextboxes', () => {
    beforeEach(() => {
      // Setup linked textboxes
      textFlow.linkTextboxes(mockSourceTextbox, mockTargetTextbox);
    });
    
    it('should unlink textboxes and clear styling', () => {
      const result = textFlow.unlinkTextboxes('source-1');
      
      expect(result).toBe(true);
      expect(textFlow.linkedTextboxes.has('source-1')).toBe(false);
      expect(mockSourceTextbox.set).toHaveBeenCalledWith({
        stroke: '',
        strokeWidth: 0,
        strokeDashArray: []
      });
      expect(mockTargetTextbox.set).toHaveBeenCalledWith({
        stroke: '',
        strokeWidth: 0,
        strokeDashArray: []
      });
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });
    
    it('should return false for unknown source ID', () => {
      const result = textFlow.unlinkTextboxes('unknown-id');
      
      expect(result).toBe(false);
    });
  });
  
  describe('calculateTextOverflow', () => {
    it('should calculate text overflow correctly when text exceeds available space', () => {
      // Setup a textbox that can only fit 2 lines
      const textbox = {
        text: 'Line 1\nLine 2\nLine 3\nLine 4',
        _textLines: ['Line 1', 'Line 2', 'Line 3', 'Line 4'],
        height: 50,
        padding: 5,
        lineHeight: 1.16,
        fontSize: 16
      };
      
      const { fittingText, overflowText } = textFlow.calculateTextOverflow(textbox);
      
      // With 16px font, 1.16 line height, and 50px height with 10px padding,
      // we should fit 2 lines: (50 - 10) / (16 * 1.16) ≈ 2.15 lines
      expect(fittingText).toBe('Line 1\nLine 2');
      expect(overflowText).toBe('Line 3\nLine 4');
    });
    
    it('should return all text as fitting when no overflow', () => {
      // Setup a textbox that can fit all lines
      const textbox = {
        text: 'Line 1\nLine 2',
        _textLines: ['Line 1', 'Line 2'],
        height: 100,
        padding: 5,
        lineHeight: 1.16,
        fontSize: 16
      };
      
      const { fittingText, overflowText } = textFlow.calculateTextOverflow(textbox);
      
      expect(fittingText).toBe('Line 1\nLine 2');
      expect(overflowText).toBe('');
    });
    
    it('should handle null or undefined textbox', () => {
      const { fittingText, overflowText } = textFlow.calculateTextOverflow(null);
      
      expect(fittingText).toBe('');
      expect(overflowText).toBe('');
    });
  });
  
  describe('findTextboxById', () => {
    it('should find a textbox by ID', () => {
      const textbox = textFlow.findTextboxById('source-1');
      
      expect(textbox).toBe(mockSourceTextbox);
    });
    
    it('should return null for unknown ID', () => {
      const textbox = textFlow.findTextboxById('unknown-id');
      
      expect(textbox).toBeNull();
    });
  });
  
  describe('createTextFlow', () => {
    it('should create a TextFlow instance', () => {
      const textFlow = createTextFlow(mockCanvas);
      
      expect(textFlow instanceof TextFlow).toBe(true);
      expect(textFlow.canvas).toBe(mockCanvas);
    });
  });
});