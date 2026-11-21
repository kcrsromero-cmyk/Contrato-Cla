import { z } from 'zod';

export const CreateApiKeySchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
});

/** Shape check before Prisma sees a @db.Uuid value; anything else is answered 404. */
export const ApiKeyIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
