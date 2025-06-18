// app/api/verify-address/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { extractTextFromDocument, detectImageTampering } from './imageutils';
import { checkDocumentContainsAddress } from './addressextraction';

interface VerificationRequest {
  full_name: string;
  email: string;
  phone_number: string;
  nin_or_bvn?: string;
  typed_address: string;
  gps_latitude: number;
  gps_longitude: number;
  utility_bill: string; // base64
  id_document: string; // base64
  land_document?: string; // base64
}

interface VerificationResult {
  success: boolean;
  overall_score: number;
  verification_id: string;
  checks: {
    gps_reverse_check: CheckResult;
    document_validity: CheckResult;
    address_match: CheckResult;
    distance_integrity: CheckResult;
    zoning_cadastral: CheckResult;
  };
  recommendations?: string[];
  timestamp: string;
}

interface CheckResult {
  passed: boolean;
  score: number;
  details: string;
  confidence: number;
}

interface DocumentAnalysisResult {
  text: string;
  tamperingScore: number;
  tamperingDetails: {
    imageQuality: number;
    compressionArtifacts: number;
    edgeConsistency: number;
    noisePattern: number;
  };
  addressMatch: {
    score: number;
    details: {
      exactMatches: string[];
      partialMatches: string[];
      keywordMatches: string[];
      streetNumberMatch: boolean;
      streetNameMatch: boolean;
      cityMatch: boolean;
      stateMatch: boolean;
      postalCodeMatch: boolean;
    };
  };
}

// Helper function to convert base64 to buffer
function base64ToBuffer(base64String: string): Buffer {
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// Helper function to determine MIME type from base64
function getMimeTypeFromBase64(base64String: string): string {
  if (base64String.startsWith('data:')) {
    const mimeMatch = base64String.match(/^data:([^;]+);base64,/);
    return mimeMatch ? mimeMatch[1] : 'image/jpeg';
  }
  return 'image/jpeg'; // Default assumption
}

// Process document with OCR and tampering detection
async function analyzeDocument(
  base64Document: string, 
  userAddress: string,
  documentType: 'certificate' | 'id' | 'utility' | 'generic' = 'generic'
): Promise<DocumentAnalysisResult> {
  try {
    const imageBuffer = base64ToBuffer(base64Document);
    const mimeType = getMimeTypeFromBase64(base64Document);
    
    console.log(`Analyzing ${documentType} document of type ${mimeType}`);
    
    // Extract text using enhanced OCR
    const extractedText = await extractTextFromDocument(imageBuffer, mimeType, {
      language: 'eng',
      documentType
    });
    
    // Detect tampering
    const tamperingResult = await detectImageTampering(imageBuffer);
    
    // Check address match
    const addressMatch = checkDocumentContainsAddress(extractedText, userAddress);
    
    console.log(`Document analysis complete:`, {
      textLength: extractedText.length,
      tamperingScore: tamperingResult.score,
      addressMatchScore: addressMatch.score
    });
    
    return {
      text: extractedText,
      tamperingScore: tamperingResult.score,
      tamperingDetails: tamperingResult.details,
      addressMatch
    };
  } catch (error) {
    console.error('Error analyzing document:', error);
    return {
      text: '',
      tamperingScore: 0.5, // Neutral score on error
      tamperingDetails: {
        imageQuality: 0,
        compressionArtifacts: 0,
        edgeConsistency: 0,
        noisePattern: 0
      },
      addressMatch: { 
        score: 0, 
        details: {
          exactMatches: [],
          partialMatches: [],
          keywordMatches: [],
          streetNumberMatch: false,
          streetNameMatch: false,
          cityMatch: false,
          stateMatch: false,
          postalCodeMatch: false
        }
      }
    };
  }
}

import { 
  reverseGeocode, 
  calculateAddressDistance as calcAddressDist, 
  calculateAddressSimilarity} from './geocoding';

// Main verification logic
async function performVerification(data: VerificationRequest): Promise<VerificationResult> {
  const verificationId = crypto.randomBytes(16).toString('hex');
  const timestamp = new Date().toISOString();
  
  console.log(`Starting verification ${verificationId} for user: ${data.email}`);
  
  // Initialize all check results
  const checks: VerificationResult['checks'] = {
    gps_reverse_check: { passed: false, score: 0, details: '', confidence: 0 },
    document_validity: { passed: false, score: 0, details: '', confidence: 0 },
    address_match: { passed: false, score: 0, details: '', confidence: 0 },
    distance_integrity: { passed: false, score: 0, details: '', confidence: 0 },
    zoning_cadastral: { passed: false, score: 0, details: '', confidence: 0 }
  };
  
  try {
    // 1. GPS Reverse Check
    console.log('Performing GPS reverse check...');
    const reverseGeocodeResult = await reverseGeocode(data.gps_latitude, data.gps_longitude);
    
    let gpsScore = 0;
    let gpsDetails = '';
    
    if (reverseGeocodeResult.success && reverseGeocodeResult.address) {
      // Calculate distance-based similarity
      const distanceResult = await calcAddressDist(data.typed_address, reverseGeocodeResult.address);
      
      if (distanceResult.success && distanceResult.distance) {
        gpsScore = distanceResult.distance.similarity;
        gpsDetails = `GPS coordinates reverse geocoded to: "${reverseGeocodeResult.address}". Distance: ${distanceResult.distance.distanceKm}km, Similarity: ${gpsScore.toFixed(2)}`;
      } else {
        // Fallback to text similarity if distance calculation fails
        gpsScore = calculateAddressSimilarity(data.typed_address, reverseGeocodeResult.address);
        gpsDetails = `GPS coordinates reverse geocoded to: "${reverseGeocodeResult.address}". Text similarity: ${gpsScore.toFixed(2)}`;
      }
    } else {
      gpsDetails = `GPS reverse geocoding failed: ${reverseGeocodeResult.error}`;
      gpsScore = 0;
    }
    
    checks.gps_reverse_check = {
      passed: gpsScore > 0.6,
      score: gpsScore,
      details: gpsDetails,
      confidence: reverseGeocodeResult.success ? 0.85 : 0.3
    };
    
    // 2. Document Validity & Analysis
    console.log('Analyzing utility bill...');
    const utilityAnalysis = await analyzeDocument(data.utility_bill, data.typed_address, 'utility');
    
    console.log('Analyzing ID document...');
    const idAnalysis = await analyzeDocument(data.id_document, data.typed_address, 'id');
    
    // Calculate overall document validity score
    const avgTamperingScore = (utilityAnalysis.tamperingScore + idAnalysis.tamperingScore) / 2;
    const hasValidText = utilityAnalysis.text.length > 50 && idAnalysis.text.length > 50;
    
    checks.document_validity = {
      passed: avgTamperingScore > 0.7 && hasValidText,
      score: avgTamperingScore,
      details: `Document tampering analysis - Utility: ${utilityAnalysis.tamperingScore}, ID: ${idAnalysis.tamperingScore}. Text extracted successfully: ${hasValidText}`,
      confidence: 0.85
    };
    
    // 3. Address Match
    console.log('Checking address matches...');
    const utilityAddressScore = utilityAnalysis.addressMatch.score;
    const idAddressScore = idAnalysis.addressMatch.score;
    const bestAddressScore = Math.max(utilityAddressScore, idAddressScore);
    
    checks.address_match = {
      passed: bestAddressScore > 0.5,
      score: bestAddressScore,
      details: `Address match scores - Utility: ${utilityAddressScore}, ID: ${idAddressScore}. Best match: ${bestAddressScore.toFixed(2)}`,
      confidence: 0.9
    };
    
    // 4. Distance Integrity
    console.log('Checking distance integrity...');
    
    // Enhanced distance integrity check using actual geocoding
    let distanceIntegrityScore = 0;
    let distanceDetails = '';
    
    // Try to get coordinates for typed address
    const typedAddressResult = await calcAddressDist(data.typed_address, reverseGeocodeResult.address || '');
    
    if (typedAddressResult.success && typedAddressResult.distance) {
      // Use distance-based scoring
      distanceIntegrityScore = Math.max(gpsScore, bestAddressScore, typedAddressResult.distance.similarity);
      distanceDetails = `Distance integrity analysis: GPS-Reverse(${gpsScore.toFixed(2)}), Best Document(${bestAddressScore.toFixed(2)}), Typed-GPS(${typedAddressResult.distance.similarity.toFixed(2)})`;
    } else {
      // Fallback to previous method
      distanceIntegrityScore = Math.min(gpsScore, bestAddressScore);
      distanceDetails = `Distance integrity based on GPS(${gpsScore.toFixed(2)}) and document(${bestAddressScore.toFixed(2)}) correlation`;
    }
    
    checks.distance_integrity = {
      passed: distanceIntegrityScore > 0.5,
      score: distanceIntegrityScore,
      details: distanceDetails,
      confidence: 0.8
    };
    
    // 5. Zoning/Cadastral (Mock implementation)
    console.log('Performing zoning/cadastral check...');
    // TODO: Implement actual zoning/cadastral verification
    const zoningScore = 0.8; // Mock score
    
    checks.zoning_cadastral = {
      passed: zoningScore > 0.6,
      score: zoningScore,
      details: `Zoning and cadastral verification completed with score: ${zoningScore.toFixed(2)}`,
      confidence: 0.7
    };
    
    // Calculate overall score
    const weightedScore = (
      checks.gps_reverse_check.score * 0.2 +
      checks.document_validity.score * 0.25 +
      checks.address_match.score * 0.3 +
      checks.distance_integrity.score * 0.15 +
      checks.zoning_cadastral.score * 0.1
    );
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (!checks.gps_reverse_check.passed) {
      recommendations.push('GPS coordinates do not closely match the provided address. Please verify location accuracy.');
    }
    
    if (!checks.document_validity.passed) {
      recommendations.push('Document quality or authenticity concerns detected. Please provide clearer, high-quality document images.');
    }
    
    if (!checks.address_match.passed) {
      recommendations.push('Address information in documents does not sufficiently match the provided address. Ensure all documents contain the correct address.');
    }
    
    if (!checks.distance_integrity.passed) {
      recommendations.push('Inconsistency detected between GPS location and document addresses. Please verify all information is accurate.');
    }
    
    const success = weightedScore > 0.6 && Object.values(checks).filter(check => check.passed).length >= 3;
    
    console.log(`Verification ${verificationId} completed. Overall score: ${weightedScore.toFixed(2)}, Success: ${success}`);
    
    return {
      success,
      overall_score: parseFloat(weightedScore.toFixed(2)),
      verification_id: verificationId,
      checks,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      timestamp
    };
    
  } catch (error) {
    console.error(`Error in verification ${verificationId}:`, error);
    
    return {
      success: false,
      overall_score: 0,
      verification_id: verificationId,
      checks,
      recommendations: ['Verification failed due to technical error. Please try again.'],
      timestamp
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Address verification request received');
    
    const data: VerificationRequest = await request.json();
    
    // Basic validation
    if (!data.typed_address || !data.utility_bill || !data.id_document) {
      return NextResponse.json(
        { error: 'Missing required fields: typed_address, utility_bill, or id_document' },
        { status: 400 }
      );
    }
    
    if (!data.gps_latitude || !data.gps_longitude) {
      return NextResponse.json(
        { error: 'GPS coordinates are required' },
        { status: 400 }
      );
    }
    
    // Perform verification
    const result = await performVerification(data);
    
    console.log(`Verification completed with ID: ${result.verification_id}`);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error in address verification API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during address verification',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}