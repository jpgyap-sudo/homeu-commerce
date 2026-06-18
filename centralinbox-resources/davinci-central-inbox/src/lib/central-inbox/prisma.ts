import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var davinciCentralInboxPrisma: PrismaClient | undefined;
}

export const prisma =
  global.davinciCentralInboxPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.davinciCentralInboxPrisma = prisma;
}
