/**
 * TextFlowService.test.js
 * Tests for the TextFlowService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import textFlowService from './TextFlowService';

// Mock text objects
const createMockTextbox = (id, text) => ({
  id,
  text,
  type: 'textbox',
  _textLines: text.split('\n'),
  height: 100,
  width: 200,
  padding: 5,
  fontSize: 16,
  lineHeight: 1.2,
  linkedObjectIds: [],
  set: vi.fn(),
  on: vi.fn()
});

describe('TextFlowService', () => {
  let mockCanvas;
  
  beforeEach(() => {
    // Reset the service
    textFlowService.cleanup();
    
    // Create a mock canvas
    mockCanvas = {
      getObjects: vi.fn().mockImplementation(type => {
        if (type === 'textbox') {
          return [
            createMockTextbox('textbox1', 'This is textbox 1'),
            createMockTextbox('textbox2', 'This is textbox 2')
          ];
        }
        return [];
      }),
      requestRenderAll: vi.fn(),
      renderAll: vi.fn()
    };
  });
  
  afterEach(() => {
    textFlowService.cleanup();
  });
  
  it('should initialize with default values', () => {
    textFlowService.initialize({ canvas: mockCanvas });
    
    expect(textFlowService.initialized).toBe(true);
    expect(textFlowService.canvas).toBe(mockCanvas);
    expect(textFlowService.linkedTextboxes.size).toBe(0);
  });
  
  it('should not initialize without a canvas', () => {
    textFlowService.initialize({});
    
    expect(textFlowService.initialized).toBe(false);
  });
  
  it('should warn if already initialized', () => {
    // Spy on console.warn
    const consoleWarnSpy = vi.spyOn(console, 'warn');
    
    // Initialize once
    textFlowService.initialize({ canvas: mockCanvas });
    
    // Try to initialize again
    textFlowService.initialize({ canvas: mockCanvas });
    
    expect(consoleWarnSpy).toHaveBeenCalledWith('TextFlowService has already been initialized');
    
    // Restore original console.warn
    consoleWarnSpy.mockRestore();
  });
  
  it('should link textboxes', () => {
    textFlowService.initialize({ canvas: mockCanvas });
    
    const sourceTextbox = createMockTextbox('source', 'Source text');
    const targetTextbox = createMockTextbox('target', '');
    
    const result = textFlowService.linkTextboxes(sourceTextbox, targetTextbox);
    
    expect(result).toBe(true);
    expect(textFlowService.linkedTextboxes.has('source')).toBe(true);
    expect(textFlowService.linkedTextboxes.get('source')).toContain('target');
    expect(sourceTextbox.linkedObjectIds).toContain('target');
    expect(sourceTextbox.set).toHaveBeenCalled();
    expect(targetTextbox.set).toHaveBeenCalled();
    expect(sourceTextbox.on).toHaveBeenCalledTimes(2); // 'changed' and 'modified' events
  });
  
  it('should not link a textbox to itself', () => {
    textFlowService.initialize({ canvas: mockCanvas });
    
    const textbox = createMockTextbox('self', 'Text');
    
    const result = textFlowService.linkTextboxes(textbox, textbox);
    
    expect(result).toBe(false);
  });
  
  it('should unlink textboxes', () => {
    textFlowService.initialize({ canvas: mockCanvas });
    
    // First, create a link
    const sourceTextbox = createMockTextbox('source', 'Source text');
    const targetTextbox = createMockTextbox('target', '');
    
    mockCanvas.getObjects.mockImplementation((type) => {
      if (type === 'textbox') {
        return [sourceTextbox, targetTextbox];
      }
      return [];
    });
    
    textFlowService.linkTextboxes(sourceTextbox, targetTextbox);
    
    // Now unlink them
    const result = textFlowService.unlinkTextboxes('source');
    
    expect(result).toBe(true);
    expect(textFlowService.linkedTextboxes.has('source')).toBe(false);
    expect(sourceTextbox.set).toHaveBeenCalledWith({
      stroke: '',
      strokeWidth: 0,
      strokeDashArray: []
    });
    expect(targetTextbox.set).toHaveBeenCalledWith('text', '');
  });
  
  it('should update text flow', () => {
    textFlowService.initialize({ canvas: mockCanvas });
    
    // Create source with very long text
    const longText = 'This is a very long text that will not fit in the textbox and should overflow into the target textbox. '.repeat(10);
    const sourceTextbox = createMockTextbox('source', longText);
    sourceTextbox._textLines = Array(20).fill('Line of text'); // Simulate wrapped text
    
    const targetTextbox = createMockTextbox('target', '');
    
    mockCanvas.getObjects.mockImplementation((type) => {
      if (type === 'textbox') {
        return [sourceTextbox, targetTextbox];
      }
      return [];
    });
    
    // Link textboxes first
    textFlowService.linkTextboxes(sourceTextbox, targetTextbox);
    
    // Reset mocks to check later calls
    sourceTextbox.set.mockClear();
    targetTextbox.set.mockClear();
    
    // Update text flow
    const result = textFlowService.updateTextFlow('source');
    
    expect(result).toBe(true);
    expect(targetTextbox.set).toHaveBeenCalledWith('text', expect.any(String)); // Should have some overflow text
  });
  
  it('should calculate text overflow correctly', () => {
    textFlowService.initialize({ canvas: mockCanvas });
    
    // Create a textbox with text that will overflow
    const textbox = createMockTextbox('test', 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
    textbox._textLines = ['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5'];
    textbox.height = 40; // Only enough height for 2 lines
    
    const { fittingText, overflowText } = textFlowService.calculateTextOverflow(textbox);
    
    expect(fittingText).toBe('Line 1\nLine 2');
    expect(overflowText).toBe('Line 3\nLine 4\nLine 5');
  });
  
  it('should find textbox by ID', () => {
    textFlowService.initialize({ canvas: mockCanvas });
    
    const result = textFlowService.findTextboxById('textbox1');
    
    expect(result).not.toBeNull();
    expect(result.id).toBe('textbox1');
  });
  
  it('should get all textboxes', () => {
    textFlowService.initialize({ canvas: mockCanvas });
    
    const result = textFlowService.getAllTextboxes();
    
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('textbox1');
    expect(result[1].id).toBe('textbox2');
  });
  
  it('should get all linked textboxes', () => {
    textFlowService.initialize({ canvas: mockCanvas });
    
    // First, create some links
    const source1 = createMockTextbox('source1', 'Source 1');
    const target1 = createMockTextbox('target1', '');
    const source2 = createMockTextbox('source2', 'Source 2');
    const target2 = createMockTextbox('target2', '');
    
    textFlowService.linkTextboxes(source1, target1);
    textFlowService.linkTextboxes(source2, target2);
    
    // Get linked textboxes
    const result = textFlowService.getLinkedTextboxes();
    
    expect(result.size).toBe(2);
    expect(result.has('source1')).toBe(true);
    expect(result.has('source2')).toBe(true);
  });
  
  it('should check if a textbox has linked targets', () => {
    textFlowService.initialize({ canvas: mockCanvas });
    
    // First, create a link
    const source = createMockTextbox('source', 'Source');
    const target = createMockTextbox('target', '');
    
    textFlowService.linkTextboxes(source, target);
    
    // Check if has linked targets
    expect(textFlowService.hasLinkedTargets('source')).toBe(true);
    expect(textFlowService.hasLinkedTargets('nonexistent')).toBe(false);
  });
  
  it('should get linked targets', () => {
    textFlowService.initialize({ canvas: mockCanvas });
    
    // First, create a link
    const source = createMockTextbox('source', 'Source');
    const target1 = createMockTextbox('target1', '');
    const target2 = createMockTextbox('target2', '');
    
    textFlowService.linkTextboxes(source, target1);
    textFlowService.linkTextboxes(source, target2);
    
    // Get linked targets
    const result = textFlowService.getLinkedTargets('source');
    
    expect(result.length).toBe(2);
    expect(result).toContain('target1');
    expect(result).toContain('target2');
  });
  
  it('should clean up', () => {
    textFlowService.initialize({ canvas: mockCanvas });
    
    // First, create some links
    const source = createMockTextbox('source', 'Source');
    const target = createMockTextbox('target', '');
    
    mockCanvas.getObjects.mockReturnValue([source, target]);
    
    textFlowService.linkTextboxes(source, target);
    
    // Clean up
    textFlowService.cleanup();
    
    expect(textFlowService.initialized).toBe(false);
    expect(textFlowService.canvas).toBeNull();
    expect(textFlowService.linkedTextboxes.size).toBe(0);
    
    // Should have attempted to remove event handlers
    expect(mockCanvas.getObjects).toHaveBeenCalledWith('textbox');
  });
  
  it('should update canvas reference', () => {
    textFlowService.initialize({ canvas: mockCanvas });
    
    const newCanvas = { getObjects: vi.fn() };
    
    textFlowService.updateCanvas(newCanvas);
    
    expect(textFlowService.canvas).toBe(newCanvas);
  });
});