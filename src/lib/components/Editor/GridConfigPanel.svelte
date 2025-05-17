<script>
  import { currentDocument } from '$lib/stores/document';
  
  /**
   * Updates grid settings in the document
   * @param {Object} settings - New grid settings
   */
  function updateGridSettings(settings) {
    if (!$currentDocument) return;
    
    currentDocument.update(doc => {
      return {
        ...doc,
        metadata: {
          ...doc.metadata,
          grid: {
            ...doc.metadata.grid,
            ...settings
          }
        },
        lastModified: new Date()
      };
    });
  }
  
  /**
   * Updates ruler settings in the document
   * @param {Object} settings - New ruler settings
   */
  function updateRulerSettings(settings) {
    if (!$currentDocument) return;
    
    currentDocument.update(doc => {
      return {
        ...doc,
        metadata: {
          ...doc.metadata,
          rulers: {
            ...doc.metadata.rulers,
            ...settings
          }
        },
        lastModified: new Date()
      };
    });
  }
  
  /**
   * Toggles grid visibility
   * @param {Event} e - Change event
   */
  function toggleGrid(e) {
    updateGridSettings({ enabled: e.target.checked });
  }
  
  /**
   * Toggles grid snapping
   * @param {Event} e - Change event
   */
  function toggleGridSnap(e) {
    updateGridSettings({ snap: e.target.checked });
  }
  
  /**
   * Updates grid size
   * @param {Event} e - Change event
   */
  function updateGridSize(e) {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      updateGridSettings({ size: value });
    }
  }
  
  /**
   * Updates grid subdivisions
   * @param {Event} e - Change event
   */
  function updateGridSubdivisions(e) {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      updateGridSettings({ subdivisions: value });
    }
  }
  
  /**
   * Updates grid color
   * @param {Event} e - Change event
   */
  function updateGridColor(e) {
    updateGridSettings({ color: e.target.value });
  }
  
  /**
   * Toggles rulers visibility
   * @param {Event} e - Change event
   */
  function toggleRulers(e) {
    updateRulerSettings({ enabled: e.target.checked });
  }
  
  /**
   * Updates ruler units
   * @param {Event} e - Change event
   */
  function updateRulerUnits(e) {
    updateRulerSettings({ units: e.target.value });
  }
  
  /**
   * Toggle horizontal ruler visibility
   * @param {Event} e - Change event
   */
  function toggleHorizontalRuler(e) {
    updateRulerSettings({ horizontalVisible: e.target.checked });
  }
  
  /**
   * Toggle vertical ruler visibility
   * @param {Event} e - Change event
   */
  function toggleVerticalRuler(e) {
    updateRulerSettings({ verticalVisible: e.target.checked });
  }
</script>

<div class="grid-config-panel bg-white rounded shadow p-4">
  <h3 class="text-lg font-semibold mb-4">Grid & Guides</h3>
  
  <!-- Grid Settings -->
  <section class="mb-4">
    <h4 class="font-medium mb-2">Grid</h4>
    
    <div class="mb-2">
      <label class="flex items-center">
        <input
          type="checkbox"
          class="mr-2"
          checked={$currentDocument?.metadata?.grid?.enabled}
          on:change={toggleGrid}
        />
        Show Grid
      </label>
    </div>
    
    <div class="mb-2">
      <label class="flex items-center">
        <input
          type="checkbox"
          class="mr-2"
          checked={$currentDocument?.metadata?.grid?.snap}
          on:change={toggleGridSnap}
        />
        Snap to Grid
      </label>
    </div>
    
    <div class="mb-2 flex items-center">
      <label class="mr-2">Grid Size:</label>
      <input
        type="number"
        min="1"
        max="100"
        class="border rounded px-2 py-1 w-16"
        value={$currentDocument?.metadata?.grid?.size || 10}
        on:input={updateGridSize}
      />
      <span class="ml-1 text-sm text-gray-500">mm</span>
    </div>
    
    <div class="mb-2 flex items-center">
      <label class="mr-2">Subdivisions:</label>
      <input
        type="number"
        min="1"
        max="10"
        class="border rounded px-2 py-1 w-16"
        value={$currentDocument?.metadata?.grid?.subdivisions || 2}
        on:input={updateGridSubdivisions}
      />
    </div>
    
    <div class="mb-2 flex items-center">
      <label class="mr-2">Grid Color:</label>
      <input
        type="color"
        class="border rounded cursor-pointer"
        value={$currentDocument?.metadata?.grid?.color || '#CCCCCC'}
        on:input={updateGridColor}
      />
    </div>
  </section>
  
  <!-- Ruler Settings -->
  <section>
    <h4 class="font-medium mb-2">Rulers</h4>
    
    <div class="mb-2">
      <label class="flex items-center">
        <input
          type="checkbox"
          class="mr-2"
          checked={$currentDocument?.metadata?.rulers?.enabled}
          on:change={toggleRulers}
        />
        Show Rulers
      </label>
    </div>
    
    <div class="mb-2">
      <label class="flex items-center">
        <input
          type="checkbox"
          class="mr-2"
          checked={$currentDocument?.metadata?.rulers?.horizontalVisible}
          on:change={toggleHorizontalRuler}
        />
        Horizontal Ruler
      </label>
    </div>
    
    <div class="mb-2">
      <label class="flex items-center">
        <input
          type="checkbox"
          class="mr-2"
          checked={$currentDocument?.metadata?.rulers?.verticalVisible}
          on:change={toggleVerticalRuler}
        />
        Vertical Ruler
      </label>
    </div>
    
    <div class="mb-2">
      <label>
        Units:
        <select
          class="border rounded px-2 py-1 ml-2"
          value={$currentDocument?.metadata?.rulers?.units || 'mm'}
          on:change={updateRulerUnits}
        >
          <option value="mm">Millimeters</option>
          <option value="cm">Centimeters</option>
          <option value="inch">Inches</option>
          <option value="px">Pixels</option>
        </select>
      </label>
    </div>
  </section>
  
  <div class="mt-4 pt-4 border-t text-sm text-gray-600">
    <p>Tip: Drag from rulers to create guides</p>
    <p>Double-click on guide markers to delete guides</p>
  </div>
</div>