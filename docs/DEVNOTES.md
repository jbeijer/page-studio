# PageStudio Development Notes
## 2025-05-17

## Projektstruktur

Vi har nu skapat följande struktur för PageStudio:

```
/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Editor/
│   │   │   │   ├── Canvas.svelte
│   │   │   │   ├── Canvas.test.js
│   │   │   │   ├── toolbar/
│   │   │   │   │   ├── DrawingTools.svelte
│   │   │   │   │   ├── EditTools.svelte
│   │   │   │   │   └── toolbar.index.js
│   │   │   │   ├── editor/
│   │   │   │   │   ├── DocumentManager.js
│   │   │   │   │   └── AutoSaveManager.js
│   │   │   │   └── modules/
│   │   │   │       ├── Canvas.events.js (Legacy - nu CanvasEventService)
│   │   │   │       └── Canvas.grid.js (Legacy - nu GridService)
│   │   │   └── UI/
│   │   ├── services/
│   │   │   ├── CanvasService.js
│   │   │   ├── CanvasService.test.js
│   │   │   ├── DocumentService.js
│   │   │   ├── GridService.js
│   │   │   ├── ToolService.js
│   │   │   ├── TextFlowService.js
│   │   │   ├── MasterPageService.js
│   │   │   ├── ServiceProvider.svelte
│   │   │   ├── getServices.js
│   │   │   ├── ServiceIntegration.js
│   │   │   └── index.js
│   │   ├── stores/
│   │   │   ├── document.js
│   │   │   ├── document.test.js
│   │   │   └── editor.js
│   │   └── utils/
│   │       ├── pdf-export.js
│   │       ├── storage.js
│   │       └── storage/
│   │           ├── documents.js
│   │           ├── master-pages.js
│   │           └── templates.js
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +page.svelte
│   │   └── editor/
│   │       └── +page.svelte
│   ├── app.css
│   └── app.html
├── static/
│   └── favicon.png
├── docs/
│   ├── DEVNOTES.md
│   ├── technical-architecture.md
│   ├── service-based-architecture.md
│   └── subtasks/
│       ├── pdf-export.md
│       ├── text-flow-implementation.md
│       └── master-pages.md
├── refactoring-plan/
│   ├── README.md
│   ├── implementation-sequence.md
│   ├── refactoring-progress.md
│   └── service-integration-patterns.md
├── package.json
├── postcss.config.js
├── svelte.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.js
└── README.md
```

## Implementerade funktioner

- Grundläggande app-struktur med SvelteKit
- Integrering av TailwindCSS för styling
- Canvas-komponent med Fabric.js
- Service-baserad arkitektur för bättre separation av intressen
- Textflöde mellan länkade textrutor över flera sidor
- Dokumentlagring med IndexedDB
- Autosave-funktionalitet
- Avancerad verktygshantering genom ToolService
- Lager- och objekthantering
- Ångra/göra om-funktionalitet via HistoryService
- Test-setup med Vitest och Testing Library
- Omfattande testning av services och komponenter

## Nästa steg

1. **Rutnät och hjälplinjer**
   - Implementera konfigurerbart rutnät med GridService
   - Utveckla rulers och hjälplinjer med GuideService
   - Implementera snappning till rutnät

2. **PDF-export**
   - Förbättra PDF-export med högre kvalitet
   - Implementera metadata-hantering
   - Stöd för vektorbaserad textrendering

3. **Mallsidor**
   - Vidareutveckla MasterPageService
   - Förbättra UI för mallsidehantering
   - Implementera möjlighet att överrida mallsideobjekt

4. **Prestanda**
   - Optimera canvas-rendering för stora dokument
   - Implementera lazy-loading av sidor och objekt
   - Förbättra memory management

5. **E2E-testning**
   - Implementera E2E-tester med Playwright
   - Automatisera testning av sidnavigering och dokumenthantering

## Utvecklingskommandon

- `npm run dev` - Starta utvecklingsserver
- `npm run build` - Bygg applikationen för produktion
- `npm run preview` - Förhandsgranska produktionsbygget
- `npm run test` - Kör enhetstester
- `npm run test:watch` - Kör tester i watch-läge
- `npm run test:coverage` - Kör tester med täckningsrapport
- `npm run test:e2e` - Kör end-to-end tester

## Viktiga filer

- `src/lib/components/Editor/Canvas.svelte` - Huvudkomponenten för canvas-editorn
- `src/lib/services/ServiceProvider.svelte` - Tillhandahåller alla services via Svelte Context
- `src/lib/services/ToolService.js` - Hanterar verktygsval och -konfiguration
- `src/lib/services/DocumentService.js` - Hanterar dokumentoperationer
- `src/lib/services/CanvasService.js` - Hanterar canvas-operationer
- `src/lib/services/TextFlowService.js` - Hanterar textflöde mellan textrutor
- `src/lib/services/MasterPageService.js` - Hanterar mallsidor
- `src/lib/services/getServices.js` - Utility för att hämta services i komponenter
- `src/lib/stores/document.js` - Dokumentdatamodell och global state
- `src/lib/utils/storage.js` - IndexedDB-lagring
- `src/lib/utils/pdf-export.js` - PDF-exportfunktionalitet
- `src/routes/editor/+page.svelte` - Huvudsida för editorn
- `docs/service-based-architecture.md` - Dokumentation av service-arkitekturen