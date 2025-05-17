/**
 * Tests for storage.js - IndexedDB document storage utility
 */

import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest';
import * as storageModule from './storage';

// Mock indexedDB globally
global.indexedDB = {
  open: vi.fn(),
  databases: vi.fn().mockResolvedValue([]),
};

// Create local reference to avoid recursive mock issues
const {
  openDatabase, 
  saveDocument, 
  loadDocument, 
  getDocumentList, 
  deleteDocument
} = storageModule;

// Define constants used in the storage module
const DOCUMENT_STORE = 'documents';

// Mock store and transaction
const mockStore = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  index: vi.fn(),
  openCursor: vi.fn(),
};

const mockTransaction = {
  objectStore: vi.fn().mockReturnValue(mockStore),
  oncomplete: null,
};

const mockDB = {
  transaction: vi.fn().mockReturnValue(mockTransaction),
  objectStoreNames: {
    contains: vi.fn().mockReturnValue(true),
  },
  createObjectStore: vi.fn(),
  close: vi.fn(),
};

// Setup mock data
const mockDocument = {
  id: 'doc-123456789',
  title: 'Test Document',
  format: 'A4',
  creator: 'Test User',
  created: new Date('2025-01-01'),
  lastModified: new Date('2025-01-02'),
  metadata: {
    pageSize: { width: 210, height: 297 },
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    columns: 1,
    columnGap: 10,
  },
  pages: [
    { id: 'page-1', canvasJSON: '{"objects":[]}', masterPageId: null },
  ],
  masterPages: [],
  styles: {
    colors: [],
    textStyles: [],
    objectStyles: [],
  },
};

// Mock the indexedDB.open result
global.indexedDB.open.mockImplementation(() => {
  const request = {
    result: mockDB,
    error: null,
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null
  };
  
  // Call onsuccess asynchronously
  setTimeout(() => {
    request.onsuccess && request.onsuccess({ target: request });
  }, 0);
  
  return request;
});

// Don't mock openDatabase directly so we can test its implementation
// instead of testing our mock

describe('Storage Utility', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Clean up
    vi.clearAllMocks();
  });
  
  test('openDatabase should return a promise that resolves to a database connection', async () => {
    const dbPromise = openDatabase();
    expect(dbPromise).toBeInstanceOf(Promise);
    
    const db = await dbPromise;
    expect(db).toBe(mockDB);
  });
  
  test('saveDocument should save a document to IndexedDB', async () => {
    // Setup mock put request
    const mockPutRequest = {
      onsuccess: null,
      onerror: null
    };
    mockStore.put.mockReturnValue(mockPutRequest);
    
    // Call saveDocument and trigger the success event
    const savePromise = saveDocument(mockDocument);
    
    // Trigger success callback asynchronously
    setTimeout(() => {
      mockPutRequest.onsuccess && mockPutRequest.onsuccess();
    }, 0);
    
    const result = await savePromise;
    
    expect(mockDB.transaction).toHaveBeenCalledWith([DOCUMENT_STORE], 'readwrite');
    expect(mockTransaction.objectStore).toHaveBeenCalledWith(DOCUMENT_STORE);
    expect(mockStore.put).toHaveBeenCalled();
    expect(result).toBe(mockDocument.id);
  });
  
  test('loadDocument should retrieve a document from IndexedDB', async () => {
    // Setup mock get request
    const mockGetRequest = {
      onsuccess: null,
      onerror: null,
      result: {
        ...mockDocument,
        created: mockDocument.created.toISOString(),
        lastModified: mockDocument.lastModified.toISOString(),
      }
    };
    
    mockStore.get.mockReturnValue(mockGetRequest);
    
    // Call loadDocument
    const loadPromise = loadDocument(mockDocument.id);
    
    // Manually trigger the success event
    setTimeout(() => {
      mockGetRequest.onsuccess && mockGetRequest.onsuccess({ target: mockGetRequest });
    }, 0);
    
    const result = await loadPromise;
    
    expect(mockDB.transaction).toHaveBeenCalledWith([DOCUMENT_STORE], 'readonly');
    expect(mockTransaction.objectStore).toHaveBeenCalledWith(DOCUMENT_STORE);
    expect(mockStore.get).toHaveBeenCalledWith(mockDocument.id);
    expect(result).toHaveProperty('id', mockDocument.id);
    expect(result).toHaveProperty('title', mockDocument.title);
    expect(result.created).toBeInstanceOf(Date);
    expect(result.lastModified).toBeInstanceOf(Date);
  });
  
  test('getDocumentList should return a list of document summaries', async () => {
    // Setup mock index
    const mockIndex = {
      openCursor: vi.fn(),
    };
    mockStore.index.mockReturnValue(mockIndex);
    
    // Setup mock cursor
    const mockCursor = {
      value: {
        id: 'doc-123456789',
        title: 'Test Document',
        created: new Date('2025-01-01').toISOString(),
        lastModified: new Date('2025-01-02').toISOString(),
        pages: [{ id: 'page-1' }],
      },
      continue: vi.fn(),
    };
    
    // Setup mock cursor request
    const mockCursorRequest = {
      onsuccess: null,
      onerror: null,
      result: mockCursor,
    };
    mockIndex.openCursor.mockReturnValue(mockCursorRequest);
    
    // Call getDocumentList
    const listPromise = getDocumentList();
    
    // Manually trigger the success event with the cursor, then with null to end the cursor
    setTimeout(() => {
      mockCursorRequest.onsuccess && mockCursorRequest.onsuccess({ target: mockCursorRequest });
      mockCursorRequest.result = null;
      mockCursorRequest.onsuccess && mockCursorRequest.onsuccess({ target: mockCursorRequest });
    }, 0);
    
    const result = await listPromise;
    
    expect(mockDB.transaction).toHaveBeenCalledWith([DOCUMENT_STORE], 'readonly');
    expect(mockTransaction.objectStore).toHaveBeenCalledWith(DOCUMENT_STORE);
    expect(mockStore.index).toHaveBeenCalledWith('lastModified');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0]).toHaveProperty('id', mockDocument.id);
    expect(result[0]).toHaveProperty('title', mockDocument.title);
    expect(result[0].created).toBeInstanceOf(Date);
    expect(result[0].lastModified).toBeInstanceOf(Date);
  });
  
  test('deleteDocument should remove a document from IndexedDB', async () => {
    // Setup mock delete request
    const mockDeleteRequest = {
      onsuccess: null,
      onerror: null,
    };
    mockStore.delete.mockReturnValue(mockDeleteRequest);
    
    // Call deleteDocument
    const deletePromise = deleteDocument(mockDocument.id);
    
    // Manually trigger the success event
    setTimeout(() => {
      mockDeleteRequest.onsuccess && mockDeleteRequest.onsuccess();
    }, 0);
    
    await deletePromise;
    
    expect(mockDB.transaction).toHaveBeenCalledWith([DOCUMENT_STORE], 'readwrite');
    expect(mockTransaction.objectStore).toHaveBeenCalledWith(DOCUMENT_STORE);
    expect(mockStore.delete).toHaveBeenCalledWith(mockDocument.id);
  });
});