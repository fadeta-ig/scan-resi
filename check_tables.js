const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Checking for tables...');
        const tables = await prisma.$queryRaw`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`;
        console.log('Tables found:', tables);
    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
