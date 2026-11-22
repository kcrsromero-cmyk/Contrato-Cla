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

export const USE_API_CAPABILITY = 'USE_API';
export const MAX_ACTIVE_API_KEYS_PER_USER = 10;

export type ApiKeyClient = Pick<PrismaClient, 'apiKey' | 'plan'>;

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

  async recordUsage(apiKeyId: string): Promise<void> {
    await this.prisma.apiKey.update({ where: { id: apiKeyId }, data: { lastUsedAt: this.now() } });
  }

  /** Returns the plaintext exactly once; only its hash and 12-char prefix are stored. */
  async issue(userId: string, name: string): Promise<IssuedApiKey> {
    const activeCount = await this.prisma.apiKey.count({ where: { userId, revokedAt: null } });
    if (activeCount >= MAX_ACTIVE_API_KEYS_PER_USER) throw new ApiKeyLimitExceededError();

    const generated = generateApiKey();
    const created = await this.prisma.apiKey.create({
      data: { userId, name, keyHash: generated.keyHash, keyPrefix: generated.keyPrefix },
      select: { id: true, name: true, keyPrefix: true, createdAt: true },
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
