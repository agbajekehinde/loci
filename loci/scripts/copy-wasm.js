#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '../node_modules/.pnpm/tesseract.js-core@6.0.0/node_modules/tesseract.js-core');
const workerSourceDir = path.join(__dirname, '../node_modules/.pnpm/tesseract.js@6.0.1/node_modules/tesseract.js/dist');
const targetDir = path.join(__dirname, '../public/wasm');

// Ensure target directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Files to copy from tesseract.js-core
const coreFiles = [
  'tesseract-core-simd.wasm',
  'tesseract-core.wasm',
  'tesseract-core-simd-lstm.wasm',
  'tesseract-core-lstm.wasm'
];

// Files to copy from tesseract.js
const workerFiles = [
  'worker.min.js'
];

console.log('Copying WASM files...');

coreFiles.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const targetPath = path.join(targetDir, file);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✓ Copied ${file}`);
  } else {
    console.log(`✗ Source file not found: ${sourcePath}`);
  }
});

console.log('Copying worker files...');

workerFiles.forEach(file => {
  const sourcePath = path.join(workerSourceDir, file);
  const targetPath = path.join(targetDir, file);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✓ Copied ${file}`);
  } else {
    console.log(`✗ Source file not found: ${sourcePath}`);
  }
});

console.log('WASM and worker files copy complete!'); 