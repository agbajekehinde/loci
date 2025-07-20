const { prisma } = require('../app/lib/prisma');

async function main() {
  try {
    const results = await prisma.verificationResult.findMany();
    console.log('VerificationResult table contents:', results);
  } catch (error) {
    console.error('Error querying VerificationResult table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 