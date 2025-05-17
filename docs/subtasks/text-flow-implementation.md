# Implementering av Textflöde mellan Textrutor
## 2025-05-17

Detta dokument beskriver den detaljerade implementationsplanen för textflödesfunktionaliteten i den webbaserade InDesign-ersättaren. Denna komponent har identifierats som en av de mest komplexa och kritiska funktionerna i projektet.

## 1. Översikt

Textflöde är en funktion där text automatiskt fortsätter i nästa kopplade textruta när den aktuella textrutan är full. Detta möjliggör layout med kontinuerlig text över flera sidor och kolumner.

### 1.1. Huvudfunktionalitet
- Länka textrutor så att text flödar mellan dem
- Automatisk omflödning när texten ändras
- Visuella indikatorer som visar länkar mellan textrutor
- Stöd för textflöde över flera sidor
- Möjlighet att bryta och återskapa länkar

### 1.2. Användarupplevelse
1. Användaren skapar en textruta och fyller den med text
2. När textrutan blir full, indikeras detta visuellt
3. Användaren skapar en till textruta och länkar den till den första
4. Text flödar automatiskt från den första till den andra textrutan
5. Ändringar i text eller formatering i första textrutan uppdaterar automatiskt flödet

## 2. Datamodell

### 2.1. Utökad TextObject-modell
```typescript
interface TextObject extends CanvasObject {
  type: 'text';
  content: string;
  style: TextStyle;
  linkedObjectId: string | null;     // ID för nästa textruta
  isLinkedSource: boolean;           // Är denna textruta en källa
  hasOverflow: boolean;              // Indikerar om textrutan har överskjutande text
  overflowContent: string | null;    // Sparad överskjutande text
  linkedFromObjectId: string | null; // ID för föregående textruta (för bakåtnavigering)
}

interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textDecoration: string;
  color: string;
  alignment: string;
  lineHeight: number;
  padding: number;
  columns: number;
  columnGap: number;
}
```

### 2.2. TextFlow-hanterarklass
```typescript
class TextFlowManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.linkedTextboxes = new Map(); // Karta av textrutor och deras kopplingar
  }
  
  // Koppla två textrutor
  linkTextboxes(sourceId: string, targetId: string): boolean;
  
  // Ta bort länk mellan textrutor
  unlinkTextboxes(sourceId: string): boolean;
  
  // Uppdatera textflöde när innehåll eller format ändras
  updateTextFlow(sourceId: string): void;
  
  // Beräkna hur mycket text som får plats i en textruta
  calculateTextCapacity(textbox: TextObject): number;
  
  // Dela text vid given kapacitetsgräns
  splitTextAtCapacity(text: string, capacity: number): { 
    visibleText: string, 
    overflowText: string 
  };
  
  // Hitta alla länkade textrutor i en kedja
  getLinkedChain(startTextboxId: string): TextObject[];
  
  // Rendera specialindikatorer för flöde (pilar, ikoner)
  renderLinkIndicators(): void;
}
```

## 3. Implementationsstrategi

För att hantera komplexiteten i textflödesimplementationen, kommer vi att utveckla funktionaliteten i fyra faser:

### 3.1. Fas 1: Grundläggande textflöde (Sprint 7, vecka 1)

#### Deluppgifter:
1. **Utöka textobjektmodellen** (0.5 dag)
   - Lägga till linkedObjectId och relaterade attribut
   - Uppdatera serialisering/deserialisering för att bevara länkar

2. **Skapa länkningsverktyg i UI** (1 dag)
   - Implementera knapp i verktygspaletten
   - Skapa visuell indikation i muspekaren för länkningsläge
   - Hantera klick för att välja käll- och måltextrutor

3. **Implementera grundläggande TextFlowManager-klass** (1 dag)
   - Länka/avlänka textrutor
   - Hantering av textrutornas kopplingsdata
   - Basala event listeners för textändringar

4. **Utveckla textkapacitetsberäkning** (2 dagar)
   - Implementera algoritm för att mäta texthöjd
   - Beräkna hur många tecken/rader som får plats
   - Hantera olika typsnitt och textstilar

5. **Visuell representation av länkar** (0.5 dag)
   - Rita pil eller linje mellan länkade textrutor
   - Visuell indikation på över-/underflöde

#### Leverabler:
- Grundläggande länkning mellan två textrutor på samma sida
- Simpel flödesalgoritm utan avancerad radbrytningshantering
- Visuell representation av länkar

### 3.2. Fas 2: Förbättrad textberäkning och uppdatering (Sprint 7, vecka 2)

#### Deluppgifter:
1. **Förbättrad textflödesalgoritm** (2 dagar)
   - Implementera korrekt radbrytning
   - Hantera stycken och formatering
   - Optimera för prestanda

2. **Uppdateringsmekanism för flödeskedja** (1.5 dagar)
   - Implementera rekursiv uppdatering genom hela kedjan
   - Hantera ändring i mitten av en kedja
   - Optimera för att minimera onödiga uppdateringar

3. **Persistenta textlänkar** (1 dag)
   - Säkerställa att länkar sparas korrekt
   - Återskapa länkar vid dokumentladdning
   - Hantera länkade objekt över flera sidor

4. **UI för att hantera textflöde** (1 dag)
   - Egenskapskontrollen för textlänkar
   - Visa överflödesindikator
   - Gränssnitt för att bryta länkar

5. **Bastest och buggfixar** (0.5 dag)
   - Testa olika scenarier
   - Fixa initiala buggar

#### Leverabler:
- Robust textflödesberäkning som korrekt hanterar radbrytning
- UI för att hantera länkar
- Stöd för kedjade textrutor (A→B→C)

### 3.3. Fas 3: Sidöverskridande textflöde (Sprint 8, vecka 1)

#### Deluppgifter:
1. **Utöka datamodellen för sidövergripande referenser** (1 dag)
   - Uppdatera dokumentmodell för att stödja sidreferenser
   - Lagra och återställa länkinformation mellan sidor

2. **Implementera sidöverskridande flödeshantering** (2 dagar)
   - Skapa mekanism för att hantera textrutor på olika sidor
   - Utveckla uppdateringsalgoritm som kan hoppa mellan sidor
   - Hantera sidnavigering och textflödesuppdatering

3. **Optimera canvas-rendering för textflöde** (1.5 dagar)
   - Minimera renderingkostnader vid textuppdatering
   - Effektiv hantering av stora textmassor
   - Stödhantere för sidbyte under flödesuppdatering

4. **UI för sidöverskridande länkar** (1 dag)
   - Visuell representation av länkar till andra sidor
   - Navigationsgränssnitt för att följa textflöde

#### Leverabler:
- Fullt fungerande textflöde över flera sidor
- Visuella indikatorer för sidöverskridande länkar
- Optimerad rendering och prestanda

### 3.4. Fas 4: Optimering och avancerade funktioner (Sprint 8, vecka 2)

#### Deluppgifter:
1. **Prestandaoptimering** (1.5 dagar)
   - Profiling av textflödesalgoritmen
   - Optimering av flaskhalsar
   - Lazy-beräkning av textflöde när möjligt

2. **Avancerad textformateringshantering** (2 dagar)
   - Korrekt hantering av mixad formatering
   - Stöd för textkolumner inom textruta
   - Hantera speciella tecken och avstavning

3. **Förbättrade UI-kontroller** (1 dag)
   - Visuella indikatorer för textflödesstatus
   - Drag-and-drop för att skapa länkar
   - Kontextuella menyer för länkhantering

4. **Buggfixar och edge-case-hantering** (1.5 dagar)
   - Testa och åtgärda problematiska scenarier
   - Hantera radering av länkade textrutor
   - Felhantering och användaråterkoppling

#### Leverabler:
- Optimerad och robust textflödesfunktionalitet
- Stöd för avancerad formatering
- Användarvänliga kontroller
- Edge-case-hantering

## 4. Tekniska utmaningar och lösningar

### 4.1. Textmätning i Canvas
**Problem**: Att korrekt beräkna exakt hur mycket text som får plats i en textruta med varierande stilar är komplext.

**Lösningar**:
1. Använda Canvas textMetrics API för grundläggande mätning
2. Implementera en inkrementell mätningsalgoritm för radbrytning
3. Skapa en cachad mätningsstrategi för att optimera prestanda
4. Använda offscreen canvas för mätningsoperationer

### 4.2. Hantering av uppdateringar
**Problem**: När text ändras i en textruta måste ändringar propagerera genom hela kedjan av länkade textrutor.

**Lösningar**:
1. Implementera en reaktiv uppdateringsmekanism
2. Skapa en uppdateringskö för att bunta ihop ändringar
3. Använda "dirty flag"-mönster för att minimera beräkningar
4. Optimera för att bara uppdatera påverkade textrutor

### 4.3. Sidöverskridande länkar
**Problem**: Länkar mellan textrutor på olika sidor komplicerar uppdatering och visualisering.

**Lösningar**:
1. Skapa en global TextFlowManager oberoende av enskilda canvas-instanser
2. Implementera referenssystem för textrutor över sidor
3. Utveckla intelligenta indikatorer för sidöverskridande länkar
4. Caching av sidöverskridande textflödesdata

### 4.4. Prestanda med många textrutor
**Problem**: Stora dokument med många länkade textrutor kan orsaka prestandaproblem.

**Lösningar**:
1. Lazy-evaluation av textflöde
2. Inkrementella uppdateringar
3. Prioritera synliga textrutor
4. Använda Web Workers för textberäkningar i bakgrunden

## 5. Testning och kvalitetssäkring

### 5.1. Testscenarier
1. Enkel länk mellan två textrutor
2. Kedjad länk mellan flera textrutor
3. Textflöde över flera sidor
4. Hantering av stora textmängder
5. Mixad formatering och stilar
6. Lägga till/ta bort text i början/mitten/slutet
7. Byta sida under textflödesuppdatering
8. Radera länkade textrutor
9. Ändra storlek på textrutor

### 5.2. Prestandatestning
1. Mäta uppdateringstid för olika textmängder
2. Profiling av minnes- och CPU-användning
3. Testning på olika enheter och webbläsare
4. Stresstest med många länkade textrutor

### 5.3. Edge-cases att testa
1. Tomma textrutor i kedjan
2. Cirkulära länkar (ska förhindras)
3. Extrem formatering (mycket stora eller små fontstorlekar)
4. Icke-standardtecken och unicode
5. Textrutor med otillräcklig storlek
6. Länkoperationer under pågående uppdatering

## 6. Användargränssnittsdetaljer

### 6.1. Länkningsverktyg
- Verktygspalettenknapp med kedjeikon
- När aktivt, ändra muspekare för att indikera länkläge
- Första klick väljer källtextruta (markeras visuellt)
- Andra klick väljer måltextruta och skapar länk

### 6.2. Visuella indikatorer
- Textrutor med överskjutande text får röd markör i nedre högra hörnet
- Länkade textrutor visar små ikoner vid länkpunkter
- Blå pil eller linje mellan länkade textrutor på samma sida
- Specialikon för att indikera textflöde till annan sida

### 6.3. Egenskapspanel
- Länkstatus i egenskapspanelen för textrutor
- Knappar för att skapa/bryta länk
- Navigation till källruta och målruta
- Information om överskjutande text

## 7. Risker och fallback-strategier

### 7.1. Risker
1. **Komplexitet i textflödesalgoritm**: Kan ta längre tid än förväntat
2. **Prestandaproblem med stora textmassor**: Kan påverka användarupplevelsen
3. **Sidöverskridande länkar är tekniskt utmanande**: Kan skapa oväntade buggar
4. **Inkonsekvent renderade i olika webbläsare**: Kan påverka textmätning

### 7.2. Fallback-strategier
1. **Förenklad fas 1-implementation**: Leverera basalt textflöde om avancerad implementation tar för lång tid
2. **Begränsad kedjelängd**: Implementera en max-gräns för antal länkade textrutor
3. **Stegvis lansering**: Börja med på-samma-sida-funktionalitet och lägg till sidöverskridande senare
4. **Manuell textavdelning**: Erbjud manuella kontroller som alternativ till automatiskt flöde

## 8. Implementationsschema

| Vecka | Sprint | Fas | Huvudaktiviteter | Milstolpe |
|-------|--------|-----|------------------|-----------|
| 12 | 7 (v1) | 1 | Länkningslogik, grundläggande flöde | Fungerande textlänkning |
| 13 | 7 (v2) | 2 | Förbättrad algoritm, kedjehantering | Robust flöde inom en sida |
| 14 | 8 (v1) | 3 | Sidöverskridande flöde | Flöde över flera sidor |
| 14 | 8 (v2) | 4 | Optimering, avancerade funktioner | Komplett textflödesfunktionalitet |

## 9. Beroenden

### 9.1. Tekniska beroenden
- Välfungerande canvas-rendering
- Stabil sidnavigering och -hantering
- Korrekt dokumentmodell för flera sidor
- Tillförlitlig textrendering i Fabric.js

### 9.2. Personalberoenden
- Senior frontend-utvecklare med erfarenhet av texthantering
- UX-designer för gränssnittskomponenter
- Tester för omfattande kvalitetssäkring

## 10. Acceptanskriterier

För att textflödesfunktionen ska anses komplett måste följande kriterier uppfyllas:

1. Text flödar automatiskt från en textruta till nästa när den första är full
2. Ändringar i text eller formatering uppdaterar flödet genom hela kedjan
3. Textflöde fungerar korrekt över flera sidor
4. Visuella indikatorer visar tydligt länkstatus och flödesriktning
5. Användare kan enkelt länka, avlänka och hantera textrutor
6. Prestanda är acceptabel även med många länkar
7. Alla testscenarier klaras utan fel
8. Textflödesdata sparas och laddas korrekt med dokument