// lib/runVerificationChecks.ts
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import exifr from 'exifr';

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

    let exifData = null;
    let hasDeviceInfo = false;
    let hasTimestamp = false;
    let hasGPSData = false;
    let likelyScreenshot = false;
    
    try {
      const exifData = await exifr.parse(buffer);
      
      hasDeviceInfo = !!(exifData?.Make || exifData?.Model);
      hasTimestamp = !!(exifData?.DateTime || exifData?.DateTimeOriginal);
      hasGPSData = !!(exifData?.GPSLatitude && exifData?.GPSLongitude);
      
      const isPNG = metadata.format === 'png';
      likelyScreenshot = isPNG && !hasDeviceInfo && !hasTimestamp;
    } catch (exifError) {
      console.warn('EXIF extraction failed:', exifError);
    }


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

    if (likelyScreenshot) {
      issues.push('Document appears to be a screenshot rather than an original photo');
    }
    
    if (!hasDeviceInfo && metadata.format === 'jpeg') {
      issues.push('JPEG image lacks camera/device information (possible manipulation)');
    }
    
    if (!hasTimestamp) {
      issues.push('Document lacks timestamp information');
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
   let baseScore = 100 - (issues.length * 15);

    if (hasDeviceInfo) baseScore += 5;
    if (hasTimestamp) baseScore += 5;
    if (hasGPSData) baseScore += 10;
    if (!likelyScreenshot) baseScore += 10;

const authenticityScore = Math.max(0, Math.min(100, baseScore));

    return {
      authenticityScore,
      issuesFound: issues,
      extractedText: text.trim(),
      ocrConfidence,
      blurVariance,
      suspiciousEdgeScore,
      blockSharpnessStats,
      exifData,
      hasDeviceInfo,
      hasTimestamp,
      hasGPSData,
      likelyScreenshot,
      imageFormat: metadata.format

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
  try {
    // Initialize Tesseract worker
    worker = await createWorker('eng');
    
    // Use pdf-parse to get number of pages
    let pdfParse, pdf2picFromPath;
    
    try {
      pdfParse = (await import('pdf-parse')).default;
    } catch (importError) {
      console.error('Failed to import pdf-parse:', importError);
      throw new Error('PDF parsing library not available');
    }
    
    try {
      const pdf2picModule = await import('pdf2pic');
      pdf2picFromPath = pdf2picModule.fromPath;
    } catch (importError) {
      console.error('Failed to import pdf2pic:', importError);
      throw new Error('PDF to image conversion library not available');
    }
    
    const fs = (await import('fs')).default;
    const os = (await import('os')).default;
    const path = (await import('path')).default;
    const pdfBuffer = buffer;
    const pdfData = await pdfParse(pdfBuffer);
    const numPages = pdfData.numpages || 1;
    // Write buffer to temp file
    const tempPDFPath = path.join(os.tmpdir(), `ocr_temp_${Date.now()}.pdf`);
    fs.writeFileSync(tempPDFPath, pdfBuffer);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr_pdf_'));
    const pdf2pic = pdf2picFromPath(tempPDFPath, {
      density: 200,
      saveFilename: 'page',
      savePath: tempDir,
      format: 'png',
      width: 1200,
      height: 1600,
    });
    let allText = '';
    let totalConfidence = 0;
    let pageCount = 0;
    for (let i = 1; i <= numPages; i++) {
      try {
        const output = await pdf2pic(i);
        if (!output.path) {
          console.warn(`No image path for page ${i}, skipping.`);
          continue;
        }
        const imagePath = output.path;
        const imageBuffer = fs.readFileSync(imagePath);
        const { data } = await worker.recognize(imageBuffer);
        if (data.text && data.text.trim().length > 0) {
          allText += data.text + '\n';
          totalConfidence += data.confidence !== undefined ? data.confidence : 0;
          pageCount++;
        }
        // Clean up the image file
        fs.unlinkSync(imagePath);
      } catch (pageError) {
        console.warn(`Failed to process page ${i}:`, pageError);
        continue;
      }
    }
    // Clean up temp dir and PDF
    fs.unlinkSync(tempPDFPath);
    fs.rmSync(tempDir, { recursive: true });
    const extractedText = allText.trim();
    const ocrConfidence = pageCount > 0 ? totalConfidence / pageCount : 0;
    const issues = [];
    if (ocrConfidence < 60) {
      issues.push(`OCR confidence is low (${ocrConfidence}). PDF may be blurry or unclear.`);
    }
    if (!extractedText || extractedText.trim().length < 20) {
      issues.push('Extracted text is too short. Document may be unreadable or unclear.');
    }
    const authenticityScore = Math.max(0, 100 - (issues.length * 20));
    return {
      authenticityScore,
      issuesFound: issues,
      extractedText: extractedText,
      ocrConfidence,
    };
  } catch (error) {
    console.error('Error verifying PDF:', error);
    
    // Fallback: try to process as image if PDF libraries failed
    try {
      console.warn('PDF processing failed, attempting fallback image processing:', error);
      worker = await createWorker('eng');
      const { data } = await worker.recognize(buffer);
      const extractedText = data.text || '';
      const ocrConfidence = data.confidence || 0;
      
      const issues = [];
      if (ocrConfidence < 60) {
        issues.push(`OCR confidence is low (${ocrConfidence}). Document may be blurry or unclear.`);
      }
      if (!extractedText || extractedText.trim().length < 20) {
        issues.push('Extracted text is too short. Document may be unreadable or unclear.');
      }
      
      const authenticityScore = Math.max(0, 100 - (issues.length * 20));
      return {
        authenticityScore,
        issuesFound: issues,
        extractedText: extractedText,
        ocrConfidence,
      };
    } catch (fallbackError) {
      console.error('PDF fallback processing also failed:', fallbackError);
      return {
        authenticityScore: 0,
        issuesFound: [`PDF verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        extractedText: '',
        ocrConfidence: 0,
      };
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (terminateError) {
          console.warn('Error terminating worker:', terminateError);
        }
      }
    }
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