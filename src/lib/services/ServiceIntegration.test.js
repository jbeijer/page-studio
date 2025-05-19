/**
 * ServiceIntegration.test.js
 * Unit tests for the ServiceIntegration module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  createLegacyDocumentManager, 
  createLegacyAutoSaveManager,
  createLegacyCanvasWrapper 
} from './ServiceIntegration';

// Mock Svelte store
vi.mock('svelte/store', () => {
  return {
    get: vi.fn().mockImplementation((store) => {
      if (store === require('$lib/stores/document').currentDocument) {
        return { id: 'test-doc-id', title: 'Test Document', pages: [] };
      } else if (store === require('$lib/stores/document').currentPage) {
        return 'page-1';
      } else if (store === require('$lib/stores/canvasReady').canvasReady) {
        return true;
      }
      return null;
    })
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

// Mock canvasReady store
vi.mock('$lib/stores/canvasReady', () => {
  return {
    canvasReady: { subscribe: vi.fn() }
  };
});

// Mock services
vi.mock('./DocumentService', () => {
  return {
    default: {
      initialize: vi.fn(),
      createNewDocument: vi.fn().mockResolvedValue({ id: 'new-doc', title: 'New Document' }),
      loadDocumentById: vi.fn().mockResolvedValue({ id: 'loaded-doc', title: 'Loaded Document' }),
      saveCurrentPage: vi.fn(),
      addPage: vi.fn().mockReturnValue('new-page-id'),
      forceSave: vi.fn().mockResolvedValue(true),
      updateDocumentTitle: vi.fn(),
      switchToPage: vi.fn().mockResolvedValue(true)
    }
  };
});

vi.mock('./CanvasService', () => {
  return {
    default: {
      initialize: vi.fn(),
      bringForward: vi.fn(),
      sendBackward: vi.fn(),
      bringToFront: vi.fn(),
      sendToBack: vi.fn(),
      deleteSelectedObjects: vi.fn(),
      copySelectedObjects: vi.fn(),
      pasteObjects: vi.fn()
    }
  };
});

vi.mock('./MasterPageService', () => {
  return {
    default: {
      initialize: vi.fn(),
      applyMasterPage: vi.fn(),
      overrideMasterObject: vi.fn()
    }
  };
});

describe('ServiceIntegration', () => {
  // Import mocked services
  const documentService = require('./DocumentService').default;
  const canvasService = require('./CanvasService').default;
  const masterPageService = require('./MasterPageService').default;
  
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Mock global window properties
    global.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
  });
  
  afterEach(() => {
    // Clean up after each test
    vi.clearAllMocks();
  });
  
  describe('createLegacyDocumentManager', () => {
    it('should create document manager with all required methods', () => {
      const context = {
        canvasComponent: {
          resetCanvas: vi.fn()
        }
      };
      
      const documentManager = createLegacyDocumentManager(context);
      
      // Check that all expected methods are present
      expect(documentManager).toHaveProperty('createNewDocument');
      expect(documentManager).toHaveProperty('loadDocumentById');
      expect(documentManager).toHaveProperty('handleAddPage');
      expect(documentManager).toHaveProperty('handleSave');
      expect(documentManager).toHaveProperty('forceSave');
      expect(documentManager).toHaveProperty('updateDocumentTitle');
    });
    
    it('should create a new document', async () => {
      const context = {
        canvasComponent: {
          resetCanvas: vi.fn()
        }
      };
      
      const documentManager = createLegacyDocumentManager(context);
      const newDoc = await documentManager.createNewDocument({ title: 'New Test Doc' });
      
      // Check that canvas was reset
      expect(context.canvasComponent.resetCanvas).toHaveBeenCalled();
      
      // Check that service was called
      expect(documentService.createNewDocument).toHaveBeenCalledWith({ title: 'New Test Doc' });
      
      // Check that document was returned
      expect(newDoc).toEqual({ id: 'new-doc', title: 'New Document' });
    });
    
    it('should load a document by ID', async () => {
      const context = {
        canvasComponent: {
          resetCanvas: vi.fn()
        }
      };
      
      const documentManager = createLegacyDocumentManager(context);
      const loadedDoc = await documentManager.loadDocumentById('doc-123');
      
      // Check that canvas was reset
      expect(context.canvasComponent.resetCanvas).toHaveBeenCalled();
      
      // Check that service was called
      expect(documentService.loadDocumentById).toHaveBeenCalledWith('doc-123');
      
      // Check that document was returned
      expect(loadedDoc).toEqual({ id: 'loaded-doc', title: 'Loaded Document' });
    });
    
    it('should add a new page', () => {
      const context = {};
      
      const documentManager = createLegacyDocumentManager(context);
      const pageId = documentManager.handleAddPage('master-1');
      
      // Check that services were called
      expect(documentService.saveCurrentPage).toHaveBeenCalled();
      expect(documentService.addPage).toHaveBeenCalledWith('master-1');
      
      // Check that page ID was returned
      expect(pageId).toBe('new-page-id');
    });
    
    it('should save the document', async () => {
      const context = {};
      
      const documentManager = createLegacyDocumentManager(context);
      const result = await documentManager.handleSave();
      
      // Check that services were called
      expect(documentService.saveCurrentPage).toHaveBeenCalled();
      expect(documentService.forceSave).toHaveBeenCalled();
      
      // Check that success result was returned
      expect(result).toEqual({ success: true, error: null });
    });
    
    it('should handle save errors', async () => {
      const context = {};
      
      // Make forceSave throw an error
      documentService.forceSave.mockRejectedValueOnce(new Error('Test error'));
      
      const documentManager = createLegacyDocumentManager(context);
      const result = await documentManager.handleSave();
      
      // Check that error result was returned
      expect(result).toEqual({ success: false, error: 'Test error' });
    });
    
    it('should update document title', () => {
      const context = {};
      
      const documentManager = createLegacyDocumentManager(context);
      documentManager.updateDocumentTitle('Updated Title');
      
      // Check that service was called
      expect(documentService.updateDocumentTitle).toHaveBeenCalledWith('Updated Title');
    });
  });
  
  describe('createLegacyAutoSaveManager', () => {
    let originalSetInterval, originalClearInterval;
    
    beforeEach(() => {
      // Mock timer functions
      originalSetInterval = global.setInterval;
      originalClearInterval = global.clearInterval;
      global.setInterval = vi.fn().mockReturnValue(123);
      global.clearInterval = vi.fn();
    });
    
    afterEach(() => {
      // Restore timer functions
      global.setInterval = originalSetInterval;
      global.clearInterval = originalClearInterval;
    });
    
    it('should create auto-save manager with all required methods', () => {
      const context = {};
      
      const autoSaveManager = createLegacyAutoSaveManager(context);
      
      // Check that all expected methods are present
      expect(autoSaveManager).toHaveProperty('initialize');
      expect(autoSaveManager).toHaveProperty('cleanup');
      expect(autoSaveManager).toHaveProperty('setupAutoSave');
      expect(autoSaveManager).toHaveProperty('setupForceSave');
      expect(autoSaveManager).toHaveProperty('setupBeforeUnloadHandler');
      expect(autoSaveManager).toHaveProperty('clearAutoSave');
      expect(autoSaveManager).toHaveProperty('clearForceSave');
      expect(autoSaveManager).toHaveProperty('clearBeforeUnloadHandler');
    });
    
    it('should initialize all auto-save systems', () => {
      const context = {};
      
      const autoSaveManager = createLegacyAutoSaveManager(context);
      autoSaveManager.initialize();
      
      // Check that all setup methods were called
      expect(global.setInterval).toHaveBeenCalledTimes(2); // Once for autoSave, once for forceSave
      expect(window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });
    
    it('should clean up properly', async () => {
      const context = {};
      
      const autoSaveManager = createLegacyAutoSaveManager(context);
      autoSaveManager.initialize();
      await autoSaveManager.cleanup();
      
      // Check that cleanup methods were called
      expect(documentService.saveCurrentPage).toHaveBeenCalled();
      expect(documentService.forceSave).toHaveBeenCalled();
      expect(global.clearInterval).toHaveBeenCalledTimes(2); // Once for autoSave, once for forceSave
      expect(window.removeEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });
  });
  
  describe('createLegacyCanvasWrapper', () => {
    it('should create canvas wrapper with all required methods', () => {
      const mockCanvas = {};
      
      const canvasWrapper = createLegacyCanvasWrapper(mockCanvas);
      
      // Check that all expected methods are present
      expect(canvasWrapper).toHaveProperty('bringForward');
      expect(canvasWrapper).toHaveProperty('sendBackward');
      expect(canvasWrapper).toHaveProperty('bringToFront');
      expect(canvasWrapper).toHaveProperty('sendToBack');
      expect(canvasWrapper).toHaveProperty('deleteSelectedObjects');
      expect(canvasWrapper).toHaveProperty('copySelectedObjects');
      expect(canvasWrapper).toHaveProperty('cutSelectedObjects');
      expect(canvasWrapper).toHaveProperty('pasteObjects');
      expect(canvasWrapper).toHaveProperty('saveCurrentPage');
      expect(canvasWrapper).toHaveProperty('loadPage');
      expect(canvasWrapper).toHaveProperty('applyMasterPage');
      expect(canvasWrapper).toHaveProperty('overrideMasterObject');
    });
    
    it('should initialize all services', () => {
      const mockCanvas = {};
      
      createLegacyCanvasWrapper(mockCanvas);
      
      // Check that services were initialized
      expect(canvasService.initialize).toHaveBeenCalledWith(mockCanvas);
      expect(documentService.initialize).toHaveBeenCalledWith(mockCanvas);
      expect(masterPageService.initialize).toHaveBeenCalledWith(mockCanvas);
    });
    
    it('should delegate methods to appropriate services', () => {
      const mockCanvas = {};
      
      const canvasWrapper = createLegacyCanvasWrapper(mockCanvas);
      
      // Call layer management methods
      canvasWrapper.bringForward();
      canvasWrapper.sendBackward();
      canvasWrapper.bringToFront();
      canvasWrapper.sendToBack();
      
      // Check that service methods were called
      expect(canvasService.bringForward).toHaveBeenCalled();
      expect(canvasService.sendBackward).toHaveBeenCalled();
      expect(canvasService.bringToFront).toHaveBeenCalled();
      expect(canvasService.sendToBack).toHaveBeenCalled();
      
      // Call object manipulation methods
      canvasWrapper.deleteSelectedObjects();
      canvasWrapper.copySelectedObjects();
      canvasWrapper.cutSelectedObjects();
      canvasWrapper.pasteObjects();
      
      // Check that service methods were called
      expect(canvasService.deleteSelectedObjects).toHaveBeenCalled();
      expect(canvasService.copySelectedObjects).toHaveBeenCalled();
      expect(canvasService.pasteObjects).toHaveBeenCalled();
      
      // Call document management methods
      canvasWrapper.saveCurrentPage();
      canvasWrapper.loadPage('page-2');
      
      // Check that service methods were called
      expect(documentService.saveCurrentPage).toHaveBeenCalled();
      expect(documentService.switchToPage).toHaveBeenCalledWith('page-2');
      
      // Call master page methods
      canvasWrapper.applyMasterPage('page-1', 'master-1');
      canvasWrapper.overrideMasterObject({ id: 'obj-1' });
      
      // Check that service methods were called
      expect(masterPageService.applyMasterPage).toHaveBeenCalledWith('page-1', 'master-1');
      expect(masterPageService.overrideMasterObject).toHaveBeenCalledWith({ id: 'obj-1' });
    });
  });
});