import type { CreateGroupDto, Group, UpdateGroupDto } from '../domain/group.js';
import type { ListOptions, ListResult } from '../domain/pagination.js';
import { GroupEntity } from '../entities/group.js';
import { NotFoundError } from '../lib/errors.js';
import type { GroupRepository } from '../ports/group-repository.js';

export class GroupDynamoRepository implements GroupRepository {
  async create(
    group: CreateGroupDto & { groupId: string; organizationId: string },
  ): Promise<Group> {
    const result = await GroupEntity.create({
      groupId: group.groupId,
      organizationId: group.organizationId,
      teamId: group.teamId,
      name: group.name,
      description: group.description ?? '',
      status: 'active',
    }).go();

    return result.data as unknown as Group;
  }

  async getById(organizationId: string, groupId: string): Promise<Group | null> {
    const result = await GroupEntity.get({
      organizationId,
      groupId,
    }).go();

    return (result.data as unknown as Group) ?? null;
  }

  async listByTeam(
    organizationId: string,
    teamId: string,
    options?: ListOptions,
  ): Promise<ListResult<Group>> {
    const query = GroupEntity.query
      .byTeam({ organizationId, teamId })
      .go({
        limit: options?.limit ?? 25,
        ...(options?.cursor && { cursor: options.cursor }),
      });

    const result = await query;

    return {
      items: result.data as unknown as Group[],
      cursor: result.cursor ?? undefined,
    };
  }

  async update(
    organizationId: string,
    groupId: string,
    data: UpdateGroupDto,
  ): Promise<Group> {
    const result = await GroupEntity.patch({
      organizationId,
      groupId,
    })
      .set(data)
      .go({ response: 'all_new' });

    if (!result.data) {
      throw new NotFoundError(`Group ${groupId} not found`);
    }

    return result.data as unknown as Group;
  }

  async delete(organizationId: string, groupId: string): Promise<void> {
    await GroupEntity.delete({
      organizationId,
      groupId,
    }).go();
  }
}
