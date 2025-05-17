# Canvas Component Refactoring Plan

## Current Issues
- Canvas.svelte is 2900+ lines - far too large for maintainability
- Multiple responsibilities mixed together
- Some modularization already started with helper files
- Difficult to test individual features

## Refactoring Goals
- Reduce Canvas.svelte to under 500 lines
- Create logical, modular components with clear responsibilities
- Eliminate code duplication
- Improve testability
- Maintain all existing functionality

## Module Structure

### 1. Canvas.svelte (core component)
**Purpose**: Main canvas container and coordinator
**Target size**: 300-400 lines
**Responsibilities**:
- Component initialization & lifecycle management
- Coordinating subcomponents
- Canvas instance creation
- Event dispatching
- Page loading/saving orchestration
- Export essential public API methods

### 2. Canvas.events.js
**Purpose**: Handle all canvas event handlers
**Target size**: 300-400 lines
**Responsibilities**:
- Mouse/pointer event handlers
- Keyboard event handlers
- Context menu handlers
- Selection event handlers
- Tool-specific event processing

### 3. Canvas.objects.js
**Purpose**: Object creation and manipulation
**Target size**: 300-400 lines
**Responsibilities**:
- Object creation functions for different types (text, rect, etc.)
- Object manipulation (scale, rotate, move)
- Object serialization/deserialization 
- Object property management
- Custom object types and behaviors

### 4. Canvas.history.js (extends current HistoryManager)
**Purpose**: History and state management 
**Target size**: 150-200 lines
**Responsibilities**:
- Undo/redo functionality
- Canvas state snapshots
- State restoration
- History event broadcasting

### 5. Canvas.layers.js (expand current Canvas.helpers.js)
**Purpose**: Layer management
**Target size**: 150-200 lines
**Responsibilities**:
- Object stacking control
- Layer visibility
- Selection grouping
- Z-index management

### 6. Canvas.clipboard.js
**Purpose**: Copy/paste functionality
**Target size**: 150-200 lines
**Responsibilities**:
- Copy logic
- Cut logic
- Paste logic
- Object cloning
- Clipboard state management

### 7. Canvas.document.js
**Purpose**: Document and page management
**Target size**: 250-300 lines
**Responsibilities**:
- Page loading/saving
- Document initialization
- Canvas state persistence
- JSON handling

### 8. Canvas.masters.js
**Purpose**: Master page functionality
**Target size**: 250-300 lines
**Responsibilities**:
- Master page application
- Master object overrides
- Master page synchronization
- Master object identification

### 9. Canvas.grid.js (expand current)
**Purpose**: Grid and guide functionality
**Target size**: 300-350 lines
**Responsibilities**:
- Grid rendering
- Guide creation/management
- Snapping logic
- Ruler coordination

### 10. Canvas.tools.js
**Purpose**: Tool management and behavior
**Target size**: 250-300 lines
**Responsibilities**:
- Tool configurations
- Tool switching logic
- Tool-specific behaviors
- Drawing mode management

### 11. Canvas.textflow.js
**Purpose**: Text flow functionality
**Target size**: 200-250 lines
**Responsibilities**:
- Text linking between objects
- Text overflow handling
- Text update propagation
- Text flow visualization

### 12. CanvasToolbar.svelte (extract from Toolbar.svelte)
**Purpose**: UI component for canvas-specific toolbar
**Target size**: 200-250 lines
**Responsibilities**:
- Tool selection UI
- Layer controls UI
- Common canvas operations
- Tool-specific options

## Shared State Management

### Canvas Context
Create a Canvas context object passed to all modules containing:
- Canvas instance reference
- Current document/page references
- Essential utility functions
- Event dispatcher

### Component Properties Interface
- Define clear property interfaces for each component
- Use proper TypeScript typing where possible
- Establish component communication patterns

## Implementation Approach

### Phase 1: Structural Refactoring
1. Create the module files with dummy exports
2. Move essential types and interfaces to shared files
3. Establish the Canvas context pattern
4. Update imports in the main Canvas.svelte

### Phase 2: Functional Migration
1. Move functions to appropriate modules one by one
2. Update references to use the modular functions
3. Ensure all tests pass after each migration
4. Document the new structure

### Phase 3: UI Component Extraction
1. Extract UI components like rulers, guides
2. Create dedicated toolbar components
3. Establish proper props passing
4. Ensure reactive updates work correctly

### Phase 4: Testing & Finalization
1. Create/update tests for each module
2. Verify full functionality of the refactored system
3. Performance testing
4. Documentation update

## Dependency Graph

```
Canvas.svelte
├── Canvas.events.js
├── Canvas.objects.js
├── Canvas.history.js
├── Canvas.layers.js
├── Canvas.clipboard.js
├── Canvas.document.js
├── Canvas.masters.js
├── Canvas.grid.js
├── Canvas.tools.js
├── Canvas.textflow.js
├── CanvasToolbar.svelte
│   └── ToolOptionPanels/*.svelte
├── HorizontalRuler.svelte
└── VerticalRuler.svelte
```

## Expected Outcomes
- Improved code maintainability
- Better separation of concerns
- Easier testing of individual features
- More focused component responsibilities
- Reduced file sizes (all under 500 lines)
- Clearer API boundaries