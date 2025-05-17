# UI Design Guide för Webbaserad InDesign-ersättare
## 2025-05-17

Detta dokument beskriver principerna, komponenterna och layouten för användargränssnittet i den webbaserade InDesign-ersättaren. Guiden säkerställer en konsekvent och användarvänlig upplevelse genom hela applikationen.

## 1. Design Principer

### 1.1. Enkelhet
- Håll gränssnittet rent och fokuserat på publikationsdesign
- Visa endast relevanta verktyg och alternativ baserat på kontext
- Använd vita ytor för att skapa andrum och tydlighet

### 1.2. Hierarki
- Organisera verktyg efter användningsfrekvens
- Gruppera relaterade funktioner
- Använd visuella ledtrådar (storlek, färg, placering) för att indikera betydelse

### 1.3. Konsekvens
- Använd konsekvent terminologi genom hela applikationen
- Standardisera interaktionsmönster
- Tillämpa enhetlig visuell stil på alla komponenter

### 1.4. Familjäritet
- Följa etablerade konventioner från InDesign där lämpligt
- Använda industristandard ikoner för vanliga funktioner
- Beakta användarnas förväntningar från liknande verktyg

### 1.5. Progressiv avslöjning
- Visa grundläggande funktioner först
- Avslöja avancerade funktioner när de behövs
- Använd kontextuella paneler för att visa relevanta alternativ

## 2. Färgpalett

### 2.1. Primära färger
- **Primär**: `#3B82F6` (Blå) - Huvudaktiveringar, primära knappar
- **Primär hover**: `#2563EB` - Hover-tillstånd för primära element
- **Primär aktiv**: `#1D4ED8` - Aktiva/nedtryckta tillstånd

### 2.2. Sekundära färger
- **Sekundär**: `#6B7280` (Grå) - Sekundära åtgärder, verktygsikonbakgrund
- **Sekundär hover**: `#4B5563` - Hover-tillstånd för sekundära element
- **Sekundär aktiv**: `#374151` - Aktiva/nedtryckta tillstånd

### 2.3. Accentfärger
- **Accent 1**: `#10B981` (Grön) - Positiva åtgärder, slutförande
- **Accent 2**: `#F59E0B` (Orange) - Varningar, ändringar
- **Accent 3**: `#EF4444` (Röd) - Fel, borttagning

### 2.4. Neutrala färger
- **Bakgrund**: `#FFFFFF` - Huvudbakgrund
- **Panel bakgrund**: `#F3F4F6` - Panelbakgrunder, sekundära bakgrunder
- **Border**: `#E5E7EB` - Ränder, avgränsare
- **Text primär**: `#1F2937` - Primär textfärg
- **Text sekundär**: `#6B7280` - Sekundär textfärg, hjälptext
- **Text disabled**: `#9CA3AF` - Inaktiverad text

### 2.5. Canvas-färger
- **Canvas bakgrund**: `#F9FAFB` - Bakgrundsfärg för redigeringsytan
- **Canvas grid**: `#E5E7EB` - Rutnät på redigeringsytan
- **Canvas guides**: `#3B82F6` (Blå) - Hjälplinjer på canvas
- **Canvas selection**: `rgba(59, 130, 246, 0.3)` - Markering på canvas

## 3. Typografi

### 3.1. Typsnittsfamiljer
- **UI Typsnitt**: Inter - Används för all UI text
- **Monospace**: JetBrains Mono - För kodblock, mått etc.

### 3.2. Textstorlekar
- **XS**: 12px - Mycket liten text, fotnoter
- **S**: 14px - Mindre text, sekundära etiketter
- **M**: 16px - Standardtext, de flesta etiketter
- **L**: 18px - Större text, sektionsrubriker
- **XL**: 20px - Mycket stor text, huvudrubriker
- **XXL**: 24px - Extra stor text, sidrubriker

### 3.3. Textvikter
- **Regular**: 400 - Normal text
- **Medium**: 500 - Betonade element
- **Semibold**: 600 - Rubriker, viktiga element
- **Bold**: 700 - Mycket viktiga element

## 4. Komponenter

### 4.1. Knappar

#### 4.1.1. Primär knapp
- Bakgrund: Primär färg
- Text: Vit
- Border radius: 6px
- Padding: 8px 16px
- Hover: Primär hover färg
- Aktiv: Primär aktiv färg

#### 4.1.2. Sekundär knapp
- Bakgrund: Vit
- Text: Primär färg
- Border: 1px solid Primär färg
- Border radius: 6px
- Padding: 8px 16px
- Hover: 10% försvagad primär färg som bakgrund
- Aktiv: 20% försvagad primär färg som bakgrund

#### 4.1.3. Tertiary Button
- Bakgrund: Transparent
- Text: Primär färg
- Border: Ingen
- Padding: 8px 16px
- Hover: 10% försvagad primär färg som bakgrund
- Aktiv: 20% försvagad primär färg som bakgrund

#### 4.1.4. Ikon knapp
- Bakgrund: Transparent
- Ikon: Primär färg
- Border radius: 6px
- Padding: 8px
- Hover: 10% försvagad primär färg som bakgrund
- Aktiv: 20% försvagad primär färg som bakgrund

### 4.2. Inputfält

#### 4.2.1. Text input
- Bakgrund: Vit
- Text: Text primär
- Border: 1px solid Border
- Border radius: 6px
- Padding: 8px 12px
- Focus: Border 2px solid Primär färg

#### 4.2.2. Numeriskt input
- Samma som Text input
- Inkluderar upp/ner pilar för ökning/minskning

#### 4.2.3. Dropdown
- Samma som Text input
- Inkluderar nedåtpil för att indikera dropdown

### 4.3. Paneler

#### 4.3.1. Verktygspanel
- Bakgrund: Panel bakgrund
- Border: 1px solid Border
- Vertikalt orienterad med ikoner
- Tool groups med expanderbar funktionalitet

#### 4.3.2. Egenskapspanel
- Bakgrund: Panel bakgrund
- Border: 1px solid Border
- Grupperade sektioner för relaterade egenskaper
- Expanderande/kollapsbara sektioner

#### 4.3.3. Sidpanel
- Bakgrund: Panel bakgrund
- Border: 1px solid Border
- Visar miniatyrer av sidor
- Drag & drop för sidordning

### 4.4. Modals och dialogs

#### 4.4.1. Standard Modal
- Bakgrund: Vit
- Border radius: 8px
- Drop shadow
- Titelområde överst
- Innehållsområde i mitten
- Knapprad i botten

#### 4.4.2. Alert Modal
- Samma som Standard Modal
- Färgkodad baserat på varningstyp (info, framgång, varning, fel)

### 4.5. Tooltips
- Bakgrund: Text primär
- Text: Vit
- Border radius: 4px
- Padding: 4px 8px
- Visas vid hover över element

## 5. Layout

### 5.1. Huvudgränssnittet

```
+------------------------------------------------+
|                  App Header                     |
+------------------------------------------------+
|        |                          |            |
|        |                          |            |
|        |                          |            |
| Tools  |       Canvas Area        | Properties |
| Panel  |                          | Panel      |
|        |                          |            |
|        |                          |            |
|        |                          |            |
+--------+--------------------------+------------+
|                Page Navigator                  |
+------------------------------------------------+
```

### 5.2. Verktygspalett (vänster)
- Fast bredd på 60px
- Vertikalt orienterad
- Grupperingsfunktionalitet för verktyg
- Ikonbaserad med tooltips

```
+--------+
| Select |
+--------+
| Text   |
+--------+
| Image  |
+--------+
| Shape  |
+--------+
| ...    |
+--------+
```

### 5.3. Egenskapspanel (höger)
- Fast bredd på 300px
- Kontextuell baserat på valt objekt/verktyg
- Grupperade egenskaper i expanderbara sektioner

```
+------------------+
| Text Properties  |
+------------------+
| Font: Arial     ▼|
| Size: 12pt      ▼|
| Bold   Italic    |
| Color: #000000  ▼|
+------------------+
| Paragraph       ▼|
+------------------+
| Position & Size ▼|
+------------------+
```

### 5.4. Canvas-området (mitten)
- Dynamisk bredd (anpassningsbar)
- Zoom-kontroller i nedre högra hörnet
- Rulers på toppen och vänster sida
- Bakgrundsmönster för papper med skugga

### 5.5. Sidnavigator (botten)
- Fast höjd på 120px
- Horisontellt scrollbar
- Miniatyrer av sidor
- Funktionalitet för att lägga till, ta bort och omorganisera sidor

```
+-------+-------+-------+-------+-------+
|  p.1  |  p.2  |  p.3  |  p.4  |  + ↓  |
+-------+-------+-------+-------+-------+
```

## 6. Interaktioner och States

### 6.1. Urval (Selection)
- Markerat objekt: blå kontur med handtag för storlek, rotation
- Flera markerade objekt: blå kontur runt hela selektionen + individuella konturlinjer
- Gruppselektion: indikeras med annorlunda stil på konturen

### 6.2. Hover States
- Knappar: färgändring
- Verktygsikoner: subtil bakgrundsfärg
- Objekt på canvas: cursor-ändring baserat på möjlig interaktion

### 6.3. Drag & Drop
- Transparens under dragning
- Visuell indikation på destinationen
- Animerad övergång när objekt släpps

### 6.4. Feedback
- Snabbmeddelanden för åtgärdsbekräftelse
- Färgkodade alerts (röd för fel, gul för varning, grön för framgång)
- Laddningsindikatorer för långvariga processer

## 7. Ikoner och visuella element

### 7.1. Ikonbibliotek
- Materialsymboler (Outlined) som primärt ikonbibliotek
- Konsekvent ikonvikt och stil
- SVG-format för skärpa i alla upplösningar

### 7.2. Vanliga ikoner
- **Select**: Pil
- **Text**: T-ikon
- **Image**: Bildram
- **Rectangle**: Rektangel
- **Ellipse**: Cirkel
- **Line**: Linje
- **Move Forward**: Lager framåt
- **Move Backward**: Lager bakåt
- **Group**: Gruppera
- **Ungroup**: Avgruppera
- **Zoom**: Förstoring
- **Pan**: Hand
- **Link**: Kedjor
- **Align**: Justeringslinjer

### 7.3. Visuella indikatorer
- **Rutnät**: Ljusgrå linjer
- **Hjälplinjer**: Blå linjer
- **Marginaler**: Magenta streckade linjer
- **Kolumner**: Lila streckade linjer
- **Länkade objekter**: Blå pil mellan länkade objekt
- **Låsta objekt**: Hänglåsikon

## 8. Responsivitet och Tillgänglighet

### 8.1. Skärmstorlekar
- Primär design för skärmar 1280px och större
- Adaptiv design för mindre skärmar
- Möjlighet att kollapsa/expandera paneler för mer arbetsyta

### 8.2. Tillgänglighetsprinciper
- Färgkontrast som uppfyller WCAG 2.1 AA-standard
- Tillgängliga etiketter för skärmläsare
- Tangentbordsnavigering för alla funktioner
- Anpassningsbar fontstorlek i UI

### 8.3. Anpassningar
- Ljust och mörkt tema
- Konfigurerbar panelpositionering
- Anpassningsbara kortkommandon