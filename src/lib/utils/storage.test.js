/**
 * Tests for storage.js - IndexedDB document storage utility
 */

import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest';
import { openDatabase, saveDocument, loadDocument, getDocumentList, deleteDocument } from './storage';

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  databases: vi.fn().mockResolvedValue([]),
};

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

// Mock request and event objects
const mockRequest = {
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
  error: null,
  result: null,
};

describe('Storage Utility', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
    
    // Setup IndexedDB global mock
    global.indexedDB = mockIndexedDB;
    
    // Setup open database mock
    mockIndexedDB.open.mockImplementation(() => {
      setTimeout(() => {
        // Call onsuccess, returning the mock DB
        mockRequest.result = mockDB;
        if (mockRequest.onsuccess) mockRequest.onsuccess({ target: mockRequest });
      }, 0);
      return mockRequest;
    });
  });
  
  afterEach(() => {
    // Clean up
    vi.resetAllMocks();
  });
  
  test('openDatabase should return a promise that resolves to a database connection', async () => {
    const dbPromise = openDatabase();
    expect(dbPromise).toBeInstanceOf(Promise);
    
    const db = await dbPromise;
    expect(db).toBe(mockDB);
    expect(mockIndexedDB.open).toHaveBeenCalledWith('PageStudioDB', 1);
  });
  
  test('saveDocument should save a document to IndexedDB', async () => {
    // Setup mock put request
    const mockPutRequest = {
      onsuccess: null,
      onerror: null,
    };
    mockStore.put.mockImplementation(() => {
      setTimeout(() => {
        if (mockPutRequest.onsuccess) mockPutRequest.onsuccess();
      }, 0);
      return mockPutRequest;
    });
    
    // Call saveDocument
    const savePromise = saveDocument(mockDocument);
    expect(savePromise).toBeInstanceOf(Promise);
    
    const result = await savePromise;
    expect(result).toBe(mockDocument.id);
    expect(mockStore.put).toHaveBeenCalled();
    expect(mockDB.transaction).toHaveBeenCalledWith(['documents'], 'readwrite');
  });
  
  test('loadDocument should retrieve a document from IndexedDB', async () => {
    // Setup mock get request
    const mockGetRequest = {
      onsuccess: null,
      onerror: null,
      result: null,
    };
    mockStore.get.mockImplementation(() => {
      setTimeout(() => {
        mockGetRequest.result = {
          ...mockDocument,
          created: mockDocument.created.toISOString(),
          lastModified: mockDocument.lastModified.toISOString(),
        };
        if (mockGetRequest.onsuccess) mockGetRequest.onsuccess({ target: mockGetRequest });
      }, 0);
      return mockGetRequest;
    });
    
    // Call loadDocument
    const loadPromise = loadDocument(mockDocument.id);
    expect(loadPromise).toBeInstanceOf(Promise);
    
    const result = await loadPromise;
    expect(result).toHaveProperty('id', mockDocument.id);
    expect(result).toHaveProperty('title', mockDocument.title);
    expect(result.created).toBeInstanceOf(Date);
    expect(result.lastModified).toBeInstanceOf(Date);
    expect(mockStore.get).toHaveBeenCalledWith(mockDocument.id);
    expect(mockDB.transaction).toHaveBeenCalledWith(['documents'], 'readonly');
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
    mockIndex.openCursor.mockImplementation(() => {
      setTimeout(() => {
        if (mockCursorRequest.onsuccess) {
          mockCursorRequest.onsuccess({ target: mockCursorRequest });
          // Simulate end of cursor
          mockCursorRequest.result = null;
          mockCursorRequest.onsuccess({ target: mockCursorRequest });
        }
      }, 0);
      return mockCursorRequest;
    });
    
    // Call getDocumentList
    const listPromise = getDocumentList();
    expect(listPromise).toBeInstanceOf(Promise);
    
    const result = await listPromise;
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0]).toHaveProperty('id', mockDocument.id);
    expect(result[0]).toHaveProperty('title', mockDocument.title);
    expect(result[0].created).toBeInstanceOf(Date);
    expect(result[0].lastModified).toBeInstanceOf(Date);
    expect(mockStore.index).toHaveBeenCalledWith('lastModified');
    expect(mockDB.transaction).toHaveBeenCalledWith(['documents'], 'readonly');
  });
  
  test('deleteDocument should remove a document from IndexedDB', async () => {
    // Setup mock delete request
    const mockDeleteRequest = {
      onsuccess: null,
      onerror: null,
    };
    mockStore.delete.mockImplementation(() => {
      setTimeout(() => {
        if (mockDeleteRequest.onsuccess) mockDeleteRequest.onsuccess();
      }, 0);
      return mockDeleteRequest;
    });
    
    // Call deleteDocument
    const deletePromise = deleteDocument(mockDocument.id);
    expect(deletePromise).toBeInstanceOf(Promise);
    
    await deletePromise;
    expect(mockStore.delete).toHaveBeenCalledWith(mockDocument.id);
    expect(mockDB.transaction).toHaveBeenCalledWith(['documents'], 'readwrite');
  });
});