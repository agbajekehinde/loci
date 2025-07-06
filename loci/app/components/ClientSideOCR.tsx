'use client';

import { useState, useCallback } from 'react';
import { createWorker, Worker } from 'tesseract.js';

export interface OCRResult {
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

export const useClientSideOCR = () => {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const initializeWorker = useCallback(async () => {
    if (worker && isInitialized) return worker;
    
    try {
      console.log('Initializing Tesseract worker...');
      const newWorker = await createWorker('eng');
      setWorker(newWorker);
      setIsInitialized(true);
      console.log('Tesseract worker initialized successfully');
      return newWorker;
    } catch (error) {
      console.error('Failed to initialize Tesseract worker:', error);
      throw new Error('Failed to initialize OCR engine');
    }
  }, [worker, isInitialized]);

  const terminateWorker = useCallback(async () => {
    if (worker) {
      try {
        await worker.terminate();
        setWorker(null);
        setIsInitialized(false);
        console.log('Tesseract worker terminated');
      } catch (error) {
        console.error('Error terminating worker:', error);
      }
    }
  }, [worker]);

  const processImage = useCallback(async (
    imageData: string | File,
    providedAddress: string,
    providedFullName: string
  ): Promise<OCRResult> => {
    setIsProcessing(true);
    
    try {
      const currentWorker = await initializeWorker();
      
      let imageInput: string;
      
      // Handle different input types
      if (typeof imageData === 'string') {
        if (imageData.startsWith('data:')) {
          imageInput = imageData;
        } else {
          imageInput = `data:image/jpeg;base64,${imageData}`;
        }
      } else if (imageData instanceof File) {
        const base64 = await fileToBase64(imageData);
        imageInput = base64;
      } else {
        throw new Error('Unsupported image format');
      }

      console.log('Processing image with Tesseract...');
      
      const { data } = await currentWorker.recognize(imageInput);

      const extractedText = data.text || '';
      const confidence = data.confidence || 0;

      console.log('OCR completed, processing results...');

      // Process the extracted text to match addresses and names
      const result = await processOCRResult(extractedText, providedAddress, providedFullName, confidence);
      
      return result;
    } catch (error) {
      console.error('OCR processing failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [initializeWorker]);

  return {
    processImage,
    initializeWorker,
    terminateWorker,
    isInitialized,
    isProcessing
  };
};

// Helper function to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = error => reject(error);
  });
};

// Process OCR results to match addresses and names
const processOCRResult = async (
  extractedText: string,
  providedAddress: string,
  providedFullName: string,
  confidence: number
): Promise<OCRResult> => {
  // Normalize text for comparison
  const normalizedText = normalizeText(extractedText);
  const normalizedAddress = normalizeText(providedAddress);

  // Extract addresses from text
  const foundAddresses = extractAddresses(extractedText);
  
  // Perform address matching
  const addressMatchResult = performAddressMatching(normalizedAddress, normalizedText);
  
  // Perform name matching
  const nameMatchResult = matchFullName(providedFullName, extractedText);
  
  // Perform block matching for enhanced accuracy
  const blockMatchResult = performEnhancedBlockMatching(providedAddress, extractedText);

  return {
    extractedText,
    addressMatched: addressMatchResult.matched,
    nameMatched: nameMatchResult.matched,
    addressMatch: addressMatchResult.matched,
    matchScore: addressMatchResult.score,
    confidence,
    foundAddresses,
    fullName: nameMatchResult.value,
    blockMatches: blockMatchResult.totalMatches,
    matchingBlocks: blockMatchResult.matchedBlocks.map(b => b.matched),
    totalBlocks: blockMatchResult.providedBlocks.length,
    blockMatchDetails: blockMatchResult,
    fuzzyAddressMatched: addressMatchResult.fuzzyMatched,
    strictAddressMatched: addressMatchResult.strictMatched,
    normalizedProvidedAddress: normalizedAddress,
    normalizedExtractedText: normalizedText,
    matchedNgram: addressMatchResult.matchedNgram || ''
  };
};

// Text normalization
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Address extraction
const extractAddresses = (text: string): string[] => {
  const addressPatterns = [
    /\d+\s+[a-zA-Z\s]+(?:street|road|avenue|drive|lane|close|court|way|place|terrace|boulevard|highway|expressway)/gi,
    /(?:street|road|avenue|drive|lane|close|court|way|place|terrace|boulevard|highway|expressway)\s+[a-zA-Z\s]+/gi,
    /\d+\s+[a-zA-Z\s]+(?:street|road|avenue|drive|lane|close|court|way|place|terrace|boulevard|highway|expressway)\s+[a-zA-Z\s]+/gi
  ];

  const addresses: string[] = [];
  
  addressPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      addresses.push(...matches);
    }
  });

  return [...new Set(addresses)]; // Remove duplicates
};

// Address matching logic
const performAddressMatching = (
  providedAddress: string,
  extractedText: string
): {
  matched: boolean;
  score: number;
  fuzzyMatched: boolean;
  strictMatched: boolean;
  matchedNgram?: string;
} => {
  const providedWords = providedAddress.split(/\s+/);
  const extractedWords = extractedText.split(/\s+/);
  
  let strictMatches = 0;
  let fuzzyMatches = 0;
  const totalWords = Math.max(providedWords.length, 1);
  
  // Check for exact matches
  providedWords.forEach(word => {
    if (word.length > 2 && extractedWords.includes(word)) {
      strictMatches++;
    }
  });
  
  // Check for fuzzy matches
  providedWords.forEach(word => {
    if (word.length > 2) {
      const fuzzyMatch = extractedWords.find(extractedWord => 
        calculateSimilarity(word, extractedWord) > 0.8
      );
      if (fuzzyMatch) {
        fuzzyMatches++;
      }
    }
  });
  
  const strictScore = (strictMatches / totalWords) * 100;
  const fuzzyScore = (fuzzyMatches / totalWords) * 100;
  
  const strictMatched = strictScore >= 60;
  const fuzzyMatched = fuzzyScore >= 70;
  const matched = strictMatched || fuzzyMatched;
  
  return {
    matched,
    score: Math.max(strictScore, fuzzyScore),
    fuzzyMatched,
    strictMatched
  };
};

// Name matching
const matchFullName = (providedFullName: string, text: string): { matched: boolean; value: string } => {
  const normalizedName = normalizeText(providedFullName);
  const normalizedText = normalizeText(text);
  
  const nameWords = normalizedName.split(/\s+/);
  const textWords = normalizedText.split(/\s+/);
  
  let matches = 0;
  nameWords.forEach(word => {
    if (word.length > 2 && textWords.includes(word)) {
      matches++;
    }
  });
  
  const matchPercentage = (matches / nameWords.length) * 100;
  const matched = matchPercentage >= 50;
  
  return {
    matched,
    value: providedFullName
  };
};

// Enhanced block matching
const performEnhancedBlockMatching = (providedAddress: string, extractedText: string): BlockMatchResult => {
  const providedBlocks = extractAddressBlocks(providedAddress);
  const extractedBlocks = extractTextBlocks(extractedText);
  
  const matchedBlocks: Array<{
    provided: string;
    matched: string;
    similarity: number;
    matchType: 'exact' | 'fuzzy' | 'partial';
  }> = [];
  
  providedBlocks.forEach(providedBlock => {
    let bestMatch = { text: '', similarity: 0, matchType: 'partial' as 'exact' | 'fuzzy' | 'partial' };
    
    extractedBlocks.forEach(extractedBlock => {
      const similarity = calculateSimilarity(providedBlock, extractedBlock);
      if (similarity > bestMatch.similarity) {
        bestMatch = {
          text: extractedBlock,
          similarity,
          matchType: similarity > 0.9 ? 'exact' : similarity > 0.7 ? 'fuzzy' : 'partial'
        };
      }
    });
    
    if (bestMatch.similarity > 0.5) {
      matchedBlocks.push({
        provided: providedBlock,
        matched: bestMatch.text,
        similarity: bestMatch.similarity,
        matchType: bestMatch.matchType
      });
    }
  });
  
  const blockScore = matchedBlocks.length > 0 
    ? (matchedBlocks.reduce((sum, block) => sum + block.similarity, 0) / matchedBlocks.length) * 100
    : 0;
  
  return {
    providedBlocks,
    extractedBlocks,
    matchedBlocks,
    blockScore,
    totalMatches: matchedBlocks.length
  };
};

// Extract address blocks
const extractAddressBlocks = (address: string): string[] => {
  return address
    .split(/[,\s]+/)
    .filter(block => block.length > 2)
    .map(block => normalizeText(block));
};

// Extract text blocks
const extractTextBlocks = (text: string): string[] => {
  return text
    .split(/[,\s]+/)
    .filter(block => block.length > 2)
    .map(block => normalizeText(block));
};

// Calculate similarity between two strings
const calculateSimilarity = (str1: string, str2: string): number => {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
};

// Levenshtein distance calculation
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

export default useClientSideOCR; 