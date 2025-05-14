import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  // Step 1: Clear existing data
  try {
    await prisma.logEntry.deleteMany();
    console.log('Cleared existing logs');
  } catch (error) {
    console.error('Error clearing existing data:', error);
    throw error;
  }
}

async function main() {
  try {
    await seed();
    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
