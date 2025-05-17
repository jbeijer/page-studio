# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PageStudio is a web-based InDesign alternative for creating magazine layouts and publications. The application allows users to design and edit publications with an intuitive WYSIWYG editor and export them as print-ready PDFs.

## Development Environment

### Tech Stack
- **Frontend Framework**: SvelteKit
- **Canvas Manipulation**: Fabric.js
- **Styling**: TailwindCSS
- **PDF Generation**: jsPDF
- **Storage**: IndexedDB (client-side)
- **Testing**: Vitest, Testing Library, Playwright

### Setup Commands

```bash
# Install dependencies
npm install

# Start development server (will be run manually in a separate terminal)
# Do NOT run this command using Claude - let the user run it manually
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing Commands

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run end-to-end tests
npm run test:e2e
```

## Code Architecture

PageStudio follows a component-based architecture with Svelte. Key architectural components include:

### Data Model
- **Document Model**: Stores document structure including pages, objects, and styles
- **Editor State**: Manages UI state like selected tool, objects, zoom level
- **Storage System**: Handles saving/loading documents from IndexedDB

### Core Components
- **Canvas Editor**: The central component that handles rendering and editing
- **Tool System**: Modular system for various editing tools (text, image, shape)
- **Page Management**: Handles multi-page documents and navigation
- **Export System**: Manages PDF generation and export settings

## Best Practices

### Security Guidelines

1. **No API Keys in Code**: Never commit API keys, tokens, or credentials into the codebase. Use environment variables for any sensitive values.

2. **Input Validation**: Validate all user inputs, especially when importing external files or data.

3. **Safe Data Handling**: Be cautious with localStorage/IndexedDB storage; sanitize data before storing or retrieving.

4. **Third-party Resources**: Validate and sanitize external resources (fonts, images) before using them.

5. **Link Protection**: Use CSP headers and validate URLs before loading external resources.

6. **Data Sanitization**: Always sanitize any data displayed in the DOM to prevent XSS attacks.

### Code Quality Standards

1. **TDD Approach**: Follow test-driven development by writing tests before implementation.

2. **TypeScript Usage**: Use TypeScript for type safety where possible.

3. **Component Isolation**: Keep components focused and isolated with clear responsibilities.

4. **State Management**: Use Svelte stores efficiently and avoid global state when possible.

5. **Error Handling**: Implement proper error handling and user feedback mechanisms.

6. **Performance Considerations**: Be mindful of canvas performance with large documents.

## Key Locations

- `/src/lib/stores/` - Svelte stores for global state management
- `/src/lib/components/Editor/` - Main canvas editing components
- `/src/lib/utils/` - Utility functions for PDF export, storage, etc.
- `/src/routes/` - SvelteKit route components and pages

## Implementation Notes

When implementing new features, follow these guidelines:

1. Study similar existing implementations in the codebase
2. Write tests first following the test-driven approach
3. Consider both desktop and mobile UX where applicable
4. Document complex algorithms or workflows with comments
5. Ensure proper error handling for edge cases
6. Test thoroughly with large documents for performance issues

## External Documentation Access

Claude has access to the Context7 MCP tools which provide up-to-date documentation for libraries used in this project. This enables:

- Access to current documentation for frameworks and libraries
- Ability to look up API references and usage examples 
- Retrieving best practices from official documentation
- Getting information about library versions and compatibility

Use these capabilities when implementing features that require specific library knowledge.