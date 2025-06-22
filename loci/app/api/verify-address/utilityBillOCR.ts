// utils/utilityBillOCR.ts
import { createWorker, Worker } from 'tesseract.js';

interface OCRResult {
  extractedText: string;
  addressMatch: boolean;
  matchScore: number;
  confidence: number;
  foundAddresses: string[];
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
    providedAddress: string
  ): Promise<OCRResult> {
    await this.initialize();
    
    try {
      let imageInput: string | Buffer;
      
      // Handle different input types
      if (typeof imageData === 'string') {
        // If it's a base64 string, convert to buffer
        if (imageData.startsWith('data:')) {
          // Remove data URL prefix if present
          const base64Data = imageData.split(',')[1];
          imageInput = Buffer.from(base64Data, 'base64');
        } else {
          imageInput = Buffer.from(imageData, 'base64');
        }
      } else if (imageData instanceof Buffer) {
        imageInput = imageData;
      } else if (imageData instanceof File) {
        // Convert File to Buffer
        const arrayBuffer = await imageData.arrayBuffer();
        imageInput = Buffer.from(arrayBuffer);
      } else {
        throw new Error('Unsupported image format');
      }

      const { data } = await this.worker!.recognize(imageInput);
      const extractedText = data.text;
      const confidence = data.confidence;

      const foundAddresses = this.extractAddresses(extractedText);
      const { addressMatch, matchScore } = this.calculateAddressMatch(
        providedAddress, 
        foundAddresses, 
        extractedText
      );

      return {
        extractedText,
        addressMatch,
        matchScore,
        confidence,
        foundAddresses
      };

    } catch (error) {
      console.error('OCR processing failed:', error);
      throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractAddresses(text: string): string[] {
    const addresses: string[] = [];
    
    const addressPatterns = [
      /\d+[,\s]+[^,\n]+(?:road|rd|street|st|avenue|ave|close|crescent|way|lane)\b[^,\n]*/gi,
      /[^,\n]*(?:road|rd|street|st|avenue|ave|close|crescent|way|lane)[^,\n]*,?\s*[^,\n]*(?:lagos|abuja|kano|ibadan|port harcourt)\b[^,\n]*/gi,
    ];

    addressPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        addresses.push(...matches.map(match => match.trim()));
      }
    });

    return [...new Set(addresses)];
  }

  private calculateAddressMatch(
    providedAddress: string, 
    foundAddresses: string[], 
    fullText: string
  ): { addressMatch: boolean; matchScore: number } {
    
    const normalizedProvided = this.normalizeAddress(providedAddress);
    let bestScore = 0;
    
    foundAddresses.forEach(extractedAddr => {
      const normalizedExtracted = this.normalizeAddress(extractedAddr);
      const score = this.calculateSimilarity(normalizedProvided, normalizedExtracted);
      bestScore = Math.max(bestScore, score);
    });

    const fullTextScore = this.calculatePartialMatch(normalizedProvided, fullText.toLowerCase());
    bestScore = Math.max(bestScore, fullTextScore);

    return {
      addressMatch: bestScore >= 0.6,
      matchScore: Math.round(bestScore * 100)
    };
  }

  private normalizeAddress(address: string): string {
    return address
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\b(road|rd|street|st|avenue|ave|close|crescent|way|lane)\b/g, 'st')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const tokens1 = str1.split(' ').filter(Boolean);
    const tokens2 = str2.split(' ').filter(Boolean);
    
    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    let matchCount = 0;
    tokens1.forEach(token1 => {
      if (tokens2.some(token2 => 
        token1.includes(token2) || 
        token2.includes(token1)
      )) {
        matchCount++;
      }
    });

    return matchCount / Math.max(tokens1.length, tokens2.length);
  }

  private calculatePartialMatch(address: string, fullText: string): number {
    const tokens = address.split(' ').filter(token => token.length > 2);
    if (tokens.length === 0) return 0;

    let foundTokens = 0;
    tokens.forEach(token => {
      if (fullText.includes(token)) {
        foundTokens++;
      }
    });

    return foundTokens / tokens.length;
  }
}

export async function verifyUtilityBillAddress(
  utilityBillData: string | Buffer | File, 
  providedAddress: string
): Promise<OCRResult> {
  const ocr = new UtilityBillOCR();
  
  try {
    const result = await ocr.processUtilityBill(utilityBillData, providedAddress);
    return result;
  } catch (error) {
    throw error;
  } finally {
    await ocr.terminate();
  }
}
