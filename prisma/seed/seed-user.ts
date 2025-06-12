import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // Hash the password
    const plainPassword = 'superadmin@superadmin.com';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

    // Create superAdmin user
    const superAdmin = await prisma.user.upsert({
        where: {
            email: 'superadmin@superadmin.com'
        },
        update: {},
        create: {
            firstname: 'Super',
            lastname: 'Admin',
            username: 'superadmin',
            email: 'superadmin@superadmin.com',
            password: hashedPassword,
            plainPassword: plainPassword,
            role: 'superAdmin',
            isActive: true,
            isDeleted: false,
            emailVerifiedAt: new Date(),
        },
    });

    console.log('✅ SuperAdmin user created:', {
        id: superAdmin.id,
        username: superAdmin.username,
        email: superAdmin.email,
        role: superAdmin.role,
        firstname: superAdmin.firstname,
        lastname: superAdmin.lastname,
    });

    console.log('🔐 Login credentials:');
    console.log('Email:', superAdmin.email);
    console.log('Username:', superAdmin.username);
    console.log('Password:', plainPassword);
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