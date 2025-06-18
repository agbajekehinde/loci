// app/api/verify-address/imageutils.ts
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

export interface OCROptions {
  language?: string;
  documentType?: 'certificate' | 'id' | 'utility' | 'generic';
}

export interface TamperingResult {
  score: number;
  details: {
    imageQuality: number;
    compressionArtifacts: number;
    edgeConsistency: number;
    noisePattern: number;
  };
}

// Extract text from document using Tesseract.js (server-compatible)
export async function extractTextFromDocument(
  imageBuffer: Buffer,
  mimeType: string,
  options: OCROptions = {}
): Promise<string> {
  
  try {
    console.log(`Starting OCR extraction for ${options.documentType || 'generic'} document`);
    
    // Preprocess image for better OCR results
    const processedBuffer = await preprocessImageForOCR(imageBuffer);
    
    // Configure Tesseract based on document type
    const tesseractOptions = getTesseractOptions(options.documentType);
    
      // Perform OCR
    const { data: { text } } = await Tesseract.recognize(
      processedBuffer,
      options.language || 'eng',
      {
        corePath: '/tesseract/tesseract-core-simd.wasm', // <--- Added this line
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
        ...tesseractOptions
      }
    );
    
    // Clean and normalize extracted text
    const cleanedText = cleanExtractedText(text);
    
    console.log(`OCR completed. Extracted ${cleanedText.length} characters`);
    return cleanedText;
    
  } catch (error) {
    console.error('Error in OCR extraction:', error);
    return '';
  }
}

// Preprocess image for better OCR using Sharp
async function preprocessImageForOCR(imageBuffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(imageBuffer)
      .resize(2000, 2000, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .greyscale()
      .normalize()
      .sharpen()
      .png({ quality: 100 })
      .toBuffer();
  } catch (error) {
    console.error('Error preprocessing image:', error);
    return imageBuffer; // Return original if preprocessing fails
  }
}

// Get Tesseract configuration based on document type
function getTesseractOptions(documentType?: string) {
  const baseOptions = {
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?-()[]{}"\' /\\',
  };

  switch (documentType) {
    case 'utility':
      return {
        ...baseOptions,
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        // Focus on addresses and utility company names
        tessedit_char_whitelist: baseOptions.tessedit_char_whitelist + '#',
      };
    
    case 'id':
      return {
        ...baseOptions,
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        // Focus on names and addresses
      };
    
    case 'certificate':
      return {
        ...baseOptions,
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      };
    
    default:
      return baseOptions;
  }
}

// Clean and normalize extracted text
function cleanExtractedText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s.,;:!?()\[\]{}'"\/\\#-]/g, '') // Remove special characters
    .trim()
    .toLowerCase();
}

// Server-compatible image tampering detection using Sharp
export async function detectImageTampering(imageBuffer: Buffer): Promise<TamperingResult> {
  try {
    console.log('Starting tampering detection analysis');
    
    // Get image metadata and stats
    const metadata = await sharp(imageBuffer).metadata();
    const stats = await sharp(imageBuffer).stats();
    
    // Analyze image quality indicators
    const imageQuality = analyzeImageQuality(metadata, stats);
    const compressionArtifacts = analyzeCompressionArtifacts(metadata);
    const edgeConsistency = await analyzeEdgeConsistency(imageBuffer);
    const noisePattern = analyzeNoisePattern(stats);
    
    // Calculate overall tampering score (higher = less likely tampered)
    const overallScore = (
      imageQuality * 0.3 +
      compressionArtifacts * 0.3 +
      edgeConsistency * 0.25 +
      noisePattern * 0.15
    );
    
    console.log(`Tampering analysis complete. Score: ${overallScore.toFixed(3)}`);
    
    return {
      score: Math.max(0, Math.min(1, overallScore)),
      details: {
        imageQuality,
        compressionArtifacts,
        edgeConsistency,
        noisePattern
      }
    };
    
  } catch (error) {
    console.error('Error in tampering detection:', error);
    // Return neutral score on error
    return {
      score: 0.7,
      details: {
        imageQuality: 0.7,
        compressionArtifacts: 0.7,
        edgeConsistency: 0.7,
        noisePattern: 0.7
      }
    };
  }
}

// Analyze image quality indicators
function analyzeImageQuality(metadata: sharp.Metadata, stats: sharp.Stats): number {
  let score = 0.8; // Base score
  
  // Resolution analysis
  if (metadata.width && metadata.height) {
    const totalPixels = metadata.width * metadata.height;
    if (totalPixels < 100000) score -= 0.2; // Too low resolution
    if (totalPixels > 2000000) score += 0.1; // Good resolution
  }
  
  // Bit depth analysis
  if (metadata.depth && Number(metadata.depth) < 8) {
    score -= 0.1; // Low bit depth
  }
  
  // Channel analysis
  if (stats.channels) {
    const avgStdDev = stats.channels.reduce((sum, ch) => sum + (ch.stdev || 0), 0) / stats.channels.length;
    if (avgStdDev < 10) score -= 0.2; // Too uniform (suspicious)
    if (avgStdDev > 50) score += 0.1; // Good variation
  }
  
  return Math.max(0, Math.min(1, score));
}

// Analyze compression artifacts
function analyzeCompressionArtifacts(metadata: sharp.Metadata): number {
  let score = 0.8; // Base score
  
  // Format analysis
  if (metadata.format === 'jpeg') {
    // JPEG compression can indicate multiple saves
    if (metadata.density && metadata.density < 72) {
      score -= 0.1; // Low quality JPEG
    }
  } else if (metadata.format === 'png') {
    score += 0.1; // PNG is lossless
  }
  
  return Math.max(0, Math.min(1, score));
}

// Analyze edge consistency using Sharp edge detection
async function analyzeEdgeConsistency(imageBuffer: Buffer): Promise<number> {
  try {
    // Apply edge detection using Sharp's convolution
    const edgeBuffer = await sharp(imageBuffer)
      .greyscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
      })
      .png()
      .toBuffer();
    
    // Get statistics of edge-detected image
    const edgeStats = await sharp(edgeBuffer).stats();
    
    // Analyze edge consistency
    let score = 0.8;
    
    if (edgeStats.channels && edgeStats.channels.length > 0) {
      const edgeStdDev = edgeStats.channels[0].stdev || 0;
      
      // Inconsistent edges might indicate tampering
      if (edgeStdDev < 5) score -= 0.2; // Too uniform edges
      if (edgeStdDev > 30) score -= 0.1; // Too chaotic edges
      if (edgeStdDev >= 5 && edgeStdDev <= 25) score += 0.1; // Good edge distribution
    }
    
    return Math.max(0, Math.min(1, score));
    
  } catch (error) {
    console.error('Error in edge consistency analysis:', error);
    return 0.7; // Neutral score on error
  }
}

// Analyze noise patterns in the image
function analyzeNoisePattern(stats: sharp.Stats): number {
  let score = 0.8; // Base score
  
  if (stats.channels && stats.channels.length > 0) {
    // Analyze noise in each channel
    stats.channels.forEach(channel => {
      const variance = (channel.stdev || 0) ** 2;
      
      // Natural images should have some noise
      if (variance < 100) score -= 0.1; // Too clean (suspicious)
      if (variance > 1000) score -= 0.05; // Too noisy
      if (variance >= 200 && variance <= 800) score += 0.05; // Good noise level
    });
  }
  
  return Math.max(0, Math.min(1, score));
}

// Utility function to validate image format
export function validateImageFormat(mimeType: string): boolean {
  const supportedFormats = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/tiff',
    'image/bmp'
  ];
  
  return supportedFormats.includes(mimeType.toLowerCase());
}