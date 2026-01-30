const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Attempting to create a test table...');
        await prisma.$executeRawUnsafe('CREATE TABLE "TestTable" (id SERIAL PRIMARY KEY, name TEXT)');
        console.log('Table created successfully!');
        await prisma.$executeRawUnsafe('DROP TABLE "TestTable"');
        console.log('Table dropped successfully!');
    } catch (err) {
        console.error('Operation failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
