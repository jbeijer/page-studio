# Product Requirements Document (PRD)
## Web-baserad InDesign-ersättare för medlemstidning

### 1. Projektöversikt

#### 1.1 Bakgrund
Många föreningar och organisationer använder Adobe InDesign för att producera medlemstidningar, vilket kräver specialiserad kunskap och kostsamma licenser. Detta projekt syftar till att ersätta grundläggande funktionalitet från InDesign med en webbaserad, användarvänlig och kostnadsfri lösning.

#### 1.2 Projektmål
Skapa en webapplikation som möjliggör för icke-tekniska redaktörer att:
- Designa och redigera medlemstidningar med en intuitiv WYSIWYG-editor
- Hantera textformatering, bilder och layout
- Exportera tryckfärdiga PDF-dokument
- Spara och återanvända mallar för konsekvent design

#### 1.3 Icke-mål
- Ersätta alla avancerade funktioner i InDesign
- Stödja multipla användare samtidigt (initial version)

### 2. Målgrupp och användarroller

#### 2.1 Primär målgrupp
- Föreningsredaktörer utan InDesign-kunskap
- Mindre organisationer med begränsad budget
- Volontärer som producerar medlemspublikationer

#### 2.2 Användarroller
- **Redaktör**: Skapar och redigerar innehåll, sparar mallar
- **Administratör**: Hanterar användare och behörigheter (framtida version)

### 3. Funktionella krav

#### 3.1 Grundfunktionalitet
- **Canvas-baserad redigering** med fri placering av objekt
- **Texthantering**: Lägg till, redigera och formatera text (storlek, typsnitt, stil)
- **Bildhantering**: Importera, placera och skala bilder
- **Formhantering**: Skapa och manipulera rektanglar, linjer och andra former
- **Objekt-transformation**: Rotera, skala och flytta objekt
- **Lagerhantering**: Ordna objekt framåt/bakåt
- **Multipla sidor**: Stöd för flera sidor i samma dokument med navigering
- **Textflöde**: Automatiskt textflöde mellan kopplade textrutor över sidor

#### 3.2 Layout och design
- **Siddimensioner**: Fördefinierade format (A4, A5, etc.)
- **Rutnät och hjälplinjer**: För enkel placering av objekt
- **Snappning**: Till rutnät och andra objekt
- **Marginaler och spalter**: Konfigurera sidmarginaler
- **Mallsidor**: Grundlayout som kan appliceras på flera sidor

#### 3.3 Export och delning
- **PDF-export**: Generera högkvalitativa PDF-filer för tryck
- **Vektorbaserad export**: Använd SVG för skarp text
- **Bildkvalitet**: Konfigurera upplösning för bilder
- **Fonthantering**: Bädda in typsnitt i exporterade filer

#### 3.4 Mallhantering
- **Spara och ladda**: Lagra layouts som återanvändbara mallar
- **Exportera mall**: Dela mallar med andra användare
- **Kategorihantering**: Organisera mallar efter typ eller tema

### 4. Icke-funktionella krav

#### 4.1 Prestanda
- **Responsivitet**: UI-interaktioner ska ske utan märkbar fördröjning
- **Effektiv rendering**: Hantera komplex layout utan prestandaproblem
- **Skalbarhet**: Fungera med stora dokument (10+ sidor)

#### 4.2 Användbarhet
- **Intuitiv UI**: Minimalt inlärningsbehov för grundläggande funktioner
- **Familjär design**: Likna InDesign där möjligt för enkel övergång
- **Progressiv komplexitet**: Enkla verktyg synliga först, avancerade vid behov

#### 4.3 Kompatibilitet
- **Webbläsarstöd**: Chrome, Firefox, Safari, Edge (senaste två versionerna)
- **Responsiv design**: Fungera på skärmar 1280px bredd och större
- **Tryckstöd**: Generera PDFer som följer tryckstandard

#### 4.4 Säkerhet och integritet
- **Lokal lagring**: Möjlighet att arbeta helt lokalt utan serveranslutning
- **Datastyrning**: Användaren äger allt innehåll

### 5. Användarupplevelse och flöden

#### 5.1 Huvudarbetsflöde
1. Skapa nytt dokument eller välj mall
2. Definiera sidantal och format
3. Konfigurera mallsidor för konsekventa element
4. Lägg till och redigera textrutor, bilder och former
5. Koppla textrutor för automatiskt textflöde mellan sidor
6. Formatera objekt med verktygspaletten
7. Justera layout med rutnät och hjälplinjer
8. Förhandsgranska dokumentet
9. Exportera som PDF
10. Spara layout för framtida bruk

#### 5.2 UI-komponenter
- **Huvudkanvas**: Central redigeringsyta
- **Verktygspalett**: Vänster sida, innehåller verktyg för att skapa/manipulera objekt
- **Egenskapspanel**: Höger sida, visar egenskaper för markerade objekt
- **Sidpanel**: Sidnavigering och sidmallar
- **Lagerhanterare**: Kontrollera objektordning och synlighet
- **Format-bibliotek**: Sparade text- och objektstilar

### 6. Teknisk arkitektur

#### 6.1 Frontend
- **Ramverk**: SvelteKit för snabb rendering och liten bundle-storlek
- **Canvas-bibliotek**: Fabric.js för objekt-manipulation och JSON-serialisering
- **PDF-generering**: jsPDF för klientbaserad PDF-export
- **Stilhantering**: TailwindCSS för UI-komponenter

#### 6.2 Datamodell
```
Document
├── metadata (titel, skapare, datum)
├── pages[]
│   ├── width, height, margins
│   ├── objects[]
│       ├── type (text, image, shape)
│       ├── properties (position, rotation, scale)
│       ├── content (text, imageUrl, etc.)
│       └── linkedObjectId (för kopplade textrutor)
├── masterPages[] (mallsidor)
└── styles (färger, typsnitt, etc.)
```

#### 6.3 Lagring
- **Lokal lagring**: IndexedDB för dokument och mallar
- **Export/Import**: JSON-format för dokumentutbyte
- **Framtida serverlagring**: API för molnbaserad synkronisering (valfritt)

### 7. Implementationsplan

#### 7.1 Fas 1: MVP (6-7 veckor)
- Grundläggande canvas med texteditor och bildimport
- Enkel objektpositionering och -formatering
- Stöd för multipla sidor med navigering
- Elementär PDF-export (rasterbaserad)
- Lokal lagring av dokument

#### 7.2 Fas 2: Avancerad layout (4-5 veckor)
- Rutnät, hjälplinjer och snappning
- Förbättrad textformatering
- Formverktyg och gruppering
- **Implementera textflöde mellan kopplade textrutor**
- **Mallsidor för återkommande element**
- Mall-bibliotek

#### 7.3 Fas 3: Avancerad output (3-4 veckor)
- Vektorbaserad PDF-export med Puppeteer
- Fonthantering och inbäddning
- Förhandsgranskning av utskrift
- Exportkonfiguration för olika sidstorlekar

### 8. Tekniska komponenter

#### 8.1 Nyckelkodsstrukturer

**Projektstruktur**
```
canvas-magazine-editor/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Editor/
│   │   │   │   ├── Canvas.svelte
│   │   │   │   ├── Toolbar.svelte
│   │   │   │   ├── PropertiesPanel.svelte
│   │   │   │   ├── PageNavigator.svelte
│   │   │   │   └── ObjectLibrary.svelte
│   │   │   └── UI/
│   │   ├── stores/
│   │   │   ├── document.js
│   │   │   ├── editor.js
│   │   │   ├── pages.js
│   │   │   └── templates.js
│   │   └── utils/
│   │       ├── pdf-export.js
│   │       ├── text-flow.js
│   │       └── storage.js
│   ├── routes/
│   │   ├── +page.svelte
│   │   ├── templates/+page.svelte
│   │   └── export/+page.svelte
├── static/
│   ├── fonts/
│   └── images/
├── package.json
├── svelte.config.js
└── tsconfig.json
```

**Canvas-komponent med multipla sidor**
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { fabric } from 'fabric';
  import { currentDocument, currentPage } from '$lib/stores/document';
  import PageNavigator from './PageNavigator.svelte';
  
  let canvasElement: HTMLCanvasElement;
  let canvas: fabric.Canvas;
  let pages: any[] = [];
  
  $: if ($currentPage && canvas) {
    loadPage($currentPage);
  }
  
  onMount(() => {
    // Initiera canvas med A4-storlek @ 150dpi
    canvas = new fabric.Canvas(canvasElement, {
      width: 1240,
      height: 1754,
      selection: true,
      preserveObjectStacking: true
    });
    
    // Ladda dokumentet från store om det finns
    if ($currentDocument) {
      pages = $currentDocument.pages || [{ 
        id: 'page-1', 
        canvasJSON: null,
        masterPageId: null
      }];
      
      // Ställ in första sidan som aktiv
      currentPage.set(pages[0].id);
    }
    
    // Lyssna på förändringar för att uppdatera store
    canvas.on('object:modified', saveCurrentPage);
    canvas.on('object:added', saveCurrentPage);
    canvas.on('object:removed', saveCurrentPage);
  });
  
  function loadPage(pageId) {
    // Spara aktuell sida först
    saveCurrentPage();
    
    // Hitta den nya sidan
    const pageToLoad = pages.find(p => p.id === pageId);
    
    if (pageToLoad) {
      // Rensa canvas
      canvas.clear();
      
      // Ladda innehåll om det finns
      if (pageToLoad.canvasJSON) {
        canvas.loadFromJSON(pageToLoad.canvasJSON, () => {
          connectLinkedTextboxes();
          canvas.renderAll();
        });
      }
      
      // Applicera mallsida om angiven
      if (pageToLoad.masterPageId) {
        applyMasterPage(pageToLoad.masterPageId);
      }
    }
  }
  
  function saveCurrentPage() {
    if (!$currentPage) return;
    
    const pageIndex = pages.findIndex(p => p.id === $currentPage);
    if (pageIndex >= 0) {
      pages[pageIndex].canvasJSON = canvas.toJSON(['linkedObjectId']);
      
      currentDocument.update(doc => ({
        ...doc,
        pages: [...pages],
        lastModified: new Date()
      }));
    }
  }
  
  function addNewPage() {
    const newPageId = `page-${pages.length + 1}`;
    
    // Lägg till ny sida i dokumentet
    pages = [...pages, { 
      id: newPageId, 
      canvasJSON: null,
      masterPageId: null
    }];
    
    // Uppdatera dokument
    currentDocument.update(doc => ({
      ...doc,
      pages: pages,
      lastModified: new Date()
    }));
    
    // Byt till nya sidan
    currentPage.set(newPageId);
  }
  
  // Hantera textflöde mellan kopplade textrutor
  function connectLinkedTextboxes() {
    // Hitta alla textrutor på canvas
    const textboxes = canvas.getObjects('textbox');
    
    // Skapa kopplingar baserat på linkedObjectId
    textboxes.forEach(textbox => {
      if (textbox.linkedObjectId) {
        const targetTextbox = canvas.getObjects().find(obj => 
          obj.id === textbox.linkedObjectId
        );
        
        if (targetTextbox) {
          // Implementera flödeslogik här
          setupTextFlowBetween(textbox, targetTextbox);
        }
      }
    });
  }
  
  function setupTextFlowBetween(sourceTextbox, targetTextbox) {
    // Lyssna på ändringar i källtextrutan
    sourceTextbox.on('changed', () => {
      // Beräkna överflödig text från källan
      const overflowText = calculateTextOverflow(sourceTextbox);
      
      // Uppdatera måltextrutan med överflödande text
      if (overflowText) {
        targetTextbox.set('text', overflowText);
        canvas.renderAll();
      }
    });
  }
  
  // Implementera textflödeslogik
  function calculateTextOverflow(textbox) {
    // Kod för att beräkna överflödig text baserat på textrutan
    // Detta kräver en avancerad implementation som mäter text-höjd
    // och returnerar text som inte får plats
    // ...
  }
  
  // Mallsidor
  function applyMasterPage(masterPageId) {
    const masterPage = $currentDocument.masterPages.find(mp => mp.id === masterPageId);
    
    if (masterPage && masterPage.canvasJSON) {
      // Ladda objekt från mallsidan men markera dem som låsta
      fabric.util.enlivenObjects(masterPage.canvasJSON.objects, (objects) => {
        objects.forEach(obj => {
          obj.set({
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
            lockRotation: true,
            lockScalingX: true,
            lockScalingY: true,
            isMasterPageObject: true
          });
          canvas.add(obj);
        });
        canvas.renderAll();
      });
    }
  }
  
  // Exportfunktioner
  async function exportDocument() {
    // Spara aktuell sida
    saveCurrentPage();
    
    // Skapa PDF för varje sida
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Första sidan läggs till direkt
    let isFirstPage = true;
    
    for (const page of pages) {
      // Ladda sidan i canvas temporärt
      await loadPageForExport(page);
      
      // Exportera canvas till bild
      const dataURL = canvas.toDataURL({
        format: 'png',
        multiplier: 2
      });
      
      // Lägg till ny sida i PDF (utom för första sidan)
      if (!isFirstPage) {
        pdf.addPage();
      }
      
      // Lägg till bild på sidan
      pdf.addImage(dataURL, 'PNG', 0, 0, 210, 297);
      isFirstPage = false;
    }
    
    // Spara PDF:en
    pdf.save(`${$currentDocument.title || 'medlemsblad'}.pdf`);
    
    // Återladda aktuell sida
    loadPage($currentPage);
  }
  
  // Hjälpfunktion för export
  function loadPageForExport(page) {
    return new Promise((resolve) => {
      canvas.clear();
      
      if (page.canvasJSON) {
        canvas.loadFromJSON(page.canvasJSON, () => {
          if (page.masterPageId) {
            applyMasterPage(page.masterPageId);
          }
          canvas.renderAll();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
</script>

<div class="editor-container">
  <PageNavigator 
    pages={pages} 
    currentPage={$currentPage} 
    onChangePage={(pageId) => currentPage.set(pageId)} 
    onAddPage={addNewPage} 
  />
  
  <div class="canvas-container">
    <canvas bind:this={canvasElement}></canvas>
  </div>
</div>
```

#### 8.2 Textflöde mellan rutor
```javascript
// Implementering av textflöde mellan kopplade textrutor
class TextFlow {
  constructor(canvas) {
    this.canvas = canvas;
    this.linkedTextboxes = new Map(); // Karta av källtextruta -> måltextruta
    
    // Lyssna på ändringar i alla textrutor
    canvas.on('text:changed', this.handleTextChange.bind(this));
  }
  
  // Koppla två textrutor för flöde
  linkTextboxes(sourceId, targetId) {
    const source = this.getTextboxById(sourceId);
    const target = this.getTextboxById(targetId);
    
    if (source && target) {
      // Lagra kopplingen
      this.linkedTextboxes.set(sourceId, targetId);
      
      // Uppdatera metadata på objekten
      source.set('linkedObjectId', targetId);
      target.set('isLinkedTarget', true);
      
      // Initiera flödet
      this.flowTextBetween(source, target);
      
      this.canvas.renderAll();
    }
  }
  
  // Hitta textruta via ID
  getTextboxById(id) {
    return this.canvas.getObjects('textbox').find(obj => obj.id === id);
  }
  
  // Hantera ändringar i textruta
  handleTextChange(event) {
    const source = event.target;
    const sourceId = source.id;
    
    // Kolla om denna textruta är kopplad till en annan
    if (this.linkedTextboxes.has(sourceId)) {
      const targetId = this.linkedTextboxes.get(sourceId);
      const target = this.getTextboxById(targetId);
      
      if (target) {
        this.flowTextBetween(source, target);
      }
    }
  }
  
  // Flöda text från en ruta till nästa
  flowTextBetween(source, target) {
    // Beräkna hur mycket text som får plats i källrutan
    const sourceHeight = source.height - (source.padding * 2);
    const lineHeight = source.lineHeight || 1.16;
    const fontSize = source.fontSize || 12;
    const maxLinesInSource = Math.floor(sourceHeight / (fontSize * lineHeight));
    
    // Dela upp texten i rader
    const allText = source.text;
    const lines = allText.split('\n');
    
    // Identifiera text som får plats och överflöde
    let sourceLines = [];
    let overflowLines = [];
    let lineCount = 0;
    
    for (const line of lines) {
      // Räkna antal rader efter radbryt
      const wrappedLines = this.calculateWrappedLines(source, line);
      
      if (lineCount + wrappedLines.length <= maxLinesInSource) {
        sourceLines.push(line);
        lineCount += wrappedLines.length;
      } else {
        overflowLines.push(line);
      }
    }
    
    // Uppdatera källan och målet
    source.set('text', sourceLines.join('\n'));
    target.set('text', overflowLines.join('\n'));
    
    // Rekursivt hantera fortsatt flöde om målet också är kopplad
    const targetId = target.id;
    if (this.linkedTextboxes.has(targetId)) {
      const nextTargetId = this.linkedTextboxes.get(targetId);
      const nextTarget = this.getTextboxById(nextTargetId);
      
      if (nextTarget) {
        this.flowTextBetween(target, nextTarget);
      }
    }
    
    this.canvas.renderAll();
  }
  
  // Hjälpfunktion för att beräkna radbryt
  calculateWrappedLines(textbox, text) {
    // Implementera algoritm för att beräkna hur många rader en text blir
    // efter radbryt baserat på textruta, bredd, teckensnitt etc.
    // Detta är en förenklad version
    const avgCharWidth = textbox.fontSize * 0.6; // Uppskattning
    const maxCharsPerLine = Math.floor((textbox.width - (textbox.padding * 2)) / avgCharWidth);
    
    // Dela upp i rader baserat på bredd
    const wrappedLines = [];
    let currentLine = '';
    
    for (const word of text.split(' ')) {
      if ((currentLine + word).length > maxCharsPerLine) {
        wrappedLines.push(currentLine);
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }
    
    if (currentLine) {
      wrappedLines.push(currentLine);
    }
    
    return wrappedLines;
  }
}
```

### 9. Risker och riskhantering

| Risk | Sannolikhet | Konsekvens | Åtgärd |
|------|-------------|------------|--------|
| Komplex implementering av textflöde | Hög | Hög | Börja med enkel modell, förfina stegvis |
| Hantering av multipla sidor i fabric.js | Medel | Hög | Utveckla egen sidhantering med separata canvas-instanser |
| Rasteriserad text ger otydlig utskrift | Hög | Medel | Implementera SVG/Puppeteer-export |
| Stora PDF-filer | Medel | Låg | Konfigurerbara exportinställningar för bilddensitet |
| Prestandaproblem vid stora dokument | Medel | Hög | Lazy-loading av objekten, rendera endast aktiv sida |
| Typsnittsproblem i exporterad PDF | Hög | Hög | Inbädda typsnitt eller konvertera till kurvor |
| Webbläsarkompatibilitet | Låg | Medel | Testa regelbundet i alla målwebbläsare |

### 10. Framtida utökningar

#### 10.1 Fas 4: Samarbete (framtida)
- Delning av dokument med andra användare
- Autentisering och användarhantering
- Kommentarer och feedback

#### 10.2 Fas 5: Avancerade layoutfunktioner
- Automatiskt innehållsförteckning
- Stilmallar för konsekvent formatering
- Indexering

#### 10.3 Fas 6: Integrationer
- Import från InDesign/IDML
- Integration med bildbanker
- Export till andra format (HTML, ePub)

### 11. Framgångskriterier

1. Redaktörer kan skapa en flersidors medlemstidning utan InDesign-kunskap
2. Text flödar automatiskt mellan kopplade textrutor över sidor
3. Tryckfärdig PDF-kvalitet jämförbar med InDesign-output
4. Webbapplikationen kräver inga externa programvarulicenser
5. Effektiv workflow som reducerar tiden för att skapa publikationer

### 12. Ordlista

- **Canvas**: HTML5-element för ritning och grafisk hantering i webbläsaren
- **WYSIWYG**: "What You See Is What You Get" - redigering där resultatet visas direkt
- **Fabric.js**: JavaScript-bibliotek för canvas-manipulation
- **jsPDF**: Bibliotek för PDF-generering i webbläsaren
- **Puppeteer**: Headless Chrome-verktyg för serverrendering
- **Textflöde**: När text automatiskt fortsätter i en annan textruta när den första är full
- **Mallsida**: Fördefinierad layoutmall med gemensamma element för flera sidor

---

### 13. Referenser och resurser

- [Fabric.js dokumentation](http://fabricjs.com/docs/)
- [jsPDF dokumentation](https://rawgit.com/MrRio/jsPDF/master/docs/index.html)
- [SvelteKit dokumentation](https://kit.svelte.dev/docs)
- [Puppeteer dokumentation](https://pptr.dev/)

---

*Detta PRD representerar version 1.0 och kommer att uppdateras löpande under projektets gång.*