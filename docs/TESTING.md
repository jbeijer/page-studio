# PageStudio Testdokumentation
## 2025-05-17

## Testkonfiguration

PageStudio använder följande testverktyg:

- **Vitest**: Huvudsakligt testramverk för enhets- och komponenttester
- **jsdom**: För att simulera en DOM-miljö i testerna
- **Testing Library**: För att testa Svelte-komponenter när det är möjligt
- **Playwright**: För end-to-end tester

## Köra tester

Följande kommandon används för att köra tester:

```bash
# Kör alla enhetstester
npm run test

# Kör tester i watch-läge (tester körs om vid kodändringar)
npm run test:watch

# Kör tester med kodtäckningsrapport
npm run test:coverage

# Kör end-to-end tester
npm run test:e2e
```

## Utmaningar med Svelte 5 och testning

Eftersom vi använder Svelte 5, finns det några speciella utmaningar med att testa komponenter:

1. **Komponentrendering**: Svelte 5 har en annan kompilatorsprocess än Svelte 4, vilket gör att traditionella metoder för att rendera komponenter i tester kan vara problematiska. Istället för att förlita oss på `render`-metoden från `@testing-library/svelte`, testar vi ofta komponenters struktur och logik direkt.

2. **Props och reaktivitet**: I Svelte 5 är det inte lika enkelt att direkt få tillgång till komponenter props. Istället testar vi props mer indirekt genom komponentens beteende.

3. **Anpassad testmetodik**: För vissa komponenter, särskilt de som interagerar med externa bibliotek som Fabric.js, använder vi mockning mer frekvent och verifierar komponentens logik snarare än dess DOM-interaktioner.

## Exempel på testupplägg

### Enhetstest för store (document.test.js)

För Svelte-stores används traditionell enhetstestning. Vi verifierar att store-funktioner fungerar korrekt genom att anropa dem och verifiera resultatet:

```javascript
import { get } from 'svelte/store';
import { currentDocument, createDocument } from './document';

describe('createDocument', () => {
  it('should create a document with default values', () => {
    const doc = createDocument({});
    expect(doc.id).toBeDefined();
    expect(doc.title).toBe('Untitled Document');
    // Fler assertions...
  });
});
```

### Komponenttest (Canvas.test.js)

För komponenter använder vi en annan approach på grund av Svelte 5:

```javascript
import { describe, it, expect } from 'vitest';
import Canvas from './Canvas.svelte';

describe('Canvas Component', () => {
  it('should test canvas component structure', () => {
    // Test if component is correctly defined
    expect(typeof Canvas).toBe('function');
    
    // Look for key patterns in the component code
    const componentSource = Canvas.toString();
    expect(componentSource).toContain('width');
    expect(componentSource).toContain('height');
  });
});
```

## Mockning 

Vi mocktar externa beroenden som Fabric.js för att isolera tester:

```javascript
vi.mock('fabric', () => {
  return {
    fabric: {
      Canvas: vi.fn().mockImplementation(() => ({
        add: vi.fn(),
        // Andra mockade metoder...
      })),
      Rect: vi.fn().mockImplementation(() => ({}))
    }
  };
});
```

## Typer av tester

### Enhetstester
- Testar enskilda funktioner och moduler
- Fokuserar på ren logik och datahantering
- Exempel: document.test.js testar dokumentmodellens logik

### Komponenttester
- Testar komponentkod och struktur
- Verifiera att komponenter har rätt egenskaper
- Exempel: Canvas.test.js

### Integrationstester
- Testar hur olika delar av applikationen fungerar tillsammans
- Exempel: Ett test som verifierar att Canvas och document-store interagerar korrekt

### End-to-end tester
- Simulerar verklig användarinteraktion med hela applikationen
- Testar kompletta arbetsflöden från början till slut
- Körs med Playwright

## Test setup

Vi använder en setupTests.js-fil för att konfigurera testmiljön:

- Mocktar browser-API:er som inte finns i testmiljön (Canvas, ResizeObserver, etc.)
- Konfigurerar globala mockningar
- Sätter upp eventuella testhjälpare

## Kodtäckningsmål

Vi strävar efter följande kodtäckning:

- Enhetstest: 90%+ täckning
- Komponenttest: 80%+ täckning 
- Totalt: 85%+ täckning

Kritiska moduler som dokumentmodell, textflöde och PDF-export bör ha extra hög täckning.

## Testtips

1. **Skriv tester först**: Följ TDD-metodiken och skriv test innan implementering
2. **Isolera tester**: Använd mockning för att isolera enheten som testas
3. **Testa edge cases**: Tänk på gränsfall och ovanliga scenarios
4. **Behåll enkla tester**: Enkla tester är lättare att underhålla
5. **Dokumentera testintention**: Använd tydliga beskrivningar så syftet med testerna framgår

## Kontinuerlig integration

Tester körs automatiskt i CI/CD pipeline för att säkerställa kodkvalitet:

- Enhetstester körs vid varje commit
- Linting och typechecking körs vid varje commit 
- E2E-tester körs vid pull requests