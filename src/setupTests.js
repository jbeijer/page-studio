import { vi } from 'vitest';

// Mock browser APIs that aren't available in the test environment
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock canvas
if (typeof HTMLCanvasElement.prototype.getContext === 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 }))
  }));
}

// Mock window.matchMedia
if (typeof window.matchMedia === 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

// Mock IntersectionObserver
if (typeof window.IntersectionObserver === 'undefined') {
  window.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }));
}

// Mock requestAnimationFrame
if (typeof window.requestAnimationFrame === 'undefined') {
  window.requestAnimationFrame = vi.fn(callback => setTimeout(callback, 0));
  window.cancelAnimationFrame = vi.fn(id => clearTimeout(id));
}

// Mock fetch
if (typeof window.fetch === 'undefined') {
  window.fetch = vi.fn();
}

// Add any other browser API mocks needed for tests

// Mock fabric.js - with both default export and named export pattern
vi.mock('fabric', async () => {
  // Create mock object that will be used for both exports
  const fabricMock = {
    version: '5.3.0',
    Canvas: vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      renderAll: vi.fn(),
      requestRenderAll: vi.fn(),
      setWidth: vi.fn(),
      setHeight: vi.fn(),
      getObjects: vi.fn(() => []),
      getActiveObject: vi.fn(),
      getActiveObjects: vi.fn(() => []),
      setActiveObject: vi.fn(),
      discardActiveObject: vi.fn(),
      toJSON: vi.fn(() => ({ objects: [] })),
      loadFromJSON: vi.fn(),
      getContext: vi.fn(),
    })),
    IText: vi.fn(function(text, options) {
      return {
        type: 'itext',
        text,
        ...options,
        on: vi.fn(),
        set: vi.fn(),
        setControlsVisibility: vi.fn(),
        toJSON: vi.fn(() => ({}))
      };
    }),
    Text: vi.fn(function(text, options) {
      return {
        type: 'text',
        text,
        ...options,
        on: vi.fn(),
        set: vi.fn(),
        setControlsVisibility: vi.fn(),
        toJSON: vi.fn(() => ({}))
      };
    }),
    Textbox: vi.fn(function(text, options) {
      return {
        type: 'textbox',
        text,
        ...options,
        on: vi.fn(),
        set: vi.fn(),
        setControlsVisibility: vi.fn(),
        toJSON: vi.fn(() => ({}))
      };
    }),
    Rect: vi.fn(function(options) {
      return {
        type: 'rect',
        ...options,
        set: vi.fn(),
        setControlsVisibility: vi.fn(),
        toJSON: vi.fn(() => ({}))
      };
    }),
    Circle: vi.fn(),
    Ellipse: vi.fn(),
    Line: vi.fn(function(points, options) {
      return {
        type: 'line',
        points,
        ...options,
        set: vi.fn(),
        setControlsVisibility: vi.fn(),
        toJSON: vi.fn(() => ({}))
      };
    }),
    Path: vi.fn(),
    Polygon: vi.fn(),
    Polyline: vi.fn(),
    Group: vi.fn(function(objects, options) {
      return {
        type: 'group',
        objects,
        ...options,
        set: vi.fn(),
        toJSON: vi.fn(() => ({}))
      };
    }),
    ActiveSelection: vi.fn(() => ({
      forEachObject: vi.fn()
    })),
    StaticCanvas: vi.fn(() => ({
      on: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      renderAll: vi.fn(),
      getObjects: vi.fn(() => [])
    })),
    Object: vi.fn(() => ({
      set: vi.fn(),
      clone: vi.fn(),
    })),
    util: {
      object: {
        extend: vi.fn(),
        clone: vi.fn(obj => ({ ...obj }))
      },
      enlivenObjects: vi.fn((objects, callback) => {
        // Create simple objects for each input object
        const enlivenedObjects = objects.map(obj => ({
          type: obj.type || 'unknown',
          ...obj,
          set: vi.fn(),
          on: vi.fn(),
          moveTo: vi.fn()
        }));
        callback(enlivenedObjects);
      })
    },
    Image: {
      fromURL: vi.fn((url, callback) => callback({}))
    }
  };

  return {
    default: fabricMock,  // For import { fabric } from 'fabric'
    fabric: fabricMock    // For import * as fabric from 'fabric'
  };
});