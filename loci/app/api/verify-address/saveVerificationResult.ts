import { prisma } from '@/app/lib/prisma';

export async function saveVerificationResult(result: any, payload: any) {
  return await prisma.verificationResult.create({
    data: {
      result,
      payload,
    },
  });
} 