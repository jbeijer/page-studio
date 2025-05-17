import { writable, derived } from 'svelte/store';

/**
 * Available tool types
 * @enum {string}
 */
export const ToolType = {
  SELECT: 'select',
  TEXT: 'text',
  IMAGE: 'image',
  RECTANGLE: 'rectangle',
  ELLIPSE: 'ellipse',
  LINE: 'line'
};

/**
 * Store for the currently active tool
 * @type {import('svelte/store').Writable<string>}
 */
export const activeTool = writable(ToolType.SELECT);

/**
 * Store for the tool options for each tool type
 * @type {import('svelte/store').Writable<Object>}
 */
export const toolOptions = writable({
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
});

/**
 * Derived store for the current tool's options
 */
export const currentToolOptions = derived(
  [activeTool, toolOptions],
  ([$activeTool, $toolOptions]) => $toolOptions[$activeTool] || {}
);

/**
 * Set the active tool
 * @param {string} toolType - The tool type to activate
 */
export function setActiveTool(toolType) {
  if (Object.values(ToolType).includes(toolType)) {
    activeTool.set(toolType);
  } else {
    console.error(`Invalid tool type: ${toolType}`);
  }
}

/**
 * Update options for a specific tool
 * @param {string} toolType - The tool type to update options for
 * @param {Object} options - The new options to apply
 */
export function updateToolOptions(toolType, options) {
  toolOptions.update(currentOptions => {
    return {
      ...currentOptions,
      [toolType]: {
        ...currentOptions[toolType],
        ...options
      }
    };
  });
}

/**
 * Reset a tool's options to default values
 * @param {string} toolType - The tool type to reset options for
 */
export function resetToolOptions(toolType) {
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
}