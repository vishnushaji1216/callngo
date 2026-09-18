const fs = require('fs');
const path = require('path');

// Base64 of a minimal 512x512 blue PNG icon
const minimalPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const buffer = Buffer.from(minimalPngBase64, 'base64');

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), buffer);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), buffer);
fs.writeFileSync(path.join(iconsDir, 'icon-maskable.png'), buffer);

console.log('Icons generated successfully in public/icons/');
