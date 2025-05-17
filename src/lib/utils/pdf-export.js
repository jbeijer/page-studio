/**
 * Utility module for PDF export functionality
 */
import { jsPDF } from 'jspdf';

/**
 * Configuration for PDF export
 * @typedef {Object} PDFExportConfig
 * @property {'draft'|'standard'|'high'|'print'} quality - Export quality
 * @property {'rgb'|'cmyk'} colorSpace - Color space
 * @property {number} bleed - Bleed in mm
 * @property {boolean} cropMarks - Whether to include crop marks
 * @property {'embed'|'outline'|'system'} fontHandling - How to handle fonts
 * @property {'none'|'low'|'medium'|'high'} compression - Compression level
 * @property {number} imageResolution - Image resolution in DPI
 * @property {Object} metadata - PDF metadata
 */

/**
 * Default export configuration
 * @type {PDFExportConfig}
 */
const defaultConfig = {
  quality: 'standard',
  colorSpace: 'rgb',
  bleed: 0,
  cropMarks: false,
  fontHandling: 'embed',
  compression: 'medium',
  imageResolution: 150,
  metadata: {
    title: 'PageStudio Document',
    author: 'PageStudio',
    subject: '',
    keywords: ['PageStudio'],
    creator: 'PageStudio',
    producer: 'PageStudio PDF Export'
  }
};

/**
 * DPI values for different quality settings
 * @type {Object}
 */
const dpiValues = {
  draft: 72,
  standard: 150,
  high: 300,
  print: 300
};

/**
 * Export a document to PDF
 * @param {Object} document - Document to export
 * @param {Object} canvasList - Map of page IDs to canvas objects
 * @param {PDFExportConfig} config - Export configuration
 * @returns {Promise<Blob>} PDF as a blob
 */
export async function exportToPDF(document, canvasList, config = {}) {
  // Merge provided config with defaults
  const exportConfig = {
    ...defaultConfig,
    ...config,
    metadata: { ...defaultConfig.metadata, ...config.metadata }
  };
  
  // Set resolution based on quality
  const dpi = dpiValues[exportConfig.quality];
  
  // Calculate page dimensions in points (1 point = 1/72 inch)
  // Convert mm to points: 1 mm = 2.83465 points
  const mmToPoints = 2.83465;
  const pageWidth = document.metadata.pageSize.width * mmToPoints;
  const pageHeight = document.metadata.pageSize.height * mmToPoints;
  
  // Create PDF with correct orientation and size
  const pdf = new jsPDF({
    orientation: pageWidth > pageHeight ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [pageWidth, pageHeight]
  });
  
  // Set PDF metadata
  pdf.setProperties({
    title: exportConfig.metadata.title || document.title,
    author: exportConfig.metadata.author,
    subject: exportConfig.metadata.subject,
    keywords: exportConfig.metadata.keywords.join(', '),
    creator: exportConfig.metadata.creator,
    producer: exportConfig.metadata.producer
  });
  
  // Process each page
  let isFirstPage = true;
  
  for (const page of document.pages) {
    const canvas = canvasList[page.id];
    
    if (!canvas) {
      console.warn(`Canvas for page ${page.id} not found`);
      continue;
    }
    
    // Add new page (except for first page)
    if (!isFirstPage) {
      pdf.addPage([pageWidth, pageHeight]);
    }
    
    // Export canvas to image
    const imageData = canvas.toDataURL({
      format: 'png',
      multiplier: dpi / 72, // Convert to correct resolution
      quality: 1.0
    });
    
    // Add image to PDF
    pdf.addImage(
      imageData, 
      'PNG', 
      0, 
      0, 
      pageWidth, 
      pageHeight
    );
    
    isFirstPage = false;
  }
  
  // Return PDF as blob
  return pdf.output('blob');
}

/**
 * Generate a preview of a document page
 * @param {Object} canvas - Fabric.js canvas of the page
 * @param {number} width - Width of the preview in pixels
 * @returns {Promise<string>} Data URL of the preview image
 */
export async function generatePagePreview(canvas, width = 200) {
  // Calculate aspect ratio
  const aspectRatio = canvas.width / canvas.height;
  const height = width / aspectRatio;
  
  // Create a temporary canvas for the preview
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const ctx = tempCanvas.getContext('2d');
  
  // Export canvas to image
  const imageData = canvas.toDataURL({
    format: 'png',
    multiplier: width / canvas.width,
    quality: 0.8
  });
  
  // Create an image from the data URL
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      resolve(tempCanvas.toDataURL('image/png'));
    };
    img.src = imageData;
  });
}