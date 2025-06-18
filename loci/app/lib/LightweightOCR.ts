// lib/lightweightOCR.ts
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

// Define options interface for flexibility
interface OCRProcessingOptions {
  language?: string;
  documentType?: 'utility' | 'id' | 'certificate' | 'generic';
}

// Run OCR after preprocessing with Sharp
export async function extractTextFromDocument(
  buffer: Buffer,
  mimeType: string,
  options: OCRProcessingOptions = {}
): Promise<string> {
  try {
    // Basic image pre-processing with Sharp
    let processed = await sharp(buffer)
      .grayscale()
      .normalize()
      .resize({ width: 1800, withoutEnlargement: true })
      .toFormat('png')
      .toBuffer();

    // Perform OCR with Tesseract
    const {
      data: { text },
    } = await Tesseract.recognize(processed, options.language || 'eng', {
      logger: msg => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[OCR]', msg);
        }
      },
    });

    return text.trim();
  } catch (error) {
    console.error('OCR failed:', error);
    return '';
  }
}

// Simple heuristic for image tampering detection (placeholder logic)
export async function detectImageTampering(buffer: Buffer): Promise<{
  score: number;
  details: {
    imageQuality: number;
    compressionArtifacts: number;
    edgeConsistency: number;
    noisePattern: number;
  };
}> {
  try {
    const metadata = await sharp(buffer).metadata();

    // Heuristic scoring based on metadata
    const imageQuality = metadata.width && metadata.height ? 0.8 : 0.3;
    const compressionArtifacts = metadata.format === 'jpeg' ? 0.5 : 0.8;
    const edgeConsistency = 0.6; // Placeholder value
    const noisePattern = 0.7; // Placeholder value

    const averageScore =
      (imageQuality + compressionArtifacts + edgeConsistency + noisePattern) /
      4;

    return {
      score: averageScore,
      details: {
        imageQuality,
        compressionArtifacts,
        edgeConsistency,
        noisePattern,
      },
    };
  } catch (error) {
    console.error('Image tampering check failed:', error);
    return {
      score: 0.5,
      details: {
        imageQuality: 0,
        compressionArtifacts: 0,
        edgeConsistency: 0,
        noisePattern: 0,
      },
    };
  }
}
