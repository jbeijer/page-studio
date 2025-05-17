# MVP Funktionsspecifikation för Webbaserad InDesign-ersättare
## 2025-05-17

Detta dokument definierar de minimala funktionerna som ska ingå i den första versionen (MVP - Minimum Viable Product) av den webbaserade InDesign-ersättaren. Syftet är att etablera en tydlig avgränsning för att säkerställa att vi levererar en funktionell produkt inom tidsplanen.

## 1. Målsättning för MVP

MVPn ska uppfylla följande mål:
1. Möjliggöra för användare att skapa enkla flersidiga medlemstidningar
2. Tillhandahålla grundläggande text- och bildhantering
3. Leverera en intuitiv och användarvänlig upplevelse
4. Exportera dokument i PDF-format med acceptabel kvalitet
5. Spara och återöppna projekt

## 2. Kärnfunktioner för MVP

### 2.1. Dokumenthantering

#### Måste ha:
- [x] Skapa nytt dokument med fördefinierade storlekar (A4, A5)
- [x] Spara dokument lokalt (IndexedDB)
- [x] Öppna tidigare sparade dokument
- [x] Exportera till PDF (rasterbaserad version)
- [x] Hantera metadata (titel, skapare, datum)

#### Kommer senare:
- [ ] Avancerade dokumentinställningar (bleed, slug)
- [ ] Molnlagring och synkronisering
- [ ] Vektorbaserad PDF-export
- [ ] Dokumentimport från andra format

### 2.2. Sidhantering

#### Måste ha:
- [x] Stöd för multipla sidor
- [x] Navigering mellan sidor
- [x] Lägga till och ta bort sidor
- [x] Grundläggande sidordning

#### Kommer senare:
- [ ] Mallsidor
- [ ] Sidnumrering och sektioner
- [ ] Avancerad sidhantering (sprids, alternativa sidstorlekar)
- [ ] Rotera sidor

### 2.3. Canvas och Arbetsmiljö

#### Måste ha:
- [x] Canvas-baserad WYSIWYG-redigering
- [x] Zoom in/ut
- [x] Grundläggande navigeringsverktyg
- [x] Panorera i canvas
- [x] Ruler (linjal)

#### Kommer senare:
- [ ] Hjälplinjer
- [ ] Avancerade rutnät
- [ ] Anpassningsbara arbetsmiljöer
- [ ] Flera vyer

### 2.4. Texthantering

#### Måste ha:
- [x] Skapa och redigera textrutor
- [x] Grundläggande textformatering (storlek, typsnitt, stil)
- [x] Textjustering (vänster, centrerat, höger, justified)
- [x] Grundläggande typsnittsstöd
- [x] Kopiera/klistra in text

#### Kommer senare:
- [ ] Textflöde mellan kopplade textrutor
- [ ] Avancerad typografi (kerning, tracking)
- [ ] Kolumner inom textrutor
- [ ] Textkonturering runt objekt
- [ ] Stilmallar

### 2.5. Bildhantering

#### Måste ha:
- [x] Importera bilder (JPG, PNG)
- [x] Storleksändra och rotera bilder
- [x] Positionera bilder på canvas
- [x] Enkla bildbeskärningsverktyg

#### Kommer senare:
- [ ] Bildbibliotek
- [ ] Avancerad bildhantering (masker, effekter)
- [ ] Stöd för fler filformat (SVG, TIFF)
- [ ] Bildlänkning

### 2.6. Formverktyg

#### Måste ha:
- [x] Rektanglar och fyrkanter
- [x] Cirklar och ellipser
- [x] Grundläggande linjer
- [x] Färg- och kantinställningar

#### Kommer senare:
- [ ] Avancerade former (polygoner, stjärnor)
- [ ] Kurvor och pennverktyg
- [ ] Gradientfyllningar
- [ ] Pathfinder-operationer

### 2.7. Objekthantering

#### Måste ha:
- [x] Välja och manipulera objekt
- [x] Flytta, skala och rotera objekt
- [x] Ordna objekt (framåt/bakåt)
- [x] Låsa objekt

#### Kommer senare:
- [ ] Gruppering och avgruppering
- [ ] Alignment och distribution
- [ ] Objekt-replikering
- [ ] Transformationspaneler

### 2.8. Färghantering

#### Måste ha:
- [x] Grundläggande färgväljare
- [x] RGB-färgsupport
- [x] Opacitetskontroll
- [x] Spara de senast använda färgerna

#### Kommer senare:
- [ ] CMYK-färgstöd
- [ ] Färgbibliotek
- [ ] Avancerade färgsystem (Pantone)
- [ ] Anpassade färgpaletter

### 2.9. Ångra och Gör om

#### Måste ha:
- [x] Grundläggande ångra/gör om-funktionalitet
- [x] Flera nivåer av historik

#### Kommer senare:
- [ ] Ångra per objekt
- [ ] Sparade historikstater
- [ ] Anpassningsbar historikdjup

### 2.10. Användargränssnitt

#### Måste ha:
- [x] Verktygspanel
- [x] Egenskapspanel
- [x] Sidnavigator
- [x] Grundläggande kortkommandon

#### Kommer senare:
- [ ] Anpassningsbara paneler
- [ ] Avancerade kortkommandon
- [ ] Mörkt tema
- [ ] Kontextuella menyer

## 3. Användarscenarion som stöds i MVP

### 3.1. Grundläggande sidlayout
En användare ska kunna:
1. Skapa ett nytt A4-dokument
2. Lägga till flera sidor
3. Placera textrutor och bilder på olika sidor
4. Formatera texten med grundläggande stilar
5. Spara dokumentet lokalt
6. Exportera till PDF

### 3.2. Enkel medlemstidning
En användare ska kunna:
1. Skapa ett 8-sidigt dokument
2. Importera bilder på specifika positioner
3. Lägga till och formatera textrutor
4. Använda enkel grafik (linjer, rutor, former)
5. Navigera mellan sidor för att redigera innehåll
6. Exportera den färdiga tidningen till PDF

### 3.3. Enkel affisch/flyer
En användare ska kunna:
1. Skapa ett enkelsidigt dokument
2. Anpassa bakgrundsfärg eller lägga till bakgrundsbild
3. Placera text i varierande stilar
4. Importera och positionera bilder 
5. Lägga till grafiska element (former, linjer)
6. Exportera till tryckfärdig PDF

## 4. Avgränsningar för MVP

För att tydliggöra omfattningen listar vi funktioner som specifikt ligger utanför MVP-versionen:

### 4.1. Exkluderade funktioner
- Textflöde mellan kopplade textrutor
- Mallsidor
- Avancerad typografisk kontroll
- Stilmallar
- Hjälplinjer och avancerade rutnät
- Vektorbaserad PDF-export
- Molnlagring
- Samarbetsfunktioner
- Import av InDesign-filer
- Avancerad bildhantering (masker, effekter)
- CMYK-färghantering
- Automatiskt innehållsförteckning

### 4.2. Begränsningar
- Maximalt sidantal: 20 sidor
- Bildstorlek: Rekommenderad max 5MB per bild
- Antal objekt: Optimerat för upp till 50 objekt per sida
- Typsnitt: Endast webbsäkra typsnitt och Google Fonts-integration

## 5. Kvalitetsmål för MVP

### 5.1. Användbarhet
- Nya användare ska kunna skapa ett enkelt dokument inom 10 minuter
- Användare utan InDesign-erfarenhet ska kunna slutföra grundläggande uppgifter utan instruktioner
- UI ska vara intuitiv med tydliga etiketter och ikoner

### 5.2. Prestanda
- Applikationsstart: Under 3 sekunder på genomsnittlig dator
- Sidbyte: Under 1 sekund
- Respons vid objektmanipulation: Omedelbar (< 100ms)
- PDF-export: Under 30 sekunder för ett 10-sidigt dokument

### 5.3. Bildkvalitet
- Text i PDF: Läsbar och skarp
- Bilder i PDF: Bevara originalupplösning upp till 300 DPI
- Utskrift: Acceptabel kvalitet för lokala skrivare

## 6. Feedback och Iteration

MVPn kommer att följas av en feedbackperiod där användardata samlas in för att informera nästa utvecklingscykel. Vi kommer särskilt att fokusera på:

1. Vilka funktioner saknas mest enligt användarna
2. Vilka arbetsflöden som är ineffektiva
3. Prestandaflaskhalsar
4. UX-problem
5. Buggar och oväntade beteenden

## 7. Framtida Roadmap (efter MVP)

### 7.1. Nästa steg (Fas 2)
- Implementera textflöde mellan kopplade textrutor
- Lägga till mallsidefunktionalitet
- Förbättra PDF-exportkvalitet
- Implementera hjälplinjer och avancerade rutnät
- Lägga till stilmallar

### 7.2. Framtida utveckling (Fas 3)
- Vektorbaserad PDF-export
- Avancerad typografi och texteffekter
- CMYK-färgstöd
- Förbättrad bildhantering
- Automatiska funktioner (TOC, index)

## 8. Tekniska beroenden för MVP

För att leverera MVPn krävs följande tekniska komponenter:
1. SvelteKit som applikationsramverk
2. Fabric.js för canvas-manipulation
3. IndexedDB för lokal lagring
4. jsPDF för PDF-generering
5. TailwindCSS för UI-komponenter
6. Webbfonts / Google Fonts-API