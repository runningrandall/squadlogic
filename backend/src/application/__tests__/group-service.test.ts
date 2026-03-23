import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroupService } from '../group-service.js';
import type { GroupRepository } from '../../ports/group-repository.js';
import type { EventPublisher } from '../../ports/event-publisher.js';
import type { Group } from '../../domain/group.js';
import { NotFoundError } from '../../lib/errors.js';

function createMockGroup(
  overrides: Partial<Group> = {},
): Group {
  return {
    groupId: 'group-123',
    teamId: 'team-456',
    organizationId: 'org-789',
    name: 'Offense',
    description: 'Offense unit',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockRepository(): GroupRepository {
  return {
    create: vi.fn(),
    getById: vi.fn(),
    listByTeam: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockPublisher(): EventPublisher {
  return {
    publish: vi.fn(),
  };
}

describe('GroupService', () => {
  let service: GroupService;
  let repository: GroupRepository;
  let publisher: EventPublisher;

  beforeEach(() => {
    repository = createMockRepository();
    publisher = createMockPublisher();
    service = new GroupService(repository, publisher);
  });

  describe('createGroup', () => {
    it('should create a group and publish event', async () => {
      const dto = {
        name: 'Offense',
        description: 'Offense unit',
      };

      const mockGroup = createMockGroup({
        name: dto.name,
        description: dto.description,
      });

      vi.mocked(repository.create).mockResolvedValue(mockGroup);

      const result = await service.createGroup('org-789', 'team-456', dto);

      expect(result).toEqual(mockGroup);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Offense',
          teamId: 'team-456',
          organizationId: 'org-789',
          groupId: expect.any(String),
        }),
      );
      expect(publisher.publish).toHaveBeenCalledWith(
        'GroupCreated',
        expect.objectContaining({
          organizationId: 'org-789',
          teamId: 'team-456',
          groupId: mockGroup.groupId,
          name: mockGroup.name,
        }),
      );
    });
  });

  describe('getGroup', () => {
    it('should return the group by id', async () => {
      const mockGroup = createMockGroup();
      vi.mocked(repository.getById).mockResolvedValue(mockGroup);

      const result = await service.getGroup('org-789', 'group-123');

      expect(result).toEqual(mockGroup);
      expect(repository.getById).toHaveBeenCalledWith('org-789', 'group-123');
    });

    it('should throw NotFoundError if group does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.getGroup('org-789', 'non-existent'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('listGroupsByTeam', () => {
    it('should return paginated list of groups', async () => {
      const mockGroups = [
        createMockGroup({ groupId: 'group-1' }),
        createMockGroup({ groupId: 'group-2' }),
      ];

      vi.mocked(repository.listByTeam).mockResolvedValue({
        items: mockGroups,
        cursor: undefined,
      });

      const result = await service.listGroupsByTeam('org-789', 'team-456', { limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(repository.listByTeam).toHaveBeenCalledWith('org-789', 'team-456', { limit: 10 });
    });
  });

  describe('updateGroup', () => {
    it('should update the group and publish event', async () => {
      const mockGroup = createMockGroup();
      const updatedGroup = createMockGroup({ name: 'Updated Name' });

      vi.mocked(repository.getById).mockResolvedValue(mockGroup);
      vi.mocked(repository.update).mockResolvedValue(updatedGroup);

      const result = await service.updateGroup('org-789', 'group-123', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(publisher.publish).toHaveBeenCalledWith(
        'GroupUpdated',
        expect.objectContaining({
          organizationId: 'org-789',
          groupId: 'group-123',
          changes: ['name'],
        }),
      );
    });

    it('should throw NotFoundError if group does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.updateGroup('org-789', 'non-existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteGroup', () => {
    it('should delete the group and publish event', async () => {
      const mockGroup = createMockGroup();
      vi.mocked(repository.getById).mockResolvedValue(mockGroup);
      vi.mocked(repository.delete).mockResolvedValue(undefined);

      await service.deleteGroup('org-789', 'group-123');

      expect(repository.delete).toHaveBeenCalledWith('org-789', 'group-123');
      expect(publisher.publish).toHaveBeenCalledWith(
        'GroupDeleted',
        expect.objectContaining({
          organizationId: 'org-789',
          groupId: 'group-123',
          name: 'Offense',
        }),
      );
    });

    it('should throw NotFoundError if group does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.deleteGroup('org-789', 'non-existent'),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
