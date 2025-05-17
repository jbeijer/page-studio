# Detaljerad Tasklista för Webbaserad InDesign-ersättare
## 2025-05-17

Denna tasklista ger en nedbrytning av alla konkreta arbetsuppgifter som behöver utföras i projektet. Varje uppgift har en uppskattad tidsåtgång och prioritet för att underlätta planering och genomförande.

## Förberedelsefas

### Projektuppsättning
- [ ] Skapa GitHub-repository (30 min) - **PRIO: HÖG**
- [ ] Installera SvelteKit med TypeScript (1 timme) - **PRIO: HÖG**
- [ ] Konfigurera TailwindCSS (1 timme) - **PRIO: HÖG**
- [ ] Installera och konfigurera Fabric.js (1 timme) - **PRIO: HÖG**
- [ ] Installera jsPDF för PDF-generering (30 min) - **PRIO: HÖG**
- [ ] Sätta upp projektmappstruktur (1 timme) - **PRIO: HÖG**
- [ ] Konfigurera eslint och prettier (30 min) - **PRIO: MEDIUM**
- [ ] Etablera CI/CD pipeline (2 timmar) - **PRIO: MEDIUM**

### Design & Prototyp
- [ ] Skapa wireframes för huvudgränssnitt (4 timmar) - **PRIO: HÖG**
- [ ] Designa verktygspanel (2 timmar) - **PRIO: HÖG**
- [ ] Designa egenskapspanel (2 timmar) - **PRIO: HÖG**
- [ ] Designa sidnavigering (1 timme) - **PRIO: HÖG**
- [ ] Skapa grundläggande Svelte stores för global state (2 timmar) - **PRIO: HÖG**
- [ ] Implementera grundläggande layout med TailwindCSS (4 timmar) - **PRIO: HÖG**

## Fas 1: MVP

### Canvas & Grundläggande Objekthantering
- [ ] Implementera Canvas-komponent med Fabric.js (4 timmar) - **PRIO: HÖG**
- [ ] Skapa grundläggande canvas-interaktion (markera, flytta) (4 timmar) - **PRIO: HÖG**
- [ ] Implementera Toolbar-komponent (4 timmar) - **PRIO: HÖG**
- [ ] Skapa verktygsväljarfunktionalitet (2 timmar) - **PRIO: HÖG**
- [ ] Bygga textobjektsverktyg (4 timmar) - **PRIO: HÖG**
- [ ] Implementera bildimportverktyg (4 timmar) - **PRIO: HÖG**
- [ ] Utveckla rektangelverktyg (2 timmar) - **PRIO: HÖG**
- [ ] Implementera linjeverktyg (2 timmar) - **PRIO: MEDIUM**
- [ ] Utveckla formverktyg (cirkel, polygon) (4 timmar) - **PRIO: MEDIUM**
- [ ] Implementera objekt-transformation (rotera, skala) (6 timmar) - **PRIO: HÖG**
- [ ] Skapa funktionalitet för objektlager (framåt/bakåt) (2 timmar) - **PRIO: HÖG**
- [ ] Implementera kopiera/klistra in-funktionalitet (2 timmar) - **PRIO: MEDIUM**
- [ ] Skapa ångra/gör om-funktion (4 timmar) - **PRIO: HÖG**

### Texthantering & Formatering
- [ ] Bygga textredigeringskomponent (6 timmar) - **PRIO: HÖG**
- [ ] Implementera teckensnittsväljare (4 timmar) - **PRIO: HÖG**
- [ ] Utveckla textstorleksväljare (2 timmar) - **PRIO: HÖG**
- [ ] Implementera textjusteringskontroller (2 timmar) - **PRIO: HÖG**
- [ ] Skapa färgväljare för text (4 timmar) - **PRIO: HÖG**
- [ ] Implementera textstilskontroller (fet, kursiv, understruken) (2 timmar) - **PRIO: HÖG**
- [ ] Utveckla radavståndskontrollen (2 timmar) - **PRIO: MEDIUM**
- [ ] Implementera styckeindragskontroller (2 timmar) - **PRIO: MEDIUM**
- [ ] Skapa sparade textstilar (4 timmar) - **PRIO: MEDIUM**

### Dokumenthantering & Multi-Page
- [ ] Skapa datamodell för dokument (2 timmar) - **PRIO: HÖG**
- [ ] Implementera sidmodell (2 timmar) - **PRIO: HÖG**
- [ ] Utveckla sidnavigeringskomponent (4 timmar) - **PRIO: HÖG**
- [ ] Skapa funktionalitet för att lägga till/ta bort sidor (2 timmar) - **PRIO: HÖG**
- [ ] Implementera sidladdning och -sparning (4 timmar) - **PRIO: HÖG**
- [ ] Utveckla IndexedDB-lagring (6 timmar) - **PRIO: HÖG**
- [ ] Bygga dokumentväljare för tidigare dokument (4 timmar) - **PRIO: HÖG**
- [ ] Implementera exportfunktion för enkel PDF (6 timmar) - **PRIO: HÖG**
- [ ] Utveckla autosave-funktionalitet (4 timmar) - **PRIO: MEDIUM**
- [ ] Skapa dokumentmetadata-hantering (titel, skapare, datum) (2 timmar) - **PRIO: MEDIUM**

## Fas 2: Avancerad Layout

### Rutnät & Hjälplinjer
- [ ] Implementera konfigurerbart rutnät (4 timmar) - **PRIO: HÖG**
- [ ] Utveckla horisontell ruler-komponent (4 timmar) - **PRIO: HÖG**
- [ ] Utveckla vertikal ruler-komponent (4 timmar) - **PRIO: HÖG**
- [ ] Skapa dragbara hjälplinjer (6 timmar) - **PRIO: HÖG**
- [ ] Implementera snappning till rutnät (4 timmar) - **PRIO: HÖG**
- [ ] Implementera snappning till hjälplinjer (4 timmar) - **PRIO: HÖG**
- [ ] Utveckla marginal- och spaltinställningar (4 timmar) - **PRIO: HÖG**
- [ ] Skapa visuell indikation för marginaler och spalter (2 timmar) - **PRIO: HÖG**
- [ ] Implementera objekt-alignment verktyg (3 timmar) - **PRIO: MEDIUM**

### Textflöde & Länkade Textrutor
- [ ] Designa datamodell för länkade textrutor (2 timmar) - **PRIO: HÖG**
- [ ] Utveckla algoritm för textflödesberäkning (8 timmar) - **PRIO: HÖG**
- [ ] Implementera länkning mellan textrutor (6 timmar) - **PRIO: HÖG**
- [ ] Skapa visuell indikator för länkade textrutor (3 timmar) - **PRIO: HÖG**
- [ ] Implementera uppdateringsmekanism vid textredigering (6 timmar) - **PRIO: HÖG**
- [ ] Utveckla sidöverskridande textflöde (8 timmar) - **PRIO: HÖG**
- [ ] Implementera textobjektskonfigurering (kolumner, padding) (4 timmar) - **PRIO: MEDIUM**
- [ ] Skapa UI för att länka/avlänka textrutor (4 timmar) - **PRIO: HÖG**
- [ ] Testa och optimera textflödeshantering (8 timmar) - **PRIO: HÖG**

### Mallsidor & Templates
- [ ] Designa mallsidemodell (2 timmar) - **PRIO: HÖG**
- [ ] Implementera mallsidhantering (6 timmar) - **PRIO: HÖG**
- [ ] Utveckla UI för att skapa mallsidor (4 timmar) - **PRIO: HÖG**
- [ ] Skapa funktionalitet för att applicera mallsidor (4 timmar) - **PRIO: HÖG**
- [ ] Implementera låsfunktionalitet för mallsideobjekt (3 timmar) - **PRIO: HÖG**
- [ ] Utveckla mallsideöverrides (6 timmar) - **PRIO: MEDIUM**
- [ ] Skapa template-sparningsfunktionalitet (4 timmar) - **PRIO: HÖG**
- [ ] Implementera template-laddningsfunktionalitet (4 timmar) - **PRIO: HÖG**
- [ ] Utveckla template-bibliotek (6 timmar) - **PRIO: MEDIUM**
- [ ] Skapa mallkategorisering (2 timmar) - **PRIO: LÅG**

## Fas 3: Avancerad Output

### Förbättrad PDF-generering
- [ ] Undersöka vektorbaserade PDF-exportalternativ (4 timmar) - **PRIO: HÖG**
- [ ] Integrera Puppeteer för vektorgenerering (8 timmar) - **PRIO: HÖG**
- [ ] Implementera förbättrad text-rendering i PDF (8 timmar) - **PRIO: HÖG**
- [ ] Utveckla fonthantering för PDF-export (6 timmar) - **PRIO: HÖG**
- [ ] Implementera fontintegrering i PDF (6 timmar) - **PRIO: HÖG**
- [ ] Skapa konfigurationsgränssnitt för PDF-export (4 timmar) - **PRIO: MEDIUM**
- [ ] Optimera bildupplösning för tryck (4 timmar) - **PRIO: HÖG**
- [ ] Implementera färghantering (CMYK-stöd) (8 timmar) - **PRIO: MEDIUM**
- [ ] Utveckla PDF-metadatahantering (2 timmar) - **PRIO: LÅG**
- [ ] Testa och optimera PDF-export (8 timmar) - **PRIO: HÖG**

### Förhandsgranskning & Finslipning
- [ ] Skapa förhandsgranskningsläge (4 timmar) - **PRIO: HÖG**
- [ ] Implementera utskriftssimuleringsvy (6 timmar) - **PRIO: MEDIUM**
- [ ] Utveckla validering för tryckfärdighet (6 timmar) - **PRIO: MEDIUM**
- [ ] Optimera prestanda för stora dokument (8 timmar) - **PRIO: HÖG**
- [ ] Implementera dokumentzoomning (4 timmar) - **PRIO: HÖG**
- [ ] Utveckla panoreringsverktyg (4 timmar) - **PRIO: HÖG**
- [ ] Skapa avancerade markeringsverktyg (gruppering) (4 timmar) - **PRIO: MEDIUM**
- [ ] Förbättra användargränssnittet baserat på feedback (8 timmar) - **PRIO: HÖG**
- [ ] Fixa buggar och edge-cases (16 timmar) - **PRIO: HÖG**

## Testning & Lansering

### Testning
- [ ] Skapa testplan (2 timmar) - **PRIO: HÖG**
- [ ] Genomföra användartester med målgruppen (8 timmar) - **PRIO: HÖG**
- [ ] Testa webbläsarkompatibilitet (4 timmar) - **PRIO: HÖG**
- [ ] Genomföra prestandatester (4 timmar) - **PRIO: HÖG**
- [ ] Identifiera och åtgärda prestandaflaskhalsar (8 timmar) - **PRIO: HÖG**
- [ ] Genomföra användbarhetstester (6 timmar) - **PRIO: HÖG**
- [ ] Testa PDF-exportkvalitet i verklig tryckmiljö (4 timmar) - **PRIO: HÖG**

### Lansering
- [ ] Skapa användardokumentation (8 timmar) - **PRIO: HÖG**
- [ ] Spela in instruktionsvideos (8 timmar) - **PRIO: MEDIUM**
- [ ] Förbereda produktionsmiljö (4 timmar) - **PRIO: HÖG**
- [ ] Etablera feedbackmekanism (2 timmar) - **PRIO: MEDIUM**
- [ ] Genomföra soft launch för begränsad publik (4 timmar) - **PRIO: HÖG**
- [ ] Åtgärda feedback från soft launch (8 timmar) - **PRIO: HÖG**
- [ ] Genomföra full lansering (2 timmar) - **PRIO: HÖG**
- [ ] Upprätta supportkanaler (4 timmar) - **PRIO: MEDIUM**

## Återkommande uppgifter under utveckling

- [ ] Veckovis kodgranskning (2 timmar/vecka) - **PRIO: HÖG**
- [ ] Sprintplanering (2 timmar/2 veckor) - **PRIO: HÖG**
- [ ] Sprint retrospektiv (1 timme/2 veckor) - **PRIO: HÖG**
- [ ] Daglig standup (15 min/dag) - **PRIO: HÖG**
- [ ] Dokumentationsuppdatering (1 timme/vecka) - **PRIO: MEDIUM**
- [ ] Prestandaoptimering (2 timmar/sprint) - **PRIO: MEDIUM**