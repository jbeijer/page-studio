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
git clone https://github.com/yourusername/page-studio.git
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
npm run test:component # Kör komponenttester
npm run test:e2e       # Kör end-to-end tester
```

## Byggd med

- [SvelteKit](https://kit.svelte.dev/)
- [Fabric.js](http://fabricjs.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [jsPDF](https://github.com/MrRio/jsPDF)

## Licens

Detta projekt är licensierat under [LICENSE] - se LICENSE-filen för detaljer.