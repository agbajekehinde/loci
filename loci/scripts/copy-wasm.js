import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wasmFiles = [
  'tesseract-core.wasm',
  'tesseract-core-simd.wasm',
  'tesseract-core-simd-lstm.wasm',
  'tesseract-core-lstm.wasm',
];

const srcDir = path.join(__dirname, '../node_modules/.pnpm/tesseract.js-core@6.0.0/node_modules/tesseract.js-core');
const destDirs = [
  path.join(__dirname, '../public/wasm'),
  path.join(__dirname, '../wasm'),
];

destDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

wasmFiles.forEach((file) => {
  const src = path.join(srcDir, file);
  destDirs.forEach((destDir) => {
    const dest = path.join(destDir, file);
    fs.copyFileSync(src, dest);
    console.log(`Copied ${src} to ${dest}`);
  });
}); 