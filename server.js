// Simple static server for development
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import compression from 'compression';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create express server
const app = express();
const PORT = process.env.PORT || 5173;

// Enable CORS for all routes
app.use(cors());

// Enable compression
app.use(compression());

// Serve static files
app.use(express.static(path.join(__dirname, 'build')));

// Handle API routes if needed
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handle all GET requests that don't match API routes - serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n\n 🚀 PageStudio server running at http://localhost:${PORT}\n\n`);
});