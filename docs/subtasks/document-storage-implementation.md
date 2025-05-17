# Dokumentlagring - Implementation

Detta dokument beskriver implementationen av dokumentlagringsfunktionaliteten i PageStudio.

## Översikt

Dokumentlagringsfunktionaliteten använder IndexedDB för att persistent lagra och hantera dokument lokalt i webbläsaren. Detta möjliggör för användare att skapa, spara, ladda och hantera dokument i applikationen utan att behöva förlita sig på en server.

## Tekniska detaljer

### Datamodell

- **Documents Store**: Lagrar fullständiga dokument med all canvas-data
  - Primärnyckel: `id` (genereras automatiskt vid skapande)
  - Index: `lastModified` (för att visa dokument sorterade efter senaste ändring)
  - Index: `title` (för sökning baserat på namn)

- **Templates Store**: Lagrar dokumentmallar för återanvändning
  - Primärnyckel: `id`
  - Index: `category` (för gruppering av mallar)
  - Index: `name` (för sökning baserat på namn)

### Huvudkomponenter

1. **storage.js** - Core utility för IndexedDB-interaktion:
   - `openDatabase()` - Initierar och ansluter till databasen
   - `saveDocument()` - Sparar ett dokument
   - `loadDocument()` - Laddar ett dokument baserat på ID
   - `getDocumentList()` - Hämtar en lista med alla dokument
   - `deleteDocument()` - Raderar ett dokument
   - `saveTemplate()` - Sparar en mall
   - `getTemplateList()` - Hämtar en lista med alla mallar

2. **DocumentList.svelte** - UI-komponent för att visa och hantera dokument:
   - Visar lista med befintliga dokument
   - Möjliggör öppnande av dokument
   - Ger funktionalitet för att radera dokument
   - Visar metainformation om varje dokument

3. **Editor Integration** - Canvas och editor integration:
   - Automatisk sparning när användaren redigerar dokument
   - Redigerbar dokumenttitel
   - JSON-serialisering av canvas-objekt med länkrelationer
   - Fullständig återställning av textflöde när dokument laddas

## Serialiseringshantering

En av de största tekniska utmaningarna var att korrekt serialisera och deserialisera canvas-objekt, särskilt textrutor med länkrelationer.

- Vi använder custom properties (`id` och `linkedObjectIds`) för att spåra textlänkar
- När vi sparar canvas JSON använder vi `JSON.stringify(canvas.toJSON(['id', 'linkedObjectIds']))`
- När vi laddar ett dokument återställer vi dessa länkar genom att ansluta event handlers
- Textflödet uppdateras automatiskt för att säkerställa korrekt flöde efter laddning

## Användargränssnitt

För användaren består funktionaliteten av:

1. **Dokumentlista** - Startskärmen som visar alla sparade dokument:
   - Visar dokumenttitel
   - Visar antal sidor
   - Visar senaste ändringsdatum
   - Knappar för att öppna eller radera dokument

2. **Editor Integration**:
   - Automatisk sparning av arbete
   - Möjlighet att ändra dokumenttitel
   - Indikation när dokumentet sparas
   - Back-knapp för att återgå till dokumentlistan

## Felhantering

Implementationen hanterar flera typer av fel:

- Databasanslutningsfel
- Läs- och skrivfel
- JSON-deserializeringsfel
- Generella IndexedDB-transaktionsfel

Vid fel visas användarvänliga felmeddelanden och applikationen försöker återställa sig själv till ett fungerande tillstånd.

## Framtida förbättringar

Följande förbättringar är planerade för dokumentlagringsfunktionaliteten:

1. **Molnlagring** - Synkronisering med molnlagring för att möjliggöra delning mellan enheter
2. **Versionshantering** - Stöd för att spara och återgå till tidigare versioner av dokument
3. **Export/Import** - Möjlighet att exportera och importera dokument från/till lokal fil
4. **Kategorisering** - Organisera dokument i mappar eller med taggar
5. **Sökfunktionalitet** - Möjlighet att söka i dokumentlistan
6. **Dupliceringsfunktion** - Skapa kopior av befintliga dokument
7. **Automatisk backup** - Periodiska säkerhetskopior för att förhindra dataförlust

## Testning

Dokumentlagringsfunktionaliteten testas med följande metoder:

1. **Unit Testing** - Testar enskilda funktioner i storage.js
2. **Integration Testing** - Testar interaktionen mellan storage och dokumentmodellen
3. **UI Testing** - Testar dokumentlistans funktionalitet och användarupplevelse
4. **Edge Case Testing** - Testar felhantering och återhämtning

Tester finns i `storage.test.js` och körs som del av CI/CD-pipeline.