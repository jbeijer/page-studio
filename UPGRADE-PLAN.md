# Upgrade Plan for PageStudio

This document outlines the plan for upgrading PageStudio's dependencies and addressing current compatibility issues.

## Current Status

We've temporarily downgraded from Svelte 5 to Svelte 4 and made compatibility fixes for the following reasons:

1. Svelte 5 runes mode introduced breaking changes in the component syntax
2. fabric.js APIs differ between versions 5.x and 6.x
3. Some TailwindCSS syntax issues (@apply directives) needed to be addressed

### Implemented Solutions

- Created a fabric-helpers.js module with version detection and text object factories
- Updated tests to be compatible with the new modular structure
- Replaced TailwindCSS @apply directives with standard CSS
- Fixed accessibility issues in form controls
- Updated package.json dependencies for compatibility:
  - Changed from Svelte 5.30.1 to Svelte 4.2.12
  - Changed from SvelteKit 2.21.0 to SvelteKit 1.27.0
  - Changed from Fabric.js 6.6.5 to Fabric.js 5.3.0
  - Updated svelte.config.js to disable runes mode

### Fixed Issues

1. **Fabric.js Integration**:
   - Created `fabric-helpers.js` for version-agnostic code
   - Implemented text object factory that handles Textbox, IText, and Text differences
   - Fixed Canvas initialization with proper error handling
   - Updated Canvas.document.js for compatible object creation

2. **Accessibility Improvements**:
   - Added proper label-input associations in PropertiesPanel
   - Replaced div elements with button elements in PageNavigator
   - Added keyboard event handling for better accessibility
   - Improved focus management in UI components

3. **Test Suite**:
   - Updated fabric.js mocks in setupTests.js
   - Created specific tests for fabric-helpers.js
   - Updated component tests to work with the refactored structure
   - Fixed test expectations to match the new modular approach

## Future Upgrade Path

### Phase 1: Stabilize Current Codebase (Complete)

- [x] Ensure all tests pass with current downgraded dependencies
- [x] Document the current state and workarounds
- [x] Update test mocks to properly handle refactored code
- [x] Fix fabric.js initialization and text object handling
- [x] Resolve test suite failures

### Phase 2: Fabric.js Upgrade (Short-term)

- [ ] Fully test fabric-helpers.js with both 5.x and 6.x versions
- [ ] Add comprehensive tests for fabric.js version-specific behavior
- [ ] Handle all edge cases in object serialization/deserialization
- [ ] Upgrade to fabric.js 6.x once all helpers are in place

### Phase 3: Svelte 5 Preparation (Medium-term)

- [ ] Create a branch for Svelte 5 migration
- [ ] Test with Svelte 5 in non-runes mode first
- [ ] Update component syntax for Svelte 5 runes compatibility
- [ ] Address reactivity model changes required by Svelte 5
- [ ] Test all components with Svelte 5

### Phase 4: Full Upgrade (Long-term)

- [ ] Complete upgrade to Svelte 5 with runes mode
- [ ] Upgrade SvelteKit to latest version
- [ ] Upgrade all supporting dependencies
- [ ] Review and update application architecture based on Svelte 5 best practices

## Specific Needed Changes

### Fabric.js Compatibility

- **Text Objects**: Continue using the text object factory pattern to handle differences between Textbox, IText, and Text
- **Canvas Creation**: Use the canvas creation helper to handle initialization differences
- **Object Serialization**: Ensure cross-version compatibility in JSON serialization

### Svelte 5 Migration

- **Component Props**: Convert `export let` to `$props` syntax
- **Reactivity**: Update reactive declarations and stores
- **Events**: Update event handling and dispatching
- **Context**: Update context API usage

### Testing

- **Test Mocks**: Ensure all mocks are updated to match the new APIs
- **Component Testing**: Adapt to new component structure
- **Integration Testing**: Add more integration tests for critical features

## Dependencies to Update

When upgrading, the following dependencies need special attention:

```json
{
  "svelte": "^5.x",
  "@sveltejs/kit": "^2.x",
  "@sveltejs/adapter-auto": "^3.x",
  "vite": "^6.x",
  "fabric": "^6.x",
  "tailwindcss": "^4.x"
}
```

## Immediate Next Steps

1. Continue optimization of document loading and canvas object recreation
2. Enhance robustness in the loading process
3. Continue refactoring of larger components for better maintainability
4. Create clearer interfaces between modules

## Conclusion

This phased approach allows us to maintain a working application while systematically addressing compatibility issues. The modular refactoring we've already completed makes these upgrades easier by isolating affected components and providing clear interfaces.

---

*This document will be updated as additional issues are identified or solutions implemented.*