import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IdentityProvider } from '../domain/IdentityProvider';
import { AuthResult, LoginCredentials, RegisterCredentials } from '../domain/dtos';
import { AuthenticatedUser } from '../domain/AuthenticatedUser';
import { IdentityMapper } from '../application/IdentityMapper';
import { SupabaseIdentityMapper } from './SupabaseIdentityMapper';

export class SupabaseIdentityProvider implements IdentityProvider {
  private client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing. Ensure SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are set.');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
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

    if (error) throw new Error(error.message);
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

  async logout(_token: string): Promise<void> {
    const { error: signOutError } = await this.client.auth.signOut();
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

  async verifyToken(token: string): Promise<any> {
    const { data, error } = await this.client.auth.getUser(token);

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Invalid token');

    return data.user;
  }

  async getUser(token: string): Promise<AuthenticatedUser | null> {
    try {
      const payload = await this.verifyToken(token);
      return SupabaseIdentityMapper.fromProviderPayload(payload);
    } catch {
      return null;
    }
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
  }
}
