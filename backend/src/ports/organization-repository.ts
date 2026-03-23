import type {
  CreateOrganizationDto,
  Organization,
  UpdateOrganizationDto,
} from '../domain/organization.js';

export interface ListOptions {
  cursor?: string;
  limit?: number;
}

export interface ListResult<T> {
  items: T[];
  cursor?: string;
}

export interface OrganizationRepository {
  create(org: CreateOrganizationDto & { organizationId: string }): Promise<Organization>;
  getById(organizationId: string): Promise<Organization | null>;
  getBySlug(slug: string): Promise<Organization | null>;
  list(options?: ListOptions): Promise<ListResult<Organization>>;
  update(
    organizationId: string,
    data: UpdateOrganizationDto,
  ): Promise<Organization>;
  delete(organizationId: string): Promise<void>;
}
