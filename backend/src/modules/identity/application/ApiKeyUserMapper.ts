import { AuthenticatedUser } from '../domain/AuthenticatedUser';
import { Roles } from '../domain/types';

export interface PlanWithCapabilities {
  name: string;
  maxFavoriteEntities: number | null;
  apiRequestsPerMinute: number | null;
  capabilities: { capability: { name: string } }[];
}

export interface UserWithPlan {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  phone: string | null;
  telegramUsername: string | null;
  notifyEmail: boolean;
  notifyTelegram: boolean;
  notifySms: boolean;
  planExpiresAt: Date | null;
  plan: PlanWithCapabilities | null;
}

export interface ResolvedApiKeyUser {
  user: AuthenticatedUser;
  apiRequestsPerMinute: number | null;
}

/**
 * Builds the AuthenticatedUser for an API-key request with exactly the plan rules
 * CurrentUserResolver.resolve applies to a web session:
 * - a non-FREE plan whose planExpiresAt has passed falls back to FREE;
 * - no plan falls back to FREE;
 * - FREE values come from the FREE row (maxFavoriteEntities ?? 0, capabilities ?? []).
 * Keep in lockstep with CurrentUserResolver: ApiKeyUserMapper.test.ts runs both on the same rows.
 */
export const buildAuthenticatedUserFromDbUser = async (
  dbUser: UserWithPlan,
  loadFreePlan: () => Promise<PlanWithCapabilities | null>,
  now: Date = new Date(),
): Promise<ResolvedApiKeyUser> => {
  const planName = dbUser.plan?.name || 'FREE';
  const isExpired = planName !== 'FREE' && !!dbUser.planExpiresAt && now >= new Date(dbUser.planExpiresAt);

  let plan: string;
  let maxFavoriteEntities: number | null;
  let capabilities: string[];
  let apiRequestsPerMinute: number | null;

  if (dbUser.plan && !isExpired) {
    plan = dbUser.plan.name;
    maxFavoriteEntities = dbUser.plan.maxFavoriteEntities;
    capabilities = dbUser.plan.capabilities.map((pc) => pc.capability.name);
    apiRequestsPerMinute = dbUser.plan.apiRequestsPerMinute;
  } else {
    const freePlan = await loadFreePlan();
    plan = 'FREE';
    maxFavoriteEntities = freePlan?.maxFavoriteEntities ?? 0;
    capabilities = freePlan?.capabilities.map((pc) => pc.capability.name) ?? [];
    apiRequestsPerMinute = freePlan?.apiRequestsPerMinute ?? null;
  }

  const user: AuthenticatedUser = {
    id: dbUser.id,
    email: dbUser.email,
    roles: dbUser.roles as Roles,
    permissions: [],
    name: dbUser.name ?? undefined,
    planExpiresAt: dbUser.planExpiresAt || null,
    plan,
    maxFavoriteEntities,
    capabilities,
    phone: dbUser.phone,
    telegramUsername: dbUser.telegramUsername,
    notifyEmail: dbUser.notifyEmail,
    notifyTelegram: dbUser.notifyTelegram,
    notifySms: dbUser.notifySms,
  };

  return { user, apiRequestsPerMinute };
};
