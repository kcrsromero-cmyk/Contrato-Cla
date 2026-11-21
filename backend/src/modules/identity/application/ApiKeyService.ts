import type { PrismaClient } from '@prisma/client';
import { AuthenticatedUser } from '../domain/AuthenticatedUser';
import { API_KEY_PATTERN, hashApiKey } from '../domain/ApiKey';
import { ApiAccessNotAllowedError, ApiKeyAuthenticationError } from '../domain/errors';
import { buildAuthenticatedUserFromDbUser } from './ApiKeyUserMapper';

export const USE_API_CAPABILITY = 'USE_API';

export type ApiKeyClient = Pick<PrismaClient, 'apiKey' | 'plan'>;

export interface ApiKeyAuthentication {
  apiKeyId: string;
  user: AuthenticatedUser;
  apiRequestsPerMinute: number | null;
}

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
}
