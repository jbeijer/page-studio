/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fabric } from 'fabric';
import { get } from 'svelte/store';
import { currentDocument, currentPage, updateDocument } from '$lib/stores/document';
import documentModuleService from './DocumentModuleService';
import documentService from './DocumentService';
import { createTextObject } from '$lib/utils/fabric-helpers';
import { loadDocument, saveDocument } from '$lib/utils/storage';

// Mock Svelte stores
vi.mock('svelte/store', async () => {
  const actual = await vi.importActual('svelte/store');
  return {
    ...actual,
    get: vi.fn()
  };
});

// Mock fabric
vi.mock('fabric', async () => {
  return {
    fabric: {
      Rect: vi.fn().mockImplementation(() => ({
        set: vi.fn(),
        setCoords: vi.fn(),
        on: vi.fn(),
        id: 'mock-rect-id',
        type: 'rect',
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        toJSON: vi.fn().mockReturnValue({
          type: 'rect',
          id: 'mock-rect-id',
          left: 100,
          top: 100,
          width: 100,
          height: 100
        })
      })),
      Textbox: vi.fn().mockImplementation(() => ({
        set: vi.fn(),
        setCoords: vi.fn(),
        on: vi.fn(),
        id: 'mock-text-id',
        type: 'textbox',
        text: 'Mock text',
        left: 100,
        top: 100,
        width: 200,
        toJSON: vi.fn().mockReturnValue({
          type: 'textbox',
          id: 'mock-text-id',
          text: 'Mock text',
          left: 100,
          top: 100,
          width: 200
        }),
        moveTo: vi.fn()
      })),
      Circle: vi.fn().mockImplementation(() => ({
        id: 'mock-circle-id',
        type: 'circle',
        toJSON: vi.fn().mockReturnValue({
          type: 'circle',
          id: 'mock-circle-id'
        }),
        moveTo: vi.fn()
      })),
      Ellipse: vi.fn().mockImplementation(() => ({
        id: 'mock-ellipse-id',
        type: 'ellipse',
        toJSON: vi.fn().mockReturnValue({
          type: 'ellipse',
          id: 'mock-ellipse-id'
        }),
        moveTo: vi.fn()
      })),
      Line: vi.fn().mockImplementation(() => ({
        id: 'mock-line-id',
        type: 'line',
        toJSON: vi.fn().mockReturnValue({
          type: 'line',
          id: 'mock-line-id'
        }),
        moveTo: vi.fn()
      })),
      Group: vi.fn().mockImplementation(() => ({
        id: 'mock-group-id',
        type: 'group',
        toJSON: vi.fn().mockReturnValue({
          type: 'group',
          id: 'mock-group-id'
        }),
        moveTo: vi.fn()
      })),
      util: {
        object: {
          clone: vi.fn().mockImplementation((obj) => {
            return {
              ...obj,
              id: 'cloned-' + obj.id,
              toJSON: vi.fn().mockReturnValue({
                type: obj.type,
                id: 'cloned-' + obj.id
              }),
              moveTo: vi.fn()
            };
          })
        },
        enlivenObjects: vi.fn().mockImplementation((objects, callback) => {
          const fabricObjects = objects.map(obj => ({
            ...obj,
            id: obj.id || 'mock-' + obj.type + '-id',
            toJSON: vi.fn().mockReturnValue(obj),
            moveTo: vi.fn(),
            on: vi.fn()
          }));
          callback(fabricObjects);
        })
      }
    }
  };
});

// Mock createTextObject
vi.mock('$lib/utils/fabric-helpers', () => ({
  createTextObject: vi.fn().mockImplementation((text, options) => ({
    id: options.id || 'mock-text-id',
    type: 'textbox',
    text: text,
    left: options.left || 100,
    top: options.top || 100,
    width: options.width || 200,
    toJSON: vi.fn().mockReturnValue({
      type: 'textbox',
      id: options.id || 'mock-text-id',
      text: text
    }),
    on: vi.fn(),
    moveTo: vi.fn()
  }))
}));

// Mock DocumentService
vi.mock('./DocumentService', () => ({
  default: {
    saveCurrentPage: vi.fn().mockReturnValue(true),
    saveSpecificPage: vi.fn().mockReturnValue(true),
    initialize: vi.fn()
  }
}));

// Mock storage utilities
vi.mock('$lib/utils/storage', () => ({
  loadDocument: vi.fn().mockImplementation(async (docId) => {
    return {
      id: docId,
      title: 'Test Document',
      pages: [
        {
          id: 'page-1',
          canvasJSON: JSON.stringify({
            version: '5.3.0',
            objects: [
              { type: 'rect', id: 'rect-1', left: 100, top: 100, width: 100, height: 100 },
              { type: 'textbox', id: 'text-1', text: 'Hello', left: 200, top: 200, width: 200 }
            ],
            background: 'white'
          })
        }
      ],
      masterPages: [
        {
          id: 'master-1',
          canvasJSON: JSON.stringify({
            version: '5.3.0',
            objects: [
              { 
                type: 'rect', 
                id: 'master-rect-1', 
                masterObjectId: 'master-obj-1',
                left: 50, 
                top: 50, 
                width: 400, 
                height: 50,
                fromMaster: true 
              }
            ],
            background: 'white'
          })
        }
      ]
    };
  }),
  saveDocument: vi.fn().mockResolvedValue(true)
}));

describe('DocumentModuleService', () => {
  let mockCanvas;
  let mockTextFlow;
  let mockGenerateId;
  
  beforeEach(() => {
    // Create mock canvas
    mockCanvas = {
      add: vi.fn(),
      remove: vi.fn(),
      getObjects: vi.fn().mockReturnValue([
        { 
          id: 'obj1', 
          type: 'rect',
          toJSON: vi.fn().mockReturnValue({ id: 'obj1', type: 'rect' })
        },
        { 
          id: 'obj2', 
          type: 'textbox', 
          text: 'Text object',
          toJSON: vi.fn().mockReturnValue({ id: 'obj2', type: 'textbox', text: 'Text object' })
        }
      ]),
      clear: vi.fn(),
      renderAll: vi.fn(),
      requestRenderAll: vi.fn(),
      setActiveObject: vi.fn(),
      toJSON: vi.fn().mockReturnValue({
        version: '5.3.0',
        objects: [
          { id: 'obj1', type: 'rect' },
          { id: 'obj2', type: 'textbox', text: 'Text object' }
        ],
        background: 'white'
      })
    };
    
    // Create mock text flow
    mockTextFlow = {
      updateTextFlow: vi.fn()
    };
    
    // Create mock ID generator
    mockGenerateId = vi.fn().mockReturnValue('new-id-12345');
    
    // Mock store data
    get.mockImplementation((store) => {
      if (store === currentDocument) {
        return {
          id: 'doc-1',
          title: 'Test Document',
          pages: [
            {
              id: 'page-1',
              canvasJSON: JSON.stringify({
                version: '5.3.0',
                objects: [
                  { type: 'rect', id: 'rect-1', left: 100, top: 100, width: 100, height: 100 },
                  { type: 'textbox', id: 'text-1', text: 'Hello', left: 200, top: 200, width: 200 }
                ],
                background: 'white'
              })
            }
          ],
          masterPages: [
            {
              id: 'master-1',
              canvasJSON: JSON.stringify({
                version: '5.3.0',
                objects: [
                  { 
                    type: 'rect', 
                    id: 'master-rect-1', 
                    masterObjectId: 'master-obj-1',
                    left: 50, 
                    top: 50, 
                    width: 400, 
                    height: 50,
                    fromMaster: true 
                  }
                ],
                background: 'white'
              })
            }
          ]
        };
      }
      if (store === currentPage) {
        return 'page-1';
      }
      return null;
    });
    
    // Initialize the service
    documentModuleService.initialize({
      canvas: mockCanvas,
      textFlow: mockTextFlow,
      generateId: mockGenerateId,
      activeTool: 'select'
    });
  });
  
  afterEach(() => {
    vi.resetAllMocks();
    documentModuleService.cleanup();
  });
  
  it('should initialize with the provided options', () => {
    expect(documentModuleService.canvas).toBe(mockCanvas);
    expect(documentModuleService.textFlow).toBe(mockTextFlow);
    expect(documentModuleService.generateId).toBe(mockGenerateId);
    expect(documentModuleService.activeTool).toBe('select');
    expect(documentModuleService.initialized).toBe(true);
  });
  
  it('should save the current page', () => {
    const result = documentModuleService.saveCurrentPage();
    
    expect(result).toBe(true);
    expect(mockCanvas.toJSON).toHaveBeenCalled();
    expect(documentService.saveSpecificPage).toHaveBeenCalled();
  });
  
  it('should save a specific page', () => {
    const pageId = 'page-2';
    const objects = [
      { id: 'obj3', type: 'rect', toJSON: vi.fn() },
      { id: 'obj4', type: 'circle', toJSON: vi.fn() }
    ];
    
    const result = documentModuleService.saveSpecificPage(pageId, objects);
    
    expect(result).toBe(true);
    expect(documentService.saveSpecificPage).toHaveBeenCalledWith(
      pageId,
      expect.objectContaining({
        version: '5.3.0',
        objects: expect.any(Array)
      })
    );
  });
  
  it('should create objects manually from JSON data', () => {
    const objectsData = [
      { type: 'rect', id: 'rect-1', left: 100, top: 100, width: 100, height: 100 },
      { type: 'textbox', id: 'text-1', text: 'Hello', left: 200, top: 200, width: 200 },
      { type: 'circle', id: 'circle-1', left: 300, top: 300, radius: 50 }
    ];
    
    const createdObjects = documentModuleService.createObjectsManually(objectsData);
    
    expect(createdObjects.length).toBe(3);
    expect(fabric.Rect).toHaveBeenCalled();
    expect(createTextObject).toHaveBeenCalled();
    expect(fabric.Circle).toHaveBeenCalled();
    
    // Verify properties were set correctly
    createdObjects.forEach(obj => {
      expect(obj.visible).toBe(true);
      expect(obj.evented).toBe(true);
      expect(obj.selectable).toBe(true); // Because activeTool is 'select'
    });
  });
  
  it('should get a page by id', () => {
    const page = documentModuleService.getPageById('page-1');
    
    expect(page).toBeDefined();
    expect(page.id).toBe('page-1');
    expect(page.canvasJSON).toBeDefined();
    
    // Test with invalid page ID
    const nonExistentPage = documentModuleService.getPageById('non-existent-page');
    expect(nonExistentPage).toBeNull();
  });
  
  it('should apply a master page', () => {
    const result = documentModuleService.applyMasterPage('master-1');
    
    expect(result).toBe(true);
    expect(fabric.util.enlivenObjects).toHaveBeenCalled();
    expect(mockCanvas.add).toHaveBeenCalled();
    expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    expect(mockCanvas.renderAll).toHaveBeenCalled();
  });
  
  it('should update text flow when text content changes', () => {
    const textObject = {
      id: 'text-1',
      type: 'textbox',
      text: 'Hello',
      linkedObjectIds: ['text-2', 'text-3']
    };
    
    documentModuleService.updateTextFlow(textObject);
    
    expect(mockTextFlow.updateTextFlow).toHaveBeenCalledWith('text-1');
  });
  
  it('should override a master object', () => {
    const masterObject = {
      id: 'master-rect-1',
      type: 'rect',
      masterObjectId: 'master-obj-1',
      fromMaster: true,
      left: 50,
      top: 50,
      width: 400,
      height: 50
    };
    
    const result = documentModuleService.overrideMasterObject(masterObject);
    
    expect(result).toBeDefined();
    expect(mockCanvas.add).toHaveBeenCalled();
    expect(mockCanvas.remove).toHaveBeenCalledWith(masterObject);
    expect(mockCanvas.setActiveObject).toHaveBeenCalled();
    expect(updateDocument).toHaveBeenCalled();
  });
  
  it('should load a page', async () => {
    mockCanvas.getObjects.mockReturnValueOnce([]);
    
    const result = await documentModuleService.loadPage('page-1', false);
    
    expect(result).toBe(true);
    expect(mockCanvas.clear).toHaveBeenCalled();
    expect(documentModuleService.createObjectsManually).toHaveBeenCalled();
    expect(mockCanvas.add).toHaveBeenCalled();
    expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
    expect(mockCanvas.renderAll).toHaveBeenCalled();
  });
  
  it('should load a document from IndexedDB', async () => {
    const result = await documentModuleService.loadDocumentFromIndexedDB('doc-1');
    
    expect(result).toBeDefined();
    expect(result.id).toBe('doc-1');
    expect(loadDocument).toHaveBeenCalledWith('doc-1');
  });
  
  it('should clean up resources properly', () => {
    documentModuleService.cleanup();
    
    expect(documentModuleService.canvas).toBeNull();
    expect(documentModuleService.textFlow).toBeNull();
    expect(documentModuleService.context).toBeNull();
    expect(documentModuleService.initialized).toBe(false);
  });
});