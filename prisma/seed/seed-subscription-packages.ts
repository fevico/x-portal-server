import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSubscriptionPackages() {
    console.log('🌟 Starting subscription packages seed...');

    const packages = [
        {
            name: 'Basic',
            amount: 8000, // ₦8,000/month
            duration: 1, // 1 month
            studentLimit: 100,
            features: {
                studentLimit: 100,
                teachers: 5,
                subjects: 10,
                storage: '1GB',
                support: 'Email',
                reports: 'Basic',
                modules: ['Students', 'Teachers', 'Classes'],
                cbt: false,
                feeManagement: false,
                bulkSMS: false,
                attendance: true,
                results: true,
            },
            isActive: true,
        },
        {
            name: 'Starter',
            amount: 15000, // ₦15,000/month
            duration: 1,
            studentLimit: 300,
            features: {
                studentLimit: 300,
                teachers: 15,
                subjects: 20,
                storage: '5GB',
                support: 'Email & Chat',
                reports: 'Standard',
                modules: ['Students', 'Teachers', 'Classes', 'Attendance', 'Results'],
                cbt: true,
                feeManagement: false,
                bulkSMS: true,
                attendance: true,
                results: true,
            },
            isActive: true,
        },
        {
            name: 'Professional',
            amount: 28000, // ₦28,000/month
            duration: 1,
            studentLimit: 800,
            features: {
                studentLimit: 800,
                teachers: 40,
                subjects: 50,
                storage: '20GB',
                support: 'Priority Support',
                reports: 'Advanced',
                modules: ['All Modules', 'CBT', 'Fee Management', 'Communication'],
                cbt: true,
                feeManagement: true,
                bulkSMS: true,
                attendance: true,
                results: true,
                parentPortal: true,
            },
            isActive: true,
        },
        {
            name: 'Enterprise',
            amount: 45000, // ₦45,000/month
            duration: 1,
            studentLimit: 2000,
            features: {
                studentLimit: 2000,
                teachers: 100,
                subjects: 'Unlimited',
                storage: '100GB',
                support: '24/7 Priority',
                reports: 'Premium Analytics',
                modules: ['All Modules', 'API Access', 'Custom Integration'],
                cbt: true,
                feeManagement: true,
                bulkSMS: true,
                attendance: true,
                results: true,
                parentPortal: true,
                apiAccess: true,
                customIntegration: true,
            },
            isActive: true,
        },
        {
            name: 'Premium Annual',
            amount: 35000, // ₦35,000/month (discounted for annual)
            duration: 12, // 12 months
            studentLimit: 5000,
            features: {
                studentLimit: 5000,
                teachers: 'Unlimited',
                subjects: 'Unlimited',
                storage: '500GB',
                support: 'Dedicated Manager',
                reports: 'Enterprise Analytics',
                modules: ['Everything', 'White Label', 'Multi-Campus'],
                cbt: true,
                feeManagement: true,
                bulkSMS: true,
                attendance: true,
                results: true,
                parentPortal: true,
                apiAccess: true,
                customIntegration: true,
                whiteLabel: true,
                multiCampus: true,
            },
            isActive: true,
        },
    ];

    for (const packageData of packages) {
        try {
            const existingPackage = await prisma.subscription.findUnique({
                where: { name: packageData.name },
            });

            if (existingPackage) {
                console.log(`📦 Package "${packageData.name}" already exists, updating...`);
                await prisma.subscription.update({
                    where: { id: existingPackage.id },
                    data: packageData,
                });
            } else {
                console.log(`📦 Creating package "${packageData.name}"...`);
                await prisma.subscription.create({
                    data: packageData,
                });
            }
        } catch (error) {
            console.error(`❌ Error creating package "${packageData.name}":`, error);
        }
    }

    console.log('✅ Subscription packages seed completed!');
}

async function main() {
    try {
        await seedSubscriptionPackages();
    } catch (error) {
        console.error('❌ Error during seeding:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
