/**
 * Services Index
 * Centralized export of all services for PageStudio
 */

import documentService from './DocumentService';
import canvasService from './CanvasService';
import masterPageService from './MasterPageService';
import contextService from './ContextService';
import canvasEventService from './CanvasEventService';
import gridService from './GridService';
import guideService from './GuideService';
import layerService from './LayerService';
import objectService from './ObjectService';
import documentModuleService from './DocumentModuleService';
import historyService from './HistoryService';
import toolService from './ToolService';
import textFlowService from './TextFlowService';

export {
  documentService,
  canvasService,
  masterPageService,
  contextService,
  canvasEventService,
  gridService,
  guideService,
  layerService,
  objectService,
  documentModuleService,
  historyService,
  toolService,
  textFlowService
};

// For easier importing
export default {
  document: documentService,
  canvas: canvasService,
  masterPage: masterPageService,
  context: contextService,
  canvasEvent: canvasEventService,
  grid: gridService,
  guide: guideService,
  layer: layerService,
  object: objectService,
  documentModule: documentModuleService,
  history: historyService,
  tool: toolService,
  textFlow: textFlowService
};