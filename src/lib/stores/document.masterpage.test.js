import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  currentDocument, 
  createDocument, 
  createMasterPage, 
  updateMasterPage, 
  removeMasterPage, 
  applyMasterPage, 
  setMasterObjectOverride 
} from './document';
import { get } from 'svelte/store';

describe('Document Store Master Page Functionality', () => {
  beforeEach(() => {
    // Create a fresh test document
    const doc = createDocument({
      title: 'Test Document',
      pageCount: 2
    });
    
    currentDocument.set(doc);
  });
  
  afterEach(() => {
    // Clean up
    currentDocument.set(null);
  });
  
  it('should create a master page correctly', () => {
    // Create a master page
    const masterPageId = createMasterPage({
      name: 'Test Master Page',
      description: 'Test description'
    });
    
    // Get the document and check the master page
    const doc = get(currentDocument);
    
    expect(doc.masterPages).toHaveLength(1);
    expect(doc.masterPages[0].id).toBe(masterPageId);
    expect(doc.masterPages[0].name).toBe('Test Master Page');
    expect(doc.masterPages[0].description).toBe('Test description');
    expect(doc.masterPages[0].basedOn).toBeNull();
    expect(doc.masterPages[0].canvasJSON).toBeNull();
    expect(doc.masterPages[0].created).toBeInstanceOf(Date);
    expect(doc.masterPages[0].lastModified).toBeInstanceOf(Date);
  });
  
  it('should update a master page correctly', () => {
    // Create a master page
    const masterPageId = createMasterPage({
      name: 'Test Master Page'
    });
    
    // Update the master page
    updateMasterPage(masterPageId, {
      name: 'Updated Master Page',
      description: 'Updated description',
      canvasJSON: '{"objects":[]}'
    });
    
    // Get the document and check the updated master page
    const doc = get(currentDocument);
    
    expect(doc.masterPages).toHaveLength(1);
    expect(doc.masterPages[0].name).toBe('Updated Master Page');
    expect(doc.masterPages[0].description).toBe('Updated description');
    expect(doc.masterPages[0].canvasJSON).toBe('{"objects":[]}');
  });
  
  it('should remove a master page correctly', () => {
    // Create a master page
    const masterPageId = createMasterPage({
      name: 'Test Master Page'
    });
    
    // Remove the master page
    removeMasterPage(masterPageId);
    
    // Get the document and check that the master page was removed
    const doc = get(currentDocument);
    
    expect(doc.masterPages).toHaveLength(0);
  });
  
  it('should handle parent-child relationships between master pages', () => {
    // Create a mock document to ensure we have control over IDs
    const mockDoc = createDocument({
      title: 'Test Document',
      pageCount: 1
    });
    
    // Create master pages with specific IDs
    const parentMasterPage = {
      id: 'parent-master-id',
      name: 'Parent Master Page',
      description: '',
      basedOn: null,
      canvasJSON: '{"objects":[]}',
      created: new Date(),
      lastModified: new Date()
    };
    
    const childMasterPage = {
      id: 'child-master-id',
      name: 'Child Master Page',
      description: '',
      basedOn: 'parent-master-id',
      canvasJSON: '{"objects":[]}',
      created: new Date(),
      lastModified: new Date()
    };
    
    // Add both master pages to the document
    mockDoc.masterPages = [parentMasterPage, childMasterPage];
    
    // Set as current document
    currentDocument.set(mockDoc);
    
    // Get the document and check the relationship
    const doc = get(currentDocument);
    
    expect(doc.masterPages).toHaveLength(2);
    
    const childMaster = doc.masterPages.find(mp => mp.id === 'child-master-id');
    expect(childMaster.basedOn).toBe('parent-master-id');
    
    // The child inherits the parent's canvasJSON
    const parentMaster = doc.masterPages.find(mp => mp.id === 'parent-master-id');
    expect(childMaster.canvasJSON).toBe(parentMaster.canvasJSON);
    
    // If parent is removed, child should update its basedOn reference
    removeMasterPage('parent-master-id');
    
    const updatedDoc = get(currentDocument);
    const updatedChild = updatedDoc.masterPages.find(mp => mp.id === 'child-master-id');
    
    expect(updatedChild.basedOn).toBeNull();
  });
  
  it('should apply a master page to pages correctly', () => {
    // Create a master page
    const masterPageId = createMasterPage({
      name: 'Test Master Page'
    });
    
    // Apply master page to the first page
    const doc = get(currentDocument);
    const firstPageId = doc.pages[0].id;
    
    applyMasterPage(masterPageId, [firstPageId]);
    
    // Check that the master page was applied
    const updatedDoc = get(currentDocument);
    
    expect(updatedDoc.pages[0].masterPageId).toBe(masterPageId);
    expect(updatedDoc.pages[0].overrides).toEqual({});
    
    // The second page should not have a master page
    expect(updatedDoc.pages[1].masterPageId).toBeNull();
  });
  
  it('should handle master object overrides correctly', () => {
    // Create a master page
    const masterPageId = createMasterPage({
      name: 'Test Master Page'
    });
    
    // Apply master page to the first page
    const doc = get(currentDocument);
    const firstPageId = doc.pages[0].id;
    
    applyMasterPage(masterPageId, [firstPageId]);
    
    // Set an override for a master object
    setMasterObjectOverride(firstPageId, 'master-obj-123', true);
    
    // Check that the override was set
    const updatedDoc = get(currentDocument);
    
    expect(updatedDoc.pages[0].overrides).toHaveProperty('master-obj-123', true);
    
    // Remove the override
    setMasterObjectOverride(firstPageId, 'master-obj-123', false);
    
    // Check that the override was removed
    const finalDoc = get(currentDocument);
    
    expect(finalDoc.pages[0].overrides).not.toHaveProperty('master-obj-123');
  });
  
  it('should apply master page to multiple pages at once', () => {
    // Create a master page
    const masterPageId = createMasterPage({
      name: 'Test Master Page'
    });
    
    // Apply master page to all pages
    const doc = get(currentDocument);
    const pageIds = doc.pages.map(page => page.id);
    
    applyMasterPage(masterPageId, pageIds);
    
    // Check that the master page was applied to all pages
    const updatedDoc = get(currentDocument);
    
    expect(updatedDoc.pages[0].masterPageId).toBe(masterPageId);
    expect(updatedDoc.pages[1].masterPageId).toBe(masterPageId);
    
    // All pages should have empty overrides
    expect(updatedDoc.pages[0].overrides).toEqual({});
    expect(updatedDoc.pages[1].overrides).toEqual({});
  });
});