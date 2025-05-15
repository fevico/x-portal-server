// prisma/seed/seed-clearlogs.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearLogs() {
  const BATCH_SIZE = 89;
  let deleted: number;

  console.log(`⏳ Starting log truncation in batches of ${BATCH_SIZE}...`);

  do {
    // delete up to BATCH_SIZE rows
    const result = await prisma.logEntry.deleteMany({
      limit: BATCH_SIZE,
    });
    deleted = result.count;
    console.log(`🗑  Deleted ${deleted} logs`);
  } while (deleted === BATCH_SIZE);

  console.log('✅ All logs cleared.');
}

async function main() {
  try {
    await clearLogs();
    console.log('🎉 Seeding (clear) completed successfully.');
  } catch (error) {
    console.error('❌ Error clearing logs:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
