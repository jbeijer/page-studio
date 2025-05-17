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
│   │   │   │   └── Canvas.test.js
│   │   │   └── UI/
│   │   ├── stores/
│   │   │   ├── document.js
│   │   │   ├── document.test.js
│   │   │   └── editor.js
│   │   └── utils/
│   │       ├── pdf-export.js
│   │       └── storage.js
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +page.svelte
│   │   └── editor/
│   │       └── +page.svelte
│   ├── app.css
│   └── app.html
├── static/
│   └── favicon.png
├── tests/
├── .svelte-kit/
│   └── tsconfig.json
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
- Grundläggande dokumentmodell och lagring
- Enkelt UI med verktygspalett och egenskapspanel
- Test-setup med Vitest och Testing Library

## Nästa steg

1. **Fortsätt implementera Canvas-verktyg**
   - Komplett implementering av text-, bild- och formverktyg
   - Implementera objekt-selection och -manipulation

2. **Dokumentlagring**
   - Slutför implementeringen av IndexedDB-lagring
   - Implementera autosave-funktionalitet

3. **Sidhantering**
   - Förbättra sidnavigering
   - Implementera sidordering genom drag and drop

4. **PDF-export**
   - Implementera grundläggande PDF-export med jsPDF

5. **Testning**
   - Utöka test-suiten för alla komponenter
   - Implementera E2E-tester med Playwright

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
- `src/lib/stores/document.js` - Dokumentdatamodell och hantering
- `src/lib/utils/storage.js` - IndexedDB-lagring
- `src/lib/utils/pdf-export.js` - PDF-exportfunktionalitet
- `src/routes/editor/+page.svelte` - Huvudsida för editorn