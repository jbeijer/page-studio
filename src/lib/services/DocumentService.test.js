/**
 * Tests for DocumentService
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import documentService from './DocumentService';
import { get } from 'svelte/store';
import { currentDocument, currentPage, setCurrentDocument, updateDocument } from '$lib/stores/document';
import { canvasReady } from '$lib/stores/canvasReady';
import { saveDocument, loadDocument } from '$lib/utils/storage';

// Mock dependencies
vi.mock('svelte/store', () => ({
  get: vi.fn(),
  writable: vi.fn(),
  derived: vi.fn()
}));

vi.mock('$lib/stores/document', () => ({
  currentDocument: { subscribe: vi.fn() },
  currentPage: { subscribe: vi.fn() },
  setCurrentDocument: vi.fn(),
  updateDocument: vi.fn()
}));

vi.mock('$lib/stores/canvasReady', () => ({
  canvasReady: { subscribe: vi.fn() },
  updateCanvasReadyStatus: vi.fn()
}));

vi.mock('$lib/utils/storage', () => ({
  saveDocument: vi.fn(),
  loadDocument: vi.fn()
}));

describe('DocumentService', () => {
  let mockCanvas;
  
  beforeEach(() => {
    // Create mock canvas
    mockCanvas = {
      clear: vi.fn(),
      getObjects: vi.fn().mockReturnValue([]),
      backgroundColor: 'white',
      renderAll: vi.fn(),
      toJSON: vi.fn().mockReturnValue({ objects: [] }),
      add: vi.fn(),
      requestRenderAll: vi.fn()
    };
    
    // Reset mocks
    vi.resetAllMocks();
    
    // Mock get to return default values
    get.mockImplementation((store) => {
      if (store === currentDocument) {
        return {
          id: 'doc-123',
          title: 'Test Document',
          pages: [
            { id: 'page-1', canvasJSON: '{"objects":[]}' },
            { id: 'page-2', canvasJSON: '{"objects":[]}' }
          ],
          metadata: {
            grid: { enabled: true },
            rulers: { enabled: true }
          }
        };
      }
      if (store === currentPage) {
        return 'page-1';
      }
      if (store === canvasReady) {
        return true;
      }
      return null;
    });
    
    // Reset service state
    documentService.cleanup();
  });
  
  afterEach(() => {
    // Clean up
    documentService.cleanup();
  });
  
  it('should initialize with canvas reference', () => {
    // Initialize with canvas
    documentService.initialize(mockCanvas);
    
    // Verify service is initialized
    expect(documentService.canvas).toBe(mockCanvas);
    expect(documentService.initialized).toBe(true);
  });
  
  it('should create a new document', async () => {
    // Mock saveDocument to resolve successfully
    saveDocument.mockResolvedValue(true);
    
    // Initialize service
    documentService.initialize(mockCanvas);
    
    // Create a new document
    const doc = await documentService.createNewDocument({ title: 'New Document' });
    
    // Verify document was created
    expect(doc).toBeTruthy();
    expect(doc.title).toBe('New Document');
    expect(doc.pages.length).toBe(1);
    
    // Verify store was updated
    expect(setCurrentDocument).toHaveBeenCalled();
    
    // Verify document was saved
    expect(saveDocument).toHaveBeenCalledWith(doc);
  });
  
  it('should load a document by ID', async () => {
    // Mock loadDocument to return a document
    const mockDoc = {
      id: 'doc-123',
      title: 'Test Document',
      pages: [{ id: 'page-1', canvasJSON: '{"objects":[]}' }]
    };
    loadDocument.mockResolvedValue(mockDoc);
    
    // Initialize service
    documentService.initialize(mockCanvas);
    
    // Load document
    const loadedDoc = await documentService.loadDocumentById('doc-123');
    
    // Verify document was loaded
    expect(loadedDoc).toBe(mockDoc);
    
    // Verify store was updated
    expect(setCurrentDocument).toHaveBeenCalledWith(mockDoc);
  });
  
  it('should save the current page', () => {
    // Mock canvas to return objects
    const mockObjects = [{ type: 'rect', id: 'obj-1' }];
    mockCanvas.getObjects.mockReturnValue(mockObjects);
    
    // Mock JSON serialization
    mockCanvas.toJSON.mockReturnValue({
      version: '5.3.0',
      objects: mockObjects,
      background: 'white'
    });
    
    // Initialize service
    documentService.initialize(mockCanvas);
    
    // Save current page
    const result = documentService.saveCurrentPage();
    
    // Verify page was saved
    expect(result).toBe(true);
    
    // Verify document was updated
    expect(updateDocument).toHaveBeenCalled();
  });
  
  it('should update document title', () => {
    // Initialize service
    documentService.initialize(mockCanvas);
    
    // Update title
    documentService.updateDocumentTitle('New Title');
    
    // Verify document was updated
    expect(updateDocument).toHaveBeenCalledWith(expect.objectContaining({
      title: 'New Title'
    }));
  });
  
  it('should update document metadata', () => {
    // Initialize service
    documentService.initialize(mockCanvas);
    
    // Update metadata
    const result = documentService.updateDocumentMetadata({
      grid: { enabled: false, size: 20 }
    });
    
    // Verify success
    expect(result).toBe(true);
    
    // Verify document was updated
    expect(updateDocument).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        grid: { enabled: false, size: 20 },
        rulers: { enabled: true }
      })
    }));
  });
  
  it('should force save the document', async () => {
    // Mock saveDocument to resolve successfully
    saveDocument.mockResolvedValue(true);
    
    // Initialize service
    documentService.initialize(mockCanvas);
    
    // Force save
    const result = await documentService.forceSave();
    
    // Verify success
    expect(result).toBe(true);
    
    // Verify document was saved
    expect(saveDocument).toHaveBeenCalled();
  });
  
  it('should clean up resources', () => {
    // Mock setup intervals
    documentService.autoSaveInterval = 123;
    documentService.forceSaveInterval = 456;
    documentService.beforeUnloadHandler = () => {};
    
    // Initialize service
    documentService.initialize(mockCanvas);
    
    // Add global event listener spy
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    // Clean up
    documentService.cleanup();
    
    // Verify event listener was removed
    expect(removeEventListenerSpy).toHaveBeenCalled();
    
    // Verify intervals were cleared
    expect(documentService.autoSaveInterval).toBeNull();
    expect(documentService.forceSaveInterval).toBeNull();
    expect(documentService.beforeUnloadHandler).toBeNull();
    
    // Cleanup spy
    removeEventListenerSpy.mockRestore();
  });
});