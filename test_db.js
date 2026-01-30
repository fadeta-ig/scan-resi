const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing connection to Supabase...');
        const result = await prisma.$queryRaw`SELECT 1 as test`;
        console.log('Connection successful:', result);
    } catch (err) {
        console.error('Connection failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
