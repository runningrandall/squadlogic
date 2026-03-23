import type {
  CreateOrganizationDto,
  Organization,
  UpdateOrganizationDto,
} from '../domain/organization.js';
import { OrganizationEntity } from '../entities/organization.js';
import { NotFoundError } from '../lib/errors.js';
import type {
  ListOptions,
  ListResult,
  OrganizationRepository,
} from '../ports/organization-repository.js';

export class OrganizationDynamoRepository implements OrganizationRepository {
  async create(
    org: CreateOrganizationDto & { organizationId: string },
  ): Promise<Organization> {
    const result = await OrganizationEntity.create({
      organizationId: org.organizationId,
      name: org.name,
      slug: org.slug,
      status: 'active',
      ownerUserId: org.ownerUserId,
      billingEmail: org.billingEmail,
      phone: org.phone,
      address: org.address,
      city: org.city,
      state: org.state,
      zip: org.zip,
      timezone: org.timezone,
      config: org.config ?? {},
    }).go();

    return result.data as unknown as Organization;
  }

  async getById(organizationId: string): Promise<Organization | null> {
    const result = await OrganizationEntity.get({
      organizationId,
    }).go();

    return (result.data as unknown as Organization) ?? null;
  }

  async getBySlug(slug: string): Promise<Organization | null> {
    const result = await OrganizationEntity.query
      .bySlug({ slug })
      .go();

    const items = result.data;
    if (items.length === 0) {
      return null;
    }

    return items[0] as unknown as Organization;
  }

  async list(options?: ListOptions): Promise<ListResult<Organization>> {
    const query = OrganizationEntity.query
      .allOrganizations({})
      .go({
        limit: options?.limit ?? 25,
        ...(options?.cursor && { cursor: options.cursor }),
      });

    const result = await query;

    return {
      items: result.data as unknown as Organization[],
      cursor: result.cursor ?? undefined,
    };
  }

  async update(
    organizationId: string,
    data: UpdateOrganizationDto,
  ): Promise<Organization> {
    const result = await OrganizationEntity.patch({
      organizationId,
    })
      .set(data)
      .go({ response: 'all_new' });

    if (!result.data) {
      throw new NotFoundError(`Organization ${organizationId} not found`);
    }

    return result.data as unknown as Organization;
  }

  async delete(organizationId: string): Promise<void> {
    await OrganizationEntity.delete({
      organizationId,
    }).go();
  }
}
