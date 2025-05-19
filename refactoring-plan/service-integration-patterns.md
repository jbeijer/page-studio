# Service Integration Patterns

This document describes integration patterns for working with PageStudio's centralized services architecture. It provides guidelines for how to use services, transition from the previous component-based approach, and ensure clean, maintainable code.

## Overview

PageStudio has been refactored to use a service-based architecture that centralizes core functionality like document management, canvas operations, and master page management. This document explains how to integrate with these services in both new and existing code.

## Available Services

The following centralized services are available:

1. **DocumentService**: Manages document operations, including:
   - Document creation, loading, and saving
   - Page management (adding, switching, saving)
   - Canvas state synchronization
   - Auto-save functionality

2. **CanvasService**: Handles canvas operations, including:
   - Canvas initialization and reset
   - Object creation and manipulation
   - Layer management
   - Event handling

3. **MasterPageService**: Specializes in master page functionality:
   - Managing master page templates
   - Applying master pages to document pages
   - Overriding master objects

## Integration Approaches

### Approach 1: Direct Service Import (Recommended for New Components)

For new components, the recommended approach is to directly import services from the central services module:

```javascript
// Import specific services
import { documentService, canvasService, masterPageService } from '$lib/services';

// Use services directly
documentService.saveCurrentPage();
canvasService.createObject('rect', { left: 100, top: 100, width: 100, height: 100 });
masterPageService.applyMasterPage(pageId, masterId);
```

This approach provides the most direct and type-safe way to use services.

### Approach 2: Context-Based Service Access (Recommended for Components within ServiceProvider)

For components that are children of the `ServiceProvider` component, you can use the `getServices` function to access services from context:

```javascript
import { getServices } from '$lib/services/getServices';

// In your component
const { documentService, canvasService, masterPageService } = getServices();
```

This approach is useful for components that might be deeply nested in the component tree and don't want to directly import services.

### Approach 3: Legacy Integration (For Transition Period)

For existing code that cannot be immediately refactored, we provide a legacy integration layer:

```javascript
import { createLegacyDocumentManager, createLegacyAutoSaveManager } from '$lib/services/ServiceIntegration';

// Create a context with canvas reference
const context = { canvasComponent: canvasRef };

// Create legacy-compatible managers
const documentManager = createLegacyDocumentManager(context);
const autoSaveManager = createLegacyAutoSaveManager(context);

// Use with existing code
documentManager.handleSave();
autoSaveManager.initialize();
```

This approach allows for a gradual transition from the old component-based approach to the new service-based architecture.

## Service Initialization

Services must be initialized with a canvas reference before use. This happens in one of two ways:

1. **Manual Initialization**: Call the `initialize` method directly:

   ```javascript
   import { documentService, canvasService, masterPageService } from '$lib/services';
   
   // Initialize services with canvas
   canvasService.initialize(canvas);
   documentService.initialize(canvas);
   masterPageService.initialize(canvas);
   ```

2. **ServiceProvider Initialization**: The `ServiceProvider` component can initialize all services:

   ```html
   <ServiceProvider>
     <Canvas />
   </ServiceProvider>
   ```

   The Canvas component would then call the initialization function:

   ```javascript
   import { getServices } from '$lib/services/getServices';
   
   onMount(() => {
     // Initialize canvas
     canvas = new fabric.Canvas(canvasElement);
     
     // Initialize services
     getServices().initializeCanvas(canvas);
   });
   ```

## Service Lifecycle

Services follow a standard lifecycle:

1. **Initialization**: Services are initialized with a canvas reference.
2. **Operation**: Services perform their operations during the component lifecycle.
3. **Cleanup**: Services clean up resources when the component unmounts.

Always call the `cleanup` method when the component is unmounted:

```javascript
onDestroy(() => {
  documentService.cleanup();
  canvasService.cleanup();
  masterPageService.cleanup();
});
```

The `ServiceProvider` component handles this automatically for components within its hierarchy.

## Best Practices

1. **Use ServiceProvider**: Wrap your application with `ServiceProvider` to enable context-based service access.

2. **Prefer Direct Imports**: For most components, directly importing services is the clearest approach.

3. **Initialize Early**: Initialize services as early as possible, usually in the `onMount` lifecycle hook.

4. **Clean Up Resources**: Always clean up services when components unmount.

5. **Handle Loading State**: Services may not be immediately available. Use reactive variables to track readiness:

   ```javascript
   import { allServicesReady } from '$lib/services/getServices';
   
   $: if ($allServicesReady) {
     // Safe to use services
   }
   ```

6. **Don't Recreate Service Logic**: Avoid reimplementing functionality that exists in services. If you need custom behavior, extend or wrap the services instead.

## Migration Guide

When migrating from the old component-based approach to the new service-based architecture:

1. Start by identifying the component's dependencies on canvas operations, document management, and master page functionality.

2. Replace direct canvas manipulation with service calls:

   **Before**:
   ```javascript
   canvas.add(new fabric.Rect({ left: 100, top: 100, width: 100, height: 100 }));
   ```

   **After**:
   ```javascript
   canvasService.createObject('rect', { left: 100, top: 100, width: 100, height: 100 });
   ```

3. Replace document manipulation functions with service calls:

   **Before**:
   ```javascript
   saveDocument(document);
   ```

   **After**:
   ```javascript
   documentService.forceSave();
   ```

4. For components that can't be fully migrated immediately, use the legacy integration layer to provide a compatibility interface.

## Example: Migrating a Component

Here's an example of migrating a simple component that creates shapes on a canvas:

**Before**:
```svelte
<script>
  export let canvas;
  
  function createRectangle() {
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      fill: '#cccccc'
    });
    canvas.add(rect);
    canvas.renderAll();
  }
</script>

<button on:click={createRectangle}>Add Rectangle</button>
```

**After**:
```svelte
<script>
  import { canvasService } from '$lib/services';
  
  function createRectangle() {
    canvasService.createObject('rect', {
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      fill: '#cccccc'
    });
  }
</script>

<button on:click={createRectangle}>Add Rectangle</button>
```

## Troubleshooting

### Service Not Initialized

If you see errors like "Canvas is not initialized" or "Cannot perform operation: Canvas not available", make sure:

1. Services are properly initialized with a canvas reference.
2. You're not trying to use services before the canvas is created.
3. The ServiceProvider component is properly wrapping your application.

### Legacy Integration Issues

If you're using the legacy integration layer and experiencing issues:

1. Check that the context object has the correct canvasComponent reference.
2. Verify that the canvas component is fully initialized before using it.
3. Consider migrating directly to the service-based approach for more reliable behavior.

### Event Handling

When transitioning from direct canvas event handling to service-based operations, you might need to adjust event handlers:

1. Register event handlers through the appropriate service rather than directly on the canvas.
2. Use service methods to respond to events instead of directly manipulating canvas objects.

## Conclusion

The service-based architecture provides a more maintainable, centralized approach to managing PageStudio's core functionality. By following these integration patterns, you can effectively use services in both new and existing code while ensuring a smooth transition to the new architecture.