import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IdentityProvider } from '../domain/IdentityProvider';
import { AuthResult, LoginCredentials, RegisterCredentials } from '../domain/dtos';
import { AuthenticatedUser } from '../domain/AuthenticatedUser';
import { IdentityMapper } from '../application/IdentityMapper';
import { SupabaseIdentityMapper } from './SupabaseIdentityMapper';
import { config } from '../../../infrastructure/config/env';

/**
 * Crea un cliente Supabase sin estado para uso en servidor.
 * El backend atiende a muchos usuarios a la vez: un cliente con sesión en memoria
 * haría que logout/refresh actúen sobre la sesión del último usuario que hizo login.
 */
export const createStatelessSupabaseClient = (): SupabaseClient =>
  createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

export class SupabaseIdentityProvider implements IdentityProvider {
  constructor(private readonly clientFactory: () => SupabaseClient = createStatelessSupabaseClient) {}

  // Un cliente nuevo por operación: aislamiento total entre peticiones concurrentes.
  private get client(): SupabaseClient {
    return this.clientFactory();
  }

  async register(credentials: RegisterCredentials): Promise<AuthResult> {
    const { data, error } = await this.client.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          name: credentials.name,
        },
      },
    });

    if (error) {
      const err = new Error(error.message);
      (err as any).code = error.code;
      throw err;
    }
    if (!data.user) throw new Error('Registration failed: no user data returned');

    const authUser = SupabaseIdentityMapper.fromProviderPayload(data.user);

    return {
      accessToken: data.session?.access_token || '',
      refreshToken: data.session?.refresh_token || '',
      expiresIn: data.session?.expires_in || 0,
      user: IdentityMapper.toUserProfile(authUser),
    };
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) throw new Error(error.message);
    if (!data.session || !data.user) throw new Error('Login failed to return session data');

    const authUser = SupabaseIdentityMapper.fromProviderPayload(data.user);

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      user: IdentityMapper.toUserProfile(authUser),
    };
  }

  async logout(token: string): Promise<void> {
    // Revoca la sesión del dueño del JWT recibido, no una sesión guardada en el servidor.
    const { error: signOutError } = await this.client.auth.admin.signOut(token, 'local');
    if (signOutError) throw new Error(signOutError.message);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const { data, error } = await this.client.auth.refreshSession({ refresh_token: refreshToken });

    if (error) throw new Error(error.message);
    if (!data.session || !data.user) throw new Error('Refresh failed to return session data');

    const authUser = SupabaseIdentityMapper.fromProviderPayload(data.user);

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      user: IdentityMapper.toUserProfile(authUser),
    };
  }

  async getUser(token: string): Promise<AuthenticatedUser | null> {
    try {
      const { data, error } = await this.client.auth.getUser(token);
      if (error || !data.user) {
        return null;
      }
      return SupabaseIdentityMapper.fromProviderPayload(data.user);
    } catch {
      return null;
    }
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
  }
}
