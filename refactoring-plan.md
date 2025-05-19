# PageStudio Refactoring Plan

Detta dokument beskriver refaktoreringsplanen för PageStudio-projektet, med fokus på att implementera en service-baserad arkitektur för att eliminera kodduplicering och förbättra underhållbarheten.

## Genomförda refaktoreringar

- [x] Implementera grundläggande service-struktur (DocumentService, CanvasService, MasterPageService)
- [x] Refaktorera Canvas.svelte för att använda services
- [x] Uppdatera DocumentManager.js för att använda DocumentService
- [x] Uppdatera AutoSaveManager.js för att använda DocumentService  
- [x] Refaktorera MasterPageEditor.svelte för att använda MasterPageService
- [x] Refaktorera MasterPagePanel.svelte för att använda MasterPageService

## Pågående refaktorering

1. **Implementera ServiceProvider-komponent** 
   - [x] Skapa en centraliserad ServiceProvider.svelte-komponent 
   - [ ] Placera i applikationens rotelement för användning i hela applikationen

2. **Refaktorera Canvas.events.js**
   - [x] Flytta event-hantering från Canvas.events.js till CanvasEventService
   - [x] Centralisera hantering av musklick, tangentbordshändelser och användarinteraktioner
   - [x] Integrera CanvasEventService med CanvasService
   - [x] Skriva enhetstester för CanvasEventService
   - [x] Uppdatera enhetstester för CanvasService

## Pågående refaktorering

3. **Uppdatera Canvas-moduler**
   - [x] Refaktorera Canvas.grid.js till GridService
   - [x] Refaktorera Canvas.guides.js till GuideService 
   - [x] Refaktorera Canvas.layers.js till LayerService
   - [x] Refaktorera Canvas.objects.js till ObjectService
   - [x] Refaktorera Canvas.document.js till DocumentModuleService
   - [ ] Refaktorera övriga Canvas-moduler för att eliminera duplicerad kod

## Återstående refaktoreringar

4. **Integrera toolbar-komponenter**
   - [ ] Uppdatera Toolbar.svelte för att använda services
   - [ ] Uppdatera DrawingTools.svelte för att använda services
   - [ ] Uppdatera övriga toolbar-komponenter

5. **Implementera tester**
   - [ ] Skriv enhetstester för DocumentService
   - [ ] Skriv enhetstester för CanvasService
   - [ ] Skriv enhetstester för MasterPageService
   - [ ] Uppdatera befintliga tester för att använda service-strukturen

6. **Dokumentera arkitekturen**
   - [ ] Skapa en arkitekturdokumentation för service-baserad arkitektur
   - [ ] Inkludera diagram över komponentberoenden och dataflöden

7. **Skapa migreringsguide**
   - [ ] Dokumentera hur utvecklare kan migrera befintliga komponenter
   - [ ] Inkludera kodexempel för vanliga användningsfall

8. **Implementera lazy loading**
   - [ ] Modifiera services för att stödja lazy loading
   - [ ] Förbättra prestanda vid applikationsstart

9. **Skapa debugging-verktyg**
   - [ ] Implementera verktygspanel för service-status
   - [ ] Förenkla felsökning under utveckling

10. **Uppdatera applikationens initialisering**
    - [ ] Ändra applikationens uppstartssekvens
    - [ ] Säkerställa korrekt ordning vid service-initialisering

## Technical Debt och framtida förbättringar

- Överväg att flytta till TypeScript för bättre typsäkerhet
- Implementera state management med tillståndsmaskiner för komplexa processer
- Förbättra felhantering och loggning i services
- Implementera prestandaoptimering för stora dokument