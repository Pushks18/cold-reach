const fs = require('fs');
const path = require('path');

// Minimal valid 16x16 purple PNG
const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABklEQVQ4jWNgYGBgAAAABQABXvMqGgAAAABJRU5ErkJggg==', 'base64');

const iconsDir = __dirname;
fs.writeFileSync(path.join(iconsDir, 'icons/icon16.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, 'icons/icon48.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, 'icons/icon128.png'), pngBuffer);

console.log('Icons created');
