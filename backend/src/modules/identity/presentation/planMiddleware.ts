/**
  * Helper to check if a user's plan is active.
  * Rules:
  * - Plan 'FREE' never expires.
  * - No planExpiresAt = active indefinitely.
  * - Compare direct UTC dates.
  */
 export const isPlanActive = (user: { plan?: { name: string } | string; planExpiresAt?: Date | string | null }): boolean => {
   const planName = typeof user.plan === 'object' ? user.plan?.name : user.plan;

   // Plan FREE nunca vence
   if (planName === 'FREE' || !planName) return true;

   // Sin fecha de vencimiento = activo indefinidamente
   if (!user.planExpiresAt) return true;

   // Comparar en UTC directamente
   return new Date() < new Date(user.planExpiresAt);
 };
