const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Fallback simple PNG generator if canvas is not installed
function createMinimalPNG(width, height, r, g, b) {
  // We can write a simple SVG or solid PNG buffer
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
}
