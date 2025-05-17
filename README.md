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

## Snabbstart

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

## Dokumentation

Utförlig dokumentation om projektet finns i [/docs](/docs/)-mappen:

- Detaljerad implementationsplan
- Teknisk arkitektur
- UI-designguide
- Teststrategi
- Och mycket mer

Se [/docs/README.md](/docs/README.md) för en fullständig lista över dokumentation.

## Utvecklingskommandon

```bash
# Utveckling
npm run dev        # Starta utvecklingsserver

# Bygg
npm run build      # Bygg för produktion
npm run preview    # Förhandsvisa produktionsbygge

# Tester
npm run test           # Kör enhetstester
npm run test:watch     # Kör tester i watch-läge
npm run test:coverage  # Kör tester med kodtäckning
npm run test:e2e       # Kör end-to-end tester

# Typ-kontroll och lint
npm run typecheck  # Kör typkontroll med svelte-check
npm run lint       # Kör linting
```

## Teknisk stack

- SvelteKit - Frontend-ramverk
- Fabric.js - Canvas-manipulation
- TailwindCSS - Styling
- IndexedDB - Lokal lagring
- jsPDF - PDF-generering

## Licens

Detta projekt är licensierat under [LICENSE] - se LICENSE-filen för detaljer.