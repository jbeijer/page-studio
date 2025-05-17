<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { currentDocument, currentPage } from '$lib/stores/document';
  
  const dispatch = createEventDispatcher();
  
  export let height = 1754; // Canvas height in px
  export let offsetY = 0;   // Canvas offset for scrolling
  export let scale = 1;     // Canvas zoom scale
  export let width = 20;    // Ruler width in px
  
  // Unit conversion based on settings
  $: units = $currentDocument?.metadata?.rulers?.units || 'mm';
  $: unitFactor = getUnitFactor(units);
  $: tickMarks = getTickMarks();
  $: guides = $currentDocument && $currentPage 
      ? $currentDocument.pages.find(p => p.id === $currentPage)?.guides?.horizontal || [] 
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
    // Generate tick marks based on height, units, scale, etc.
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
    const totalHeightMm = height / (pxPerMm * scale);
    const numMajorTicks = Math.ceil(totalHeightMm / majorStep) + 1;
    
    // Generate major ticks
    for (let i = 0; i < numMajorTicks; i++) {
      const posMm = i * majorStep;
      const posPx = posMm * adjustedScale - offsetY;
      
      if (posPx >= 0 && posPx <= height) {
        result.push({
          position: posPx,
          size: width * 0.8, // 80% of ruler width
          label: formatMeasurement(posMm),
          major: true
        });
      }
      
      // Generate minor ticks between major ticks
      if (i < numMajorTicks - 1) {
        const minorTicksCount = majorStep / minorStep - 1;
        for (let j = 1; j <= minorTicksCount; j++) {
          const minorPosMm = posMm + j * minorStep;
          const minorPosPx = minorPosMm * adjustedScale - offsetY;
          
          if (minorPosPx >= 0 && minorPosPx <= height) {
            result.push({
              position: minorPosPx,
              size: width * 0.5, // 50% of ruler width for minor ticks
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
      const clickPos = e.clientY - rect.top;
      const posInCanvasCoords = (clickPos + offsetY) / scale;
      
      dispatch('createGuide', { position: posInCanvasCoords, isHorizontal: true });
    }
    
    // Add event listeners for dragging
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }
  
  function handleMouseMove(e) {
    if (isDraggingGuide && draggedGuideIndex >= 0) {
      // Update guide position during drag
      const rect = rulerElement.getBoundingClientRect();
      const newPos = e.clientY - rect.top;
      const posInCanvasCoords = (newPos + offsetY) / scale;
      
      dispatch('updateGuide', { 
        index: draggedGuideIndex, 
        position: posInCanvasCoords, 
        isHorizontal: true 
      });
    }
  }
  
  function handleMouseUp(e) {
    if (isDraggingGuide) {
      // Finalize guide position
      const rect = rulerElement.getBoundingClientRect();
      const finalPos = e.clientY - rect.top;
      const posInCanvasCoords = (finalPos + offsetY) / scale;
      
      dispatch('updateGuide', { 
        index: draggedGuideIndex, 
        position: posInCanvasCoords, 
        isHorizontal: true,
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
    dispatch('deleteGuide', { index, isHorizontal: true });
  }
  
  onMount(() => {
    // Setup
  });
</script>

<div 
  class="ruler vertical-ruler" 
  style="height: {height}px; width: {width}px;"
  bind:this={rulerElement}
  on:mousedown={handleMouseDown}
>
  {#each tickMarks as tick}
    <div 
      class="tick {tick.major ? 'major' : 'minor'}" 
      style="top: {tick.position}px; width: {tick.size}px;"
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
        style="top: {guide * scale - offsetY}px;"
        on:dblclick={() => handleGuideMarkerDoubleClick(index)}
      ></div>
    {/each}
  {/if}
</div>

<style>
  .ruler {
    position: relative;
    background-color: #f0f0f0;
    border-right: 1px solid #ccc;
    overflow: hidden;
    user-select: none;
    cursor: crosshair;
  }
  
  .tick {
    position: absolute;
    left: 0;
    height: 1px;
    background-color: #666;
  }
  
  .tick.major {
    height: 1px;
  }
  
  .tick.minor {
    height: 1px;
    opacity: 0.5;
  }
  
  .tick-label {
    position: absolute;
    left: 2px;
    top: 2px;
    font-size: 8px;
    color: #333;
    transform: rotate(-90deg);
    transform-origin: left top;
    white-space: nowrap;
  }
  
  .guide-marker {
    position: absolute;
    width: 8px;
    height: 8px;
    background-color: #0066cc;
    left: 12px;
    transform: translateY(-4px);
    cursor: move;
    z-index: 1;
  }
  
  .guide-marker:hover {
    background-color: #0088ff;
  }
</style>