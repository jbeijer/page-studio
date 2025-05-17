# Editor Components

Denna mapp innehåller komponenter och kodfiler relaterade till editorns canvas-funktionalitet.

## Kodfiler

### Canvas.svelte

Huvudkomponenten för canvas-editorn. Hanterar interaktion med Fabric.js-canvas, event-hantering, och integration med övriga komponenter.

### Canvas.helpers.js

Innehåller hjälpfunktioner för Canvas-komponenten, främst related till lagerhantering och klippbordsfunktioner.

### Canvas.grid.js

Implementerar grid-rendering funktionalitet med SVG för exakt pixel-perfekt visning av grid-linjer.

Nyckelfeatures:
- Pixel-perfekt SVG-baserad grid-rendering
- Helper-funktioner för att skapa SVG-element
- Hanterar både huvud-grid och under-grid (subdivisions)
- Optimerad för att undvika subpixel-rendering problem

### Canvas.guides.js

Hanterar linjalguider som kan placeras och flyttas på canvasen.

Nyckelfeatures:
- Skapar horisontella och vertikala guider
- Implementerar drag-funktionalitet
- Synkroniserar guider med dokumentmodellen
- Stöd för borttagning och uppdatering av guider

## Komponenter

### Toolbar.svelte

Verktygsraden med alla verktyg för att manipulera canvasen.

### TextEditingPanel.svelte

Panel för att redigera textinnehåll och formateringsegenskaper.

### MasterObjectContextMenu.svelte

Kontextmeny för masterpage-objekt och hantering av overrides.

### GridConfigPanel.svelte

Konfigurationspanel för grid-egenskaper (storlek, färg, subdivision, etc).

### HorizontalRuler.svelte / VerticalRuler.svelte

Implementerar linjaler med markeringar för exakta mått.

## Implementationsdetaljer

### Grid Rendering

Grid-renderingen använder en SVG-baserad approach istället för CSS eller Canvas API-rendering, då detta ger överlägsen precision och undviker subpixel-renderingsproblem som kan orsaka "snöiga" linjer.

```javascript
// Exempel på hur grid-renderingen anropas
renderGrid({
  canvas,
  canvasElement,
  isMounted,
  width,
  height,
  currentDocument: $currentDocument,
  convertToPixels
});
```

### Guides

Implementationen av guider bygger på Fabric.js Line-objekt med speciella egenskaper:

```javascript
// Exempel på hur en guide skapas
const guide = createHorizontalGuide({
  canvas, 
  currentDocument, 
  currentPage, 
  position, 
  width
});
```

## Prestandaoptimering

Canvas-komponenten och dess relaterade delar har optimerats för:

1. **Rendering-prestanda**: Genom att undvika onödiga rerenders och använda effektiva rendering-tekniker
2. **Kodbaser**: Genom att extrahera funktionalitet till separata moduler (grid, guides, helpers)
3. **Minnesanvändning**: Genom att hantera objekt och resurser på ett effektivt sätt

## Debugging

För att aktivera debug-läge för grid:

```javascript
window.DEBUG_GRID_ALIGNMENT = true;
```

Detta visar visuella markörer och ger detaljerad information i konsolen för att diagnostisera grid-relaterade problem.