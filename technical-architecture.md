# Teknisk Arkitektur för Webbaserad InDesign-ersättare
## 2025-05-17

Detta dokument beskriver den tekniska arkitekturen för den webbaserade InDesign-ersättaren. Det inkluderar val av teknologier, datamodeller, och hur olika komponenter interagerar med varandra.

## 1. Teknologi-stack

### 1.1. Frontend-ramverk
- **SvelteKit**: Valt för sin höga prestanda, små bundles och enkla komponentmodell
  - Fördelar: Minimalt ramverk-overhead, reaktiv programmering, filbaserad routing
  - Svelte-stores används för global state management

### 1.2. UI och Styling
- **TailwindCSS**: För snabb och konsekvent styling
  - Fördelar: Utility-first approach, bra för UI-komponenter, lätt att anpassa

### 1.3. Canvas och Renderingsbibliotek
- **Fabric.js**: Kraftfullt canvas-bibliotek för objekthantering
  - Fördelar: Inbyggt stöd för objektmanipulation, gruppering, serialisering
  - Hantering av selection, transformations, layers
  - Anpassningsbart för specifika redigeringsverktyg

### 1.4. PDF-generering
- **jsPDF**: För klientbaserad PDF-generering i fas 1 (MVP)
- **Puppeteer**: För server-side rendering i fas 3 (Avancerad Output)
  - Möjliggör vektorbaserad PDF med korrekt textrendering

### 1.5. Lagring
- **IndexedDB**: För lokal lagring av dokument och mallar
  - Fördelar: Stora datamängder kan lagras lokalt, strukturerad lagring

## 2. Datamodell

### 2.1. Dokumentmodell
```typescript
interface Document {
  id: string;
  title: string;
  creator: string;
  created: Date;
  lastModified: Date;
  pages: Page[];
  masterPages: MasterPage[];
  styles: StyleDefinitions;
  metadata: {
    pageSize: {
      width: number;  // i mm
      height: number; // i mm
    };
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    columns: number;
    columnGap: number;
  };
}

interface Page {
  id: string;
  canvasJSON: any; // Fabric.js JSON representation
  masterPageId: string | null;
}

interface MasterPage {
  id: string;
  name: string;
  canvasJSON: any; // Fabric.js JSON representation
}

interface StyleDefinitions {
  colors: ColorStyle[];
  textStyles: TextStyle[];
  objectStyles: ObjectStyle[];
}

interface ColorStyle {
  id: string;
  name: string;
  value: string; // HEX eller RGB
}

interface TextStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textDecoration: string;
  color: string;
  alignment: string;
  lineHeight: number;
}

interface ObjectStyle {
  id: string;
  name: string;
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  opacity: number;
}
```

### 2.2. Objekt-typer
```typescript
// Bastyp för alla objekt på canvas
interface CanvasObject {
  id: string;
  type: 'text' | 'image' | 'shape' | 'group';
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  rotation: number;
  opacity: number;
  locked: boolean;
  fromMasterPage: boolean;
}

interface TextObject extends CanvasObject {
  type: 'text';
  content: string;
  style: {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    textDecoration: string;
    color: string;
    alignment: string;
    lineHeight: number;
    columns: number;
    columnGap: number;
  };
  linkedObjectId: string | null; // ID för nästa länkade textruta
}

interface ImageObject extends CanvasObject {
  type: 'image';
  src: string;
  originalSize: {
    width: number;
    height: number;
  };
  crop: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

interface ShapeObject extends CanvasObject {
  type: 'shape';
  shapeType: 'rectangle' | 'ellipse' | 'line' | 'polygon';
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  points?: number[][]; // För polygoner
}
```

## 3. Komponentarkitektur

### 3.1. Huvudkomponenter
```
App
├── EditorLayout
│   ├── ToolbarPanel
│   │   ├── ToolSelector
│   │   ├── ObjectTools
│   │   └── ActionTools
│   ├── CanvasWorkspace
│   │   ├── RulerHorizontal
│   │   ├── RulerVertical
│   │   ├── Canvas
│   │   └── PageNavigator
│   └── PropertiesPanel
│       ├── TextProperties
│       ├── ImageProperties
│       ├── ShapeProperties
│       └── DocumentProperties
├── DocumentManager
│   ├── DocumentList
│   ├── TemplateLibrary
│   └── ExportOptions
└── DialogSystem
    ├── NewDocumentDialog
    ├── ExportDialog
    └── SettingsDialog
```

### 3.2. State Management
Svelte-stores används för att hantera global state:

```typescript
// document.ts - Hanterar aktuellt dokument
export const currentDocument = writable<Document | null>(null);
export const currentPage = writable<string | null>(null);
export const documentList = writable<DocumentSummary[]>([]);

// editor.ts - Hanterar editor-state
export const currentTool = writable<Tool>('select');
export const selectedObjects = writable<string[]>([]);
export const clipboard = writable<CanvasObject[]>([]);
export const zoomLevel = writable<number>(100);
export const showGrid = writable<boolean>(true);
export const showGuides = writable<boolean>(true);

// templates.ts - Hanterar templates/mallar
export const templateLibrary = writable<Template[]>([]);
```

## 4. Nyckelprocesser

### 4.1. Textflöde mellan rutor

1. **Datakoppling**:
   - Textrutor har ett `linkedObjectId` som pekar till nästa textruta
   - Kedjor av textrutor kan skapas över multipla sidor

2. **Algoritm för textflöde**:
   - Mäter tillgängligt utrymme i källtextrutan
   - Beräknar vilken del av texten som får plats
   - Placerar överflödig text i den länkade textrutan
   - Uppdaterar iterativt genom hela kedjan när ändringar görs

3. **Implementation**:
   - Event-lyssnare på textredigeringshändelser
   - Detektion av överskjutande text
   - Font-rendering med korrekt radbrytning

### 4.2. PDF-generering

#### 4.2.1. Rasterbaserad (MVP)
1. Varje sida renderas till en canvas
2. Canvas exporteras som PNG med hög upplösning
3. PNG-bilder infogas i PDF med jsPDF
4. Genererad PDF sparas lokalt hos användaren

#### 4.2.2. Vektorbaserad (Avancerad)
1. Dokumentet renderas till HTML/SVG med korrekt fonter
2. Puppeteer används för high-fidelity rendering 
3. PDF genereras med full vektorstöd och inbäddade fonter
4. Metadata läggs till i PDF:en

### 4.3. Mallsidor
1. Mallsida skapas som en separat canvas
2. Objekt på mallsidan markeras med flaggan `fromMasterPage: true`
3. Vid sidladdning läggs mallsideobjekt in först, sedan sidans specifika objekt
4. Mallsideobjekt är låsta men kan göras redigerbara med override-funktion

## 5. Tekniska utmaningar och lösningar

### 5.1. Textflöde
**Utmaning**: Implementera automatiskt textflöde mellan textrutor över sidor.

**Lösning**:
- Mätning av texthöjd med canvas text-metrics
- Inkrementell beräkning av textpassning
- Observer-pattern för att uppdatera länkade textrutor
- Optimera för prestanda genom att bara beräkna om när nödvändigt

### 5.2. Vector-baserad PDF-export
**Utmaning**: Exportera högkvalitativ PDF för tryck.

**Lösning**:
- Implementera två-stegsexport: snabb rasterbaserad och högkvalitativ vektorbaserad
- Använda SVG för vektorrepresentation
- Inbäddning av fonter i PDF
- Serverkomponent för vektorgenerering med Puppeteer

### 5.3. Prestanda med stora dokument
**Utmaning**: Bibehålla god prestanda även med många sidor och objekt.

**Lösning**:
- Lazy-loading av sidor - bara aktiv sida renderas
- Optimerad canvas-rendering
- Virtualiserad sidnavigator för stora dokument
- WebWorkers för tunga beräkningar (textflöde, PDF-export)

## 6. Säkerhet och datahantering

### 6.1. Datalagring
- All data lagras lokalt i användarens webbläsare via IndexedDB
- Automatisk säkerhetskopiering med konfigurerbar frekvens
- Export/import av dokumentfiler i JSON-format

### 6.2. Fonthantering
- Systemfonter används primärt
- Webbfonts kan integreras för konsekvens
- Font-inbäddning vid PDF-export för tryckfärdiga dokument

### 6.3. Bildhantering
- Bilder lagras som dataURLs eller Blobs i IndexedDB
- Olika upplösningsversioner genereras för redigering vs. export
- Metadata bevaras för optimal utskriftskvalitet

## 7. Framtida arkitekturella överväganden

### 7.1. Molnlagring och synkronisering
- RESTful API för att lagra dokument på server
- Synkroniseringsmekanism mellan lokal och moln-lagring
- Conflict resolution för samarbetsändamål

### 7.2. Realtidssamarbete
- WebSocket-baserad kommunikation för realtidsuppdateringar
- Operational Transformation (OT) eller Conflict-free replicated data type (CRDT) för konfliktlösning
- Permission-system för olika användarroller

### 7.3. Plugins och extensibilitet
- Plugin-API för att utöka funktionalitet
- Hook-system för att integrera med externa tjänster
- Template-marknadsplats för delning av mallar