const sharp = require('sharp');
const fs = require('fs');

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed"/>
      <stop offset="100%" style="stop-color:#ec4899"/>
    </linearGradient>
  </defs>
  
  <!-- Background rounded square -->
  <rect width="512" height="512" rx="115" fill="url(#bg)"/>
  
  <!-- Calendar body -->
  <rect x="116" y="160" width="280" height="230" rx="24" 
    fill="white" opacity="0.25"/>
  
  <!-- Calendar header bar -->
  <rect x="116" y="160" width="280" height="70" rx="24" 
    fill="white" opacity="0.4"/>
  <rect x="116" y="200" width="280" height="30" 
    fill="white" opacity="0.4"/>
  
  <!-- Calendar hooks -->
  <rect x="176" y="130" width="22" height="60" rx="11" fill="white"/>
  <rect x="314" y="130" width="22" height="60" rx="11" fill="white"/>
  
  <!-- Checkmark bold -->
  <path d="M168 290 L230 360 L360 210" 
    fill="none" stroke="white" stroke-width="42" 
    stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

async function generateIcons() {
  if (!fs.existsSync('public/icons')) {
    fs.mkdirSync('public/icons', { recursive: true });
  }
  
  const svgBuffer = Buffer.from(svgIcon);
  
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/icons/icon-192x192.png');
  console.log('Generated: icon-192x192.png');
  
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/icons/icon-512x512.png');
  console.log('Generated: icon-512x512.png');
  
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/icons/apple-touch-icon.png');
  console.log('Generated: apple-touch-icon.png');
  
  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
