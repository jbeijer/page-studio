import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { 
  currentDocument, 
  currentPage, 
  documentList, 
  createDocument, 
  setCurrentDocument,
  addPage,
  removePage
} from './document';

describe('Document Store', () => {
  beforeEach(() => {
    // Reset stores to a clean state before each test
    currentDocument.set(null);
    currentPage.set(null);
    documentList.set([]);
  });

  describe('createDocument', () => {
    it('should create a document with default values', () => {
      const doc = createDocument({});
      
      expect(doc.id).toBeDefined();
      expect(doc.title).toBe('Untitled Document');
      expect(doc.format).toBe('A4');
      expect(doc.metadata.pageSize.width).toBe(210);
      expect(doc.metadata.pageSize.height).toBe(297);
      expect(doc.pages.length).toBe(1);
      expect(doc.pages[0].id).toBe('page-1');
    });

    it('should create a document with specified values', () => {
      const doc = createDocument({
        title: 'Test Document',
        format: 'A5',
        width: 148,
        height: 210,
        pageCount: 3
      });
      
      expect(doc.title).toBe('Test Document');
      expect(doc.format).toBe('A5');
      expect(doc.metadata.pageSize.width).toBe(148);
      expect(doc.metadata.pageSize.height).toBe(210);
      expect(doc.pages.length).toBe(3);
      expect(doc.pages[0].id).toBe('page-1');
      expect(doc.pages[1].id).toBe('page-2');
      expect(doc.pages[2].id).toBe('page-3');
    });
  });

  describe('setCurrentDocument', () => {
    it('should set the current document and first page', () => {
      const doc = createDocument({
        title: 'Test',
        pageCount: 2
      });
      
      setCurrentDocument(doc);
      
      expect(get(currentDocument)).toBe(doc);
      expect(get(currentPage)).toBe('page-1');
    });

    it('should set currentPage to null if document has no pages', () => {
      const doc = { ...createDocument({}), pages: [] };
      
      setCurrentDocument(doc);
      
      expect(get(currentDocument)).toBe(doc);
      expect(get(currentPage)).toBeNull();
    });
  });

  describe('addPage', () => {
    it('should add a page to the document', () => {
      const doc = createDocument({});
      setCurrentDocument(doc);
      
      addPage();
      
      const updatedDoc = get(currentDocument);
      expect(updatedDoc.pages.length).toBe(2);
      expect(updatedDoc.pages[1].id).toBe('page-2');
      expect(get(currentPage)).toBe('page-2');
    });

    it('should do nothing if no document is set', () => {
      addPage();
      
      expect(get(currentDocument)).toBeNull();
    });
  });

  describe('removePage', () => {
    it('should remove the specified page', () => {
      const doc = createDocument({ pageCount: 3 });
      setCurrentDocument(doc);
      
      removePage('page-2');
      
      const updatedDoc = get(currentDocument);
      expect(updatedDoc.pages.length).toBe(2);
      expect(updatedDoc.pages[0].id).toBe('page-1');
      expect(updatedDoc.pages[1].id).toBe('page-3');
    });

    it('should update currentPage if the removed page was selected', () => {
      const doc = createDocument({ pageCount: 3 });
      setCurrentDocument(doc);
      currentPage.set('page-2');
      
      removePage('page-2');
      
      expect(get(currentPage)).toBe('page-1');
    });

    it('should set currentPage to null if removing the last page', () => {
      const doc = createDocument({});
      setCurrentDocument(doc);
      
      removePage('page-1');
      
      expect(get(currentPage)).toBeNull();
    });
  });
});