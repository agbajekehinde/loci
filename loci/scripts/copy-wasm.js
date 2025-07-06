#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '../node_modules/.pnpm/tesseract.js-core@6.0.0/node_modules/tesseract.js-core');
const targetDir = path.join(__dirname, '../public/wasm');
const rootTargetDir = path.join(__dirname, '../wasm');

// Ensure target directories exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}
if (!fs.existsSync(rootTargetDir)) {
  fs.mkdirSync(rootTargetDir, { recursive: true });
}

// Files to copy from tesseract.js-core
const coreFiles = [
  'tesseract-core-simd.wasm',
  'tesseract-core.wasm',
  'tesseract-core-simd-lstm.wasm',
  'tesseract-core-lstm.wasm'
];

console.log('Copying WASM files...');

coreFiles.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const targetPath = path.join(targetDir, file);
  const rootTargetPath = path.join(rootTargetDir, file);
  
  if (fs.existsSync(sourcePath)) {
    // Copy to public/wasm for web serving
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✓ Copied ${file} to public/wasm/`);
    
    // Copy to root wasm for server-side access
    fs.copyFileSync(sourcePath, rootTargetPath);
    console.log(`✓ Copied ${file} to wasm/`);
  } else {
    console.log(`✗ Source file not found: ${sourcePath}`);
  }
});

console.log('WASM files copy complete!'); 