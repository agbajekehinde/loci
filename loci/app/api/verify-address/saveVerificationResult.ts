import { prisma } from '@/app/lib/prisma';
// import type { JsonValue } from '@/app/generated/prisma/index.d.ts';

export interface VerificationPayload {
  full_name: string;
  typed_address: string;
  utility_bill: string;
  id_document: string;
  gps_latitude?: string;
  gps_longitude?: string;
  [key: string]: unknown;
}

export interface VerificationResult {
  success: boolean;
  overall_score: number;
  verification_id: string;
  checks: Record<string, unknown>;
  ip: string | null;
  ip_location: unknown;
  recommendations: string[];
  timestamp: string;
  landverify_data: unknown;
  [key: string]: unknown;
}

export async function saveVerificationResult(result: VerificationResult, payload: VerificationPayload) {
  return await prisma.verificationResult.create({
    data: {
      result: JSON.parse(JSON.stringify(result)),
      payload: JSON.parse(JSON.stringify(payload)),
    },
  });
} 