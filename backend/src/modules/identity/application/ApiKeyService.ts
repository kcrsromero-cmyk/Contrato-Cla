import type { PrismaClient } from '@prisma/client';
import { AuthenticatedUser } from '../domain/AuthenticatedUser';
import { API_KEY_PATTERN, generateApiKey, hashApiKey } from '../domain/ApiKey';
import {
  ApiAccessNotAllowedError,
  ApiKeyAuthenticationError,
  ApiKeyLimitExceededError,
  ApiKeyNotFoundError,
} from '../domain/errors';
import { buildAuthenticatedUserFromDbUser } from './ApiKeyUserMapper';
import { RedisCacheAdapter } from '../../../infrastructure/redis/RedisCacheAdapter';

export const USE_API_CAPABILITY = 'USE_API';
/** Used only when a user somehow has no plan row; every USE_API plan sets its own `maxApiKeys`. */
const DEFAULT_MAX_ACTIVE_API_KEYS_PER_USER = 10;
const USAGE_THROTTLE_SECONDS = 5 * 60;

export type ApiKeyClient = Pick<PrismaClient, 'apiKey' | 'plan' | 'user' | '$transaction'>;

export interface ApiKeyAuthentication {
  apiKeyId: string;
  user: AuthenticatedUser;
  apiRequestsPerMinute: number | null;
}

export interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export interface IssuedApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  key: string;
}

const SUMMARY_SELECT = {
  id: true,
  name: true,
  keyPrefix: true,
  createdAt: true,
  lastUsedAt: true,
  revokedAt: true,
} as const;

export class ApiKeyService {
  private readonly cache = new RedisCacheAdapter();

  constructor(
    private readonly prisma: ApiKeyClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Resolves a presented key to its owner under the same plan rules as a web session.
   * Throws ApiKeyAuthenticationError (malformed, unknown, revoked) or
   * ApiAccessNotAllowedError (owner's resolved plan lacks USE_API).
   */
  async authenticate(plaintextKey: string): Promise<ApiKeyAuthentication> {
    if (!API_KEY_PATTERN.test(plaintextKey)) throw new ApiKeyAuthenticationError();

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash: hashApiKey(plaintextKey) },
      include: { user: { include: { plan: { include: { capabilities: { include: { capability: true } } } } } } },
    });
    if (!apiKey || apiKey.revokedAt) throw new ApiKeyAuthenticationError();

    const { user, apiRequestsPerMinute } = await buildAuthenticatedUserFromDbUser(
      apiKey.user,
      () => this.prisma.plan.findUnique({
        where: { name: 'FREE' },
        include: { capabilities: { include: { capability: true } } },
      }),
      this.now(),
    );

    if (!user.capabilities?.includes(USE_API_CAPABILITY)) throw new ApiAccessNotAllowedError();

    return { apiKeyId: apiKey.id, user, apiRequestsPerMinute };
  }

  /**
   * Writes `lastUsedAt` at most once per `USAGE_THROTTLE_SECONDS` per key. The Redis gate is
   * acquired atomically (`SET NX EX`), so concurrent requests for the same key never both pass
   * it; if the Postgres write then fails, the gate is released so the next request can retry
   * instead of silently skipping writes for the rest of the window.
   */
  async recordUsage(apiKeyId: string): Promise<void> {
    const throttleKey = `apikey:usage-throttle:${apiKeyId}`;
    const acquired = await this.cache.setIfNotExists(throttleKey, '1', USAGE_THROTTLE_SECONDS);
    if (!acquired) return;

    try {
      await this.prisma.apiKey.update({ where: { id: apiKeyId }, data: { lastUsedAt: this.now() } });
    } catch (error) {
      await this.cache.del(throttleKey);
      throw error;
    }
  }

  /**
   * Returns the plaintext exactly once; only its hash and 12-char prefix are stored.
   * The count-then-create is serialized per user with a transaction-scoped advisory lock,
   * so concurrent requests from the same user can't both pass the count check at 9.
   * `null` on the plan's `maxApiKeys` means unlimited, matching `maxFavoriteEntities`.
   */
  async issue(userId: string, name: string): Promise<IssuedApiKey> {
    const generated = generateApiKey();
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

      const dbUser = await tx.user.findUnique({ where: { id: userId }, select: { plan: { select: { maxApiKeys: true } } } });
      const limit = dbUser?.plan ? dbUser.plan.maxApiKeys : DEFAULT_MAX_ACTIVE_API_KEYS_PER_USER;

      if (limit !== null) {
        const activeCount = await tx.apiKey.count({ where: { userId, revokedAt: null } });
        if (activeCount >= limit) throw new ApiKeyLimitExceededError();
      }

      return tx.apiKey.create({
        data: { userId, name, keyHash: generated.keyHash, keyPrefix: generated.keyPrefix },
        select: { id: true, name: true, keyPrefix: true, createdAt: true },
      });
    });
    return { ...created, key: generated.plaintext };
  }

  async listForUser(userId: string): Promise<ApiKeySummary[]> {
    return this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: SUMMARY_SELECT,
    });
  }

  /** Another user's key id is indistinguishable from a missing one (ApiKeyNotFoundError). */
  async revoke(userId: string, apiKeyId: string): Promise<ApiKeySummary> {
    const existing = await this.prisma.apiKey.findFirst({ where: { id: apiKeyId, userId }, select: SUMMARY_SELECT });
    if (!existing) throw new ApiKeyNotFoundError();
    if (existing.revokedAt) return existing;
    return this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { revokedAt: this.now() },
      select: SUMMARY_SELECT,
    });
  }
}
