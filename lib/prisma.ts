import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * IMPORTANT: For Supabase, use the DIRECT connection (port 5432), NOT the pooler (port 6543)
 * 
 * Prisma requires prepared statements which pgbouncer (pooler) doesn't support.
 * 
 * Use this format in your .env:
 * DATABASE_URL="postgresql://postgres:PASSWORD@PROJECT.supabase.co:5432/postgres"
 * 
 * NOT this (pooler - will cause "prepared statement does not exist" errors):
 * DATABASE_URL="postgresql://postgres:PASSWORD@PROJECT.pooler.supabase.com:6543/postgres"
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

