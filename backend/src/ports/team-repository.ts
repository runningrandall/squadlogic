import type { ListOptions, ListResult } from '../domain/pagination.js';
import type { CreateTeamDto, Team, UpdateTeamDto } from '../domain/team.js';

export interface TeamRepository {
  create(team: CreateTeamDto & { teamId: string; organizationId: string }): Promise<Team>;
  getById(organizationId: string, teamId: string): Promise<Team | null>;
  listByOrganization(organizationId: string, options?: ListOptions): Promise<ListResult<Team>>;
  update(organizationId: string, teamId: string, data: UpdateTeamDto): Promise<Team>;
  delete(organizationId: string, teamId: string): Promise<void>;
}
