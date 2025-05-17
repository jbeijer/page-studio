/**
 * Grid and guides utility functions
 */

// Constants for unit conversion
const MM_PER_INCH = 25.4;
const CM_PER_INCH = 2.54;
const DEFAULT_DPI = 96;

/**
 * Converts millimeters to pixels
 * @param {number} sizeInMm - Grid size in millimeters
 * @param {number} [dpi=96] - DPI setting (default 96)
 * @returns {number} Grid size in pixels
 */
export function mmToPixels(sizeInMm, dpi = DEFAULT_DPI) {
  // Floor to whole pixels to ensure consistent grid rendering
  // Math.floor ger exakt pixelrendering medan Math.round kan orsaka ojämna grid
  return Math.floor((sizeInMm / MM_PER_INCH) * dpi);
}

/**
 * Convert a value from document units to pixels
 * @param {number} value - The value in document units
 * @param {string} unit - The unit ('mm', 'cm', 'inch', 'px')
 * @param {number} [dpi=96] - DPI setting (default 96)
 * @returns {number} - The value in pixels
 */
export function convertToPixels(value, unit, dpi = DEFAULT_DPI) {
  // Använd Math.floor istället för Math.round för att säkerställa jämna grid
  // Konsekvent användning av Math.floor ger bättre grid-rendering
  switch (unit) {
    case 'mm':
      return mmToPixels(value, dpi);
    case 'cm':
      return Math.floor((value / CM_PER_INCH) * dpi);
    case 'inch':
      return Math.floor(value * dpi);
    case 'px':
      return Math.floor(value); // Säkerställ att även pixlar är heltal
    default:
      return mmToPixels(value, dpi);
  }
}

/**
 * Convert a value from pixels to document units
 * @param {number} pixels - The value in pixels
 * @param {string} unit - The target unit ('mm', 'cm', 'inch', 'px')
 * @param {number} [dpi=96] - DPI setting (default 96)
 * @returns {number} - The value in the specified unit
 */
export function convertFromPixels(pixels, unit, dpi = DEFAULT_DPI) {
  switch (unit) {
    case 'mm':
      return (pixels / dpi) * MM_PER_INCH;
    case 'cm':
      return (pixels / dpi) * CM_PER_INCH;
    case 'inch':
      return pixels / dpi;
    case 'px':
      return pixels;
    default:
      return (pixels / dpi) * MM_PER_INCH;
  }
}

/**
 * Calculate grid step based on grid size and zoom level
 * @param {number} gridSize - Grid size in the document's units
 * @param {number} zoom - Current zoom level
 * @returns {number} - The adjusted grid step size
 */
export function calculateGridStep(gridSize, zoom) {
  return gridSize / zoom;
}

/**
 * Calculates the nearest grid point for snapping
 * @param {number} position - Current position
 * @param {number} gridSize - Grid size in pixels
 * @param {number} threshold - Snap threshold in pixels
 * @returns {number|null} The snapped position or null if not within threshold
 */
export function snapToGrid(position, gridSize, threshold) {
  const nearestGridPoint = Math.round(position / gridSize) * gridSize;
  const distance = Math.abs(position - nearestGridPoint);
  
  if (distance <= threshold) {
    return nearestGridPoint;
  }
  
  return null;
}

/**
 * Formats a measurement value based on units
 * @param {number} value - The measurement value 
 * @param {string} unit - The unit system ('mm', 'cm', 'inch', 'px')
 * @param {number} [decimals=1] - Number of decimal places
 * @returns {string} Formatted measurement
 */
export function formatMeasurement(value, unit, decimals = 1) {
  switch(unit) {
    case 'cm':
      return Number.isInteger(value) ? `${value} cm` : `${value.toFixed(1)} cm`;
    case 'inch':
      return Number.isInteger(value) ? `${value}″` : `${value.toFixed(1)}″`;
    case 'px':
      return `${value} px`; // No decimal for px
    case 'mm':
    default: // mm
      return Number.isInteger(value) ? `${value} mm` : `${value.toFixed(1)} mm`;
  }
}

/**
 * Calculates optimal step size for ruler ticks based on zoom level
 * @param {number} scale - Current zoom scale
 * @param {number} [minPixelsBetweenMajorTicks=30] - Minimum pixels between major ticks
 * @returns {number} Appropriate step size in mm
 */
export function calculateRulerStepSize(scale, minPixelsBetweenMajorTicks = 30) {
  const stepSizes = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000];
  const pixelsPerMm = mmToPixels(1) * scale;
  
  for (let i = 0; i < stepSizes.length; i++) {
    if (stepSizes[i] * pixelsPerMm >= minPixelsBetweenMajorTicks) {
      return stepSizes[i];
    }
  }
  
  return 100; // Default if everything is too small
}

/**
 * Calculate tick marks for rulers
 * @param {number} length - Ruler length in pixels
 * @param {string} unit - Measurement unit ('mm', 'cm', 'inch', 'px')
 * @param {number} zoom - Current zoom level
 * @returns {Array} - Array of tick objects with position, label, and if it's a major tick
 */
export function calculateTicks(length, unit, zoom) {
  const ticks = [];
  let majorStep, minorStep, labelInterval;
  
  // Calculate step sizes based on unit and zoom
  switch (unit) {
    case 'mm':
      // At higher zoom levels, create more detailed tick marks
      majorStep = mmToPixels(10) * zoom; // 10mm = 1cm is a major tick
      minorStep = zoom >= 2 ? mmToPixels(0.5) * zoom : mmToPixels(1) * zoom;  // More detailed at higher zoom
      labelInterval = 10; // Label every 10mm
      break;
      
    case 'cm':
      majorStep = mmToPixels(10) * zoom; // 1cm is a major tick
      minorStep = zoom >= 2 ? mmToPixels(0.5) * zoom : mmToPixels(1) * zoom;  // More detailed at higher zoom
      labelInterval = 1;  // Label every 1cm
      break;
      
    case 'inch':
      majorStep = mmToPixels(25.4) * zoom; // 1 inch is a major tick
      minorStep = zoom >= 2 ? mmToPixels(25.4/32) * zoom : mmToPixels(25.4/16) * zoom; // More detailed at higher zoom
      labelInterval = 1;  // Label every 1 inch
      break;
      
    case 'px':
      majorStep = 100 * zoom; // Every 100px is a major tick
      minorStep = zoom >= 2 ? 5 * zoom : 10 * zoom;  // More detailed at higher zoom
      labelInterval = 100;  // Label every 100px
      break;
      
    default:
      majorStep = mmToPixels(10) * zoom;
      minorStep = zoom >= 2 ? mmToPixels(0.5) * zoom : mmToPixels(1) * zoom;
      labelInterval = 10;
  }
  
  // Adjust steps if zoom level is very small to prevent overcrowding
  const minPixelsBetweenTicks = 5;
  if (minorStep < minPixelsBetweenTicks) {
    const multiplier = Math.ceil(minPixelsBetweenTicks / minorStep);
    minorStep *= multiplier;
    if (majorStep / minorStep < 2) {
      // Ensure major steps are at least 2x minor steps
      majorStep = minorStep * 2;
    }
    labelInterval *= multiplier;
  }
  
  // Generate ticks
  for (let pos = 0; pos <= length; pos += minorStep) {
    const isMajor = Math.abs(pos % majorStep) < 0.001;
    let label = '';
    
    // Calculate label value in the appropriate unit
    const value = convertFromPixels(pos / zoom, unit);
    
    // Only add labels to some major ticks (not too crowded)
    if (isMajor && Math.abs(value % labelInterval) < 0.001) {
      label = Math.round(value * 10) / 10; // Round to 1 decimal place
    }
    
    ticks.push({
      position: pos,
      label: label.toString(),
      major: isMajor
    });
  }
  
  return ticks;
}

/**
 * Find the nearest snap point for a given position
 * @param {number} position - Current position
 * @param {Array} snapPoints - Array of positions
 * @param {number} threshold - Snap threshold in pixels
 * @returns {number|null} - The position of the nearest snap point or null if none within threshold
 */
export function findNearestSnapPoint(position, snapPoints, threshold) {
  let nearest = null;
  let minDistance = threshold;
  
  for (const point of snapPoints) {
    const distance = Math.abs(position - point);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = point;
    }
  }
  
  return nearest;
}

/**
 * Determine if two objects are aligned
 * @param {Object} obj1 - First object (with left, top, width, height)
 * @param {Object} obj2 - Second object (with left, top, width, height)
 * @param {number} threshold - Alignment threshold in pixels
 * @returns {Object} - Object with alignment information for edges and centers
 */
export function checkAlignment(obj1, obj2, threshold) {
  const obj1Right = obj1.left + obj1.width;
  const obj1Bottom = obj1.top + obj1.height;
  const obj1CenterX = obj1.left + obj1.width / 2;
  const obj1CenterY = obj1.top + obj1.height / 2;
  
  const obj2Right = obj2.left + obj2.width;
  const obj2Bottom = obj2.top + obj2.height;
  const obj2CenterX = obj2.left + obj2.width / 2;
  const obj2CenterY = obj2.top + obj2.height / 2;
  
  return {
    // Edge alignments
    leftEdge: Math.abs(obj1.left - obj2.left) < threshold,
    rightEdge: Math.abs(obj1Right - obj2Right) < threshold,
    topEdge: Math.abs(obj1.top - obj2.top) < threshold,
    bottomEdge: Math.abs(obj1Bottom - obj2Bottom) < threshold,
    
    // Center alignments
    centerX: Math.abs(obj1CenterX - obj2CenterX) < threshold,
    centerY: Math.abs(obj1CenterY - obj2CenterY) < threshold,
    
    // Edge-to-center alignments
    leftToCenter: Math.abs(obj1.left - obj2CenterX) < threshold,
    rightToCenter: Math.abs(obj1Right - obj2CenterX) < threshold,
    topToCenter: Math.abs(obj1.top - obj2CenterY) < threshold,
    bottomToCenter: Math.abs(obj1Bottom - obj2CenterY) < threshold
  };
}