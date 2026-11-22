import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IdentityProvider } from '../domain/IdentityProvider';
import { AuthResult, LoginCredentials, RegisterCredentials } from '../domain/dtos';
import { AuthenticatedUser } from '../domain/AuthenticatedUser';
import { IdentityMapper } from '../application/IdentityMapper';
import { SupabaseIdentityMapper } from './SupabaseIdentityMapper';
import { config } from '../../../infrastructure/config/env';

export class SupabaseIdentityProvider implements IdentityProvider {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY);
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

  /**
   * Revokes only the session tied to this specific token (`scope=local`) via Supabase's
   * REST API. Never uses `this.client.auth.signOut()`: that call acts on whatever session
   * happens to be stored on the shared singleton client, which login/refresh calls from
   * other concurrent requests keep overwriting — it can silently no-op or revoke an
   * unrelated user's session. `scope=global` would also be correct here, but it revokes
   * every session the user has on every device, which this single "cerrar sesión" endpoint
   * doesn't promise.
   */
  async logout(token: string): Promise<void> {
    const response = await fetch(`${config.SUPABASE_URL}/auth/v1/logout?scope=local`, {
      method: 'POST',
      headers: {
        apikey: config.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
      },
    });

    // An already-expired/invalid token has nothing left to revoke — logout stays idempotent.
    if (!response.ok && response.status !== 401 && response.status !== 403) {
      throw new Error(`Supabase logout failed with status ${response.status}`);
    }
  }

  /** Stateless token exchange — never reads or writes the shared client's session. */
  async refresh(refreshToken: string): Promise<AuthResult> {
    const response = await fetch(`${config.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: config.SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error_description || data.msg || 'Refresh failed');
    if (!data.access_token || !data.user) throw new Error('Refresh failed to return session data');

    const authUser = SupabaseIdentityMapper.fromProviderPayload(data.user);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
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
