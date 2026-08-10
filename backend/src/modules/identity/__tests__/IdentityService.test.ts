import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdentityService } from '../application/IdentityService';
import { IdentityProvider } from '../domain/IdentityProvider';
import { IUserRepository } from '../domain/IUserRepository';
import { IOrganizationRepository } from '../domain/IOrganizationRepository';
import { AuthResult, LoginCredentials, RegisterCredentials } from '../domain/dtos';
import { AuthenticatedUser } from '../domain/AuthenticatedUser';

class MockIdentityProvider implements IdentityProvider {
  register = vi.fn();
  login = vi.fn();
  logout = vi.fn();
  refresh = vi.fn();
  verifyToken = vi.fn();
  getUser = vi.fn();
  resetPassword = vi.fn();
}

describe('IdentityService', () => {
  let identityProvider: MockIdentityProvider;
  let userRepository: any;
  let organizationRepository: any;
  let identityService: IdentityService;

  beforeEach(() => {
    identityProvider = new MockIdentityProvider();
    userRepository = { create: vi.fn(), findById: vi.fn(), update: vi.fn(), delete: vi.fn() };
    organizationRepository = { create: vi.fn(), findById: vi.fn(), update: vi.fn(), delete: vi.fn() };
    identityService = new IdentityService(identityProvider, userRepository, organizationRepository);
  });

  it('should call provider.register and return the result', async () => {
    const creds: RegisterCredentials = { email: 'test@test.com', password: 'password123' };
    const expectedResult: AuthResult = {
      accessToken: 'acc_token',
      refreshToken: 'ref_token',
      expiresIn: 3600,
      user: { id: '1', email: 'test@test.com', roles: ['USER'], permissions: [] }
    };

    identityProvider.register.mockResolvedValue(expectedResult);
    organizationRepository.create.mockResolvedValue({ id: 'org_123', name: 'Test Org' });
    userRepository.create.mockResolvedValue({ id: '1', email: 'test@test.com' });

    const result = await identityService.register(creds);

    expect(identityProvider.register).toHaveBeenCalledWith(creds);
    expect(organizationRepository.create).toHaveBeenCalled();
    expect(userRepository.create).toHaveBeenCalled();
    expect(result.user.organizationId).toBe('org_123');
  });

  it('should call provider.login and return the result', async () => {
    const creds: LoginCredentials = { email: 'test@test.com', password: 'password123' };
    const expectedResult: AuthResult = {
      accessToken: 'acc_token',
      refreshToken: 'ref_token',
      expiresIn: 3600,
      user: { id: '1', email: 'test@test.com', roles: ['USER'], permissions: [] }
    };

    identityProvider.login.mockResolvedValue(expectedResult);

    const result = await identityService.login(creds);

    expect(identityProvider.login).toHaveBeenCalledWith(creds);
    expect(result).toEqual(expectedResult);
  });

  it('should call provider.logout with token', async () => {
    const token = 'my_token';
    identityProvider.logout.mockResolvedValue(undefined);

    await identityService.logout(token);

    expect(identityProvider.logout).toHaveBeenCalledWith(token);
  });

  it('should call provider.refresh with refresh token', async () => {
    const token = 'refresh_token';
    const expectedResult: AuthResult = {
      accessToken: 'new_acc_token',
      refreshToken: 'new_ref_token',
      expiresIn: 3600,
      user: { id: '1', email: 'test@test.com', roles: ['USER'], permissions: [] }
    };

    identityProvider.refresh.mockResolvedValue(expectedResult);

    const result = await identityService.refresh(token);

    expect(identityProvider.refresh).toHaveBeenCalledWith(token);
    expect(result).toEqual(expectedResult);
  });

  it('should call provider.getUser with token', async () => {
    const token = 'my_token';
    const expectedUser: AuthenticatedUser = {
      id: '1',
      email: 'test@test.com',
      roles: ['USER'],
      permissions: []
    };

    identityProvider.getUser.mockResolvedValue(expectedUser);

    const result = await identityService.getCurrentUser(token);

    expect(identityProvider.getUser).toHaveBeenCalledWith(token);
    expect(result).toEqual(expectedUser);
  });
});
