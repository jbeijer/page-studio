# Service-Baserad Arkitektur i PageStudio
## 2025-05-19

## Introduktion

Detta dokument beskriver den service-baserade arkitekturen som implementerats i PageStudio. Arkitekturen är designad för att centralisera funktionalitet, minska kodduplikation, förbättra testbarhet och skapa en mer underhållbar kodbas.

## 1. Service-Arkitektur Översikt

PageStudio använder en service-baserad arkitektur där centrala funktioner exponeras genom singleton-services. Varje service har ett specifikt ansvarsområde och följer en konsekvent API-design.

```
Frontend Components
       ↓   ↑
       |   |
       ↓   ↑
    ServiceProvider
       ↓   ↑ 
       |   |
       ↓   ↑
  Service Instances ←→ Context
       ↓   ↑
       |   |
       ↓   ↑
   Canvas & Document Data
```

### 1.1 Nyckelbegrepp

- **Singleton Pattern**: Varje service är en singleton för att säkerställa att det bara finns en instans i hela applikationen.
- **Dependency Injection**: Services injiceras i komponenter via Svelte Context.
- **Service Registry**: ServiceProvider-komponenten tillhandahåller alla services.
- **Centralized Context**: ContextService hanterar delad data mellan services.

## 2. Service Livscykel

Alla services följer en gemensam livscykelmodell:

1. **Initialisering**: En `initialize(options)` metod som konfigurerar servicen.
2. **Användning**: API-metoder för att utföra service-specifika operationer.
3. **Städning**: En `cleanup()` metod för att frigöra resurser när komponenten avmonteras.

```typescript
// Exempel på service-livscykel
class ExampleService {
  constructor() {
    this.initialized = false;
  }

  initialize(options = {}) {
    // Konfigurera servicen
    this.initialized = true;
    return this;
  }

  // API-metoder
  performOperation() { /* ... */ }

  cleanup() {
    // Frigör resurser
    this.initialized = false;
  }
}
```

## 3. Centrala Services

### 3.1 ContextService

Hanterar delad data och fungerar som en central kommunikationspunkt mellan andra services.

**Ansvarsområden:**
- Tillhandahålla delad state för komponenter och andra services
- Hantera proxies för direktaccess till kontext
- Uppdatera kontextdata när applikationsstate ändras

**Nyckelmetoder:**
- `get(key)`: Hämta värde från kontext
- `set(key, value)`: Uppdatera värde i kontext
- `update(partialContext)`: Uppdatera flera värden samtidigt
- `createProxy()`: Skapa en proxy för mer direkt access

### 3.2 CanvasService

Hanterar grundläggande operationer på canvas-objektet.

**Ansvarsområden:**
- Hantera canvas-initialisering och konfiguration
- Hantera renderingsoptimering
- Tillhandahålla grundläggande canvas-operationer

**Nyckelmetoder:**
- `initialize(canvas)`: Konfigurera canvas
- `createObject(type, options)`: Skapa nya objekt
- `render()`: Rendera canvas
- `getObjectById(id)`: Hämta objekt via ID

### 3.3 DocumentService

Hanterar dokumentrelaterade operationer.

**Ansvarsområden:**
- Hantera dokumentladdning och -lagring
- Hantera dokumentstrukturen
- Hantera dokumentmetadata

**Nyckelmetoder:**
- `createNewDocument(options)`: Skapa nytt dokument
- `loadDocumentById(id)`: Ladda dokument
- `saveCurrentPage()`: Spara aktuell sida
- `updateDocumentTitle(title)`: Uppdatera dokumenttitel

### 3.4 MasterPageService

Hanterar mallsidor och deras tillämpning på dokumentsidor.

**Ansvarsområden:**
- Hantera mallsidekoncept
- Hantera överridningar av mallsideobjekt
- Hantera mallsideapplicering

**Nyckelmetoder:**
- `createMasterPage(options)`: Skapa ny mallsida
- `applyMasterPage(pageId, masterId)`: Applicera mallsida på sida
- `overrideMasterObject(object)`: Överrida mallsideobjekt

### 3.5 ToolService

Hanterar verktygsrelaterade operationer.

**Ansvarsområden:**
- Hantera verktygsval och verktygsspecifik konfiguration
- Konfigurera canvas för olika verktyg
- Hantera verktygsinteraktioner

**Nyckelmetoder:**
- `setActiveTool(toolType)`: Ställ in aktivt verktyg
- `setupCanvasForTool(toolType)`: Konfigurera canvas för verktyg
- `getCurrentToolOptions()`: Hämta aktuella verktygsalternativ

### 3.6 TextFlowService

Hanterar textflöde mellan länkade textboxar.

**Ansvarsområden:**
- Hantera länkar mellan textboxar
- Beräkna textflöde mellan länkade textboxar
- Uppdatera textinnehåll baserat på ändringar

**Nyckelmetoder:**
- `linkTextboxes(source, target)`: Länka textboxar
- `updateTextFlow(textboxId)`: Uppdatera textflöde

### 3.7 LayerService

Hanterar lager och objektordning.

**Ansvarsområden:**
- Hantera objektordning och lager
- Tillhandahålla operationer för att ändra lagerstacken
- Hantera lagerselektion och -synlighet

**Nyckelmetoder:**
- `bringForward()`: Flytta objekt framåt i lagerordningen
- `sendBackward()`: Flytta objekt bakåt i lagerordningen
- `bringToFront()`: Flytta objekt längst fram
- `sendToBack()`: Flytta objekt längst bak

### 3.8 ObjectService

Hanterar objektmanipulation.

**Ansvarsområden:**
- Hantera objektselektion och -manipulation
- Hantera kopiera/klistra in-operationer
- Hantera grupperingsoperationer

**Nyckelmetoder:**
- `deleteSelectedObjects()`: Ta bort valda objekt
- `copySelectedObjects()`: Kopiera valda objekt
- `pasteObjects()`: Klistra in objekt från urklipp
- `groupSelectedObjects()`: Gruppera valda objekt

### 3.9 HistoryService

Hanterar ångra/göra om-funktionalitet.

**Ansvarsområden:**
- Hantera historikstackar för ångra/göra om
- Hantera state-serialisering och -deserialisering
- Tillhandahålla operationer för ångra/göra om

**Nyckelmetoder:**
- `undo()`: Ångra senaste åtgärd
- `redo()`: Gör om senaste ångrade åtgärd
- `saveState()`: Spara aktuellt tillstånd
- `canUndo()`, `canRedo()`: Kontrollera möjlighet att ångra/göra om

### 3.10 GridService

Hanterar rutnät och linjer.

**Ansvarsområden:**
- Hantera rutnätsrendring och -konfiguration
- Hantera snapning till rutnät
- Hantera konvertering mellan olika enheter

**Nyckelmetoder:**
- `renderGrid()`: Rendera rutnätet
- `updateGridProperties(props)`: Uppdatera rutnätskonfiguration
- `snapToGrid(point)`: Snappa en punkt till rutnätet
- `convertToPixels(value, unit)`: Konvertera värde till pixlar

### 3.11 GuideService

Hanterar guider (hjälplinjer).

**Ansvarsområden:**
- Hantera skapande och redigering av guider
- Hantera snapning till guider
- Hantera guide-persistens

**Nyckelmetoder:**
- `createHorizontalGuide(position)`: Skapa horisontell guide
- `createVerticalGuide(position)`: Skapa vertikal guide
- `updateGuidePosition(guide, position)`: Uppdatera guideposition
- `deleteGuide(guide)`: Ta bort guide

## 4. Service Integration

### 4.1 ServiceProvider

ServiceProvider är en Svelte-komponent som tillhandahåller alla services via Svelte Context API. Den hanterar även initialiseringen av services i rätt ordning.

```svelte
<!-- ServiceProvider.svelte -->
<script>
  import { setContext } from 'svelte';
  import documentService from './DocumentService';
  import canvasService from './CanvasService';
  // Importera andra services...

  // Funktion för att initialisera services med canvas
  export function initializeCanvas(canvas) {
    if (!canvas) return false;
    
    // Initialisera services i rätt ordning
    canvasService.initialize(canvas);
    documentService.initialize(canvas);
    // Initialisera andra services...
    
    return true;
  }
  
  // Sätt upp kontext för alla komponenter
  setContext('pageStudioServices', {
    documentService,
    canvasService,
    // Andra services...
  });
</script>

<slot></slot>
```

### 4.2 getServices Utility

En utility-funktion för att hämta services från Context API i komponenterna.

```javascript
// getServices.js
import { getContext } from 'svelte';

export function getServices() {
  const services = getContext('pageStudioServices');
  
  if (!services) {
    console.error('Services not found in context');
    // Returnera dummy-services för att undvika null-fel
    return {
      documentService: { /* dummy methods */ },
      canvasService: { /* dummy methods */ },
      // Andra dummy-services...
    };
  }
  
  return services;
}
```

### 4.3 Service Initialization i Canvas.svelte

Canvas.svelte fungerar som huvudkomponent för canvas-interaktion och initialiserar alla services via centraliserad funktion.

```javascript
// Centraliserad service-initialisering i Canvas.svelte
function initializeServices() {
  if (!canvas) return false;
  
  // Core services först
  contextService.initialize({
    canvas,
    // Andra initiala värden...
  });
  
  // Skapa en proxy för enklare context-åtkomst
  const context = contextService.createProxy();
  
  // Dokumenthanteringsservices
  documentService.initialize(canvas);
  masterPageService.initialize(canvas);
  
  // Objektmanipulationsservices
  objectService.initialize({
    canvas,
    dispatch,
    generateId,
    // Andra beroenden...
  });
  
  // Andra services...
  
  // Uppdatera kontext med services
  context.update({
    documentService,
    objectService,
    // Andra services...
  });
  
  return true;
}
```

## 5. Service Kommunikation

Services kommunicerar med varandra genom flera metoder:

### 5.1 Direkt Referens

I vissa fall behöver services referera direkt till varandra för att utföra operationer.

```javascript
// Exempel på direkt service-referens
class DocumentModuleService {
  initialize(options) {
    this.textFlowService = options.textFlow;
  }
  
  saveCurrentPage() {
    // Direkt anrop till textFlowService
    if (this.textFlowService) {
      this.textFlowService.updateAllTextFlows();
    }
    // Fortsätt med sidlagring...
  }
}
```

### 5.2 Kontext-baserad Kommunikation

Services kan kommunicera via det delade kontextobjektet.

```javascript
// Exempel på kontext-baserad kommunikation
class ToolService {
  updateActiveTool(toolType) {
    // Uppdatera verktyget i kontexten
    contextService.set('activeTool', toolType);
  }
}

class ObjectService {
  initialize() {
    // Lyssna på förändringar i kontexten
    contextService.onChange('activeTool', (tool) => {
      this.updateObjectSelectability(tool);
    });
  }
}
```

### 5.3 Event-baserad Kommunikation

För lösare kopplade interaktioner kan en event-baserad modell användas.

```javascript
// Exempel på event-baserad kommunikation
class TextFlowService {
  updateTextFlow(textboxId) {
    // Uppdaterar textflöde och meddelar via händelse
    document.dispatchEvent(new CustomEvent('textflow:updated', {
      detail: { textboxId, status: 'complete' }
    }));
  }
}

// Lyssnare i annan service eller komponent
document.addEventListener('textflow:updated', (event) => {
  const { textboxId, status } = event.detail;
  // Hantera uppdateringar...
});
```

## 6. Legacy Adapter Pattern

För att stödja övergången till service-arkitekturen har en adapter-pattern implementerats genom ServiceIntegration.js.

```javascript
// Exempel på legacy adapter
export function createLegacyDocumentManager(context) {
  // Returnerar ett gränssnitt som liknar det gamla API:et men använder de nya services
  return {
    createNewDocument: (options) => documentService.createNewDocument(options),
    loadDocumentById: (id) => documentService.loadDocumentById(id),
    // Andra adapterade metoder...
  };
}
```

Detta gör det möjligt att gradvis migrera komponenter till den nya arkitekturen utan att behöva uppdatera alla samtidigt.

## 7. Testning av Services

Varje service har en motsvarande testfil som validerar dess funktionalitet. Testerna följer ett konsekvent mönster:

```javascript
// Exempel på service-test
describe('DocumentService', () => {
  beforeEach(() => {
    // Reset service före varje test
    documentService.cleanup();
  });

  it('should initialize with a canvas reference', () => {
    const mockCanvas = {};
    const result = documentService.initialize(mockCanvas);
    expect(result).toBe(documentService); // För metodkedjning
    expect(documentService.canvas).toBe(mockCanvas);
  });

  it('should create a new document', async () => {
    documentService.initialize(mockCanvas);
    const doc = await documentService.createNewDocument({ title: 'Test Doc' });
    expect(doc).toHaveProperty('id');
    expect(doc.title).toBe('Test Doc');
  });

  // Fler tester...
});
```

## 8. Fördelar med Service-Arkitekturen

1. **Minskad Kodduplikation**: Centraliserad funktionalitet minskar duplicering.
2. **Förbättrad Testbarhet**: Isolerade services med tydliga ansvarsområden är lättare att testa.
3. **Bättre Separation av Intressen**: Varje service har ett specifikt ansvarsområde.
4. **Konsekvent API**: Alla services följer samma API-mönster och livscykelhantering.
5. **Förenklad Komponentarkitektur**: Komponenter kan fokusera på UI och delegera logiken till services.
6. **Förbättrad Felhantering**: Centraliserad felhantering i services.
7. **Enklare Underhåll**: Mindre, fokuserade services är lättare att underhålla.
8. **Tydligare Kodorganisation**: Service-uppdelningen skapar en naturlig struktur.

## 9. Framtida Förbättringar

1. **Service Discovery Mechanism**: Automatisk upptäckt och registrering av services.
2. **Advanced Dependency Injection**: Mer sofistikerad DI-lösning för bättre hantering av serviceberoenden.
3. **Service Health Monitoring**: Övervaka services tillstånd och prestanda.
4. **Service Versioning**: Hantera API-versioner för services.
5. **Service Event Bus**: Implementera en centraliserad eventbus för service-kommunikation.