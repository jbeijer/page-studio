# PageStudio

PageStudio är en webbaserad InDesign-ersättare för att skapa medlemstidningar och publikationer. Verktyget gör det möjligt för icke-tekniska redaktörer att designa och redigera publikationer med en intuitiv WYSIWYG-editor.

## Funktioner

- Canvas-baserad WYSIWYG-redigering
- Text- och bildhantering
- Formverktyg och objekt-transformation
- Multipel-sidhantering
- Textflöde mellan kopplade textrutor
- Mallsidor för återkommande element
- PDF-export för tryck

## Teknisk stack

- SvelteKit för frontend-ramverk
- Fabric.js för canvas-hantering
- TailwindCSS för styling
- IndexedDB för lokal lagring
- jsPDF för PDF-generering

## Utvecklingsmiljö

För att sätta upp utvecklingsmiljön:

1. Klona repository
```bash
git clone https://github.com/jbeijer/page-studio.git
cd page-studio
```

2. Installera beroenden
```bash
npm install
```

3. Starta utvecklingsserver
```bash
npm run dev
```

4. Besök `http://localhost:5173` i din webbläsare

## Testning

PageStudio använder en testdriven utvecklingsprocess med:

```bash
npm run test           # Kör enhetstester
npm run test:watch     # Kör tester i watch-läge
npm run test:coverage  # Kör tester med kodtäckning
npm run test:e2e       # Kör end-to-end tester
```

## Projektdokumentation

All dokumentation finns i `/docs`-mappen:

- [Implementation Plan](implementation-plan.md) - Detaljerad plan för implementering av projektet
- [Task List](task-list.md) och [Updated Task List](updated-task-list.md) - Lista över arbetsuppgifter
- [Development Timeline](development-timeline.md) - Tidsplan för utvecklingen
- [Technical Architecture](technical-architecture.md) - Teknisk arkitektur och designbeslut
- [Test Strategy](test-strategy.md) och [Testing](TESTING.md) - Teststrategi och -dokumentation
- [UI Design Guide](ui-design-guide.md) - Guide för användargränssnittsdesign
- [MVP Features](mvp-features.md) - Funktionalitet för Minimal Viable Product
- [Risk Assessment](risk-assessment.md) - Riskbedömning och -hantering

### Detaljerad dokumentation av nyckelkomponenter

I mappen `/docs/subtasks/` finns detaljerad dokumentation av de mest komplexa komponenterna:

- [Text Flow Implementation](subtasks/text-flow-implementation.md) - Implementering av textflöde mellan textrutor
- [PDF Export](subtasks/pdf-export.md) - Detaljerad plan för PDF-exportfunktionen
- [Master Pages](subtasks/master-pages.md) - Implementering av mallsidor

## Byggd med

- [SvelteKit](https://kit.svelte.dev/)
- [Fabric.js](http://fabricjs.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [jsPDF](https://github.com/MrRio/jsPDF)

## Licens

Detta projekt är licensierat under [LICENSE] - se LICENSE-filen för detaljer.