export interface Organization {
  id: string;
  name: string;
  createdAt: Date;
}

export interface IOrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  create(organization: Omit<Organization, 'createdAt'>): Promise<Organization>;
  update(organization: Organization): Promise<Organization>;
  delete(id: string): Promise<void>;
}
