# Svelte Downgrade Guide

This document explains how we temporarily downgraded from Svelte 5 to Svelte 4 to fix compatibility issues.

## What Changed

1. Downgraded dependencies in package.json:
   - Svelte: ^5.30.1 → ^4.2.12
   - @sveltejs/kit: ^2.21.0 → ^1.27.0
   - @sveltejs/adapter-auto: ^6.0.1 → ^2.1.1
   - vite: ^6.3.5 → ^4.5.1
   - vitest: ^3.1.3 → ^0.34.6
   - tailwindcss: ^3.4.17 → ^3.3.5
   - fabric: ^6.6.5 → ^5.3.0
   - jsdom: ^26.1.0 → ^22.1.0
   - jspdf: ^3.0.1 → ^2.5.1

2. Updated svelte.config.js:
   - Removed Svelte 5 runes configuration

3. Fixed Canvas.svelte:
   - Replaced `$effect()` with standard Svelte 4 `$:` reactive statements
   - Kept standard `export let` for props

## How to Apply the Changes

To complete the downgrade process, run:

```bash
./update-dependencies.sh
```

If you encounter dependency conflicts, try running:

```bash
npm install --legacy-peer-deps
```

This script will:
1. Clean the npm cache
2. Remove node_modules directory and package-lock.json
3. Install the downgraded dependencies
4. Rebuild the project

After running this script, you should be able to start the development server normally:

```bash
npm run dev
```

## Why Was This Necessary?

The project was experiencing compatility issues with Svelte 5's new "runes" mode, which caused errors like:
- "Cannot use `export let` in runes mode — use `$props()` instead"
- "Uncaught ReferenceError: props is not defined"

Rather than attempt a full migration to Svelte 5's runes syntax (which would require significant changes across all components), we opted to temporarily downgrade to Svelte 4 to maintain stability.

## Future Migration Plan

When ready to migrate to Svelte 5:
1. Update dependencies to Svelte 5
2. Gradually convert components to use Svelte 5 runes syntax:
   - Replace `export let` with `const { prop } = $props()`
   - Replace `$: reactive` with `$effect()`
   - Follow the official Svelte 5 migration guide