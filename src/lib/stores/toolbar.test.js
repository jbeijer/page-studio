import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { 
  activeTool, 
  toolOptions, 
  currentToolOptions,
  ToolType,
  setActiveTool,
  updateToolOptions,
  resetToolOptions
} from './toolbar';

describe('Toolbar Store', () => {
  beforeEach(() => {
    // Reset stores to initial state
    setActiveTool(ToolType.SELECT);
    
    // Reset all tool options
    Object.values(ToolType).forEach(toolType => {
      resetToolOptions(toolType);
    });
  });

  describe('activeTool', () => {
    it('should start with SELECT as the default active tool', () => {
      expect(get(activeTool)).toBe(ToolType.SELECT);
    });

    it('should update active tool when setActiveTool is called', () => {
      setActiveTool(ToolType.TEXT);
      expect(get(activeTool)).toBe(ToolType.TEXT);
      
      setActiveTool(ToolType.RECTANGLE);
      expect(get(activeTool)).toBe(ToolType.RECTANGLE);
    });

    it('should not update active tool with invalid tool type', () => {
      setActiveTool(ToolType.SELECT);
      setActiveTool('invalidTool');
      expect(get(activeTool)).toBe(ToolType.SELECT);
    });
  });

  describe('toolOptions', () => {
    it('should have default options for each tool type', () => {
      const options = get(toolOptions);
      
      expect(options[ToolType.SELECT]).toBeDefined();
      expect(options[ToolType.TEXT]).toBeDefined();
      expect(options[ToolType.IMAGE]).toBeDefined();
      expect(options[ToolType.RECTANGLE]).toBeDefined();
      expect(options[ToolType.ELLIPSE]).toBeDefined();
      expect(options[ToolType.LINE]).toBeDefined();
    });

    it('should update tool options when updateToolOptions is called', () => {
      updateToolOptions(ToolType.TEXT, {
        fontSize: 24,
        fontFamily: 'Helvetica'
      });
      
      const options = get(toolOptions);
      expect(options[ToolType.TEXT].fontSize).toBe(24);
      expect(options[ToolType.TEXT].fontFamily).toBe('Helvetica');
      
      // Other properties should remain unchanged
      expect(options[ToolType.TEXT].textAlign).toBe('left');
    });

    it('should reset tool options when resetToolOptions is called', () => {
      // Change some options first
      updateToolOptions(ToolType.RECTANGLE, {
        fill: '#ff0000',
        stroke: '#0000ff',
        strokeWidth: 3
      });
      
      // Then reset
      resetToolOptions(ToolType.RECTANGLE);
      
      const options = get(toolOptions);
      expect(options[ToolType.RECTANGLE].fill).toBe('#ffffff');
      expect(options[ToolType.RECTANGLE].stroke).toBe('#000000');
      expect(options[ToolType.RECTANGLE].strokeWidth).toBe(1);
    });
  });

  describe('currentToolOptions', () => {
    it('should return options for the active tool', () => {
      setActiveTool(ToolType.TEXT);
      
      const options = get(currentToolOptions);
      expect(options.fontSize).toBe(16);
      expect(options.fontFamily).toBe('Arial');
    });

    it('should update when active tool changes', () => {
      setActiveTool(ToolType.TEXT);
      expect(get(currentToolOptions).fontSize).toBe(16);
      
      setActiveTool(ToolType.RECTANGLE);
      expect(get(currentToolOptions).fill).toBe('#ffffff');
    });

    it('should update when tool options change', () => {
      setActiveTool(ToolType.RECTANGLE);
      
      updateToolOptions(ToolType.RECTANGLE, {
        fill: '#ff0000'
      });
      
      expect(get(currentToolOptions).fill).toBe('#ff0000');
    });

    it('should return empty object for invalid tool type', () => {
      // This test simulates what would happen if the store was manually set to an invalid value
      activeTool.set('invalidTool');
      
      expect(get(currentToolOptions)).toEqual({});
    });
  });
});