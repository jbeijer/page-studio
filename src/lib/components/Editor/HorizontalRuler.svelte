<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { currentDocument, currentPage } from '$lib/stores/document';
  
  const dispatch = createEventDispatcher();
  
  export let width = 1240; // Canvas width in px
  export let offsetX = 0;  // Canvas offset for scrolling
  export let scale = 1;    // Canvas zoom scale
  export let height = 20;  // Ruler height in px
  
  // Unit conversion based on settings
  $: units = $currentDocument?.metadata?.rulers?.units || 'mm';
  $: unitFactor = getUnitFactor(units);
  $: tickMarks = getTickMarks();
  $: guides = $currentDocument && $currentPage 
      ? $currentDocument.pages.find(p => p.id === $currentPage)?.guides?.vertical || [] 
      : [];
  
  let rulerElement;
  let isDraggingGuide = false;
  let draggedGuideIndex = -1;
  
  function getUnitFactor(unit) {
    switch(unit) {
      case 'cm': return 0.1;  // 1cm = 10mm
      case 'inch': return 0.0393701; // 1mm ≈ 0.0393701 inches
      case 'px': return 1;
      default: return 1; // mm is default
    }
  }
  
  function getTickMarks() {
    // Generate tick marks based on width, units, scale, etc.
    const result = [];
    
    // Convert to mm for the standard basis
    const pxPerMm = 3.78; // Approximate conversion at 96 DPI
    const stepSizes = [1, 5, 10, 25, 50, 100, 200, 500, 1000];
    
    // Find appropriate step size based on zoom level
    const adjustedScale = scale * pxPerMm;
    let majorStep = 10; // default step in mm
    
    for (let i = 0; i < stepSizes.length; i++) {
      if (stepSizes[i] * adjustedScale >= 30) { // At least 30px between major ticks
        majorStep = stepSizes[i];
        break;
      }
    }
    
    // Minor step is 1/5 of major step
    const minorStep = majorStep / 5;
    
    // Calculate number of ticks needed
    const totalWidthMm = width / (pxPerMm * scale);
    const numMajorTicks = Math.ceil(totalWidthMm / majorStep) + 1;
    
    // Generate major ticks
    for (let i = 0; i < numMajorTicks; i++) {
      const posMm = i * majorStep;
      const posPx = posMm * adjustedScale - offsetX;
      
      if (posPx >= 0 && posPx <= width) {
        result.push({
          position: posPx,
          size: height * 0.8, // 80% of ruler height
          label: formatMeasurement(posMm),
          major: true
        });
      }
      
      // Generate minor ticks between major ticks
      if (i < numMajorTicks - 1) {
        const minorTicksCount = majorStep / minorStep - 1;
        for (let j = 1; j <= minorTicksCount; j++) {
          const minorPosMm = posMm + j * minorStep;
          const minorPosPx = minorPosMm * adjustedScale - offsetX;
          
          if (minorPosPx >= 0 && minorPosPx <= width) {
            result.push({
              position: minorPosPx,
              size: height * 0.5, // 50% of ruler height for minor ticks
              label: null,
              major: false
            });
          }
        }
      }
    }
    
    return result;
  }
  
  function formatMeasurement(value) {
    // Format the measurement based on current units
    switch(units) {
      case 'cm':
        return `${(value / 10).toFixed(1)}`;
      case 'inch':
        return `${(value * 0.0393701).toFixed(1)}`;
      case 'px':
        return `${Math.round(value * 3.78)}`;
      default: // mm
        return `${Math.round(value)}`;
    }
  }
  
  function handleMouseDown(e) {
    // Check if we're on a guide marker
    const markers = rulerElement.querySelectorAll('.guide-marker');
    let onGuide = false;
    
    markers.forEach((marker, index) => {
      const rect = marker.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom) {
        onGuide = true;
        isDraggingGuide = true;
        draggedGuideIndex = index;
      }
    });
    
    if (!onGuide) {
      // Create a new guide at this position
      const rect = rulerElement.getBoundingClientRect();
      const clickPos = e.clientX - rect.left;
      const posInCanvasCoords = (clickPos + offsetX) / scale;
      
      dispatch('createGuide', { position: posInCanvasCoords, isHorizontal: false });
    }
    
    // Add event listeners for dragging
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }
  
  function handleMouseMove(e) {
    if (isDraggingGuide && draggedGuideIndex >= 0) {
      // Update guide position during drag
      const rect = rulerElement.getBoundingClientRect();
      const newPos = e.clientX - rect.left;
      const posInCanvasCoords = (newPos + offsetX) / scale;
      
      dispatch('updateGuide', { 
        index: draggedGuideIndex, 
        position: posInCanvasCoords, 
        isHorizontal: false 
      });
    }
  }
  
  function handleMouseUp(e) {
    if (isDraggingGuide) {
      // Finalize guide position
      const rect = rulerElement.getBoundingClientRect();
      const finalPos = e.clientX - rect.left;
      const posInCanvasCoords = (finalPos + offsetX) / scale;
      
      dispatch('updateGuide', { 
        index: draggedGuideIndex, 
        position: posInCanvasCoords, 
        isHorizontal: false,
        final: true
      });
    }
    
    // Reset drag state
    isDraggingGuide = false;
    draggedGuideIndex = -1;
    
    // Remove event listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }
  
  function handleGuideMarkerDoubleClick(index) {
    // Delete the guide on double click
    dispatch('deleteGuide', { index, isHorizontal: false });
  }
  
  onMount(() => {
    // Setup
  });
</script>

<div 
  class="ruler horizontal-ruler" 
  style="width: {width}px; height: {height}px;"
  bind:this={rulerElement}
  on:mousedown={handleMouseDown}
>
  {#each tickMarks as tick}
    <div 
      class="tick {tick.major ? 'major' : 'minor'}" 
      style="left: {tick.position}px; height: {tick.size}px;"
    >
      {#if tick.label}
        <span class="tick-label">{tick.label}</span>
      {/if}
    </div>
  {/each}
  
  <!-- Guide markers -->
  {#if guides.length > 0}
    {#each guides as guide, index}
      <div 
        class="guide-marker" 
        style="left: {guide * scale - offsetX}px;"
        on:dblclick={() => handleGuideMarkerDoubleClick(index)}
      ></div>
    {/each}
  {/if}
</div>

<style>
  .ruler {
    position: relative;
    background-color: #f0f0f0;
    border-bottom: 1px solid #ccc;
    overflow: hidden;
    user-select: none;
    cursor: crosshair;
  }
  
  .tick {
    position: absolute;
    top: 0;
    width: 1px;
    background-color: #666;
  }
  
  .tick.major {
    width: 1px;
  }
  
  .tick.minor {
    width: 1px;
    opacity: 0.5;
  }
  
  .tick-label {
    position: absolute;
    top: 2px;
    left: 2px;
    font-size: 8px;
    color: #333;
  }
  
  .guide-marker {
    position: absolute;
    width: 8px;
    height: 8px;
    background-color: #0066cc;
    top: 12px;
    transform: translateX(-4px);
    cursor: move;
    z-index: 1;
  }
  
  .guide-marker:hover {
    background-color: #0088ff;
  }
</style>