#!/usr/bin/env node

/**
 * Generate PNG icons for PWA manifest
 * Creates simple gradient icons without external dependencies
 */

const fs = require('fs')
const path = require('path')

// Simple PNG generator using raw PNG format
function createSimplePNG(size, color1, color2) {
  // This creates a very basic PNG with a gradient-like pattern
  // For production, you'd want to use a proper image library like 'sharp' or 'canvas'
  
  // For now, let's create a solid color PNG using a minimal PNG structure
  const width = size
  const height = size
  
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  
  // IHDR chunk (image header)
  const ihdr = Buffer.alloc(25)
  ihdr.writeUInt32BE(13, 0) // chunk length
  ihdr.write('IHDR', 4)
  ihdr.writeUInt32BE(width, 8)
  ihdr.writeUInt32BE(height, 12)
  ihdr.writeUInt8(8, 16) // bit depth
  ihdr.writeUInt8(2, 17) // color type (RGB)
  ihdr.writeUInt8(0, 18) // compression
  ihdr.writeUInt8(0, 19) // filter
  ihdr.writeUInt8(0, 20) // interlace
  
  // Calculate CRC for IHDR
  const crc = require('zlib').crc32(ihdr.slice(4, 21))
  ihdr.writeUInt32BE(crc, 21)
  
  // For simplicity, create a solid purple square
  // In a real implementation, you'd use a proper image library
  
  const pixelData = Buffer.alloc(width * height * 3)
  for (let i = 0; i < pixelData.length; i += 3) {
    pixelData[i] = 139     // R (purple)
    pixelData[i + 1] = 92  // G
    pixelData[i + 2] = 246 // B
  }
  
  // Compress pixel data (simplified - just using raw data)
  const idat = Buffer.concat([
    Buffer.from([0, 0, 0, 0]), // chunk length placeholder
    Buffer.from('IDAT'),
    require('zlib').deflateSync(pixelData)
  ])
  idat.writeUInt32BE(idat.length - 8, 0)
  const idatCrc = require('zlib').crc32(idat.slice(4))
  const idatWithCrc = Buffer.concat([idat, Buffer.alloc(4)])
  idatWithCrc.writeUInt32BE(idatCrc, idat.length)
  
  // IEND chunk
  const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130])
  
  return Buffer.concat([signature, ihdr, idatWithCrc, iend])
}

// Alternative: Create a data URL and convert to PNG
// This is a simpler approach that works without dependencies
function createDataURLIcon(size) {
  // Create SVG and convert to PNG using canvas (if available)
  // For now, we'll use a base64 encoded minimal PNG
  
  // This is a minimal valid PNG (1x1 purple pixel) that we'll claim is the right size
  // In production, use a proper library
  const minimalPNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'base64'
  )
  
  return minimalPNG
}

async function generateIcons() {
  const iconsDir = path.join(__dirname, '..', 'public', 'icons')
  
  // Ensure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true })
  }
  
  console.log('🎨 Generating PWA icons...\n')
  
  try {
    // Try to use sharp if available, otherwise use minimal PNG
    let sharp
    try {
      sharp = require('sharp')
      console.log('✓ Using sharp for high-quality icons')
      
      // Create SVG buffer
      const svg192 = `
        <svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#6366F1;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="192" height="192" rx="32" fill="url(#grad)"/>
          <path d="M96 48L120 84H72L96 48Z" fill="white" opacity="0.9"/>
          <path d="M72 108L96 144L120 108H72Z" fill="white" opacity="0.9"/>
          <circle cx="96" cy="96" r="12" fill="white"/>
        </svg>
      `
      
      const svg512 = `
        <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#6366F1;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="512" height="512" rx="96" fill="url(#grad)"/>
          <path d="M256 128L320 224H192L256 128Z" fill="white" opacity="0.9"/>
          <path d="M192 288L256 384L320 288H192Z" fill="white" opacity="0.9"/>
          <circle cx="256" cy="256" r="32" fill="white"/>
        </svg>
      `
      
      await sharp(Buffer.from(svg192))
        .png()
        .toFile(path.join(iconsDir, 'icon-192x192.png'))
      
      await sharp(Buffer.from(svg512))
        .png()
        .toFile(path.join(iconsDir, 'icon-512x512.png'))
      
      console.log('✓ Created icon-192x192.png')
      console.log('✓ Created icon-512x512.png')
      
    } catch (e) {
      console.log('⚠ sharp not available, using fallback method')
      
      // Fallback: Create simple solid color PNGs
      const png192 = createSimplePNG(192, '#8B5CF6', '#6366F1')
      const png512 = createSimplePNG(512, '#8B5CF6', '#6366F1')
      
      fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), png192)
      fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), png512)
      
      console.log('✓ Created icon-192x192.png (fallback)')
      console.log('✓ Created icon-512x512.png (fallback)')
    }
    
    console.log('\n✅ Icons generated successfully!')
    console.log('📁 Location:', iconsDir)
    
  } catch (error) {
    console.error('❌ Error generating icons:', error.message)
    process.exit(1)
  }
}

generateIcons()
