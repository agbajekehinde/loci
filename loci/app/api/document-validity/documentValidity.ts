// lib/runVerificationChecks.ts
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

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
    try {
      // Create and initialize Tesseract worker properly
      worker = await createWorker('eng');
      const { data } = await worker.recognize(buffer);
      text = data.text || '';
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

    const authenticityScore = Math.max(0, 100 - (issues.length * 20));

    return {
      authenticityScore,
      issuesFound: issues,
      extractedText: text.trim(),
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function verifyPDF(buffer: Buffer) {
  try {
    return {
      authenticityScore: 0,
      issuesFound: ['PDF verification not implemented'],
      extractedText: '',
    };
  } catch (error) {
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