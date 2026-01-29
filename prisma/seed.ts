// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    const SALT_ROUNDS = 10;

    // Create default users
    const users = [
        {
            username: 'superadmin',
            password: await bcrypt.hash('super123', SALT_ROUNDS),
            name: 'Super Administrator',
            role: 'SUPER_ADMIN' as const
        },
        {
            username: 'admin',
            password: await bcrypt.hash('admin123', SALT_ROUNDS),
            name: 'Marketplace Admin',
            role: 'ADMIN' as const
        },
        {
            username: 'staff',
            password: await bcrypt.hash('staff123', SALT_ROUNDS),
            name: 'Warehouse Staff',
            role: 'WAREHOUSE' as const
        }
    ];

    for (const user of users) {
        const existing = await prisma.user.findUnique({
            where: { username: user.username }
        });

        if (!existing) {
            await prisma.user.create({ data: user });
            console.log(`✅ Created user: ${user.username} (${user.role})`);
        } else {
            console.log(`⏭️  User already exists: ${user.username}`);
        }
    }

    console.log('✨ Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
