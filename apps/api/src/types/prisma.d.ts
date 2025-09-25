// Type declarations for Prisma client to fix import issues
declare module '@prisma/client' {
  export * from '.prisma/client';
  export { PrismaClient } from '.prisma/client';
}