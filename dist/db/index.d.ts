import { PrismaClient } from '@prisma/client';
declare global {
    var prisma: PrismaClient | undefined;
}
export declare const db: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare function connectDatabase(): Promise<void>;
export declare function disconnectDatabase(): Promise<void>;
export { PrismaClient };
export * from '@prisma/client';
//# sourceMappingURL=index.d.ts.map