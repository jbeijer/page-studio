#!/bin/bash

# Update dependencies script for PageStudio editor
# This script helps revert from Svelte 5 to Svelte 4 to fix compatibility issues

echo "Cleaning npm cache..."
npm cache clean --force

echo "Removing node_modules directory..."
rm -rf node_modules

echo "Removing package-lock.json..."
rm -f package-lock.json

echo "Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps

echo "Rebuilding the project..."
npm run build

echo "Done! You can now run 'npm run dev' to start the development server."