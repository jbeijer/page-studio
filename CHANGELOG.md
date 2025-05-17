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
- Texthantering i redigeraren
- Bildimport och -hantering
- Lokal lagring med IndexedDB
- Sidnavigering för multipage-dokument
- TestDriven Development (TDD) uppsättning med Vitest
- Implementationsplan och teknisk dokumentation
- Skapat mapp-strukturen för /docs med detaljerad dokumentation

### Changed
- Flyttade all projektdokumentation till `/docs`-mappen
- Standardgrennamn från "master" till "main"

### Fixed
- TailwindCSS-konfigurationen för kompatibilitet med Svelte 5
- Event-attribut syntax i Svelte-komponenter för att följa Svelte 5-standard

## [0.1.0] - 2025-05-17
### Added
- Initial commit av PageStudio-projektet
- Dokumentation av projektets arkitektur och plan
- Detaljerade implementationsplaner för textflöde, PDF-export och mallsidor
- Testning och CI/CD-konfiguration
- Riskvärdering och MVP-definition

[Unreleased]: https://github.com/jbeijer/page-studio/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jbeijer/page-studio/releases/tag/v0.1.0