const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database via plain JS...');
    const SALT_ROUNDS = 10;
    const users = [
        {
            username: 'superadmin',
            password: await bcrypt.hash('super123', SALT_ROUNDS),
            name: 'Super Administrator',
            role: 'SUPER_ADMIN'
        },
        {
            username: 'admin',
            password: await bcrypt.hash('admin123', SALT_ROUNDS),
            name: 'Marketplace Admin',
            role: 'ADMIN'
        },
        {
            username: 'staff',
            password: await bcrypt.hash('staff123', SALT_ROUNDS),
            name: 'Warehouse Staff',
            role: 'WAREHOUSE'
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
