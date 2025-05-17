# Mallsidor (Master Pages) Implementeringsplan
## 2025-05-17

Detta dokument beskriver implementeringsplanen för mallsidor i den webbaserade InDesign-ersättaren. Mallsidor är en väsentlig funktionalitet för att skapa konsekvent design över multipla sidor i publikationer.

## 1. Översikt

Mallsidor (Master Pages) möjliggör för användare att skapa och hantera återanvändbara layoutelement som automatiskt appliceras på dokument. Detta är särskilt viktigt för tidningar och publikationer med konsekvent header, footer och andra återkommande element.

### 1.1. Kärnsyfte
- Skapa återanvändbara layoutelement för konsekvent design över dokumentet
- Spara tid genom att automatisera placering av återkommande element
- Säkerställa enhetlig visuell identitet i publikationer
- Möjliggöra globala ändringar från en central plats

### 1.2. Målbeteende
- Användare kan skapa och redigera mallsidor
- Mallsidor kan appliceras på dokumentsidor
- Element från mallsidor visas på dokumentsidor men kan inte direkt manipuleras
- Ändringar i en mallsida propagererar automatiskt till alla sidor som använder den
- Användare kan skapa överrides för att anpassa enskilda sidor

## 2. Användarupplevelse

### 2.1. Mallsidearbetsflöde
1. Användaren klickar på "Mallsidor" i sidpanelen
2. En lista över tillgängliga mallsidor visas
3. Användaren kan skapa en ny mallsida eller redigera en befintlig
4. I mallsidesredigeringsläge lägger användaren till element som ska återanvändas
5. När mallsidan är redo, kan användaren applicera den på en eller flera dokumentsidor
6. Mallsidesobjekt visas på dokumentsidor med en visuell indikator
7. Användaren kan skapa överrides genom att låsa upp specifika mallsidesobjekt

### 2.2. UI-komponenter

#### 2.2.1. Mallsidepanel
```
+-------------------------------------+
| MALLSIDOR                          |
|-------------------------------------|
| + [A-Huvud]                        |
|   Standardmall med header/footer   |
|                                    |
| + [B-Innehåll]                     |
|   Innehållsmall med två kolumner   |
|                                    |
| + [C-Bild]                         |
|   Mall för bildsidor               |
|                                    |
| + [Ny mallsida...]                 |
+-------------------------------------+
```

#### 2.2.2. Mallsideapplicering
```
+-------------------------------------+
| Applicera mallsida                  |
|-------------------------------------|
| Välj mallsida:                      |
| O [A-Huvud]                         |
| @ [B-Innehåll]                      |
| O [C-Bild]                          |
| O [Ingen]                           |
|                                     |
| Applicera på:                       |
| O Aktuell sida                      |
| @ Valda sidor (1,3,5-8)             |
| O Alla sidor                        |
|                                     |
| [ ] Bevara lokala överrides         |
|                                     |
| [Avbryt]  [Applicera]               |
+-------------------------------------+
```

#### 2.2.3. Mallsidesobjekt på dokumentsida
- Mallsidesobjekt visas med ljusgrå ram för att indikera att de kommer från en mallsida
- När muspekaren hovrar över ett mallsidesobjekt visas en låsikon
- Kontextmeny för mallsidesobjekt med alternativ som "Lås upp på denna sida"

## 3. Datamodell

### 3.1. MasterPage modell
```typescript
interface MasterPage {
  id: string;
  name: string;
  description: string;
  based_on: string | null;  // ID för eventuell parent mall
  canvas_data: any;  // Fabric.js JSON-representation
  objects: MasterPageObject[];
  created: Date;
  modified: Date;
}

interface MasterPageObject {
  id: string;
  type: string;  // text, image, shape, etc.
  properties: any;  // Objektegenskaper
  locked: boolean;
  editable_properties: string[];  // Egenskaper som kan överridas (t.ex. "content" för text)
  page_overrides: Map<string, any>;  // Map av page_id -> overrides
}
```

### 3.2. Page modell (utökad)
```typescript
interface Page {
  id: string;
  master_page_id: string | null;
  canvas_data: any;  // Fabric.js JSON-representation
  overridden_objects: Map<string, boolean>;  // Map av master_object_id -> is_overridden
  user_objects: any[];  // Användarens egna objekt, inte från mallsidor
}
```

### 3.3. Document modell (utökad)
```typescript
interface Document {
  // Befintliga fält...
  master_pages: MasterPage[];
  default_master_page_id: string | null;
}
```

## 4. Implementationsplan

### 4.1. Fas 1: Grundläggande Mallside-Arkitektur (Sprint 8, Vecka 1 - 3 dagar)

#### 4.1.1. Datamodell och lagring
- Utöka dokumentmodellen med mallsidestöd
- Implementera mallsidelagring i IndexedDB
- Skapa CRUD-operationer för mallsidor

#### 4.1.2. Mallsidesredigeringsläge
- Implementera växling mellan dokument- och mallsidesredigering
- Skapa visuell indikator för mallsidesredigeringsläge
- Anpassa verktygspalett för mallsidesredigering

#### 4.1.3. Mallsidesobjekthantering
- Utveckla system för att flagga objekt som mallsidesobjekt
- Implementera egenskaper för att styra överridbarhet
- Skapa serialisering/deserialisering för mallsidesobjekt

**Leverabler:**
- Grundläggande datastruktur för mallsidor
- Möjlighet att skapa och redigera mallsidor
- Stöd för att spara mallsidor med dokument

### 4.2. Fas 2: Mallsidesapplikation (Sprint 8, Vecka 1 - 3 dagar)

#### 4.2.1. Applikationsmekanism
- Implementera logic för att applicera en mallsida på en dokumentsida
- Utveckla rendering-pipeline för mallsidesobjekt
- Skapa UI för att applicera mallsidor på sidor

#### 4.2.2. Visuell representation
- Implementera visuella indikatorer för mallsidesobjekt
- Skapa lås/låsupp-UI för mallsidesobjekt
- Utveckla kontextmenyer för mallsidesobjekt

#### 4.2.3. Mallsidesuppdateringar
- Implementera uppdateringsmekanism när mallsidor ändras
- Utveckla notifikationssystem för mallsidesuppdateringar
- Hantera konflikter mellan mallsidor och dokumentsidor

**Leverabler:**
- Fullt fungerande applicering av mallsidor
- Visuella indikatorer för mallsidesobjekt
- Mallsidesobjekt synliga på dokumentsidor

### 4.3. Fas 3: Överrides och Avancerade Funktioner (Sprint 8, Vecka 2 - 4 dagar)

#### 4.3.1. Överridessystem
- Implementera överridesmekanism för mallsidesobjekt
- Utveckla UI för att hantera överrider
- Skapa persistensmodell för överrider

#### 4.3.2. Mallsideshierarki
- Implementera baserade mallsidor (mallsidor baserade på andra mallsidor)
- Utveckla arvsmodell för mallsidesobjekt
- Skapa UI för att hantera mallsideshierarki

#### 4.3.3. Automatisk uppdatering
- Implementera automatisk uppdatering av sidor när mallsidor ändras
- Utveckla batchoperation för globala mallsidesändringar
- Optimera prestanda för stora dokument

**Leverabler:**
- Fullt funktionellt överridessystem
- Mallsideshierarki och arv
- Automatisk uppdatering av alla sidor vid mallsidesändringar

## 5. Tekniska Utmaningar och Lösningar

### 5.1. Rendering av mallsidesobjekt
**Problem**: Mallsidesobjekt måste renderas på dokumentsidor men ska inte vara direkt manipulerbara.

**Lösningar**:
1. Fabric.js-objekt med speciella egenskaper (selectable: false, hasControls: false)
2. Speciallager för mallsidesobjekt som renderas separat
3. Visuell differentiation genom genomskinlighet eller outlining

### 5.2. Hantering av överrider
**Problem**: När användare "låser upp" ett mallsidesobjekt måste vi hantera både mallsidesversion och den anpassade versionen.

**Lösningar**:
1. Klona mallsidesobjektet och behåll referens till originalet
2. Flagga objektet som "overridden" i sidans datamodell
3. Vid mallsidesuppdateringar, intelligenta uppdateringar som bevarar överrider

### 5.3. Prestanda med många mallsidesobjekt
**Problem**: Dokument med många sidor och mallsidesobjekt kan bli prestandakrävande.

**Lösningar**:
1. Lazy loading av mallsidesobjekt
2. Objektpooling för att återanvända strukturer
3. Effektiv diffhantering vid uppdateringar

### 5.4. Versionshantering och konflikter
**Problem**: När mallsidor uppdateras kan det leda till konflikter med användarändringar.

**Lösningar**:
1. Versionsmärkning av mallsidor
2. Diffhantering för att identifiera konflikter
3. Konfliktlösningsdialog när kritiska ändringar upptäcks

## 6. UI och Interaktionsdesign

### 6.1. Mallsidepanel
- Placerad i sidnavigeraren med dedikerad sektion
- Visa miniatyrer av mallsidor
- Drag-and-drop funktion för att applicera på sidor
- Kontextmeny för vanliga mallsidesoperationer

### 6.2. Mallsidesredigeringsläge
- Tydlig visuell indikering när i mallsidesredigeringsläge
- Speciell bakgrund för att differentiera från normal redigering
- Banner överst i redigeringsytan som visar aktuell mallsida
- Enkel navigering mellan mallsidor

### 6.3. Mallsidesobjektindikationer
- Ljusgrå ram runt mallsidesobjekt
- Låsikon när muspekare hovrar över
- Kontextmeny med "Lås upp på denna sida"
- Visuell förändring när objekt låsts upp (ram blir blå)

## 7. Testningsstrategi

### 7.1. Funktionalitetstestning
1. Skapa, redigera och ta bort mallsidor
2. Applicera mallsidor på enskilda sidor och sidräckvidd
3. Överriding av mallsidesobjekt
4. Hantering av mallsideshierarki
5. Uppdatering av mallsidor och propagering av ändringar

### 7.2. Prestandatestning
1. Dokument med många sidor som använder mallsidor
2. Mallsidor med många objekt
3. Hastighet för applicering av mallsidor på multipla sidor
4. Minnesanvändning vid redigering av stora dokument

### 7.3. Edge Case-testning
1. Byta mallsida på sidor med överrider
2. Ta bort en mallsida som används av dokumentsidor
3. Konflikterande ändringar i mallsida vs. överrideobjekt
4. Djup nästlade mallsideshierarkier

## 8. Risker och Fallbackstrategier

### 8.1. Identifierade risker
1. **Komplexitet i rendering**: Svårt att korrekt kombinera mallsides- och sidobjekt
2. **Prestandaproblem**: Stora dokument med många mallsidor kan bli långsamma
3. **Användarförvirring**: Koncept med låsta/olåsta mallsidesobjekt kan vara förvirrande
4. **Datakorruption**: Risk för felaktig hantering av referenser mellan sidor och mallsidor

### 8.2. Fallbackstrategier
1. **Förenklad första version**: Implementera basversion utan överrider eller hierarki först
2. **Alternativ representation**: Använda en enklare visuell modell för mallsidesobjekt
3. **Tydliga hjälptexter**: Skapa exceptionellt tydlig UI med vägledning
4. **Robust datahantering**: Extra validering och versionshantering av mallsidesdata

## 9. Implementationsschema

| Dag | Aktivitet | Beskrivning | Status |
|-----|-----------|-------------|--------|
| 1 | Datamodell | Implementera grundläggande datastrukturer för mallsidor | ✅ Slutförd |
| 1 | Redigeringsläge | Skapa växling mellan dokument- och mallsidesredigering | ✅ Slutförd |
| 2 | Objekthantering | Implementera mallsidesobjektflaggor och egenskaper | ✅ Slutförd |
| 2-3 | Appliceringsmekanism | Utveckla system för att applicera mallsidor på dokumentsidor | ✅ Slutförd |
| 3-4 | Visuell representation | Implementera visuella indikatorer och UI | ✅ Slutförd |
| 5 | Överridessystem | Utveckla grundläggande överridesmekanismer | ✅ Slutförd |
| 6 | Mallsideshierarki | Implementera mallsider baserade på andra mallsidor | ✅ Slutförd |
| 7 | Uppdateringsmekanismer | Skapa system för automatisk uppdatering vid mallsidesändringar | ✅ Slutförd |
| 8 | Testning | Omfattande testning och buggfixar | ✅ Slutförd |

## 12. Implementationsstatusar och lösningar

### 12.1. Slutförda funktioner
Mallsidesfunktionaliteten är nu fullt implementerad med:

- Komplett datamodell och IndexedDB-lagring
- UI för att skapa, redigera och hantera mallsidor
- Applicering av mallsidor på dokumentsidor
- Visuella indikatorer för mallsidesobjekt
- Kraftfull överridesfunktionalitet
- Automatisk uppdatering vid mallsidesändringar

### 12.2. Lösta utmaningar
Vi har framgångsrikt löst flera utmaningar:

1. **Rendering av mallsidesobjekt** - Implementerat med Fabric.js-objekt med speciella egenskaper som markerar dem som mallsidesobjekt, inklusive visuella indikatorer.

2. **Överrides och sidupploadning** - Löst ett kritiskt problem där objekt försvann vid sidbyte genom implementeringen av mer robusta laddningsmekanismer. Lösningen omfattar:
   - Direkt IndexedDB-åtkomst för att garantera användning av senaste data
   - Manuell objektskapning utan beroende av problematiska Fabric.js-funktioner
   - Förbättrad sidladdningslogik med noggrann kontroll av objektsynlighet

3. **Prestanda med många objekt** - Optimerat renderingen för bättre prestanda, särskilt vid arbete med multipla mall- och dokumentsidor.

### 12.3. Nästa steg
Trots att mallsidesfunktionaliteten är slutförd finns det ytterligare förbättringsmöjligheter:

- **Template-bibliotek** - Utveckla ett delat bibliotek av återanvändbara mallar
- **Ytterligare optimering** - Förbättra prestandan för mycket stora dokument
- **Förbättrad UX** - Ytterligare förbättringar av användargränssnittet för ökad intuitivitet

## 10. Beroenden och integrationspunkter

### 10.1. Tekniska beroenden
- Välfungerande canvas-hantering med Fabric.js
- Robust sidnavigering
- Välfungerande objekthantering
- Stabil lagringsmekanism (IndexedDB)

### 10.2. Integrationspunkter
- Sidnavigatorn för att visa och hantera mallsidor
- Canvas renderer för att hantera speciella mallsidesobjekt
- Dokumentmodell för lagring och hantering
- Toolbar som anpassas till mallsidesredigeringsläge

## 11. Acceptanskriterier

För att mallsidesfunktionen ska anses komplett måste följande kriterier uppfyllas:

1. Användare kan skapa, redigera och ta bort mallsidor
2. Mallsidor kan appliceras på en eller flera dokumentsidor
3. Mallsidesobjekt visas korrekt på dokumentsidor med tydlig visuell indikering
4. Ändringar i mallsidor propagerar automatiskt till alla applicerade sidor
5. Användare kan skapa överrider för specifika mallsidesobjekt på enskilda sidor
6. Mallsidor kan baseras på andra mallsidor (hierarki)
7. Mallsidor bevaras korrekt när dokument sparas och öppnas igen
8. Prestandan påverkas inte signifikant i dokument med många sidor
9. Användargränssnittet är intuitivt och tydligt kring mallsideskonceptet
10. Konflikter och kantsituationer hanteras gracefully med tydliga användarmeddelanden