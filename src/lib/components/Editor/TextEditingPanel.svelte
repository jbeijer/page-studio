<script>
  import { currentDocument } from '$lib/stores/document';
  import * as fabric from 'fabric';
  import TextFlow from '$lib/utils/text-flow';
  
  export let canvas = null;
  export let textObject = null;
  
  let fontFamily = "Arial";
  let fontSize = 16;
  let textAlign = "left";
  let fontWeight = "normal";
  let fontStyle = "normal";
  let textDecoration = "";
  let textColor = "#000000";
  let lineHeight = 1.16;
  
  // Create a TextFlow manager when needed
  let textFlow = null;
  $: if (canvas && !textFlow) {
    textFlow = new TextFlow(canvas);
  }
  
  // Update local state when the text object changes
  $: if (textObject) {
    fontFamily = textObject.fontFamily || "Arial";
    fontSize = textObject.fontSize || 16;
    textAlign = textObject.textAlign || "left";
    fontWeight = textObject.fontWeight || "normal";
    fontStyle = textObject.fontStyle || "normal";
    textDecoration = textObject.textDecoration || "";
    textColor = textObject.fill || "#000000";
    lineHeight = textObject.lineHeight || 1.16;
  }
  
  function updateTextProperty(property, value) {
    if (!textObject || !canvas) return;
    
    const updateObj = {};
    updateObj[property] = value;
    textObject.set(updateObj);
    canvas.renderAll();
    
    // Also update local state
    if (property === 'fontFamily') fontFamily = value;
    if (property === 'fontSize') fontSize = value;
    if (property === 'textAlign') textAlign = value;
    if (property === 'fontWeight') fontWeight = value;
    if (property === 'fontStyle') fontStyle = value;
    if (property === 'textDecoration') textDecoration = value;
    if (property === 'fill') textColor = value;
    if (property === 'lineHeight') lineHeight = value;
    
    // If text has linked textboxes, update the text flow
    if (textObject.linkedObjectIds && textObject.linkedObjectIds.length > 0 && textFlow) {
      textFlow.updateTextFlow(textObject.id);
    }
  }
  
  function toggleBold() {
    const newWeight = fontWeight === 'bold' ? 'normal' : 'bold';
    updateTextProperty('fontWeight', newWeight);
  }
  
  function toggleItalic() {
    const newStyle = fontStyle === 'italic' ? 'normal' : 'italic';
    updateTextProperty('fontStyle', newStyle);
  }
  
  function toggleUnderline() {
    const newDecoration = textDecoration === 'underline' ? '' : 'underline';
    updateTextProperty('textDecoration', newDecoration);
  }
  
  function linkTextBoxes() {
    if (!canvas || !textObject || !textFlow) return;
    
    // Set the canvas in a state to await the target textbox selection
    canvas.discardActiveObject();
    canvas.defaultCursor = 'crosshair';
    
    const originalCursor = canvas.defaultCursor;
    
    // Create a one-time event handler for the next object selection
    const handleObjectSelected = (options) => {
      if (!options.target) return;
      
      const targetObject = options.target;
      
      // Make sure the target is a textbox
      if (targetObject.type !== 'textbox') {
        alert('Please select a textbox as the target.');
        canvas.defaultCursor = originalCursor;
        return;
      }
      
      // Make sure we're not selecting the same textbox
      if (targetObject === textObject) {
        alert('Cannot link a textbox to itself.');
        canvas.defaultCursor = originalCursor;
        return;
      }
      
      // Link the textboxes using TextFlow
      textFlow.linkTextboxes(textObject, targetObject);
      
      // Reset cursor
      canvas.defaultCursor = originalCursor;
      canvas.off('mouse:down', handleObjectSelected);
      canvas.setActiveObject(textObject);
      canvas.renderAll();
    };
    
    // Register the one-time handler
    canvas.once('mouse:down', handleObjectSelected);
  }
  
  function unlinkTextBoxes() {
    if (!textObject || !textFlow || !textObject.id) return;
    
    // Use TextFlow to unlink
    textFlow.unlinkTextboxes(textObject.id);
    
    // Render changes
    canvas.renderAll();
  }
</script>

<div class="p-4 bg-white border-t border-gray-200">
  <h3 class="font-medium text-lg mb-3">Text Editing</h3>
  
  {#if textObject}
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <!-- Font Family -->
        <div>
          <label for="font-family" class="block text-sm font-medium text-gray-700">
            Font Family
          </label>
          <select
            id="font-family"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            bind:value={fontFamily}
            on:change={() => updateTextProperty('fontFamily', fontFamily)}
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
          </select>
        </div>
        
        <!-- Font Size -->
        <div>
          <label for="font-size" class="block text-sm font-medium text-gray-700">
            Font Size
          </label>
          <input
            id="font-size"
            type="number"
            min="8"
            max="72"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            bind:value={fontSize}
            on:change={() => updateTextProperty('fontSize', fontSize)}
          />
        </div>
      </div>
      
      <!-- Text Color -->
      <div>
        <label for="text-color" class="block text-sm font-medium text-gray-700">
          Text Color
        </label>
        <input
          id="text-color"
          type="color"
          class="mt-1 block w-full h-8 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
          bind:value={textColor}
          on:change={() => updateTextProperty('fill', textColor)}
        />
      </div>
      
      <!-- Line Height -->
      <div>
        <label for="line-height" class="block text-sm font-medium text-gray-700">
          Line Height
        </label>
        <input
          id="line-height"
          type="range"
          min="0.8"
          max="2"
          step="0.05"
          class="mt-1 block w-full h-8 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
          bind:value={lineHeight}
          on:change={() => updateTextProperty('lineHeight', lineHeight)}
        />
        <div class="text-xs text-gray-500 text-right">{lineHeight.toFixed(2)}</div>
      </div>
      
      <!-- Text Style Controls -->
      <div class="flex space-x-2">
        <button
          class="flex-1 py-2 px-3 rounded-md bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary {fontWeight === 'bold' ? 'bg-primary text-white' : ''}"
          on:click={toggleBold}
        >
          <span class="font-bold">B</span>
        </button>
        <button
          class="flex-1 py-2 px-3 rounded-md bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary {fontStyle === 'italic' ? 'bg-primary text-white' : ''}"
          on:click={toggleItalic}
        >
          <span class="italic">I</span>
        </button>
        <button
          class="flex-1 py-2 px-3 rounded-md bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary {textDecoration === 'underline' ? 'bg-primary text-white' : ''}"
          on:click={toggleUnderline}
        >
          <span class="underline">U</span>
        </button>
      </div>
      
      <!-- Text Alignment -->
      <div class="flex space-x-2">
        <button
          class="flex-1 py-2 px-3 rounded-md bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary {textAlign === 'left' ? 'bg-primary text-white' : ''}"
          on:click={() => updateTextProperty('textAlign', 'left')}
          aria-label="Align Text Left"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mx-auto" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
        <button
          class="flex-1 py-2 px-3 rounded-md bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary {textAlign === 'center' ? 'bg-primary text-white' : ''}"
          on:click={() => updateTextProperty('textAlign', 'center')}
          aria-label="Align Text Center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mx-auto" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm2 4a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm2 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
        <button
          class="flex-1 py-2 px-3 rounded-md bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary {textAlign === 'right' ? 'bg-primary text-white' : ''}"
          on:click={() => updateTextProperty('textAlign', 'right')}
          aria-label="Align Text Right"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mx-auto" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm6 4a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1zm4 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
        <button
          class="flex-1 py-2 px-3 rounded-md bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary {textAlign === 'justify' ? 'bg-primary text-white' : ''}"
          on:click={() => updateTextProperty('textAlign', 'justify')}
          aria-label="Justify Text"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mx-auto" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      
      <!-- Text Flow Controls -->
      <div class="border-t pt-3 mt-3">
        <h4 class="font-medium text-sm mb-2">Text Flow</h4>
        <div class="flex space-x-2">
          <button
            class="flex-1 py-2 px-3 rounded-md bg-primary text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            on:click={linkTextBoxes}
          >
            Link Text Boxes
          </button>
          <button
            class="flex-1 py-2 px-3 rounded-md bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            on:click={unlinkTextBoxes}
          >
            Unlink
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          Link this text box to another one to create text flow. Text that doesn't fit in this box will flow into the linked box.
        </p>
      </div>
    </div>
  {:else}
    <p class="text-gray-500">Select a text object to edit its properties.</p>
  {/if}
</div>