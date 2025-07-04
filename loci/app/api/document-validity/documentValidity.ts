// lib/runVerificationChecks.ts
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { fromPath as pdf2picFromPath } from 'pdf2pic';
import fs from 'fs';
import os from 'os';
import path from 'path';

export async function runVerificationChecks(base64Data: string) {
  try {
    // Clean base64 string if it has data URL prefix
    let cleanBase64 = base64Data;
    if (base64Data.startsWith('data:')) {
      cleanBase64 = base64Data.split(',')[1];
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(cleanBase64, 'base64');
    if (buffer.length === 0) {
      return {
        authenticityScore: 0,
        issuesFound: ['Invalid or empty file data']
      };
    }

    const mimeType = await getMimeType(buffer);
    
    if (mimeType.startsWith('image/')) {
      return await verifyImage(buffer);
    } else if (mimeType === 'application/pdf') {
      return await verifyPDF(buffer);
    } else {
      return {
        authenticityScore: 0,
        issuesFound: [`Unsupported file type: ${mimeType}`]
      };
    }
  } catch (error) {
    console.error('Error in runVerificationChecks:', error);
    return {
      authenticityScore: 0,
      issuesFound: [`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

async function verifyImage(buffer: Buffer) {
  let worker = null;
  
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    let text = '';
    let ocrConfidence = null;
    try {
      // Create and initialize Tesseract worker properly
      worker = await createWorker('eng');
      const { data } = await worker.recognize(buffer);
      text = data.text || '';
      ocrConfidence = data.confidence !== undefined ? data.confidence : null;
    } catch (ocrError) {
      console.warn('OCR failed:', ocrError);
    } finally {
      // Always terminate the worker to prevent memory leaks
      if (worker) {
        await worker.terminate();
      }
    }

    const issues = [];

    if (metadata.format !== 'jpeg' && metadata.format !== 'png') {
      issues.push(`Unexpected image format: ${metadata.format}`);
    }

    // Check for extremely small images (possible manipulation)
    if (metadata.width && metadata.height &&
        (metadata.width < 100 || metadata.height < 100)) {
      issues.push('Image dimensions are suspiciously small');
    }

    // --- New: OCR confidence check ---
    if (ocrConfidence !== null && ocrConfidence < 60) {
      issues.push(`OCR confidence is low (${ocrConfidence}). Image may be blurry or unclear.`);
    }

    // --- New: Extracted text length check ---
    if (!text || text.trim().length < 20) {
      issues.push('Extracted text is too short. Document may be unreadable or unclear.');
    }

    // --- New: Blur/sharpness check ---
    // Convert to greyscale and get raw pixel data
    const greyscale = await image
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = greyscale.data;
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Compute Laplacian variance (simple blur detection)
    function laplacianVariance(pixels: Buffer, width: number, height: number): number {
      // 3x3 Laplacian kernel
      const kernel = [
        0,  1, 0,
        1, -4, 1,
        0,  1, 0
      ];
      let sum = 0;
      let sumSq = 0;
      let count = 0;
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let lap = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const px = x + kx;
              const py = y + ky;
              const pixelVal = pixels[py * width + px];
              lap += kernel[(ky + 1) * 3 + (kx + 1)] * pixelVal;
            }
          }
          sum += lap;
          sumSq += lap * lap;
          count++;
        }
      }
      const mean = sum / count;
      const variance = sumSq / count - mean * mean;
      return variance;
    }

    let blurVariance = null;
    if (width > 2 && height > 2) {
      blurVariance = laplacianVariance(pixels, width, height);
      if (blurVariance < 100) {
        issues.push(`Image appears blurry (sharpness score: ${blurVariance.toFixed(2)}).`);
      }
    }

    // --- Suspicious Edges Detection (Border Analysis) ---
    // Use Sobel edge detection to find strong edges near the borders
    function sobelEdgeMagnitude(pixels: Buffer, width: number, height: number): number[][] {
      // Sobel kernels
      const gx = [
        -1, 0, 1,
        -2, 0, 2,
        -1, 0, 1
      ];
      const gy = [
        -1, -2, -1,
         0,  0,  0,
         1,  2,  1
      ];
      const mag: number[][] = [];
      for (let y = 1; y < height - 1; y++) {
        mag[y] = [];
        for (let x = 1; x < width - 1; x++) {
          let sx = 0, sy = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const px = x + kx;
              const py = y + ky;
              const val = pixels[py * width + px];
              sx += gx[(ky + 1) * 3 + (kx + 1)] * val;
              sy += gy[(ky + 1) * 3 + (kx + 1)] * val;
            }
          }
          mag[y][x] = Math.sqrt(sx * sx + sy * sy);
        }
      }
      return mag;
    }

    let suspiciousEdgeScore = null;
    if (width > 10 && height > 10) {
      const edgeMag = sobelEdgeMagnitude(pixels, width, height);
      // Analyze border regions (5% from each edge)
      const borderSizeX = Math.max(2, Math.floor(width * 0.05));
      const borderSizeY = Math.max(2, Math.floor(height * 0.05));
      let borderSum = 0, borderCount = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (
            x < borderSizeX || x >= width - borderSizeX ||
            y < borderSizeY || y >= height - borderSizeY
          ) {
            // Only count valid edgeMag values
            if (edgeMag[y] && edgeMag[y][x] !== undefined) {
              borderSum += edgeMag[y][x];
              borderCount++;
            }
          }
        }
      }
      const avgBorderEdge = borderCount > 0 ? borderSum / borderCount : 0;
      suspiciousEdgeScore = avgBorderEdge;
      if (avgBorderEdge > 60) {
        issues.push('Strong/suspicious edges detected near document borders (possible cropping or tampering).');
      }
    }

    // --- Inconsistent Quality Regions (Block-wise Sharpness) ---
    function blockSharpness(pixels: Buffer, width: number, height: number, grid=4): { blockVars: number[], std: number, mean: number } {
      const blockVars: number[] = [];
      const blockW = Math.floor(width / grid);
      const blockH = Math.floor(height / grid);
      for (let by = 0; by < grid; by++) {
        for (let bx = 0; bx < grid; bx++) {
          const x0 = bx * blockW;
          const y0 = by * blockH;
          const x1 = bx === grid-1 ? width : x0 + blockW;
          const y1 = by === grid-1 ? height : y0 + blockH;
          // Extract block pixels
          const blockPix: number[] = [];
          for (let y = y0+1; y < y1-1; y++) {
            for (let x = x0+1; x < x1-1; x++) {
              blockPix.push(pixels[y * width + x]);
            }
          }
          // Compute Laplacian variance for block
          if (blockPix.length > 0) {
            const blockBuf = Buffer.from(blockPix);
            blockVars.push(laplacianVariance(blockBuf, x1-x0, y1-y0));
          }
        }
      }
      const mean = blockVars.reduce((a, b) => a + b, 0) / blockVars.length;
      const std = Math.sqrt(blockVars.reduce((a, b) => a + (b-mean)*(b-mean), 0) / blockVars.length);
      return { blockVars, std, mean };
    }

    let blockSharpnessStats = null;
    if (width > 16 && height > 16) {
      blockSharpnessStats = blockSharpness(pixels, width, height, 4);
      if (blockSharpnessStats.std > 100) {
        issues.push('Inconsistent quality detected: some regions are much blurrier or sharper than others (possible tampering or patching).');
      }
    }

    // Score: subtract 20 for each issue
    const authenticityScore = Math.max(0, 100 - (issues.length * 20));

    return {
      authenticityScore,
      issuesFound: issues,
      extractedText: text.trim(),
      ocrConfidence,
      blurVariance,
      suspiciousEdgeScore,
      blockSharpnessStats,
    };
  } catch (error) {
    console.error('Error verifying image:', error);
    return {
      authenticityScore: 0,
      issuesFound: [`Image verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      extractedText: '',
    };
  }
}

async function verifyPDF(buffer: Buffer) {
  let worker = null;
  let tempPDFPath = '';
  try {
    // Write buffer to a temp file
    tempPDFPath = path.join(os.tmpdir(), `docvalid_temp_${Date.now()}.pdf`);
    fs.writeFileSync(tempPDFPath, buffer);

    // Convert each page to image and OCR
    const pdf2pic = pdf2picFromPath(tempPDFPath, {
      density: 200,
      format: 'png',
      saveFilename: `docvalid_page_${Date.now()}`,
      savePath: os.tmpdir(),
    });
    // Get number of pages (pdf2pic.info is not available, so try to convert until fail or use a library to count pages)
    // We'll use a simple approach: try up to 20 pages, stop if conversion fails
    let extractedText = '';
    let totalConfidence = 0;
    let pageCount = 0;
    const issues = [];
    worker = await createWorker('eng');
    for (let page = 1; page <= 20; page++) {
      try {
        const result = await pdf2pic(page);
        const pageImagePath = result.path;
        if (!pageImagePath) break;
        const pageBuffer = fs.readFileSync(pageImagePath);
        const { data } = await worker.recognize(pageBuffer);
        extractedText += data.text + '\n';
        totalConfidence += data.confidence;
        pageCount++;
        fs.unlinkSync(pageImagePath);
        // Stop if the image is empty (pdf2pic returns a blank image for non-existent pages)
        if (!data.text || data.text.trim().length === 0) break;
      } catch {
        break;
      }
    }
    if (pageCount === 0) {
      issues.push('No readable pages found in PDF.');
    }
    const ocrConfidence = pageCount > 0 ? totalConfidence / pageCount : 0;
    if (ocrConfidence < 60) {
      issues.push(`OCR confidence is low (${ocrConfidence}). PDF may be blurry or unclear.`);
    }
    if (!extractedText || extractedText.trim().length < 20) {
      issues.push('Extracted text is too short. Document may be unreadable or unclear.');
    }
    const authenticityScore = Math.max(0, 100 - (issues.length * 20));
    // Clean up temp PDF
    fs.unlinkSync(tempPDFPath);
    if (worker) await worker.terminate();
    return {
      authenticityScore,
      issuesFound: issues,
      extractedText: extractedText.trim(),
      ocrConfidence,
    };
  } catch (error) {
    if (worker) await worker.terminate();
    if (tempPDFPath && fs.existsSync(tempPDFPath)) fs.unlinkSync(tempPDFPath);
    console.error('Error verifying PDF:', error);
    return {
      authenticityScore: 0,
      issuesFound: [`PDF verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      extractedText: '',
    };
  }
}

async function getMimeType(buffer: Buffer): Promise<string> {
  try {
    // Use dynamic import for ES modules in Node.js environment
    const { fileTypeFromBuffer } = await import('file-type');
    const type = await fileTypeFromBuffer(buffer);
    return type?.mime || 'application/octet-stream';
  } catch (error) {
    console.error('Error detecting file type:', error);
    return 'application/octet-stream';
  }
}