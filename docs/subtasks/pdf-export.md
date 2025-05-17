# PDF Export Implementation Plan
## 2025-05-17

Detta dokument beskriver implementationen av PDF-exportfunktionaliteten i den webbaserade InDesign-ersättaren, vilket är en kritisk funktion för att leverera tryckfärdiga dokument.

## 1. Översikt

PDF-export är en kärnfunktion som låter användare skapa högkvalitativa, tryckfärdiga PDF-filer från sina dokument. Detta dokument beskriver en stegvis implementeringsplan från grundläggande rasterbaserad export i MVP till en avancerad vektorbaserad export i senare faser.

### 1.1. Målsättningar
- Erbjuda enkel PDF-exportfunktionalitet i MVP
- Utveckla avancerad vektorbaserad export för tryckfärdiga dokument
- Säkerställa korrekt typsnitthantering och bildkvalitet
- Optimera filstorlek för effektiv distribution
- Tillhandahålla konfigurerbara exportalternativ

### 1.2. Utmaningar
- Korrekt textrendering i vektorformat
- Fontintegrering och hantering
- Höga krav på bildkvalitet för tryck
- Hantering av transparens och blandningslägen
- Prestandaoptimering för stora dokument

## 2. Teknisk Approach

Vi kommer att implementera PDF-exporten i tre faser med olika tekniska lösningar:

### 2.1. Fas 1: Rasterbaserad PDF (MVP)
I MVP-fasen använder vi en enkel rasterbaserad approach:
- Varje sida renderas till en canvas
- Canvas exporteras som en högupplöst PNG-bild
- jsPDF används för att skapa en PDF med infogade bilder

**Tekniska komponenter:**
- HTML Canvas API
- Fabric.js canvas rendering
- jsPDF bibliotek

### 2.2. Fas 2: Hybrid PDF
I den andra fasen förbättrar vi kvaliteten genom en hybridlösning:
- Text och vektorgrafik extraheras och sparas i SVG-format
- Rasterbilder optimeras för tryck
- SVG + rasterbilder kombineras i PDF

**Tekniska komponenter:**
- SVG-generering från Fabric.js objekt
- Förbättrad jsPDF integration
- PDF.js för förhandsgranskning

### 2.3. Fas 3: Vektorbaserad PDF
I den sista fasen implementerar vi fullständig vektorbaserad export:
- Server-side rendering med Puppeteer för hög kvalitet
- Fullständig fontintegrering
- Avancerat stöd för tryckförberedelse

**Tekniska komponenter:**
- Puppeteer för headless Chrome rendering
- PDF-bibliotek med avancerat stöd för tryckkvalitet
- Font subsetting och inbäddning

## 3. Datamodell och API

### 3.1. Exportkonfiguration
```typescript
interface PDFExportConfig {
  quality: 'draft' | 'standard' | 'high' | 'print';
  colorSpace: 'rgb' | 'cmyk';
  bleed: number;  // i mm
  cropMarks: boolean;
  fontHandling: 'embed' | 'outline' | 'system';
  compression: 'none' | 'low' | 'medium' | 'high';
  imageResolution: number;  // i DPI
  metadata: PDFMetadata;
}

interface PDFMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string[];
  creator: string;
  producer: string;
}
```

### 3.2. Export Service API
```typescript
class PDFExportService {
  constructor(config: PDFExportConfig) {
    this.config = config;
  }
  
  // Exportera ett helt dokument till PDF
  async exportDocument(document: Document): Promise<Blob>;
  
  // Exportera en enskild sida till PDF
  async exportPage(page: Page): Promise<Blob>;
  
  // Förhandsgranskning av export
  async generatePreview(page: Page): Promise<HTMLCanvasElement>;
  
  // Intern metod för att rendera canvas till bild
  private renderCanvas(canvas: fabric.Canvas, dpi: number): Promise<HTMLImageElement>;
  
  // Intern metod för att extrahera text och vektorer
  private extractVectorElements(canvas: fabric.Canvas): SVGElement;
  
  // Intern metod för fonthantering
  private handleFonts(usedFonts: string[]): void;
}
```

## 4. Detaljerad Implementationsplan

### 4.1. Fas 1: Rasterbaserad PDF (MVP) - Sprint 4

#### 4.1.1. Grundläggande PDF-generering (2 dagar)
- Implementera rendering av canvas till högupplösta bilder
- Konfigurera jsPDF för grundläggande PDF-skapande
- Skapa enkel export-knapp i användargränssnittet

#### 4.1.2. Multipel-sidhantering (1 dag)
- Implementera rendering av alla dokumentsidor
- Säkerställa korrekt sidordning i PDF
- Hantera sidbyte i jsPDF

#### 4.1.3. Grundläggande metadata (0.5 dag)
- Implementera grundläggande metadata (titel, skapare)
- Lägga till datumstämpel och applikationsidentifiering

#### 4.1.4. Bildkvalitetsoptimering (1.5 dagar)
- Implementera konfigurering av DPI för export
- Optimera bildstorlek och kvalitet
- Hantera stora canvas-storlekar

#### 4.1.5. Testning och buggfixar (1 dag)
- Testa PDF-generering på olika dokument
- Verifiera utskrivbarhet
- Åtgärda initiala buggar

**Leverabler:**
- Fungerande PDF-export i MVP
- Export av flersidiga dokument
- Grundläggande metadata
- Acceptabel utskriftskvalitet för MVP

### 4.2. Fas 2: Hybrid PDF - Sprint 9

#### 4.2.1. Textextrahering (2 dagar)
- Utveckla system för att extrahera textelement från canvas
- Konvertera textrutor till redigerbar text i PDF
- Implementera basalt stöd för typsnitt

#### 4.2.2. SVG-baserad vektorgrafik (2 dagar)
- Implementera SVG-export av vektorobjekt
- Integrera SVG med jsPDF
- Hantera blandningar av raster och vektor

#### 4.2.3. Förbättrad bildhantering (1.5 dagar)
- Implementera bildkomprimering
- Optimera bitmapbilder för tryck
- Hantera genomskinlighet

#### 4.2.4. Exportkonfigurationspanel (1.5 dagar)
- Skapa konfigurerbart UI för exportinställningar
- Implementera kvalitetspresets
- Lägga till avancerade inställningar

#### 4.2.5. Förhandsgranskning (1 dag)
- Implementera förhandsgranskning av PDF
- Visa uppskattad filstorlek
- Ge visuell feedback på olika kvalitetsinställningar

**Leverabler:**
- Förbättrad PDF-kvalitet med vektorbaserad text
- Konfigurerbar exportpanel
- Förhandsgranskningsfunktionalitet
- Optimerad bildkvalitet

### 4.3. Fas 3: Vektorbaserad PDF - Sprint 10

#### 4.3.1. Server-side rendering setup (2 dagar)
- Utforska Puppeteer-integration
- Sätta upp rendering pipeline
- Implementera kommunikation mellan klient och server

#### 4.3.2. Fonthantering och inbäddning (2 dagar)
- Implementera detektering av använda typsnitt
- Utveckla fontsubsetting för minskad filstorlek
- Skapa typsnittsintegrering i PDF

#### 4.3.3. Avancerade tryckförberedelser (2 dagar)
- Implementera skärmärken och utfall
- Lägga till stöd för CMYK-färgrymd
- Implementera färgprofiler

#### 4.3.4. PDF-validering och optimering (1.5 dagar)
- Implementera PDF/X validering
- Optimera PDF-struktur för tryck
- Minska filstorlek genom komprimering

#### 4.3.5. Testing och finslipning (2 dagar)
- Testa med professionellt tryckeri
- Verifiera kompatibilitet med tryckleverantörer
- Finjustera kvalitetsinställningar

**Leverabler:**
- Komplett vektorbaserad PDF-export
- Professionell tryckförberedelse
- Fontintegration
- Validerad tryckkvalitet

## 5. Användarupplevelse

### 5.1. Export-dialog UI

**MVP Version (Enkel dialog):**
```
+----------------------------------+
| Export PDF                       |
|----------------------------------|
| Dokumentnamn: [_____________]    |
|                                  |
| Kvalitet:                        |
| O Draft (72 DPI)                 |
| O Standard (150 DPI)             |
| @ High (300 DPI)                 |
|                                  |
| [ ] Inkludera metadata           |
|                                  |
| [    Avbryt    ] [    Export    ]|
+----------------------------------+
```

**Avancerad Version (Fas 3):**
```
+----------------------------------+
| Export PDF                       |
|----------------------------------|
| Målprofil:                       |
| O Skärm                          |
| O Print (standard)               |
| @ Professional Print             |
| O Custom                         |
|                                  |
| Avancerade inställningar:        |
|                                  |
| Färgrymd:     [RGB v]            |
| Bildkvalitet: [300 DPI v]        |
| Fonter:       [Embed v]          |
| Komprimering: [Medium v]         |
|                                  |
| [ ] Skärmärken                   |
| [ ] Utfall: [3] mm               |
| [ ] PDF/X-1a kompatibel          |
|                                  |
| Metadata:                        |
| Titel:   [_____________]         |
| Skapare: [_____________]         |
|                                  |
| [Förhandsgranska] [Avbryt] [Export]|
+----------------------------------+
```

### 5.2. Export-arbetsflöde

#### MVP Workflow:
1. Användaren klickar på "Exportera PDF"
2. Enkel dialog visar grundalternativ
3. Användaren väljer kvalitet och filnamn
4. Klickar "Export"
5. Laddningsindikator visas
6. PDF genereras och laddas ner automatiskt

#### Avancerad Workflow (Fas 3):
1. Användaren klickar på "Exportera PDF"
2. Avancerad dialog med profilval visas
3. Användaren kan välja fördefinierade profiler eller anpassade inställningar
4. Förhandsgranskning kan genereras
5. Användaren justerar inställningar efter behov
6. Klickar "Export"
7. Laddningsindikator med procentuell framgång visas
8. PDF valideras internt
9. PDF genereras och laddas ner automatiskt
10. Bekräftelsedialog med summering visas

## 6. Tekniska utmaningar och lösningar

### 6.1. Textrendering
**Problem**: Text måste renderas skarpt och som vektorbaserad text, inte som pixelbilder, för professionellt tryck.

**Lösningar**:
1. **MVP**: Högupplösta canvas-renderingar (300+ DPI)
2. **Hybrid**: Extrahera textdata och infoga som text-element i PDF
3. **Avancerad**: Använda SVG med CSS för exakt textpositionering

### 6.2. Fonthantering
**Problem**: Typsnitt måste hanteras korrekt för att garantera konsekvent visning och tryck.

**Lösningar**:
1. **MVP**: Använda endast websäkra typsnitt
2. **Hybrid**: Begränsad fontintegrering för vanliga typsnitt
3. **Avancerad**: Komplett fontsubsetting och inbäddning

### 6.3. Bildkvalitet för tryck
**Problem**: Bilder måste ha tillräcklig upplösning och kvalitet för tryck, vilket ökar filstorlek.

**Lösningar**:
1. **MVP**: Exportera med fast hög upplösning (300 DPI)
2. **Hybrid**: Adaptiv upplösning baserad på bildstorlek
3. **Avancerad**: Intelligent bildkomprimering och optimering

### 6.4. Prestandaproblem med stora dokument
**Problem**: Rendering av stora dokument kan orsaka prestandaproblem i webbläsaren.

**Lösningar**:
1. **MVP**: Progressiv sidrendering
2. **Hybrid**: Använda Web Workers för bakgrundsprocesser
3. **Avancerad**: Server-side rendering för stora dokument

### 6.5. Serverbaserad rendering
**Problem**: Vektorbaserad export med Puppeteer kräver serverkomponent.

**Lösningar**:
1. **MVP**: Helt klientbaserad lösning
2. **Hybrid**: Förbered för eventuell serverkomponent
3. **Avancerad**: Implementera lightweight serverkomponent för rendering

## 7. Testning och kvalitetssäkring

### 7.1. Testscenarier
1. Export av ensidigt dokument med text och bilder
2. Export av flersidigt dokument (10+ sidor)
3. Export med olika typsnittstyper (standard, Google Fonts, etc)
4. Test av bildkvalitet vid olika exportinställningar
5. Verifiering av textskärpa i exporterade PDFer
6. Test av metadata-inbäddning
7. Prestandatest med stora dokument
8. Test med avancerade layouter (transparens, blandningar, etc)

### 7.2. Valideringsmetodik
1. Visuell inspektion av exporterade PDFer
2. Jämförelse med InDesign-output som referens
3. Utskriftstester på olika skrivare
4. Validering med PDF/X-standarder
5. Test hos professionella tryckerier
6. Filstorleksoptimering

### 7.3. Prestandamätning
1. Exporttid för olika dokument och kvaliteter
2. Minnesanvändning under exportprocessen
3. CPU-användning under rendering
4. Filstorleksmätning för olika konfigurationer

## 8. Risker och fallback-strategier

### 8.1. Risker
1. **Komplex vektorexport**: Vektorbaserad export kan vara mer komplex än förväntat
2. **Fontkompatibilitet**: Problem med typsnittsrendering på olika plattformar
3. **Serverkomponent**: Eventuella svårigheter med serverintegration
4. **Prestanda**: Långsam rendering av stora dokument
5. **Webbläsarbegränsningar**: Skillnader i canvas-rendering mellan webbläsare

### 8.2. Fallback-strategier
1. **Hybridmetod**: Falla tillbaka på förbättrad rasterbaserad export om vektorexport är problematisk
2. **Fontkonvertering**: Konvertera problematiska typsnitt till kurvor som fallback
3. **Klientbaserad lösning**: Alternativ helt klientbaserad lösning om serverkomponent stöter på problem
4. **Upplösningsskalning**: Dynamiskt justera kvalitet baserat på dokumentstorlek
5. **Feature detection**: Anpassa export baserat på webbläsarfunktionalitet

## 9. Implementationsschema

| Vecka | Sprint | Fas | Huvudaktiviteter | Milstolpe |
|-------|--------|-----|------------------|-----------|
| 8 | 4 | 1 | Grundläggande PDF-export | Fungerande PDF-export i MVP |
| 15-16 | 9 | 2 | Hybrid PDF med förbättrad text | Förbättrad PDF-kvalitet |
| 17-18 | 10 | 3 | Vektorbaserad PDF och tryckförberedelse | Professionell PDF-export |

## 10. Beroenden och integrationspunkter

### 10.1. Tekniska beroenden
- Välfungerande canvas-rendering i Fabric.js
- Korrekt dokumentmodell och sidhantering
- Font-laddning och hantering i applikationen
- Eventuell serverinfrastruktur för Puppeteer (Fas 3)

### 10.2. Integrationspunkter
- Export-API som integrerar med dokumenthanteringen
- Fonthantering som integrerar med textrenderings-systemet
- Dokumentlagerexponering för vektorextrahering
- UI-komponenter för exportkonfiguration

## 11. Acceptanskriterier för PDF-export

Fas 1 (MVP):
1. Användare kan exportera flersidiga dokument till PDF
2. Text är läsbar i utskrivna PDFer
3. Bilder har acceptabel kvalitet (minst 150 DPI)
4. Korrekt sidordning och orientering
5. Grundläggande metadata (titel, skapare) inkluderas

Fas 2:
1. Förbättrad textkvalitet i exporterade PDFer
2. Konfigurerbara exportinställningar
3. Mindre filstorlek jämfört med fas 1
4. Förhandsgranskningsfunktionalitet

Fas 3:
1. Vektorbaserad text och grafik i exporterade PDFer
2. Kompletta typsnittsuppsättningar inbäddade korrekt
3. Tryckförberedelse (utfall, skärmärken)
4. CMYK-stöd för professionellt tryck
5. PDF/X-kompatibilitet för tryckerier
6. Optimerad filstorlek med bevarad kvalitet