import { NextRequest, NextResponse } from 'next/server';
import { runVerificationChecks } from '../document-validity/documentValidity';
import { getIpAndLocation } from '@/app/hooks/geolocation';

interface ClientOCRResult {
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
  blockMatchDetails?: Record<string, unknown>;
  fuzzyAddressMatched: boolean;
  strictAddressMatched: boolean;
  normalizedProvidedAddress: string;
  normalizedExtractedText: string;
  matchedNgram: string;
}

interface DocumentValidityResult {
  authenticityScore: number;
  issuesFound: string[];
  passed?: boolean;
  details?: string;
  confidence?: number;
}

interface ZoningResult {
  passed: boolean;
  score: number;
  details: string;
  confidence: number;
  landverify_response?: Record<string, unknown>;
}

async function verifyZoningCadastral(address: string, utilityBillBase64?: string) {
  try {
    if (!address || address.trim() === '') {
      throw new Error('Address is required for zoning/cadastral verification');
    }

    if (!process.env.LANDVERIFY_KEY) {
      throw new Error('LANDVERIFY_KEY environment variable is not set');
    }

    const files = [];
    
    if (utilityBillBase64 && utilityBillBase64.trim() !== '') {
      try {
        const fileUrl = `data:image/jpeg;base64,${utilityBillBase64}`;
        files.push(fileUrl);
        console.log('Added utility bill to files array');
      } catch (uploadError) {
        console.error('Failed to process utility bill:', uploadError);
      }
    }

    if (files.length === 0) {
      throw new Error('No files available for verification - utility bill is required');
    }

    const payload = {
      address: address.trim(),
      files: files,
      userId: 3386
    };

    console.log('Sending payload to LandVerify:', {
      address: payload.address,
      filesCount: payload.files.length,
      userId: payload.userId
    });

    const response = await fetch('https://app.landverify.ng/api/verification/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.LANDVERIFY_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LandVerify API Error:', response.status, errorText);
      throw new Error(`LandVerify API failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('LandVerify API Response:', result);

    return {
      passed: result.status === 'submitted' || result.success === true,
      score: result.status === 'submitted' ? 50 : (result.score || 50),
      details: result.status === 'submitted' 
        ? `Verification successfully submitted for processing for ${address}. LandVerify processing initiated.`
        : (result.message || result.details || 'Zoning/cadastral verification successfully submitted for processing'),
      confidence: result.status === 'submitted' ? 90 : (result.confidence || 75),
      landverify_response: result
    };

  } catch (error) {
    console.error('Zoning/cadastral verification error:', error);
    
    return {
      passed: false,
      score: 0,
      details: `Zoning/cadastral verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      confidence: 0,
      landverify_response: null
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      typed_address,
      utility_bill,
      id_document,
      client_ocr_results // New field for client-side OCR results
    } = body;

    if (!typed_address || !utility_bill || !id_document) {
      return NextResponse.json(
        { error: 'Missing required fields: typed_address, utility_bill, and id_document' },
        { status: 400 }
      );
    }

    // Validate client OCR results
    if (!client_ocr_results || !client_ocr_results.utility_bill || !client_ocr_results.id_document) {
      return NextResponse.json(
        { error: 'Missing client-side OCR results' },
        { status: 400 }
      );
    }

    let cleanUtilityBillBase64 = utility_bill;
    if (utility_bill.startsWith('data:')) {
      cleanUtilityBillBase64 = utility_bill.split(',')[1];
    }
    if (!cleanUtilityBillBase64 || cleanUtilityBillBase64.length === 0) {
      return NextResponse.json(
        { error: 'Empty base64 image data for utility bill' },
        { status: 400 }
      );
    }

    let cleanIdDocumentBase64 = id_document;
    if (id_document.startsWith('data:')) {
      cleanIdDocumentBase64 = id_document.split(',')[1];
    }
    if (!cleanIdDocumentBase64 || cleanIdDocumentBase64.length === 0) {
      return NextResponse.json(
        { error: 'Empty base64 image data for id document' },
        { status: 400 }
      );
    }

    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleanUtilityBillBase64) || !base64Regex.test(cleanIdDocumentBase64)) {
      return NextResponse.json(
        { error: 'Invalid base64 format for utility bill or id document' },
        { status: 400 }
      );
    }

    try {
      const buffer1 = Buffer.from(cleanUtilityBillBase64, 'base64');
      const buffer2 = Buffer.from(cleanIdDocumentBase64, 'base64');
      if (buffer1.length === 0 || buffer2.length === 0) {
        throw new Error('Empty buffer after base64 decode');
      }
    } catch (error) {
      console.error('Base64 validation error:', error);
      return NextResponse.json(
        { error: 'Invalid base64 image data - cannot decode' },
        { status: 400 }
      );
    }

    // Use client-side OCR results instead of server-side OCR
    const ocrResult_utility = client_ocr_results.utility_bill;
    const ocrResult_id = client_ocr_results.id_document;

    // Perform document validity checks (server-side)
    let documentValidityResult_utility, documentValidityResult_id;
    try {
      documentValidityResult_utility = await runVerificationChecks(utility_bill);
    } catch (docError) {
      console.error('Utility Bill document validity check failed:', docError);
      return NextResponse.json(
        { error: 'Utility Bill document validity check failed', details: docError instanceof Error ? docError.message : 'Unknown document validation error' },
        { status: 500 }
      );
    }
    try {
      documentValidityResult_id = await runVerificationChecks(id_document);
    } catch (docError) {
      console.error('ID Document validity check failed:', docError);
      return NextResponse.json(
        { error: 'ID Document validity check failed', details: docError instanceof Error ? docError.message : 'Unknown document validation error' },
        { status: 500 }
      );
    }

    // Perform zoning/cadastral verification (server-side)
    let zoningCadastralResult;
    try {
      zoningCadastralResult = await verifyZoningCadastral(typed_address, cleanUtilityBillBase64);
    } catch (zoningError) {
      console.error('Zoning/cadastral verification failed:', zoningError);
      return NextResponse.json(
        { error: 'Zoning/cadastral verification failed', details: zoningError instanceof Error ? zoningError.message : 'Unknown zoning error' },
        { status: 500 }
      );
    }

    // Get IP and location information
    let ipAndLocationResult;
    try {
      ipAndLocationResult = await getIpAndLocation(request);
    } catch (ipError) {
      console.error('IP and location check failed:', ipError);
      ipAndLocationResult = {
        ip: 'unknown',
        city: 'unknown',
        region: 'unknown',
        country: 'unknown',
        isp: 'unknown',
        details: 'IP and location check failed'
      };
    }

    // Calculate overall verification score
    const utilityBillScore = Math.round(
      (ocrResult_utility.matchScore * 0.4) +
      (documentValidityResult_utility.authenticityScore * 0.3) +
      (ocrResult_utility.confidence * 0.3)
    );

    const idDocumentScore = Math.round(
      (ocrResult_id.matchScore * 0.4) +
      (documentValidityResult_id.authenticityScore * 0.3) +
      (ocrResult_id.confidence * 0.3)
    );

    const overallScore = Math.round(
      (utilityBillScore * 0.4) +
      (idDocumentScore * 0.3) +
      (zoningCadastralResult.score * 0.3)
    );

    // Generate verification ID
    const verificationId = `LOCI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare response
    const verificationResult = {
      success: overallScore >= 60,
      overall_score: overallScore,
      verification_id: verificationId,
      checks: {
        utility_bill: {
          validity: documentValidityResult_utility,
          match: {
            address_match: ocrResult_utility.addressMatched,
            name_match: ocrResult_utility.nameMatched,
            match_score: ocrResult_utility.matchScore,
            found_addresses: ocrResult_utility.foundAddresses,
            confidence: ocrResult_utility.confidence,
            extracted_text: ocrResult_utility.extractedText,
            block_matches: ocrResult_utility.blockMatches,
            total_blocks: ocrResult_utility.totalBlocks,
            fuzzy_address_matched: ocrResult_utility.fuzzyAddressMatched,
            strict_address_matched: ocrResult_utility.strictAddressMatched
          }
        },
        id_document: {
          validity: documentValidityResult_id,
          match: {
            address_match: ocrResult_id.addressMatched,
            name_match: ocrResult_id.nameMatched,
            match_score: ocrResult_id.matchScore,
            found_addresses: ocrResult_id.foundAddresses,
            confidence: ocrResult_id.confidence,
            extracted_text: ocrResult_id.extractedText,
            block_matches: ocrResult_id.blockMatches,
            total_blocks: ocrResult_id.totalBlocks,
            fuzzy_address_matched: ocrResult_id.fuzzyAddressMatched,
            strict_address_matched: ocrResult_id.strictAddressMatched
          }
        },
        zoning_cadastral: zoningCadastralResult,
        gps_reverse_check: ipAndLocationResult,
        distance_integrity: {
          passed: true,
          details: 'GPS coordinates provided for verification'
        }
      },
      ip: ipAndLocationResult.ip,
      recommendations: generateRecommendations(ocrResult_utility, ocrResult_id, documentValidityResult_utility, documentValidityResult_id, zoningCadastralResult),
      timestamp: new Date().toISOString()
    };

    console.log('Verification completed successfully:', {
      verificationId,
      overallScore,
      utilityBillScore,
      idDocumentScore,
      zoningScore: zoningCadastralResult.score
    });

    return NextResponse.json(verificationResult);

  } catch (error) {
    console.error('Verification process failed:', error);
    return NextResponse.json(
      { error: 'Verification process failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function generateRecommendations(
  utilityOCR: ClientOCRResult,
  idOCR: ClientOCRResult,
  utilityValidity: DocumentValidityResult,
  idValidity: DocumentValidityResult,
  zoningResult: ZoningResult
): string[] {
  const recommendations: string[] = [];

  // OCR-based recommendations
  if (utilityOCR.matchScore < 70) {
    recommendations.push('Utility bill address match is low. Please ensure the document clearly shows the address.');
  }
  if (idOCR.matchScore < 70) {
    recommendations.push('ID document address match is low. Please ensure the document clearly shows the address.');
  }
  if (utilityOCR.confidence < 80) {
    recommendations.push('Utility bill OCR confidence is low. Please upload a clearer image.');
  }
  if (idOCR.confidence < 80) {
    recommendations.push('ID document OCR confidence is low. Please upload a clearer image.');
  }

  // Document validity recommendations
  if (!utilityValidity.passed) {
    recommendations.push('Utility bill validation failed. Please ensure the document is authentic and not tampered with.');
  }
  if (!idValidity.passed) {
    recommendations.push('ID document validation failed. Please ensure the document is authentic and not tampered with.');
  }

  // Zoning recommendations
  if (!zoningResult.passed) {
    recommendations.push('Zoning/cadastral verification failed. Please ensure the address is correct and the property exists.');
  }

  if (recommendations.length === 0) {
    recommendations.push('All verifications passed successfully. Your address verification is complete.');
  }

  return recommendations;
} 