import { PrismaClient } from '@prisma/client';

// Use a singleton Prisma client instance to prevent multiple connection pools
export const prisma = new PrismaClient();
