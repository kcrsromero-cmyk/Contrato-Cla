import { Subscription } from './Subscription';

export interface ISubscriptionRepository {
  create(subscription: Subscription): Promise<Subscription>;
  findById(id: string): Promise<Subscription | null>;
  findByOrganizationId(organizationId: string): Promise<Subscription | null>;
  update(subscription: Subscription): Promise<Subscription>;
}
