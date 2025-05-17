# Master Pages Implementation Plan for PageStudio
## 2025-05-18

This document outlines the implementation plan for adding master pages functionality to PageStudio, our web-based InDesign alternative.

## 1. Overview

Master pages are a critical feature for any professional page layout application, allowing users to create templates that can be applied across multiple pages. They provide consistency, efficiency, and powerful layout capabilities.

### Goals

- Create a system for defining reusable page templates (master pages)
- Implement application of master pages to document pages
- Develop visual indicators and interaction for master page elements
- Allow overriding of master page elements on specific pages
- Enable automatic updating of document pages when master pages change

## 2. Current Status

The codebase already has some preparation for master pages:
- Document model includes `masterPages` array
- Page model includes `masterPageId` reference
- Canvas loading code has placeholder for applying master pages

## 3. Implementation Strategy

### 3.1 Data Model Enhancements

```typescript
// Master Page Model
interface MasterPage {
  id: string;
  name: string;
  description: string;
  basedOn: string | null;  // ID of parent master page (for inheritance)
  canvasJSON: string;  // Fabric.js serialized canvas
  created: Date;
  lastModified: Date;
}

// Enhanced Page Model
interface Page {
  id: string;
  masterPageId: string | null;
  canvasJSON: string;  // User's content
  overrides: {
    [masterId: string]: boolean;  // Map of overridden master objects
  };
}
```

### 3.2 User Interface Components

1. **Master Pages Panel**
   - List of available master pages
   - Thumbnail previews
   - Create/Edit/Delete controls
   - Context menu for operations

2. **Master Page Editing Mode**
   - Distinct visual styling to indicate master page editing
   - Tools for defining which objects should appear on pages

3. **Page Navigator Enhancements**
   - Visual indicators for pages with master pages applied
   - Drag-and-drop interface for applying master pages to pages

4. **Master Page Object Indicators**
   - Visual indicators for elements coming from master pages
   - Context menu for overriding elements

## 4. Implementation Phases

### Phase 1: Core Data Model and Structure (3 days)

1. **Enhance Document Store**
   - Update storage.js to handle master pages collection
   - Add CRUD operations for master pages
   - Implement serialization/deserialization with master page references

2. **Create Master Page Editor Component**
   - Develop MasterPageEditor.svelte component
   - Implement switching between regular and master page editing modes
   - Add visual indicators for master page editing mode

3. **Extend Canvas for Master Pages**
   - Update Canvas.svelte to handle master page objects
   - Implement rendering pipeline for master page objects

**Deliverables:**
- Enhanced data model with master page support
- Basic UI for creating and editing master pages
- Storage implementation for master pages

### Phase 2: Master Page Application (4 days)

1. **Master Page Panel**
   - Create MasterPagePanel.svelte component
   - Implement thumbnails and management interface
   - Develop drag-and-drop functionality

2. **Application Mechanism**
   - Create applyMasterPage function in document store
   - Implement composite rendering of master and regular content
   - Develop visual indicators for master page elements on pages

3. **Master Page Object Management**
   - Implement special attributes for master page objects
   - Create rendering system for displaying master objects
   - Add interactive elements for identifying master objects

**Deliverables:**
- Working master page panel
- Ability to apply master pages to document pages
- Visual system for master page objects

### Phase 3: Advanced Features and Refinement (5 days)

1. **Override System**
   - Implement object overriding mechanism
   - Create UI for unlocking master page objects
   - Develop persistence model for overrides

2. **Master Page Inheritance**
   - Create parent-child relationships for master pages
   - Implement cascading updates through hierarchy
   - Build UI for managing master page hierarchies

3. **Automatic Updates**
   - Develop propagation system for master page changes
   - Implement intelligent update that preserves overrides
   - Add notification system for master page changes

**Deliverables:**
- Complete override system
- Master page inheritance
- Automatic updates with override preservation

## 5. Technical Approach

### 5.1 Master Page Objects Rendering

We'll extend the Fabric.js canvas handling to support a two-layer approach:
- Base layer: Master page objects (rendered first)
- Content layer: User's page content (rendered on top)

Master page objects will have special properties:
```javascript
const masterObject = new fabric.Rect({
  // Regular properties
  left: 100,
  top: 100,
  width: 200,
  height: 50,
  fill: 'blue',
  
  // Master page specific properties
  fromMaster: true,
  masterId: 'master-1',
  masterObjectId: 'obj-123',
  overridable: true,
  
  // Visual/interaction properties for master objects
  selectable: false,  // Unless overridden
  evented: true,      // To allow context menu
  opacity: 0.9        // Slight visual difference
});
```

### 5.2 Overriding Master Objects

When a user overrides a master object:
1. Clone the master object
2. Remove master object restrictions
3. Mark the object as overridden in the page data
4. Replace the master object with the override in the rendering
5. Store the override relationship for future updates

### 5.3 Update Propagation

When a master page is updated:
1. Identify all pages using this master page
2. For each page, determine which master objects are overridden
3. Update non-overridden objects with the new master content
4. For overridden objects, apply a smart merge if possible
5. Notify the user of any conflicts that require manual resolution

## 6. Testing Strategy

### 6.1 Unit Tests

- Test master page CRUD operations
- Test override mechanisms
- Test update propagation algorithms
- Test serialization/deserialization

### 6.2 Component Tests

- Test master page editor component
- Test master page panel
- Test application of master pages to document pages

### 6.3 Integration Tests

- Test complete workflow from creation to application
- Test complex scenarios with nested master pages
- Test large document performance

## 7. Risks and Mitigations

### 7.1 Performance Concerns

**Risk**: Large documents with many master pages could impact performance

**Mitigation**:
- Implement lazy loading of master content
- Use efficient caching strategies
- Optimize rendering pipeline for master objects

### 7.2 User Experience Complexity

**Risk**: Master page concept could be confusing to users

**Mitigation**:
- Create clear visual indicators
- Provide tooltips and help content
- Implement intuitive interaction patterns

### 7.3 Conflicts in Updates

**Risk**: Master page updates could conflict with user content

**Mitigation**:
- Develop smart conflict resolution
- Provide clear user notifications
- Implement version tracking for master pages

## 8. Implementation Timeline

| Week | Day | Tasks |
|------|-----|-------|
| 1 | 1-2 | Core data model and master page editor |
| 1 | 3-5 | Master page application mechanism |
| 2 | 1-3 | Override system and inheritance |
| 2 | 4-5 | Automatic updates and conflict resolution |
| 3 | 1-2 | UI refinement and performance optimization |
| 3 | 3-5 | Testing and bug fixing |

## 9. Success Criteria

The master pages implementation will be considered successful if:

1. Users can create and edit master pages
2. Master pages can be applied to single or multiple document pages
3. Master page elements appear correctly on document pages
4. Users can override specific master elements on individual pages
5. Changes to master pages propagate correctly to all linked pages
6. The system maintains acceptable performance with large documents
7. The UI clearly communicates master page concepts to users
8. Master pages and overrides survive saving and reopening documents