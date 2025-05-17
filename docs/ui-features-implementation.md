# UI-funktioner Implementationsdetaljer

## Objekt-lagerhantering

### Översikt
Objekt-lagerhantering, även känt som z-index hantering, ger användare möjlighet att kontrollera objekt-ordningen på canvas genom att flytta objekt framåt eller bakåt i visningsordningen (z-ordningen). Detta är en kritisk funktion för layout-applikationer.

### Datamönster
Vi har implementerat lagerhantering genom att utnyttja Fabric.js inbyggda objektordning och tillhandahålla följande funktioner:
- **bringForward**: Flyttar objektet ett lager uppåt
- **sendBackward**: Flyttar objektet ett lager nedåt
- **bringToFront**: Placerar objektet överst i lagringsordningen
- **sendToBack**: Placerar objektet nederst i lagringsordningen

### Implementation
Implementationen finns primärt i två filer:

1. **Canvas.helpers.js** - Innehåller grundfunktionaliteten för lagerhantering:
   - Separata funktioner för varje lagringsoperation
   - Stöd för gruppselektioner (multiple-objekt)
   - Validering för att förhindra manipulation av mallsideobjekt
   - Integration med historikhantering för att möjliggöra ångra/gör om

2. **Toolbar.svelte** - Innehåller UI-kontrollen för lagerhantering:
   - Knappar för varje lageroperation
   - Visuell feedback om objektet kan manipuleras
   - Keyboard shortcuts (Ctrl+], Ctrl+[, etc.)

### Tekniska detaljer
- Varje lageroperation följs av ett anrop till `canvas.renderAll()` för att uppdatera vyn
- Objektets position i canvas sparas automatiskt efter varje lageroperation
- Vi sorterar objekt baserat på deras z-index när gruppselektioner hanteras för att undvika konflikter
- Funktionerna skyddar mot att ändra mallsideobjekt (`fromMaster`-egenskapen)

### Kopiera/klippa ut/klistra in-funktionalitet

Implementationen av kopiera/klippa ut/klistra in-funktionaliteten är integrerad med lagerhanteringen och använder samma grundläggande arkitektur. Funktionerna är implementerade i `Canvas.helpers.js`:

- **copySelectedObjects**: Kopierar valda objekt till clipboardet
- **cutSelectedObjects**: Klipper ut valda objekt (kopiera + ta bort)
- **pasteObjects**: Klistrar in objekt från clipboardet med en liten offset

Alla funktioner har stöd för gruppselektioner och följer samma mönster för objektpersistens som lagerhanteringsfunktionerna.

### Testning
Vi har implementerat enhetstester för all lagerhanteringsfunktionalitet i `Canvas.test.js`, inklusive tester för:
- Felhantering när inget objekt är valt
- Korrekt hantering av gruppselektioner
- Kontroll av mallsideobjekt-skydd
- Integration med canvas-sparning

### Framtida förbättringar
- Implementera visuell lagerhanteringspanel för att se och manipulera objekt-stacken
- Lägga till lagergrupper för att organisera objekt i logiska grupper
- Förbättra visuell feedback för objektens z-position