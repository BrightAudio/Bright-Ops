const sharp = require('sharp');

const svg = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="80" ry="80" fill="#1a1a2e"/>
  <polygon points="256,60 448,172 448,372 256,484 64,372 64,172" 
    fill="none" stroke="#F07A1A" stroke-width="24" stroke-linejoin="round"/>
  <line x1="256" y1="60" x2="256" y2="272" stroke="#F07A1A" stroke-width="24" stroke-linecap="round"/>
  <line x1="256" y1="272" x2="64" y2="372" stroke="#F07A1A" stroke-width="24" stroke-linecap="round"/>
  <line x1="256" y1="272" x2="448" y2="372" stroke="#F07A1A" stroke-width="24" stroke-linecap="round"/>
  <polygon points="256,60 448,172 256,272 64,172" fill="#F07A1A" opacity="0.25"/>
  <polygon points="64,172 256,272 256,484 64,372" fill="#F07A1A" opacity="0.15"/>
  <polygon points="448,172 256,272 256,484 448,372" fill="#F07A1A" opacity="0.10"/>
</svg>`;

async function main() {
  // 256x256 for general use
  await sharp(Buffer.from(svg)).resize(256, 256).png().toFile('public/icon.png');
  console.log('Created icon.png (256x256)');

  // Multiple sizes for ICO
  const pngToIco = require('png-to-ico').default;
  const fs = require('fs');
  const sizes = [16, 32, 48, 64, 128, 256];
  const tmpFiles = [];
  for (const size of sizes) {
    const tmpPath = `public/icon-${size}.png`;
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(tmpPath);
    tmpFiles.push(tmpPath);
  }
  const ico = await pngToIco(tmpFiles);
  fs.writeFileSync('public/icon.ico', ico);
  // Clean up temp files
  for (const f of tmpFiles) {
    if (f !== 'public/icon.png') fs.unlinkSync(f);
  }
  console.log('Created icon.ico (multi-size)');
}

main().catch(console.error);
