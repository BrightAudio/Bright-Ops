const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, '../public/bright-ops-logo.svg');
const outputPath = path.join(__dirname, '../public/icon.png');

sharp(inputPath)
  .resize(256, 256, {
    fit: 'contain',
    background: { r: 255, g: 255, b: 255, alpha: 1 }
  })
  .png()
  .toFile(outputPath)
  .then(info => {
    console.log('✅ Icon generated:', info.path);
  })
  .catch(err => {
    console.error('❌ Icon generation failed:', err);
    process.exit(1);
  });
