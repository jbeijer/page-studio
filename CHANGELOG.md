# Changelog

Alla betydande ändringar i projektet kommer att dokumenteras i denna fil.

Formatet är baserat på [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
och projektet följer [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial projektstruktur med SvelteKit, Fabric.js och TailwindCSS
- Grundläggande canvas-editor med Fabric.js
- Dokumentmodell för multipage-dokument
- Grundläggande PDF-exportfunktionalitet
- Sidnavigering för multipage-dokument
- TestDriven Development (TDD) uppsättning med Vitest
- Implementationsplan och teknisk dokumentation
- Skapat mapp-strukturen för /docs med detaljerad dokumentation
- Avancerad toolbar med verktygsväljare för olika objekttyper
- Fullständig textredigeringskomponent med formatering
- Implementerat verktyg för rektanglar, linjer och ellipser
- Textflödesfunktionalitet mellan länkade textrutor
- Stöd för objekt-transformation (rotera, skala)
- Bildimport och -hantering
- Komplett test-suite för textflödesfunktionaliteten
- Komplett dokumentlagring med IndexedDB
- Funktionalitet för att skapa, spara och ladda dokument
- Dokumentlistkomponent för att hantera tidigare dokument
- Stöd för dokumentmetadata (titel, skapare, datum)
- Automatisk sparning av canvas-tillstånd
- Avancerad JSON-serialisering av canvas-objekt med länkrelationer
- Stöd för mallsidor (master pages) med applikation på en eller alla sidor
- Överriding av mallsideobjekt på specifika sidor
- UI för att hantera mallsidor via en speciell panel
- Möjlighet att redigera mallsidor separat från dokumentsidor
- Ångra/göra om-funktionalitet med historikhantering
- Stöd för att ta bort objekt via Delete-tangenten eller knapp
- Implementerat konfigurerbart rutnät med SVG-baserad rendering
- Utvecklat rulers (horisontell och vertikal) för precisa mätningar
- Implementerat funktionalitet för dragbara hjälplinjer
- Implementerat snappning till rutnät för exakt objektplacering

### Changed
- Flyttade all projektdokumentation till `/docs`-mappen
- Standardgrennamn från "master" till "main"
- Uppdaterade task-list.md för att reflektera aktuellt projektläge
- Förbättrade TextEditingPanel med stöd för avancerad textformatering
- Optimerad canvas-hantering för bättre prestanda
- Förbättrad hemsida med dokumenthantering
- Uppdaterad navigation med redigerbar dokumenttitel
- Refaktorerad kod för bättre modularitet genom uppdelning i mindre komponenter
- Förbättrad grid-rendering med SVG-baserad approach för exakt pixelrendering
- Omstrukturerad Canvas.svelte med separata moduler för grid och guides

### Fixed
- TailwindCSS-konfigurationen för kompatibilitet med Svelte 5
- Event-attribut syntax i Svelte-komponenter för att följa Svelte 5-standard
- Tillgänglighetsproblem i knappar utan textinnehåll
- Problem med objekt som försvinner vid sidbyte i canvas-editorn
- Fabric.js import-syntaxen för korrekt användning av biblioteket
- Objekt-persistens vid sidbyte genom implementation av en mer robust laddningsmekanism
- Direkt IndexedDB-åtkomst för att säkerställa att senaste data alltid används
- Åtgärdat problem med "snöiga" grid-linjer genom att använda SVG istället för CSS
- Löst issues med subpixel-rendering i grid-komponenten
- Fixat rendering av guides genom förbättrad positionering
- Korrigerat JSDoc-syntax i Canvas.svelte för korrekt kompilering

## [0.1.0] - 2025-05-17
### Added
- Initial commit av PageStudio-projektet
- Dokumentation av projektets arkitektur och plan
- Detaljerade implementationsplaner för textflöde, PDF-export och mallsidor
- Testning och CI/CD-konfiguration
- Riskvärdering och MVP-definition

[Unreleased]: https://github.com/jbeijer/page-studio/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jbeijer/page-studio/releases/tag/v0.1.0