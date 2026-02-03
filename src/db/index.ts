import { PrismaClient } from '@prisma/client';

declare global {
    var prisma: PrismaClient | undefined;
}

export const db = globalThis.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = db;
}

export async function connectDatabase(): Promise<void> {
    try {
        await db.$connect();
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Failed to connect to database:', error);
        throw error;
    }
}

export async function disconnectDatabase(): Promise<void> {
    await db.$disconnect();
    console.log('Database disconnected');
}

export { PrismaClient };
export * from '@prisma/client';
