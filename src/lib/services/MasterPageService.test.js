/**
 * MasterPageService.test.js
 * Unit tests for the MasterPageService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import masterPageService from './MasterPageService';

// Mock dependencies
vi.mock('svelte/store', () => {
  const mockDoc = {
    id: 'test-document',
    masterPages: [
      {
        id: 'master-1',
        title: 'Master 1',
        canvasJSON: JSON.stringify({
          version: "5.3.0",
          objects: [
            {
              type: 'rect',
              id: 'test-master-object',
              masterObjectId: 'master-obj-1',
              left: 100,
              top: 100,
              width: 100,
              height: 100,
              fill: 'red'
            }
          ],
          background: "white"
        })
      }
    ],
    pages: [
      { 
        id: 'page-1', 
        masterPageId: 'master-1',
        overrides: {}
      },
      { 
        id: 'page-2', 
        masterPageId: null,
        overrides: {}
      }
    ]
  };
  
  const store = {
    subscribe: vi.fn(),
    set: vi.fn(),
    update: vi.fn()
  };
  
  return {
    get: vi.fn().mockReturnValue(mockDoc),
    writable: vi.fn(() => store),
    derived: vi.fn(() => store),
    readable: vi.fn(() => store)
  };
});

// Mock fabric
vi.mock('fabric', () => {
  return {
    fabric: {
      Canvas: vi.fn(() => ({
        add: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
        renderAll: vi.fn(),
        requestRenderAll: vi.fn(),
        getObjects: vi.fn().mockReturnValue([]),
        setActiveObject: vi.fn(),
        toJSON: vi.fn().mockReturnValue({
          version: "5.3.0",
          objects: [],
          background: "white"
        })
      })),
      Rect: vi.fn(function(options) {
        return { ...options, type: 'rect' };
      }),
      Textbox: vi.fn(function(text, options) {
        return { ...options, text, type: 'textbox' };
      }),
      Circle: vi.fn(function(options) {
        return { ...options, type: 'circle' };
      }),
      util: {
        object: {
          clone: vi.fn(obj => ({ ...obj }))
        },
        enlivenObjects: vi.fn((objects, callback) => {
          const enlivenedObjects = objects.map(obj => ({
            ...obj,
            moveTo: vi.fn(),
            visible: true
          }));
          callback(enlivenedObjects);
        })
      }
    }
  };
});

// Mock document service
vi.mock('./DocumentService', () => {
  return {
    default: {
      saveCurrentPage: vi.fn().mockResolvedValue(true),
      forceSave: vi.fn().mockResolvedValue(true)
    }
  };
});

// Mock document store
vi.mock('$lib/stores/document', () => {
  return {
    currentDocument: { subscribe: vi.fn() },
    currentPage: { subscribe: vi.fn() },
    updateDocument: vi.fn()
  };
});

describe('MasterPageService', () => {
  let mockCanvas;
  
  beforeEach(() => {
    // Create a mock canvas for testing
    mockCanvas = {
      add: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      renderAll: vi.fn(),
      requestRenderAll: vi.fn(),
      getObjects: vi.fn().mockReturnValue([]),
      setActiveObject: vi.fn(),
      toJSON: vi.fn().mockReturnValue({
        version: "5.3.0",
        objects: [],
        background: "white"
      })
    };
    
    // Reset the service before each test
    masterPageService.cleanup();
  });

  afterEach(() => {
    // Clean up after each test
    masterPageService.cleanup();
    vi.clearAllMocks();
  });

  it('should initialize with a canvas reference', () => {
    const result = masterPageService.initialize(mockCanvas);
    expect(result).toBe(masterPageService); // For chaining
    expect(masterPageService.canvas).toBe(mockCanvas);
  });

  it('should create a new master page', () => {
    const { updateDocument } = require('$lib/stores/document');
    masterPageService.initialize(mockCanvas);
    
    const masterId = masterPageService.createMasterPage({ title: 'Test Master' });
    
    expect(masterId).toMatch(/master-\d+/);
    expect(updateDocument).toHaveBeenCalled();
  });

  it('should update an existing master page', () => {
    const { updateDocument } = require('$lib/stores/document');
    masterPageService.initialize(mockCanvas);
    
    const success = masterPageService.updateMasterPage('master-1', { title: 'Updated Master' });
    
    expect(success).toBe(true);
    expect(updateDocument).toHaveBeenCalled();
  });

  it('should handle error when updating non-existent master page', () => {
    const originalConsoleError = console.error;
    console.error = vi.fn();
    
    masterPageService.initialize(mockCanvas);
    
    const success = masterPageService.updateMasterPage('non-existent-master', { title: 'Updated Master' });
    
    expect(success).toBe(false);
    expect(console.error).toHaveBeenCalled();
    
    console.error = originalConsoleError;
  });

  it('should delete a master page', () => {
    const { updateDocument } = require('$lib/stores/document');
    masterPageService.initialize(mockCanvas);
    
    const success = masterPageService.deleteMasterPage('master-1');
    
    expect(success).toBe(true);
    expect(updateDocument).toHaveBeenCalled();
  });

  it('should apply a master page to a document page', () => {
    const { updateDocument } = require('$lib/stores/document');
    const { get } = require('svelte/store');
    
    masterPageService.initialize(mockCanvas);
    
    // Mock current page
    const currentPageMock = vi.spyOn(require('svelte/store'), 'get');
    currentPageMock.mockReturnValueOnce(get()).mockReturnValueOnce('page-2');
    
    // Spy on applyMasterPageToCanvas
    const applyMasterPageSpy = vi.spyOn(masterPageService, 'applyMasterPageToCanvas');
    applyMasterPageSpy.mockImplementation(() => true);
    
    const success = masterPageService.applyMasterPage('page-2', 'master-1');
    
    expect(success).toBe(true);
    expect(updateDocument).toHaveBeenCalled();
    expect(applyMasterPageSpy).toHaveBeenCalled();
  });

  it('should override a master object', () => {
    const { updateDocument } = require('$lib/stores/document');
    
    masterPageService.initialize(mockCanvas);
    
    const masterObject = {
      type: 'rect',
      fromMaster: true,
      masterObjectId: 'master-obj-1',
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      fill: 'red'
    };
    
    const overridden = masterPageService.overrideMasterObject(masterObject);
    
    expect(overridden).toBeTruthy();
    expect(overridden.fromMaster).toBe(false);
    expect(mockCanvas.add).toHaveBeenCalled();
    expect(mockCanvas.remove).toHaveBeenCalledWith(masterObject);
    expect(updateDocument).toHaveBeenCalled();
  });

  it('should load a master page', async () => {
    masterPageService.initialize(mockCanvas);
    
    const success = await masterPageService.loadMasterPage('master-1');
    
    expect(success).toBe(true);
    expect(mockCanvas.clear).toHaveBeenCalled();
    expect(mockCanvas.renderAll).toHaveBeenCalled();
  });

  it('should save a master page', () => {
    const { updateDocument } = require('$lib/stores/document');
    
    masterPageService.initialize(mockCanvas);
    
    // Mock canvas objects
    mockCanvas.getObjects.mockReturnValue([
      {
        type: 'rect',
        id: 'test-object',
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        fill: 'blue'
      }
    ]);
    
    const success = masterPageService.saveMasterPage('master-1');
    
    expect(success).toBe(true);
    expect(mockCanvas.toJSON).toHaveBeenCalled();
    expect(updateDocument).toHaveBeenCalled();
  });

  it('should apply master page objects to canvas', () => {
    masterPageService.initialize(mockCanvas);
    
    const success = masterPageService.applyMasterPageToCanvas('master-1', {});
    
    expect(success).toBe(true);
    expect(mockCanvas.add).toHaveBeenCalled();
    expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
  });

  it('should handle error when applying non-existent master page', () => {
    const originalConsoleError = console.error;
    console.error = vi.fn();
    
    masterPageService.initialize(mockCanvas);
    
    const success = masterPageService.applyMasterPageToCanvas('non-existent-master', {});
    
    expect(success).toBe(false);
    
    console.error = originalConsoleError;
  });

  it('should cleanup properly', () => {
    masterPageService.initialize(mockCanvas);
    masterPageService.cleanup();
    
    expect(masterPageService.canvas).toBe(null);
  });
});