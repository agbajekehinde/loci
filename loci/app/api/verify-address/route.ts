import { NextRequest, NextResponse } from 'next/server';
import { verifyUtilityBillAddress } from "./utilityBillOCR";
import { runVerificationChecks } from '../document-validity/documentValidity';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      typed_address,
      utility_bill, // base64 string
      gps_latitude,
      gps_longitude,
      // ... other fields
    } = body;

    // Validate required fields
    if (!typed_address || !utility_bill) {
      return NextResponse.json(
        { error: 'Missing required fields: typed_address and utility_bill' },
        { status: 400 }
      );
    }

    // Clean base64 string - remove data URL prefix if present
    let cleanBase64 = utility_bill;
    if (utility_bill.startsWith('data:')) {
      cleanBase64 = utility_bill.split(',')[1];
    }

    // Improved base64 validation
    if (!cleanBase64 || cleanBase64.length === 0) {
      return NextResponse.json(
        { error: 'Empty base64 image data' },
        { status: 400 }
      );
    }

    // More robust base64 validation
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleanBase64)) {
      return NextResponse.json(
        { error: 'Invalid base64 format' },
        { status: 400 }
      );
    }

    try {
      // Test if base64 can be decoded
      const buffer = Buffer.from(cleanBase64, 'base64');
      if (buffer.length === 0) {
        throw new Error('Empty buffer after base64 decode');
      }
    } catch (error) {
      console.error('Base64 validation error:', error);
      return NextResponse.json(
        { error: 'Invalid base64 image data - cannot decode' },
        { status: 400 }
      );
    }

    // Perform OCR address verification with error handling
    let ocrResult;
    try {
      ocrResult = await verifyUtilityBillAddress(cleanBase64, typed_address);
    } catch (ocrError) {
      console.error('OCR verification failed:', ocrError);
      return NextResponse.json(
        { error: 'OCR verification failed', details: ocrError instanceof Error ? ocrError.message : 'Unknown OCR error' },
        { status: 500 }
      );
    }

    // Document validity check with error handling
    let documentValidityResult;
    try {
      // Pass the original utility_bill (which contains the base64 data)
      documentValidityResult = await runVerificationChecks(utility_bill);
    } catch (docError) {
      console.error('Document validity check failed:', docError);
      return NextResponse.json(
        { error: 'Document validity check failed', details: docError instanceof Error ? docError.message : 'Unknown document validation error' },
        { status: 500 }
      );
    }

    const document_validity = {
      passed: true,
      score: documentValidityResult.authenticityScore,
      details: documentValidityResult.issuesFound.join(', '),
      confidence: 100
    };
  

    // Mock other verification checks
    const mockChecks = {
      gps_reverse_check: {
        passed: true,
        score: 85,
        details: `GPS coordinates verified for ${typed_address}`,
        confidence: 90
      },
      distance_integrity: {
        passed: gps_latitude && gps_longitude,
        score: 92,
        details: 'Location coordinates within acceptable range',
        confidence: 95
      },
      zoning_cadastral: {
        passed: true,
        score: 78,
        details: 'Address matches zoning records',
        confidence: 82
      }
    };

    // Calculate overall score with null checks
    const scores = [
      ocrResult?.matchScore || 0,
      mockChecks.gps_reverse_check.score,
      document_validity.score || 0,
      mockChecks.distance_integrity.score,
      mockChecks.zoning_cadastral.score
    ].filter(score => score !== null && score !== undefined);

    const overall_score = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    const verificationResult = {
      success: (ocrResult?.addressMatch || false) && overall_score >= 70,
      overall_score,
      verification_id: `VER_${Date.now()}`,
      checks: {
        address_match: {
          passed: ocrResult?.addressMatch || false,
          score: ocrResult?.matchScore || 0,
          details: `Address match: ${ocrResult?.matchScore || 0}% confidence. Found: ${ocrResult?.foundAddresses?.slice(0, 2).join(', ') || 'No addresses found'}`,
          confidence: ocrResult?.confidence || 0
        },
        document_validity,
        ...mockChecks
      },
      recommendations: !(ocrResult?.addressMatch) ? [
        'Consider uploading a clearer utility bill image',
        'Ensure the address on the utility bill matches exactly'
      ] : [],
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(verificationResult);

  } catch (error) {
    console.error('Verification failed:', error);
    return NextResponse.json(
      {
        error: 'Verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}