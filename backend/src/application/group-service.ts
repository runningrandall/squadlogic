import { randomUUID } from 'node:crypto';
import type {
  CreateGroupDto,
  Group,
  UpdateGroupDto,
} from '../domain/group.js';
import type { ListOptions, ListResult } from '../domain/pagination.js';
import { NotFoundError } from '../lib/errors.js';
import type { EventPublisher } from '../ports/event-publisher.js';
import type { GroupRepository } from '../ports/group-repository.js';

export class GroupService {
  constructor(
    private readonly repository: GroupRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async createGroup(
    organizationId: string,
    teamId: string,
    dto: Omit<CreateGroupDto, 'teamId'>,
  ): Promise<Group> {
    const groupId = randomUUID();

    const group = await this.repository.create({
      ...dto,
      teamId,
      groupId,
      organizationId,
    });

    await this.eventPublisher.publish('GroupCreated', {
      organizationId,
      teamId,
      groupId: group.groupId,
      name: group.name,
    });

    return group;
  }

  async getGroup(organizationId: string, groupId: string): Promise<Group> {
    const group = await this.repository.getById(organizationId, groupId);
    if (!group) {
      throw new NotFoundError(`Group ${groupId} not found`);
    }

    return group;
  }

  async listGroupsByTeam(
    organizationId: string,
    teamId: string,
    options?: ListOptions,
  ): Promise<ListResult<Group>> {
    return this.repository.listByTeam(organizationId, teamId, options);
  }

  async updateGroup(
    organizationId: string,
    groupId: string,
    dto: UpdateGroupDto,
  ): Promise<Group> {
    const existing = await this.repository.getById(organizationId, groupId);
    if (!existing) {
      throw new NotFoundError(`Group ${groupId} not found`);
    }

    const updated = await this.repository.update(organizationId, groupId, dto);

    await this.eventPublisher.publish('GroupUpdated', {
      organizationId,
      groupId,
      changes: Object.keys(dto),
    });

    return updated;
  }

  async deleteGroup(organizationId: string, groupId: string): Promise<void> {
    const existing = await this.repository.getById(organizationId, groupId);
    if (!existing) {
      throw new NotFoundError(`Group ${groupId} not found`);
    }

    await this.repository.delete(organizationId, groupId);

    await this.eventPublisher.publish('GroupDeleted', {
      organizationId,
      groupId,
      name: existing.name,
    });
  }
}
