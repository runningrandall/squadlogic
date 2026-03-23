import { randomUUID } from 'node:crypto';
import type {
  CreateOrganizationDto,
  Organization,
  UpdateOrganizationDto,
} from '../domain/organization.js';
import { ConflictError, NotFoundError } from '../lib/errors.js';
import type { EventPublisher } from '../ports/event-publisher.js';
import type {
  ListOptions,
  ListResult,
  OrganizationRepository,
} from '../ports/organization-repository.js';

export class OrganizationService {
  constructor(
    private readonly repository: OrganizationRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async createOrganization(
    dto: CreateOrganizationDto,
  ): Promise<Organization> {
    const existingBySlug = await this.repository.getBySlug(dto.slug);
    if (existingBySlug) {
      throw new ConflictError(
        `Organization with slug "${dto.slug}" already exists`,
      );
    }

    const organizationId = randomUUID();

    const organization = await this.repository.create({
      ...dto,
      organizationId,
    });

    await this.eventPublisher.publish('OrganizationCreated', {
      organizationId: organization.organizationId,
      name: organization.name,
      slug: organization.slug,
      ownerUserId: organization.ownerUserId,
    });

    return organization;
  }

  async getOrganization(organizationId: string): Promise<Organization> {
    const organization = await this.repository.getById(organizationId);
    if (!organization) {
      throw new NotFoundError(
        `Organization ${organizationId} not found`,
      );
    }

    return organization;
  }

  async listOrganizations(
    options?: ListOptions,
  ): Promise<ListResult<Organization>> {
    return this.repository.list(options);
  }

  async updateOrganization(
    organizationId: string,
    dto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const existing = await this.repository.getById(organizationId);
    if (!existing) {
      throw new NotFoundError(
        `Organization ${organizationId} not found`,
      );
    }

    const updated = await this.repository.update(organizationId, dto);

    await this.eventPublisher.publish('OrganizationUpdated', {
      organizationId,
      changes: Object.keys(dto),
    });

    return updated;
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    const existing = await this.repository.getById(organizationId);
    if (!existing) {
      throw new NotFoundError(
        `Organization ${organizationId} not found`,
      );
    }

    await this.repository.delete(organizationId);

    await this.eventPublisher.publish('OrganizationDeleted', {
      organizationId,
      name: existing.name,
    });
  }
}
