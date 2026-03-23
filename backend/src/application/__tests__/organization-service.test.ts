import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganizationService } from '../organization-service.js';
import type { OrganizationRepository } from '../../ports/organization-repository.js';
import type { EventPublisher } from '../../ports/event-publisher.js';
import type { Organization } from '../../domain/organization.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';

function createMockOrganization(
  overrides: Partial<Organization> = {},
): Organization {
  return {
    organizationId: 'org-123',
    name: 'Test Org',
    slug: 'test-org',
    status: 'active',
    ownerUserId: 'user-456',
    billingEmail: 'billing@test.com',
    phone: '555-0100',
    address: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    timezone: 'America/Chicago',
    config: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockRepository(): OrganizationRepository {
  return {
    create: vi.fn(),
    getById: vi.fn(),
    getBySlug: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockPublisher(): EventPublisher {
  return {
    publish: vi.fn(),
  };
}

describe('OrganizationService', () => {
  let service: OrganizationService;
  let repository: OrganizationRepository;
  let publisher: EventPublisher;

  beforeEach(() => {
    repository = createMockRepository();
    publisher = createMockPublisher();
    service = new OrganizationService(repository, publisher);
  });

  describe('createOrganization', () => {
    it('should create an organization and publish event', async () => {
      const dto = {
        name: 'New Org',
        slug: 'new-org',
        ownerUserId: 'user-789',
        billingEmail: 'billing@neworg.com',
        phone: '555-0200',
        address: '456 Oak Ave',
        city: 'Chicago',
        state: 'IL',
        zip: '60601',
        timezone: 'America/Chicago',
        config: {},
      };

      const mockOrg = createMockOrganization({
        name: dto.name,
        slug: dto.slug,
        ownerUserId: dto.ownerUserId,
      });

      vi.mocked(repository.getBySlug).mockResolvedValue(null);
      vi.mocked(repository.create).mockResolvedValue(mockOrg);

      const result = await service.createOrganization(dto);

      expect(result).toEqual(mockOrg);
      expect(repository.getBySlug).toHaveBeenCalledWith('new-org');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Org',
          slug: 'new-org',
          organizationId: expect.any(String),
        }),
      );
      expect(publisher.publish).toHaveBeenCalledWith(
        'OrganizationCreated',
        expect.objectContaining({
          organizationId: mockOrg.organizationId,
          name: mockOrg.name,
        }),
      );
    });

    it('should throw ConflictError if slug already exists', async () => {
      const dto = {
        name: 'New Org',
        slug: 'existing-slug',
        ownerUserId: 'user-789',
        billingEmail: 'billing@neworg.com',
        phone: '555-0200',
        address: '456 Oak Ave',
        city: 'Chicago',
        state: 'IL',
        zip: '60601',
        timezone: 'America/Chicago',
        config: {},
      };

      vi.mocked(repository.getBySlug).mockResolvedValue(
        createMockOrganization({ slug: 'existing-slug' }),
      );

      await expect(service.createOrganization(dto)).rejects.toThrow(
        ConflictError,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('getOrganization', () => {
    it('should return the organization by id', async () => {
      const mockOrg = createMockOrganization();
      vi.mocked(repository.getById).mockResolvedValue(mockOrg);

      const result = await service.getOrganization('org-123');

      expect(result).toEqual(mockOrg);
      expect(repository.getById).toHaveBeenCalledWith('org-123');
    });

    it('should throw NotFoundError if organization does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.getOrganization('non-existent'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('listOrganizations', () => {
    it('should return paginated list of organizations', async () => {
      const mockOrgs = [
        createMockOrganization({ organizationId: 'org-1' }),
        createMockOrganization({ organizationId: 'org-2' }),
      ];

      vi.mocked(repository.list).mockResolvedValue({
        items: mockOrgs,
        cursor: undefined,
      });

      const result = await service.listOrganizations({ limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(repository.list).toHaveBeenCalledWith({ limit: 10 });
    });
  });

  describe('updateOrganization', () => {
    it('should update the organization and publish event', async () => {
      const mockOrg = createMockOrganization();
      const updatedOrg = createMockOrganization({ name: 'Updated Name' });

      vi.mocked(repository.getById).mockResolvedValue(mockOrg);
      vi.mocked(repository.update).mockResolvedValue(updatedOrg);

      const result = await service.updateOrganization('org-123', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(publisher.publish).toHaveBeenCalledWith(
        'OrganizationUpdated',
        expect.objectContaining({
          organizationId: 'org-123',
          changes: ['name'],
        }),
      );
    });

    it('should throw NotFoundError if organization does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.updateOrganization('non-existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteOrganization', () => {
    it('should delete the organization and publish event', async () => {
      const mockOrg = createMockOrganization();
      vi.mocked(repository.getById).mockResolvedValue(mockOrg);
      vi.mocked(repository.delete).mockResolvedValue(undefined);

      await service.deleteOrganization('org-123');

      expect(repository.delete).toHaveBeenCalledWith('org-123');
      expect(publisher.publish).toHaveBeenCalledWith(
        'OrganizationDeleted',
        expect.objectContaining({
          organizationId: 'org-123',
          name: 'Test Org',
        }),
      );
    });

    it('should throw NotFoundError if organization does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.deleteOrganization('non-existent'),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
