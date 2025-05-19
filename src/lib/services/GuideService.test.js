/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fabric } from 'fabric';
import { get } from 'svelte/store';
import { currentDocument, currentPage, updateDocument } from '$lib/stores/document';
import guideService from './GuideService';
import documentService from './DocumentService';

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
      Line: vi.fn().mockImplementation(() => ({
        set: vi.fn(),
        setCoords: vi.fn(),
        on: vi.fn(),
        id: 'mock-guide-id',
        top: 100,
        left: 100,
        orientation: 'horizontal'
      }))
    }
  };
});

// Mock document service
vi.mock('./DocumentService', () => ({
  default: {
    forceSave: vi.fn(),
    initialize: vi.fn()
  }
}));

// Mock Svelte stores
vi.mock('$lib/stores/document', () => ({
  currentDocument: { subscribe: vi.fn() },
  currentPage: { subscribe: vi.fn() },
  updateDocument: vi.fn()
}));

describe('GuideService', () => {
  let mockCanvas;
  
  beforeEach(() => {
    // Create a mock canvas object
    mockCanvas = {
      add: vi.fn(),
      remove: vi.fn(),
      getObjects: vi.fn().mockReturnValue([]),
      on: vi.fn(),
      off: vi.fn(),
      requestRenderAll: vi.fn(),
      renderAll: vi.fn()
    };
    
    // Mock document store data
    get.mockImplementation((store) => {
      if (store === currentDocument) {
        return {
          id: 'doc1',
          pages: [
            {
              id: 'page1',
              guides: {
                horizontal: [100, 200],
                vertical: [150, 250]
              }
            }
          ]
        };
      }
      if (store === currentPage) {
        return 'page1';
      }
    });
    
    // Initialize the guide service
    guideService.initialize({
      canvas: mockCanvas,
      width: 1240,
      height: 1754
    });
  });
  
  afterEach(() => {
    vi.resetAllMocks();
    guideService.cleanup();
  });
  
  it('should initialize with the provided canvas', () => {
    expect(guideService.canvas).toBe(mockCanvas);
    expect(guideService.canvasWidth).toBe(1240);
    expect(guideService.canvasHeight).toBe(1754);
    expect(guideService.initialized).toBe(true);
  });
  
  it('should create a horizontal guide', () => {
    const guide = guideService.createHorizontalGuide(100);
    
    expect(fabric.Line).toHaveBeenCalledWith([0, 100, 1240, 100], expect.any(Object));
    expect(mockCanvas.add).toHaveBeenCalled();
    expect(guide).toBeDefined();
  });
  
  it('should create a vertical guide', () => {
    const guide = guideService.createVerticalGuide(150);
    
    expect(fabric.Line).toHaveBeenCalledWith([150, 0, 150, 1754], expect.any(Object));
    expect(mockCanvas.add).toHaveBeenCalled();
    expect(guide).toBeDefined();
  });
  
  it('should delete a guide', () => {
    const guide = { id: 'guide1', orientation: 'horizontal', originalPosition: 100 };
    
    guideService.deleteGuide(guide);
    
    expect(mockCanvas.remove).toHaveBeenCalledWith(guide);
    expect(updateDocument).toHaveBeenCalled();
    expect(documentService.forceSave).toHaveBeenCalled();
  });
  
  it('should load guides from document', () => {
    // Mock existing guides on the canvas
    mockCanvas.getObjects.mockReturnValueOnce([
      { guide: true, id: 'old-guide' }
    ]);
    
    guideService.loadGuidesFromDocument();
    
    // Should clear existing guides
    expect(mockCanvas.remove).toHaveBeenCalled();
    
    // Should create new guides
    expect(fabric.Line).toHaveBeenCalledTimes(4); // 2 horizontal + 2 vertical
    expect(mockCanvas.add).toHaveBeenCalledTimes(4);
  });
  
  it('should save guides to document', () => {
    // Mock guides on the canvas
    mockCanvas.getObjects.mockReturnValueOnce([
      { guide: true, orientation: 'horizontal', top: 100 },
      { guide: true, orientation: 'vertical', left: 150 }
    ]);
    
    guideService.saveGuidesToDocument();
    
    // Should update the document
    expect(updateDocument).toHaveBeenCalled();
    expect(documentService.forceSave).toHaveBeenCalled();
  });
  
  it('should clear all guides', () => {
    // Mock guides on the canvas
    mockCanvas.getObjects.mockReturnValueOnce([
      { guide: true, id: 'guide1' },
      { guide: true, id: 'guide2' }
    ]);
    
    guideService.clearGuides();
    
    // Should remove all guides
    expect(mockCanvas.remove).toHaveBeenCalledTimes(2);
    expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
  });
  
  it('should clean up resources', () => {
    guideService.cleanup();
    
    expect(guideService.canvas).toBeNull();
    expect(guideService.initialized).toBe(false);
  });
});