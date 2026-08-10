import { AuthenticatedUser } from './AuthenticatedUser';

export interface IUserRepository {
  findById(id: string): Promise<AuthenticatedUser | null>;
  create(user: AuthenticatedUser): Promise<AuthenticatedUser>;
  update(user: AuthenticatedUser): Promise<AuthenticatedUser>;
  delete(id: string): Promise<void>;
}
