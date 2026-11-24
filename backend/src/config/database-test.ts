import { prisma } from './prisma.js';

async function testDatabaseConnection(): Promise<void> {
    try {
        await prisma.$connect();

        const result = await prisma.$queryRaw<
            { current_database: string }[]
        >`SELECT current_database()`;

        console.log('Database connected successfully!');
        console.log('Current database:', result[0]?.current_database);
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

void testDatabaseConnection();
