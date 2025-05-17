# Test-strategi för PageStudio
## 2025-05-17

Detta dokument beskriver test-strategin för PageStudio-projektet, med fokus på test-driven utveckling (TDD) för att säkerställa robust och underhållbar kod.

## 1. Översikt

Test-driven utveckling kommer att användas genomgående i projektet för att:
- Säkerställa att koden uppfyller specifikationen
- Förhindra regressioner när nya funktioner läggs till
- Dokumentera förväntad koduppförande
- Möjliggöra trygga refaktoreringar
- Uppmuntra modulär och testbar design

## 2. Test-nivåer

Vi kommer att implementera följande testnivåer:

### 2.1. Enhetstester
- Testar individuella funktioner och klasser
- Fokuserar på att isolera kodenheter med mockade beroenden
- Körs snabbt och automatiserat

### 2.2. Komponenttester 
- Testar Svelte-komponenter i isolation
- Verifierar rendering, händelsehantering och tillståndsändringar
- Använder Svelte Testing Library

### 2.3. Integrationstester
- Testar samspelet mellan komponenter och moduler
- Verifierar dataflöden mellan moduler
- Fokuserar på kritiska integrationer (canvas-rendering, textflöde, etc.)

### 2.4. End-to-end (E2E) tester
- Testar applikationen som helhet från användarperspektiv
- Simulerar verklig användarinteraktion
- Fokuserar på kritiska användarflöden

## 3. TDD-process

För varje funktion kommer vi att följa denna TDD-process:

1. **Red**: Skriv ett fallerade test som definierar önskad funktionalitet
2. **Green**: Implementera minimal kod för att få testet att passera
3. **Refactor**: Förbättra koden medan testerna fortsätter passera

### 3.1. Exempel på TDD-workflow för textflöde

```javascript
// STEG 1: RED - Skriv ett test som fallerar
describe('TextFlowManager', () => {
  test('should calculate overflow text correctly', () => {
    // Arrange
    const textBox = new TextBox({
      width: 200,
      height: 100,
      fontSize: 16,
      lineHeight: 1.2
    });
    const longText = 'Lorem ipsum...'; // Text som inte får plats
    
    // Act
    const textFlowManager = new TextFlowManager();
    const { visibleText, overflowText } = textFlowManager.calculateTextSplit(textBox, longText);
    
    // Assert
    expect(visibleText).not.toBe(longText);
    expect(overflowText.length).toBeGreaterThan(0);
    expect(visibleText + overflowText).toBe(longText);
  });
});

// STEG 2: GREEN - Implementera minimal kod för att passera testet
class TextFlowManager {
  calculateTextSplit(textBox, text) {
    // Enkel implementation för att få testet att passera
    const capacity = Math.floor((textBox.width * textBox.height) / 
                               (textBox.fontSize * textBox.lineHeight * 10));
    const splitIndex = Math.min(capacity, text.length);
    
    return {
      visibleText: text.substring(0, splitIndex),
      overflowText: text.substring(splitIndex)
    };
  }
}

// STEG 3: REFACTOR - Förbättra implementationen
class TextFlowManager {
  calculateTextSplit(textBox, text) {
    // Mer precis text-split-algoritm med faktisk textmätning
    // ...förbättrad implementation som fortfarande passerar testet...
  }
}
```

## 4. Testverktyg och ramverk

### 4.1. Enhetstester och komponenttester
- **Vitest**: Snabb testrunner kompatibel med SvelteKit
- **Svelte Testing Library**: För komponenttestning
- **JSDOM**: För DOM-simulering i tester
- **Sinon.js**: För stubbar, spioner och mockning

### 4.2. End-to-end tester
- **Playwright**: För automatiserade browsertester
- **Playwright Test**: För testorganisering och assertion

### 4.3. Visuella regressionstest
- **Storybook**: För komponentdokumentation och visuell testning
- **Percy eller Chromatic**: För visuella jämförelser och regressionstester

## 5. Teststruktur

Testfiler ska:
- Placeras nära koden de testar med `.test.ts`/`.test.js`-suffix
- Följa samma modulära struktur som implementationen
- Vara organiserade i logiska grupper med describe-block

### 5.1. Exempel på filstruktur
```
src/lib/
  components/
    Editor/
      Canvas.svelte
      Canvas.test.ts
  utils/
    text-flow.ts
    text-flow.test.ts
tests/
  e2e/
    document-creation.spec.ts
    text-editing.spec.ts
```

## 6. Testning av kritiska komponenter

### 6.1. Canvas och rendering
- Testa objekt-transformationer (flytta, rotera, skala)
- Testa lagerordning och gruppering
- Testa rendering-precision genom pixeljämförelser

### 6.2. Textflöde
- Testa textkapacitetsberäkningar
- Testa text-splitting-algoritm
- Testa uppdateringar genom kedjade textrutor
- Testa sidöverskridande textflöde

### 6.3. Mallsidor
- Testa applicering av mallsidor på dokumentsidor
- Testa överrides
- Testa uppdateringspropagering

### 6.4. PDF-export
- Testa korrekt sidordning
- Testa textrendering i exporterad PDF
- Testa bildkvalitet i olika DPI-inställningar

## 7. Mockstrategier

### 7.1. Canvas-mockning
För att testa canvas-relaterad kod utan faktisk rendering:
```typescript
// Mocka fabric.js Canvas
const mockCanvas = {
  add: jest.fn(),
  remove: jest.fn(),
  renderAll: jest.fn(),
  getObjects: jest.fn().mockReturnValue([]),
  // Ytterligare mockade metoder efter behov
};
```

### 7.2. Lagringmockning
För tester som involverar IndexedDB:
```typescript
// Mocka IndexedDB med fake-indexeddb
import 'fake-indexeddb/auto';
```

### 7.3. Service Workers
För tester som involverar Service Workers:
```typescript
// Registrera en mock Service Worker för tester
const mockRegistration = { installing: null, waiting: null, active: { postMessage: jest.fn() } };
jest.spyOn(navigator.serviceWorker, 'register').mockResolvedValue(mockRegistration);
```

## 8. Kontinuerlig integration och testautomatisering

### 8.1. CI Pipeline
- Kör enhetstester vid varje commit
- Kör komponenttester vid varje commit
- Kör E2E-tester vid pull requests
- Kör visuella regressionstester vid pull requests

### 8.2. Pre-commit hooks
- Kör linting och typechecking
- Kör relevanta enhetstester för ändrade filer

### 8.3. CI-konfiguration
```yaml
# .github/workflows/test.yml exempel
name: Test

on:
  push:
    branches: [ main, dev ]
  pull_request:
    branches: [ main, dev ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit
      - run: npm run test:component
      - run: npm run build
      - run: npm run test:e2e
```

## 9. Testdriven utvecklingsprocess

### 9.1. Sprint-planering
- Identifiera testbara enheter för sprint-objekt
- Skapa test-tasks för varje funktionalitet
- Allokera tid för testskrivning (ca 30% av utvecklingstiden)

### 9.2. Daglig utvecklingscykel
1. Skriv testfall för aktuell funktionalitet
2. Implementera funktionalitet tills tester passerar
3. Refaktorera för klarhet och prestanda
4. Commit kod med tester

### 9.3. Code review
- Inkludera testtäckning i code reviews
- Verifiera att alla nya funktioner har adekvata tester
- Validera teststrategier för nya komponenter

## 10. Testtäckning och rapportering

### 10.1. Täckningsmål
- Kodradsräckning: Minst 80% totalt
- Funktionsräckning: Minst 90%
- Branch-täckning: Minst 75%

### 10.2. Kritiska moduler (kräver högre täckning)
- Textflödeshantering: 90%+ kodradsräckning
- PDF-exportmodul: 90%+ kodradsräckning
- Dokumentlagringsmodell: 95%+ kodradsräckning

### 10.3. Rapportering
- Generera täckningsrapporter vid varje testning
- Integrera täckningsrapportering i CI/CD-pipeline
- Bevaka trenderna i testtäckning över tid

## 11. Testdokumentation

### 11.1. Test-specs
Alla tester ska ha tydlig dokumentation:
- Precis beskrivning av vad som testas
- Förutsättningar och setup
- Förväntade resultat
- Edge-cases som hanteras

### 11.2. Testhjälpares dokumentation
Dokumentera testhjälpare och mocks för återanvändning:
```typescript
/**
 * Skapar en mockad textruta för testning
 * @param {Object} props - Egenskaper att override default
 * @returns {Object} Mockad textruta
 */
export function createMockTextBox(props = {}) {
  return {
    id: 'mock-textbox-1',
    type: 'textbox',
    width: 100,
    height: 100,
    text: 'Sample text',
    fontSize: 12,
    ...props
  };
}
```

## 12. Integration i projektets tidplan

### 12.1. Förberedelsefas (Vecka 1)
- Konfigurera testramar (Vitest, Testing Library, etc.)
- Skapa initialtesters för grundläggande komponenter
- Etablera testningsriktlinjer för projektet

### 12.2. MVP-fas (Vecka 2-8)
- Implementera TDD för alla nya funktioner
- Förbered automatiserade tester för kritiska användarflöden
- Etablera CI/CD-pipeline med testintegrering

### 12.3. Avancerade funktioner (Vecka 9-18)
- Utöka testsuiten för komplex funktionalitet
- Implementera specialiserad testning för textflöde, mallsidor, etc.
- Lägg till prestandatester för kritiska sökvägar

### 12.4. Tidstilldelning
- Dedikera ~30% av utvecklingstiden för testning
- Allokera specifik tid i varje sprint för testunderhåll
- Schemalägg dedikerad "Test Debt"-tid för att åtgärda problematiska tester

## 13. Testaktualisering per komponent

### 13.1. Canvas-komponent
```typescript
// Canvas.test.ts
describe('Canvas Component', () => {
  beforeEach(() => {
    // Setup test canvas
  });
  
  test('should render all objects correctly', () => {
    // Test rendering
  });
  
  test('should handle selection of objects', () => {
    // Test object selection
  });
  
  test('should apply transformations to selected objects', () => {
    // Test transformations
  });
});
```

### 13.2. Textflödesmodul
```typescript
// text-flow.test.ts
describe('TextFlow Module', () => {
  test('should calculate correct capacity for a textbox', () => {
    // Test capacity calculation
  });
  
  test('should split text correctly based on textbox capacity', () => {
    // Test text splitting
  });
  
  test('should update linked textboxes when source changes', () => {
    // Test update propagation
  });
});
```

### 13.3. Dokumentmodel
```typescript
// document-store.test.ts
describe('Document Store', () => {
  test('should create a new document with default values', () => {
    // Test document creation
  });
  
  test('should add a page to document', () => {
    // Test page addition
  });
  
  test('should save and restore document from storage', () => {
    // Test persistence
  });
});
```

## 14. Uppstart och integration av testning i projektet

### 14.1. Första veckan
1. Konfigurera Vitest och Testing Library
2. Skapa testmiljö för Svelte-komponenter
3. Skriva första testsuiten för enkla klasser/hjälpare
4. Etablera GitHub Actions för automatiserad testning

### 14.2. Utbildning
1. Genomföra kort TDD-workshop för teamet
2. Skapa dokumentation och exempel på mönster för testning
3. Etablera rutiner för parprogrammering för testning

### 14.3. Första testbara komponenter
1. Simpel Canvas-rendering
2. Dokument datamodell
3. Verktygspalett interaktion
4. Lagringsmekanismer

## 15. Kontinuerlig förbättring av teststrategi

Projektets teststrategi kommer att utvärderas och förbättras kontinuerligt:

1. Sprint-retrospektiv ska innehålla testerfarhetsdelning
2. Indikatorer för testkvalitet (flaky tests, täckning, etc.) övervakas
3. Teststrategin uppdateras baserat på nya lärdomar
4. Testautomatisering förbättras under projektet