// utils/utilityBillOCR.ts
import { createWorker, Worker } from 'tesseract.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import sharp from 'sharp';

// Environment check to prevent test file access in production
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

interface OCRResult {
  extractedText: string;
  addressMatched: boolean;
  nameMatched: boolean;
  addressMatch: boolean;
  matchScore: number;
  confidence: number;
  foundAddresses: string[];
  fullName: string;
  blockMatches?: number;
  matchingBlocks?: string[];
  totalBlocks?: number;
  blockMatchDetails?: BlockMatchResult;
  fuzzyAddressMatched: boolean;
  strictAddressMatched: boolean;
  normalizedProvidedAddress: string;
  normalizedExtractedText: string;
  matchedNgram: string;
}

interface BlockMatchResult {
  providedBlocks: string[];
  extractedBlocks: string[];
  matchedBlocks: Array<{
    provided: string;
    matched: string;
    similarity: number;
    matchType: 'exact' | 'fuzzy' | 'partial';
  }>;
  blockScore: number;
  totalMatches: number;
}

class UtilityBillOCR {
  private worker: Worker | null = null;

  async initialize(): Promise<void> {
    if (!this.worker) {
      this.worker = await createWorker('eng');
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  async processUtilityBill(
    imageData: string | Buffer | File, 
    providedAddress: string,
    providedFullName: string
  ): Promise<OCRResult> {
    await this.initialize();
    
    try {
      let imageInput: string | Buffer;
      let isPDF = false;
      let tempPDFPath = '';
      
      // Handle different input types
      if (typeof imageData === 'string') {
        if (imageData.startsWith('data:')) {
          const base64Data = imageData.split(',')[1];
          imageInput = Buffer.from(base64Data, 'base64');
        } else {
          imageInput = Buffer.from(imageData, 'base64');
        }
      } else if (imageData instanceof Buffer) {
        imageInput = imageData;
      } else if (imageData instanceof File) {
        const arrayBuffer = await imageData.arrayBuffer();
        imageInput = Buffer.from(arrayBuffer);
      } else {
        throw new Error('Unsupported image format');
      }

      // Detect PDF by magic number
      if (Buffer.isBuffer(imageInput) && imageInput.subarray(0, 4).toString() === '%PDF') {
        isPDF = true;
        // Ensure we're not in a test environment and use a safe temp path
        if (isProduction || !isTest) {
          tempPDFPath = path.join(os.tmpdir(), `ocr_temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`);
          try {
            fs.writeFileSync(tempPDFPath, imageInput);
          } catch (writeError) {
            console.error('Failed to write temp PDF file:', writeError);
            // Fallback: try to process as image instead
            isPDF = false;
            tempPDFPath = '';
            console.warn('PDF write failed, falling back to image processing');
          }
        } else {
          // In test environment, treat as image
          isPDF = false;
          console.warn('PDF processing disabled in test environment, treating as image');
        }
      }

      let extractedText = '';
      let confidence = 0;
      
      if (isPDF && tempPDFPath) {
        try {
          // Dynamic imports to prevent build-time issues
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
          
          // Hybrid approach: Try direct PDF text extraction first
          let directText = '';
          try {
            const pdfBuffer = fs.readFileSync(tempPDFPath);
            const pdfData = await pdfParse(pdfBuffer);
            directText = pdfData.text || '';
          } catch (parseError) {
            console.warn('PDF parse failed, falling back to OCR:', parseError);
            directText = '';
          }
          
          if (directText && directText.trim().length > 50) {
            extractedText = directText;
            confidence = 100;
            // Clean up temp file
            try {
              fs.unlinkSync(tempPDFPath);
            } catch (cleanupError) {
              console.warn('Failed to cleanup temp PDF file:', cleanupError);
            }
          } else {
            // Fallback: Convert all pages to images and OCR using pdf2pic
            try {
              const pdfBuffer = fs.readFileSync(tempPDFPath);
              const pdfData = await pdfParse(pdfBuffer);
              const numPages = pdfData.numpages || 1;
              const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr_pdf_'));
              const pdf2pic = pdf2picFromPath(tempPDFPath, {
                density: 300, // Increased from 200 to 300 DPI for better OCR
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
                  let imageBuffer = fs.readFileSync(imagePath);
                  // Preprocess image with sharp: grayscale, increase contrast, threshold
                  // @ts-expect-error: TypeScript type system limitation, Buffer is correct at runtime
                  imageBuffer = Buffer.from(Uint8Array.prototype.slice.call(imageBuffer)) as Buffer;
                  // @ts-expect-error: TypeScript type system limitation, Buffer is correct at runtime
                  imageBuffer = await sharp(imageBuffer)
                    .grayscale()
                    .normalize()
                    .threshold(180)
                    .toBuffer();
                  if (this.worker) {
                    const { data } = await this.worker.recognize(imageBuffer);
                    console.log(`Page ${i} OCR extracted text:`, data.text);
                    console.log(`Page ${i} OCR confidence:`, data.confidence);
                    if (data.text && data.text.trim().length > 0) {
                      allText += data.text + '\n';
                      totalConfidence += data.confidence !== undefined ? data.confidence : 0;
                      pageCount++;
                    }
                  }
                  // Clean up the image file
                  try {
                    fs.unlinkSync(imagePath);
                  } catch (cleanupError) {
                    console.warn('Failed to cleanup image file:', cleanupError);
                  }
                } catch (pageError) {
                  console.warn(`Failed to process page ${i}:`, pageError);
                  continue;
                }
              }
              // Clean up temp dir and PDF
              try {
                fs.unlinkSync(tempPDFPath);
                fs.rmSync(tempDir, { recursive: true });
              } catch (cleanupError) {
                console.warn('Failed to cleanup temp files:', cleanupError);
              }
              extractedText = allText.trim();
              confidence = pageCount > 0 ? totalConfidence / pageCount : 0;
              if (!extractedText || extractedText.length < 10) {
                throw new Error('No text could be extracted from PDF pages');
              }
            } catch (pdfError) {
              console.error('PDF processing failed:', pdfError);
              throw new Error(`PDF OCR failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown PDF processing error'}`);
            }
          }
        } catch (pdfProcessingError) {
          // Clean up temp file if it exists
          if (tempPDFPath && fs.existsSync(tempPDFPath)) {
            try {
              fs.unlinkSync(tempPDFPath);
            } catch (cleanupError) {
              console.warn('Failed to cleanup temp PDF file:', cleanupError);
            }
          }
          
          // Fallback: Try to process PDF as image if libraries failed
          console.warn('PDF processing failed, attempting fallback image processing:', pdfProcessingError);
          try {
            if (!this.worker) {
              throw new Error('OCR worker not initialized');
            }
            
            // Try to process the PDF buffer directly as an image
            const { data } = await this.worker.recognize(imageInput);
            extractedText = data.text || '';
            confidence = data.confidence || 0;
            
            if (!extractedText || extractedText.trim().length < 5) {
              throw new Error('No text could be extracted from PDF using fallback method');
            }
          } catch (fallbackError) {
            console.error('PDF fallback processing also failed:', fallbackError);
            throw new Error(`PDF processing failed: ${pdfProcessingError instanceof Error ? pdfProcessingError.message : 'Unknown error'}`);
          }
        }
      } else {
        // Normal image OCR
        if (!this.worker) {
          throw new Error('OCR worker not initialized');
        }
        
        const { data } = await this.worker.recognize(imageInput);
        extractedText = data.text || '';
        confidence = data.confidence || 0;
      }

      // Validate extracted text
      if (!extractedText || extractedText.trim().length < 5) {
        throw new Error('No text could be extracted from the document');
      }

      const foundAddresses = this.extractAddresses(extractedText);
      const matchedFullName = this.matchFullName(providedFullName, extractedText);
      
      // Enhanced block-based matching system
      const blockMatchResult = this.performEnhancedBlockMatching(providedAddress, extractedText);
      
      // Calculate name match score
      const nameScore = this.calculateNameMatchScore(providedFullName, extractedText);
      
      // Enhanced scoring logic with block-based thresholds
      const addressScore = blockMatchResult.blockScore * 100;
      const blockCount = blockMatchResult.totalMatches;
      
      // Dynamic scoring based on block matches
      let finalAddressScore = addressScore;
      if (blockCount >= 5) {
        // If 5+ blocks match, ensure minimum 85% score
        finalAddressScore = Math.max(addressScore, 85);
      } else if (blockCount >= 3) {
        // If 3-4 blocks match, ensure minimum 75% score
        finalAddressScore = Math.max(addressScore, 75);
      }
      // Force: If blockScore is above 0.75 and blockCount >= 5, force final score to 100%
      if (blockCount >= 5 && blockMatchResult.blockScore > 0.75) {
        finalAddressScore = 100;
      }
      
      // Adaptive thresholds based on block matches
      const addressThreshold = blockCount >= 5 ? 0.85 : 0.75; // 85% for 5+ blocks, 75% otherwise
      const nameThreshold = 0.5; // 50% name match threshold
      
      // --- STRICT PHRASE MATCH LOGIC ---
      // Normalize both provided address and extracted text
      const normalizedProvidedAddress = this.normalizeText(providedAddress);
      const normalizedExtractedText = this.normalizeText(extractedText);
      // Logging for debugging
      console.log('Normalized Provided Address:', normalizedProvidedAddress);
      console.log('Normalized Extracted OCR Text:', normalizedExtractedText);
      
      // Require a 5+ word n-gram from the provided address to appear as a substring in the OCR text
      const providedAddressWords = normalizedProvidedAddress.split(' ').filter(Boolean);
      let strictAddressMatch = false;
      let matchedNgram = '';
      if (providedAddressWords.length >= 5) {
        for (let i = 0; i <= providedAddressWords.length - 5; i++) {
          const ngram = providedAddressWords.slice(i, i + 5).join(' ');
          if (normalizedExtractedText.includes(ngram)) {
            strictAddressMatch = true;
            matchedNgram = ngram;
            break;
          }
        }
        // Log the result
        console.log('Strict 5-word n-gram match:', strictAddressMatch, 'Matched n-gram:', matchedNgram);
      } else {
        // For short addresses, fall back to block-based logic
        strictAddressMatch = (finalAddressScore >= addressThreshold * 100);
        console.log('Short address fallback to fuzzy logic. Strict match:', strictAddressMatch);
      }
      
      const addressMatched = strictAddressMatch;
      const fuzzyAddressMatched = (finalAddressScore >= addressThreshold * 100);
      const nameMatched = (nameScore >= nameThreshold * 100);
      const fullMatch = addressMatched && nameMatched;
      
      // Weighted scoring: 70% address, 30% name (since address is primary focus)
      let combinedScore = Math.round((finalAddressScore * 0.7) + (nameScore * 0.3));
      // If address score was forced to 100 due to strong fuzzy match, force combinedScore to 100 as well
      if (blockCount >= 5 && blockMatchResult.blockScore > 0.75 && finalAddressScore === 100) {
        combinedScore = 100;
      }

      return {
        extractedText,
        addressMatched, // strict phrase match
        nameMatched,
        addressMatch: fullMatch,
        matchScore: combinedScore,
        confidence,
        foundAddresses,
        fullName: matchedFullName.value,
        blockMatches: blockCount,
        matchingBlocks: blockMatchResult.matchedBlocks.map(m => m.provided),
        totalBlocks: blockMatchResult.providedBlocks.length,
        blockMatchDetails: blockMatchResult,
        // Add fuzzy match info for debugging
        fuzzyAddressMatched,
        strictAddressMatched: addressMatched,
        // Debug info
        normalizedProvidedAddress,
        normalizedExtractedText,
        matchedNgram
      };

    } catch (error) {
      console.error('OCR processing failed:', error);
      throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Enhanced block matching system
  private performEnhancedBlockMatching(providedAddress: string, extractedText: string): BlockMatchResult {
    const providedBlocks = this.extractEnhancedAddressBlocks(providedAddress);
    const extractedBlocks = this.extractEnhancedTextBlocks(extractedText);
    
    const matchedBlocks: Array<{
      provided: string;
      matched: string;
      similarity: number;
      matchType: 'exact' | 'fuzzy' | 'partial';
    }> = [];
    
    let totalMatches = 0;
    let totalScore = 0;
    
    providedBlocks.forEach(providedBlock => {
      let bestMatch: {
        block: string;
        similarity: number;
        matchType: 'exact' | 'fuzzy' | 'partial';
      } = {
        block: '',
        similarity: 0,
        matchType: 'partial'
      };
      
      extractedBlocks.forEach(extractedBlock => {
        const similarity = this.calculateAdvancedBlockSimilarity(providedBlock, extractedBlock);
        
        if (similarity > bestMatch.similarity) {
          bestMatch = {
            block: extractedBlock,
            similarity,
            matchType: this.determineMatchType(similarity)
          };
        }
      });
      
      // Accept matches with 70% or higher similarity
      if (bestMatch.similarity >= 0.7) {
        matchedBlocks.push({
          provided: providedBlock,
          matched: bestMatch.block,
          similarity: bestMatch.similarity,
          matchType: bestMatch.matchType
        });
        totalMatches++;
        totalScore += bestMatch.similarity;
      }
    });
    
    const blockScore = providedBlocks.length > 0 ? totalScore / providedBlocks.length : 0;
    
    return {
      providedBlocks,
      extractedBlocks,
      matchedBlocks,
      blockScore,
      totalMatches
    };
  }

  // Enhanced address block extraction
  private extractEnhancedAddressBlocks(address: string): string[] {
    const blocks: string[] = [];
    const normalizedAddress = this.normalizeText(address);
    
    // Split by common separators
    const primarySplit = normalizedAddress.split(/[,\s]+/).filter(part => part.length > 1);
    
    // Add individual meaningful tokens
    primarySplit.forEach(part => {
      const cleaned = part.replace(/[^\w]/g, '').toLowerCase();
      if (cleaned.length > 1) {
        blocks.push(cleaned);
      }
    });
    
    // Add compound phrases for better contextual matching
    const compoundPatterns = [
      // Location-specific compounds
      { pattern: /lekki\s+pen+isula/i, normalized: 'lekkipeninsula' },
      { pattern: /peninsula\s+residential/i, normalized: 'peninsularesidential' },
      { pattern: /residential\s+scheme/i, normalized: 'residentialscheme' },
      { pattern: /eti\s+osa/i, normalized: 'etiosa' },
      { pattern: /lagos\s+state/i, normalized: 'lagosstate' },
      { pattern: /victoria\s+island/i, normalized: 'victoriaisland' },
      { pattern: /port\s+harcourt/i, normalized: 'portharcourt' },
      
      // Generic address compounds
      { pattern: /(\w+)\s+estate/i, normalized: '$1estate' },
      { pattern: /(\w+)\s+close/i, normalized: '$1close' },
      { pattern: /(\w+)\s+street/i, normalized: '$1street' },
      { pattern: /(\w+)\s+road/i, normalized: '$1road' },
      { pattern: /(\w+)\s+avenue/i, normalized: '$1avenue' },
      { pattern: /plot\s+(\w+)/i, normalized: 'plot$1' },
      { pattern: /block\s+(\w+)/i, normalized: 'block$1' },
      { pattern: /phase\s+(\w+)/i, normalized: 'phase$1' }
    ];
    
    compoundPatterns.forEach(({ pattern, normalized }) => {
      const match = address.match(pattern);
      if (match) {
        if (normalized.includes('$1')) {
          blocks.push(normalized.replace('$1', match[1].toLowerCase()));
        } else {
          blocks.push(normalized);
        }
      }
    });
    
    // Add n-gram blocks for better partial matching
    const words = normalizedAddress.split(/\s+/).filter(word => word.length > 2);
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = words[i] + words[i + 1];
      if (bigram.length > 4) {
        blocks.push(bigram);
      }
    }
    
    return [...new Set(blocks)].filter(block => block.length > 1);
  }

  // Enhanced text block extraction from OCR results
  private extractEnhancedTextBlocks(text: string): string[] {
    const blocks: string[] = [];
    const normalizedText = this.normalizeText(text);
    
    // Extract word-level blocks
    const words = normalizedText.split(/\s+/).filter(word => word.length > 1);
    words.forEach(word => {
      const cleaned = word.replace(/[^\w]/g, '').toLowerCase();
      if (cleaned.length > 1) {
        blocks.push(cleaned);
      }
    });
    
    // Extract line-level blocks
    const lines = text.split(/[\n\r]+/);
    lines.forEach(line => {
      const cleaned = this.normalizeText(line).replace(/\s+/g, '');
      if (cleaned.length > 3) {
        blocks.push(cleaned);
      }
    });
    
    // Extract phrase-level blocks (bigrams and trigrams)
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = words[i] + words[i + 1];
      if (bigram.length > 4) {
        blocks.push(bigram);
      }
      
      if (i < words.length - 2) {
        const trigram = words[i] + words[i + 1] + words[i + 2];
        if (trigram.length > 6) {
          blocks.push(trigram);
        }
      }
    }
    
    // Extract contextual blocks based on location keywords
    const locationContexts = this.extractLocationContexts(text);
    blocks.push(...locationContexts);
    
    return [...new Set(blocks)].filter(block => block.length > 1);
  }

  // Extract location-specific contexts
  private extractLocationContexts(text: string): string[] {
    const contexts: string[] = [];
    const lines = text.split(/[\n\r]+/);
    
    lines.forEach(line => {
      const normalizedLine = this.normalizeText(line);
      
      // Check for location-rich lines
      const locationKeywords = ['lekki', 'peninsula', 'residential', 'scheme', 'eti', 'osa', 'lagos', 'estate', 'plot', 'block', 'phase'];
      const foundKeywords = locationKeywords.filter(keyword => 
        normalizedLine.includes(keyword)
      );
      
      if (foundKeywords.length >= 2) {
        // This line likely contains address information
        const cleanedLine = normalizedLine.replace(/[^\w\s]/g, '').replace(/\s+/g, '');
        if (cleanedLine.length > 5) {
          contexts.push(cleanedLine);
        }
      }
    });
    
    return contexts;
  }

  // Advanced block similarity calculation
  private calculateAdvancedBlockSimilarity(block1: string, block2: string): number {
    const norm1 = this.normalizeForMatching(block1);
    const norm2 = this.normalizeForMatching(block2);
    
    // Calculate all similarities
    const exactMatch = norm1 === norm2 ? 1.0 : 0;
    const substringMatch = this.calculateSubstringMatch(norm1, norm2);
    const levenshteinSim = this.calculateLevenshteinSimilarity(norm1, norm2);
    const jaroSim = this.calculateJaroWinklerSimilarity(norm1, norm2);
    const phoneticSim = this.calculatePhoneticSimilarity(norm1, norm2);
    
    // Weighted ensemble
    const weights = { exact: 0.4, substring: 0.25, levenshtein: 0.15, jaro: 0.15, phonetic: 0.05 };
    
    return (exactMatch * weights.exact) +
           (substringMatch * weights.substring) +
           (levenshteinSim * weights.levenshtein) +
           (jaroSim * weights.jaro) +
           (phoneticSim * weights.phonetic);
  }
  
  // ADD THIS NEW METHOD
  private calculateSubstringMatch(str1: string, str2: string): number {
    if (str1.length >= 3 && str2.length >= 3) {
      if (str1.includes(str2) || str2.includes(str1)) {
        const shorterLength = Math.min(str1.length, str2.length);
        const longerLength = Math.max(str1.length, str2.length);
        return shorterLength / longerLength;
      }
    }
    return 0;
  }

  // Normalize text for consistent matching
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      // Handle common Nigerian location misspellings
      .replace(/\b(pen+isula|peninsular)\b/g, 'peninsula')
      .replace(/\b(res[ie]dent[iae]al)\b/g, 'residential')
      .replace(/\b(sch?eme?)\b/g, 'scheme')
      .replace(/\b(lek+i)\b/g, 'lekki')
      .replace(/\b(etio[sa]a?)\b/g, 'etiosa')
      .replace(/\b(lag[ou]s)\b/g, 'lagos')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Normalize specifically for matching
  private normalizeForMatching(text: string): string {
    return this.normalizeText(text).replace(/\s+/g, '');
  }

  // Determine match type based on similarity score
  private determineMatchType(similarity: number): 'exact' | 'fuzzy' | 'partial' {
    if (similarity >= 0.95) return 'exact';
    if (similarity >= 0.8) return 'fuzzy';
    return 'partial';
  }

  // Levenshtein similarity
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;
    
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return 1 - (distance / maxLength);
  }

  // Levenshtein distance implementation
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Phonetic similarity for common misspellings
  private calculatePhoneticSimilarity(str1: string, str2: string): number {
    const phoneticMap: { [key: string]: string } = {
      'peninsula': 'peninsula|pennisula|peninsular|penninsula',
      'residential': 'residential|residental|residencial|resedential',
      'scheme': 'scheme|sheme|sceme|skeme',
      'lekki': 'lekki|leki|leky|lecki',
      'etiosa': 'etiosa|etios|etiossa|etioosa'
    };
    
    for (const [, variants] of Object.entries(phoneticMap)) {
      const variantList = variants.split('|');
      if (variantList.includes(str1) && variantList.includes(str2)) {
        return 0.9; // High similarity for known phonetic variants
      }
    }
    
    return 0;
  }

  // Jaro-Winkler similarity implementation
  private calculateJaroWinklerSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;
    
    const matchWindow = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
    const str1Matches = new Array(str1.length).fill(false);
    const str2Matches = new Array(str2.length).fill(false);
    
    let matches = 0;
    let transpositions = 0;
    
    // Identify matches
    for (let i = 0; i < str1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, str2.length);
      
      for (let j = start; j < end; j++) {
        if (str2Matches[j] || str1[i] !== str2[j]) continue;
        str1Matches[i] = str2Matches[j] = true;
        matches++;
        break;
      }
    }
    
    if (matches === 0) return 0;
    
    // Count transpositions
    let k = 0;
    for (let i = 0; i < str1.length; i++) {
      if (!str1Matches[i]) continue;
      while (!str2Matches[k]) k++;
      if (str1[i] !== str2[k]) transpositions++;
      k++;
    }
    
    const jaro = (matches / str1.length + matches / str2.length + (matches - transpositions / 2) / matches) / 3;
    
    // Winkler modification
    let prefix = 0;
    for (let i = 0; i < Math.min(str1.length, str2.length, 4); i++) {
      if (str1[i] === str2[i]) prefix++;
      else break;
    }
    
    return jaro + 0.1 * prefix * (1 - jaro);
  }

  // Enhanced address extraction
  private extractAddresses(text: string): string[] {
    const addresses: string[] = [];
    
    const addressPatterns = [
      // Enhanced patterns for Nigerian addresses
      /\d+[,\s]+[^,\n]+(?:road|rd|street|st|avenue|ave|close|crescent|way|lane|drive|dr)\b[^,\n]*/gi,
      /[^,\n]*(?:road|rd|street|st|avenue|ave|close|crescent|way|lane|drive|dr)[^,\n]*,?\s*[^,\n]*(?:lagos|abuja|kano|ibadan|port harcourt|ph|portharcourt)\b[^,\n]*/gi,
      /[^,\n]*(?:residential|estate|scheme|phase|block|plot)[^,\n]*(?:lagos|abuja|kano|ibadan|port harcourt|lekki|victoria island|ikoyi|vi|surulere|ikeja)\b[^,\n]*/gi,
      /lekki[^,\n]*(?:residential|estate|scheme|peninsula)[^,\n]*/gi,
      /[^,\n]*peninsula[^,\n]*residential[^,\n]*scheme[^,\n]*/gi,
      /[^,\n]*(?:eti\s*osa|etiosa)[^,\n]*(?:lagos|lekki)[^,\n]*/gi,
      /plot[^,\n]*\d+[^,\n]*block[^,\n]*\d+[^,\n]*/gi,
    ];

    addressPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        addresses.push(...matches.map(match => match.trim()));
      }
    });

    // Enhanced line-by-line extraction
    const lines = text.split('\n');
    lines.forEach(line => {
      const normalizedLine = line.toLowerCase();
      const addressKeywords = ['lekki', 'residential', 'scheme', 'peninsula', 'estate', 'plot', 'block', 'phase', 'eti osa', 'etiosa', 'lagos'];
      const foundKeywords = addressKeywords.filter(keyword => normalizedLine.includes(keyword));
      
      if (foundKeywords.length >= 2) {
        addresses.push(line.trim());
      }
    });

    return [...new Set(addresses)].filter(addr => addr.length > 10);
  }

  // Rest of the methods remain the same...
  private matchFullName(providedFullName: string, text: string): { matched: boolean, value: string } {
    if (!providedFullName) return { matched: false, value: '' };
    
    const normalizedProvided = providedFullName.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
    const normalizedText = text.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ');
    
    if (normalizedText.includes(normalizedProvided)) {
      return { matched: true, value: providedFullName };
    }
    
    const nameTokens = normalizedProvided.split(' ').filter(Boolean);
    let foundTokens = 0;
    const textWords = normalizedText.split(/\s+/);
    
    nameTokens.forEach(token => {
      const bestMatch = textWords.reduce((best, word) => {
        const similarity = this.calculateLevenshteinSimilarity(token, word);
        return similarity > best ? similarity : best;
      }, 0);
      
      if (bestMatch >= 0.8) {
        foundTokens++;
      }
    });
    
    const ratio = foundTokens / nameTokens.length;
    if (ratio >= 0.6) {
      return { matched: true, value: providedFullName };
    }
    
    return { matched: false, value: '' };
  }

  private calculateNameMatchScore(providedFullName: string, text: string): number {
    if (!providedFullName) return 0;
    
    const normalizedProvided = providedFullName.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
    const normalizedText = text.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ');
    
    if (normalizedText.includes(normalizedProvided)) {
      return 100;
    }
    
    const nameTokens = normalizedProvided.split(' ').filter(Boolean);
    let totalScore = 0;
    const textWords = normalizedText.split(/\s+/);
    
    nameTokens.forEach(token => {
      const bestMatch = textWords.reduce((best, word) => {
        const similarity = this.calculateLevenshteinSimilarity(token, word);
        return similarity > best ? similarity : best;
      }, 0);
      
      totalScore += bestMatch;
    });
    
    const ratio = nameTokens.length > 0 ? totalScore / nameTokens.length : 0;
    return Math.round(ratio * 100);
  }
}

export async function verifyUtilityBillAddress(
  utilityBillData: string | Buffer | File, 
  providedAddress: string,
  providedFullName: string
): Promise<OCRResult> {
  const ocr = new UtilityBillOCR();
  
  try {
    const result = await ocr.processUtilityBill(utilityBillData, providedAddress, providedFullName);
    return result;
  } catch (error) {
    throw error;
  } finally {
    await ocr.terminate();
  }
}