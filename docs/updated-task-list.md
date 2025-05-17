# Uppdaterad Tasklista för PageStudio
## 2025-05-17

Denna uppdaterade tasklista inkluderar testdriven utveckling (TDD) som en integrerad del av utvecklingsprocessen. Varje huvudfunktionalitet har nu motsvarande testtasks för att säkerställa att vi följer TDD-principerna genom hela projektet.

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

### Testinfrastruktur
- [ ] Installera och konfigurera Vitest (1 timme) - **PRIO: HÖG**
- [ ] Konfigurera Svelte Testing Library (1 timme) - **PRIO: HÖG**
- [ ] Sätta upp JSDOM för komponenttester (30 min) - **PRIO: HÖG**
- [ ] Konfigurera Playwright för E2E-tester (2 timmar) - **PRIO: MEDIUM**
- [ ] Skapa testhjälpare och mockklasser (2 timmar) - **PRIO: HÖG**
- [ ] Implementera testrapportering och täckningsanalys (1 timme) - **PRIO: MEDIUM**
- [ ] Sätta upp GitHub Actions för automatiserade tester (1 timme) - **PRIO: HÖG**

### Design & Prototyp
- [ ] Skapa wireframes för huvudgränssnitt (4 timmar) - **PRIO: HÖG**
- [ ] Designa verktygspanel (2 timmar) - **PRIO: HÖG**
- [ ] Designa egenskapspanel (2 timmar) - **PRIO: HÖG**
- [ ] Designa sidnavigering (1 timme) - **PRIO: HÖG**
- [ ] Skapa grundläggande Svelte stores för global state (2 timmar) - **PRIO: HÖG**
- [ ] Implementera grundläggande layout med TailwindCSS (4 timmar) - **PRIO: HÖG**

## Fas 1: MVP

### Canvas & Grundläggande Objekthantering
- [ ] Skapa testsuite för Canvas-komponent (2 timmar) - **PRIO: HÖG**
- [ ] Implementera Canvas-komponent med Fabric.js (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för grundläggande objektmanipulation (2 timmar) - **PRIO: HÖG**
- [ ] Skapa grundläggande canvas-interaktion (markera, flytta) (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för Toolbar-komponent (1 timme) - **PRIO: HÖG**
- [ ] Implementera Toolbar-komponent (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för verktygsväljarfunktionalitet (1 timme) - **PRIO: HÖG**
- [ ] Skapa verktygsväljarfunktionalitet (2 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för textobjektsverktyg (1 timme) - **PRIO: HÖG**
- [ ] Bygga textobjektsverktyg (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för bildimport (1 timme) - **PRIO: HÖG**
- [ ] Implementera bildimportverktyg (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för formverktyg (1 timme) - **PRIO: HÖG**
- [ ] Utveckla rektangelverktyg (2 timmar) - **PRIO: HÖG**
- [ ] Implementera linjeverktyg (2 timmar) - **PRIO: MEDIUM**
- [ ] Utveckla formverktyg (cirkel, polygon) (4 timmar) - **PRIO: MEDIUM**
- [ ] Skriva tester för objekt-transformation (1 timme) - **PRIO: HÖG**
- [ ] Implementera objekt-transformation (rotera, skala) (6 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för lagerhantering (1 timme) - **PRIO: HÖG**
- [ ] Skapa funktionalitet för objektlager (framåt/bakåt) (2 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för kopiera/klistra in (30 min) - **PRIO: MEDIUM**
- [ ] Implementera kopiera/klistra in-funktionalitet (2 timmar) - **PRIO: MEDIUM**
- [ ] Skriva tester för ångra/gör om (1 timme) - **PRIO: HÖG**
- [ ] Skapa ångra/gör om-funktion (4 timmar) - **PRIO: HÖG**

### Texthantering & Formatering
- [ ] Skriva tester för textredigeringskomponent (2 timmar) - **PRIO: HÖG**
- [ ] Bygga textredigeringskomponent (6 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för teckensnittsväljare (1 timme) - **PRIO: HÖG**
- [ ] Implementera teckensnittsväljare (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för textstorleksväljare (30 min) - **PRIO: HÖG**
- [ ] Utveckla textstorleksväljare (2 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för textjusteringskontroller (30 min) - **PRIO: HÖG**
- [ ] Implementera textjusteringskontroller (2 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för färgväljare (1 timme) - **PRIO: HÖG**
- [ ] Skapa färgväljare för text (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för textstilskontroller (30 min) - **PRIO: HÖG**
- [ ] Implementera textstilskontroller (fet, kursiv, understruken) (2 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för radavståndskontrollen (30 min) - **PRIO: MEDIUM**
- [ ] Utveckla radavståndskontrollen (2 timmar) - **PRIO: MEDIUM**
- [ ] Skriva tester för styckeindragskontroller (30 min) - **PRIO: MEDIUM**
- [ ] Implementera styckeindragskontroller (2 timmar) - **PRIO: MEDIUM**
- [ ] Skriva tester för textstilar (1 timme) - **PRIO: MEDIUM**
- [ ] Skapa sparade textstilar (4 timmar) - **PRIO: MEDIUM**

### Dokumenthantering & Multi-Page
- [ ] Skriva tester för dokumentmodell (1 timme) - **PRIO: HÖG**
- [ ] Skapa datamodell för dokument (2 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för sidmodell (1 timme) - **PRIO: HÖG**
- [ ] Implementera sidmodell (2 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för sidnavigeringskomponent (1 timme) - **PRIO: HÖG**
- [ ] Utveckla sidnavigeringskomponent (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för sidskapande/borttagning (1 timme) - **PRIO: HÖG**
- [ ] Skapa funktionalitet för att lägga till/ta bort sidor (2 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för sidladdning/sparning (1 timme) - **PRIO: HÖG**
- [ ] Implementera sidladdning och -sparning (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för IndexedDB-lagring (2 timmar) - **PRIO: HÖG**
- [ ] Utveckla IndexedDB-lagring (6 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för dokumentväljare (1 timme) - **PRIO: HÖG**
- [ ] Bygga dokumentväljare för tidigare dokument (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för PDF-export (2 timmar) - **PRIO: HÖG**
- [ ] Implementera exportfunktion för enkel PDF (6 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för autosave (1 timme) - **PRIO: MEDIUM**
- [ ] Utveckla autosave-funktionalitet (4 timmar) - **PRIO: MEDIUM**
- [ ] Skriva tester för dokumentmetadata (30 min) - **PRIO: MEDIUM**
- [ ] Skapa dokumentmetadata-hantering (titel, skapare, datum) (2 timmar) - **PRIO: MEDIUM**

## Fas 2: Avancerad Layout

### Rutnät & Hjälplinjer
- [ ] Skriva tester för rutnät (1 timme) - **PRIO: HÖG**
- [ ] Implementera konfigurerbart rutnät (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för ruler-komponenter (1 timme) - **PRIO: HÖG**
- [ ] Utveckla horisontell ruler-komponent (4 timmar) - **PRIO: HÖG**
- [ ] Utveckla vertikal ruler-komponent (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för hjälplinjer (1 timme) - **PRIO: HÖG**
- [ ] Skapa dragbara hjälplinjer (6 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för snappning (1 timme) - **PRIO: HÖG**
- [ ] Implementera snappning till rutnät (4 timmar) - **PRIO: HÖG**
- [ ] Implementera snappning till hjälplinjer (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för marginal-/spaltinställningar (1 timme) - **PRIO: HÖG**
- [ ] Utveckla marginal- och spaltinställningar (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för visuella indikatorer (30 min) - **PRIO: HÖG**
- [ ] Skapa visuell indikation för marginaler och spalter (2 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för objekt-alignment (30 min) - **PRIO: MEDIUM**
- [ ] Implementera objekt-alignment verktyg (3 timmar) - **PRIO: MEDIUM**

### Textflöde & Länkade Textrutor
- [ ] Skriva tester för textflödesmodell (2 timmar) - **PRIO: HÖG**
- [ ] Designa datamodell för länkade textrutor (2 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för textflödesberäkning (2 timmar) - **PRIO: HÖG**
- [ ] Utveckla algoritm för textflödesberäkning (8 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för textrute-länkning (1 timme) - **PRIO: HÖG**
- [ ] Implementera länkning mellan textrutor (6 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för visuella indikatorer (30 min) - **PRIO: HÖG**
- [ ] Skapa visuell indikator för länkade textrutor (3 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för uppdateringsmekanism (1 timme) - **PRIO: HÖG**
- [ ] Implementera uppdateringsmekanism vid textredigering (6 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för sidöverskridande textflöde (2 timmar) - **PRIO: HÖG**
- [ ] Utveckla sidöverskridande textflöde (8 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för textobjektskonfiguration (1 timme) - **PRIO: MEDIUM**
- [ ] Implementera textobjektskonfigurering (kolumner, padding) (4 timmar) - **PRIO: MEDIUM**
- [ ] Skriva tester för länk/avlänk UI (1 timme) - **PRIO: HÖG**
- [ ] Skapa UI för att länka/avlänka textrutor (4 timmar) - **PRIO: HÖG**
- [ ] Skapa testfall för edge cases i textflöde (2 timmar) - **PRIO: HÖG**
- [ ] Testa och optimera textflödeshantering (8 timmar) - **PRIO: HÖG**

### Mallsidor & Templates
- [ ] Skriva tester för mallsidemodell (1 timme) - **PRIO: HÖG**
- [ ] Designa mallsidemodell (2 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för mallsidehantering (1 timme) - **PRIO: HÖG**
- [ ] Implementera mallsidhantering (6 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för mallside-UI (1 timme) - **PRIO: HÖG**
- [ ] Utveckla UI för att skapa mallsidor (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för mallsideapplicering (1 timme) - **PRIO: HÖG**
- [ ] Skapa funktionalitet för att applicera mallsidor (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för mallsidesobjektlåsning (30 min) - **PRIO: HÖG**
- [ ] Implementera låsfunktionalitet för mallsideobjekt (3 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för överrider (1 timme) - **PRIO: MEDIUM**
- [ ] Utveckla mallsideöverrides (6 timmar) - **PRIO: MEDIUM**
- [ ] Skriva tester för mallsidesparning (1 timme) - **PRIO: HÖG**
- [ ] Skapa template-sparningsfunktionalitet (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för mallladdning (1 timme) - **PRIO: HÖG**
- [ ] Implementera template-laddningsfunktionalitet (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för mallbibliotek (1 timme) - **PRIO: MEDIUM**
- [ ] Utveckla template-bibliotek (6 timmar) - **PRIO: MEDIUM**
- [ ] Skriva tester för mallkategorisering (30 min) - **PRIO: LÅG**
- [ ] Skapa mallkategorisering (2 timmar) - **PRIO: LÅG**

## Fas 3: Avancerad Output

### Förbättrad PDF-generering
- [ ] Skriva tester för PDF-export strategier (2 timmar) - **PRIO: HÖG**
- [ ] Undersöka vektorbaserade PDF-exportalternativ (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för Puppeteer-integration (2 timmar) - **PRIO: HÖG**
- [ ] Integrera Puppeteer för vektorgenerering (8 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för textrendering i PDF (1 timme) - **PRIO: HÖG**
- [ ] Implementera förbättrad text-rendering i PDF (8 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för fonthantering (1 timme) - **PRIO: HÖG**
- [ ] Utveckla fonthantering för PDF-export (6 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för fontintegrering (1 timme) - **PRIO: HÖG**
- [ ] Implementera fontintegrering i PDF (6 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för export-UI (1 timme) - **PRIO: MEDIUM**
- [ ] Skapa konfigurationsgränssnitt för PDF-export (4 timmar) - **PRIO: MEDIUM**
- [ ] Skriva tester för bildoptimering (1 timme) - **PRIO: HÖG**
- [ ] Optimera bildupplösning för tryck (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för färghantering (1 timme) - **PRIO: MEDIUM**
- [ ] Implementera färghantering (CMYK-stöd) (8 timmar) - **PRIO: MEDIUM**
- [ ] Skriva tester för PDF-metadata (30 min) - **PRIO: LÅG**
- [ ] Utveckla PDF-metadatahantering (2 timmar) - **PRIO: LÅG**
- [ ] Utveckla omfattande tester för PDF-kvalitet (2 timmar) - **PRIO: HÖG**
- [ ] Testa och optimera PDF-export (8 timmar) - **PRIO: HÖG**

### Förhandsgranskning & Finslipning
- [ ] Skriva tester för förhandsgranskningsläge (1 timme) - **PRIO: HÖG**
- [ ] Skapa förhandsgranskningsläge (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för utskriftssimulering (1 timme) - **PRIO: MEDIUM**
- [ ] Implementera utskriftssimuleringsvy (6 timmar) - **PRIO: MEDIUM**
- [ ] Skriva tester för tryckfärdighetsvalidering (1 timme) - **PRIO: MEDIUM**
- [ ] Utveckla validering för tryckfärdighet (6 timmar) - **PRIO: MEDIUM**
- [ ] Skriva prestandatester för stora dokument (2 timmar) - **PRIO: HÖG**
- [ ] Optimera prestanda för stora dokument (8 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för zoomning (30 min) - **PRIO: HÖG**
- [ ] Implementera dokumentzoomning (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för panorering (30 min) - **PRIO: HÖG**
- [ ] Utveckla panoreringsverktyg (4 timmar) - **PRIO: HÖG**
- [ ] Skriva tester för markeringsverktyg (1 timme) - **PRIO: MEDIUM**
- [ ] Skapa avancerade markeringsverktyg (gruppering) (4 timmar) - **PRIO: MEDIUM**
- [ ] Genomföra användarfeedbacktester (2 timmar) - **PRIO: HÖG**
- [ ] Förbättra användargränssnittet baserat på feedback (8 timmar) - **PRIO: HÖG**
- [ ] Upprätta test-suite för regression och edge-cases (4 timmar) - **PRIO: HÖG**
- [ ] Fixa buggar och edge-cases (16 timmar) - **PRIO: HÖG**

## Testning & Lansering

### Testning
- [ ] Skapa omfattande testplan (2 timmar) - **PRIO: HÖG**
- [ ] Genomföra användartester med målgruppen (8 timmar) - **PRIO: HÖG**
- [ ] Skriva automatiserade browser-kompatibilitetstester (2 timmar) - **PRIO: HÖG**
- [ ] Testa webbläsarkompatibilitet (4 timmar) - **PRIO: HÖG**
- [ ] Utveckla prestandatestsvit (2 timmar) - **PRIO: HÖG**
- [ ] Genomföra prestandatester (4 timmar) - **PRIO: HÖG**
- [ ] Analysera prestandaflaskhalsar genom profiling (2 timmar) - **PRIO: HÖG**
- [ ] Identifiera och åtgärda prestandaflaskhalsar (8 timmar) - **PRIO: HÖG**
- [ ] Genomföra användbarhetstester (6 timmar) - **PRIO: HÖG**
- [ ] Skapa tryckkvalitetstester (2 timmar) - **PRIO: HÖG**
- [ ] Testa PDF-exportkvalitet i verklig tryckmiljö (4 timmar) - **PRIO: HÖG**

### Lansering
- [ ] Skapa användardokumentation (8 timmar) - **PRIO: HÖG**
- [ ] Spela in instruktionsvideos (8 timmar) - **PRIO: MEDIUM**
- [ ] Förbereda produktionsmiljö (4 timmar) - **PRIO: HÖG**
- [ ] Etablera feedbackmekanism (2 timmar) - **PRIO: MEDIUM**
- [ ] Planera och genomföra soft launch (4 timmar) - **PRIO: HÖG**
- [ ] Sammanställa och prioritera feedback (2 timmar) - **PRIO: HÖG**
- [ ] Åtgärda feedback från soft launch (8 timmar) - **PRIO: HÖG**
- [ ] Genomföra slutlig testning inför lansering (4 timmar) - **PRIO: HÖG**
- [ ] Genomföra full lansering (2 timmar) - **PRIO: HÖG**
- [ ] Upprätta supportkanaler (4 timmar) - **PRIO: MEDIUM**

## Återkommande uppgifter under utveckling

- [ ] Veckovis kodgranskning (2 timmar/vecka) - **PRIO: HÖG**
- [ ] Omfattande testredogörelse (1 timme/vecka) - **PRIO: HÖG**
- [ ] Sprintplanering (2 timmar/2 veckor) - **PRIO: HÖG**
- [ ] Sprint retrospektiv (1 timme/2 veckor) - **PRIO: HÖG**
- [ ] Daglig standup (15 min/dag) - **PRIO: HÖG**
- [ ] Dokumentationsuppdatering (1 timme/vecka) - **PRIO: MEDIUM**
- [ ] Prestandaoptimering (2 timmar/sprint) - **PRIO: MEDIUM**
- [ ] Test suite-underhåll (1 timme/vecka) - **PRIO: HÖG**