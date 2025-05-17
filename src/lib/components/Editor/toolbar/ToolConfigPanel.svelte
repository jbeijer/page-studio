<script>
  import { activeTool, ToolType, currentToolOptions } from '$lib/stores/toolbar';
  
  // Component props
  export let context = null;
  
  // Text tool options
  let textSize = 14;
  let textFont = 'Arial';
  let textWeight = 'normal';
  let textStyle = 'normal';
  let textColor = '#000000';
  
  // Shape tool options
  let shapeStrokeWidth = 1;
  let shapeStrokeColor = '#000000';
  let shapeFillColor = '#ffffff';
  
  // Initialize options based on current tool
  $: {
    if ($currentToolOptions) {
      if ($activeTool === ToolType.TEXT) {
        textSize = $currentToolOptions.fontSize || 14;
        textFont = $currentToolOptions.fontFamily || 'Arial';
        textWeight = $currentToolOptions.fontWeight || 'normal';
        textStyle = $currentToolOptions.fontStyle || 'normal';
        textColor = $currentToolOptions.fill || '#000000';
      } else if (
        $activeTool === ToolType.RECTANGLE || 
        $activeTool === ToolType.ELLIPSE || 
        $activeTool === ToolType.LINE
      ) {
        shapeStrokeWidth = $currentToolOptions.strokeWidth || 1;
        shapeStrokeColor = $currentToolOptions.stroke || '#000000';
        shapeFillColor = $currentToolOptions.fill || '#ffffff';
      }
    }
  }
  
  // Update text tool options
  function updateTextOptions() {
    $currentToolOptions = {
      ...$currentToolOptions,
      fontSize: textSize,
      fontFamily: textFont,
      fontWeight: textWeight,
      fontStyle: textStyle,
      fill: textColor
    };
  }
  
  // Update shape tool options
  function updateShapeOptions() {
    $currentToolOptions = {
      ...$currentToolOptions,
      strokeWidth: shapeStrokeWidth,
      stroke: shapeStrokeColor,
      fill: shapeFillColor
    };
  }
  
  // Handle option changes
  function handleFontSizeChange(event) {
    textSize = parseInt(event.target.value);
    updateTextOptions();
  }
  
  function handleFontFamilyChange(event) {
    textFont = event.target.value;
    updateTextOptions();
  }
  
  function handleFontWeightChange(event) {
    textWeight = event.target.value;
    updateTextOptions();
  }
  
  function handleFontStyleChange(event) {
    textStyle = event.target.value;
    updateTextOptions();
  }
  
  function handleTextColorChange(event) {
    textColor = event.target.value;
    updateTextOptions();
  }
  
  function handleStrokeWidthChange(event) {
    shapeStrokeWidth = parseInt(event.target.value);
    updateShapeOptions();
  }
  
  function handleStrokeColorChange(event) {
    shapeStrokeColor = event.target.value;
    updateShapeOptions();
  }
  
  function handleFillColorChange(event) {
    shapeFillColor = event.target.value;
    updateShapeOptions();
  }
</script>

<div class="tool-config-panel">
  <h2 class="text-xs font-semibold px-2 pb-1 text-gray-500 uppercase">Properties</h2>
  
  {#if $activeTool === ToolType.TEXT}
    <div class="text-tool-options">
      <div class="option-group">
        <label for="text-size">Font Size</label>
        <input 
          type="number" 
          id="text-size" 
          bind:value={textSize} 
          on:change={handleFontSizeChange}
          min="8" 
          max="72"
        />
      </div>
      
      <div class="option-group">
        <label for="text-font">Font Family</label>
        <select 
          id="text-font" 
          bind:value={textFont} 
          on:change={handleFontFamilyChange}
        >
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Georgia">Georgia</option>
          <option value="Courier New">Courier New</option>
        </select>
      </div>
      
      <div class="option-group">
        <label for="text-weight">Font Weight</label>
        <select 
          id="text-weight" 
          bind:value={textWeight} 
          on:change={handleFontWeightChange}
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
        </select>
      </div>
      
      <div class="option-group">
        <label for="text-style">Font Style</label>
        <select 
          id="text-style" 
          bind:value={textStyle} 
          on:change={handleFontStyleChange}
        >
          <option value="normal">Normal</option>
          <option value="italic">Italic</option>
        </select>
      </div>
      
      <div class="option-group">
        <label for="text-color">Text Color</label>
        <input 
          type="color" 
          id="text-color" 
          bind:value={textColor} 
          on:change={handleTextColorChange}
        />
      </div>
    </div>
  {/if}
  
  {#if $activeTool === ToolType.RECTANGLE || $activeTool === ToolType.ELLIPSE || $activeTool === ToolType.LINE}
    <div class="shape-tool-options">
      <div class="option-group">
        <label for="stroke-width">Stroke Width</label>
        <input 
          type="number" 
          id="stroke-width" 
          bind:value={shapeStrokeWidth} 
          on:change={handleStrokeWidthChange}
          min="0" 
          max="20"
        />
      </div>
      
      <div class="option-group">
        <label for="stroke-color">Stroke Color</label>
        <input 
          type="color" 
          id="stroke-color" 
          bind:value={shapeStrokeColor} 
          on:change={handleStrokeColorChange}
        />
      </div>
      
      {#if $activeTool !== ToolType.LINE}
        <div class="option-group">
          <label for="fill-color">Fill Color</label>
          <input 
            type="color" 
            id="fill-color" 
            bind:value={shapeFillColor} 
            on:change={handleFillColorChange}
          />
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .tool-config-panel {
    padding: 10px;
    border-top: 1px solid #eaeaea;
  }
  
  .option-group {
    margin-bottom: 10px;
  }
  
  .option-group label {
    display: block;
    font-size: 12px;
    color: #4a5568;
    margin-bottom: 4px;
  }
  
  input[type="number"],
  input[type="text"],
  select {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 14px;
  }
  
  input[type="color"] {
    width: 100%;
    height: 30px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    cursor: pointer;
  }
</style>