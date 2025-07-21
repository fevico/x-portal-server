import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Realistic qualifications for primary and secondary school teachers in Nigeria
const primaryQualifications = [
    'NCE (Nigeria Certificate in Education)',
    'B.Ed (Bachelor of Education) - Primary',
    'PGDE (Postgraduate Diploma in Education)',
    'TC II (Teachers Grade II Certificate)',
];

const secondaryQualifications = [
    'B.Ed (Bachelor of Education) - Secondary',
    'B.Sc (Ed) (Bachelor of Science in Education)',
    'M.Ed (Master of Education)',
    'PGDE (Postgraduate Diploma in Education)',
];

async function main() {
    console.log('🌱 Starting database seeding...');

    // Step 1: Replace all qualifications with random realistic values
    console.log('🔧 Replacing qualifications with realistic data for Nigerian teachers...');
    const allStaff = await prisma.staff.findMany();

    for (const staff of allStaff) {
        // Randomly decide if the teacher is primary or secondary (50/50 chance)
        const isPrimary = Math.random() < 0.5;
        const qualPool = isPrimary ? primaryQualifications : secondaryQualifications;

        // Generate a random number of qualifications (1 to 3)
        const numQuals = Math.floor(Math.random() * 3) + 1;
        const randomQuals = [];
        const usedIndices = new Set();

        while (randomQuals.length < numQuals) {
            const randomIndex = Math.floor(Math.random() * qualPool.length);
            if (!usedIndices.has(randomIndex)) {
                usedIndices.add(randomIndex);
                randomQuals.push(qualPool[randomIndex]);
            }
        }

        const newQualifications = JSON.stringify(randomQuals);

        await prisma.staff.update({
            where: { id: staff.id },
            data: { qualifications: newQualifications },
        });
        console.log(`✅ Updated qualifications for staff ID ${staff.id}: ${newQualifications}`);
    }

    console.log('✅ Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        console.log('🔌 Database connection closed');
    });