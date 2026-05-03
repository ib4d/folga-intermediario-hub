import { PrismaClient } from '@prisma/client'

import { ensurePlatformInitialized } from './platform-init'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Initialize Platform Layer (Agents, Events, etc.)
ensurePlatformInitialized()
