import type { ListOptions, ListResult } from '../domain/pagination.js';
import type { CreateGroupDto, Group, UpdateGroupDto } from '../domain/group.js';

export interface GroupRepository {
  create(group: CreateGroupDto & { groupId: string; organizationId: string }): Promise<Group>;
  getById(organizationId: string, groupId: string): Promise<Group | null>;
  listByTeam(organizationId: string, teamId: string, options?: ListOptions): Promise<ListResult<Group>>;
  update(organizationId: string, groupId: string, data: UpdateGroupDto): Promise<Group>;
  delete(organizationId: string, groupId: string): Promise<void>;
}
