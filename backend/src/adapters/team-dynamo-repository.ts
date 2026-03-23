import type { CreateTeamDto, Team, UpdateTeamDto } from '../domain/team.js';
import type { ListOptions, ListResult } from '../domain/pagination.js';
import { TeamEntity } from '../entities/team.js';
import { NotFoundError } from '../lib/errors.js';
import type { TeamRepository } from '../ports/team-repository.js';

export class TeamDynamoRepository implements TeamRepository {
  async create(
    team: CreateTeamDto & { teamId: string; organizationId: string },
  ): Promise<Team> {
    const result = await TeamEntity.create({
      teamId: team.teamId,
      organizationId: team.organizationId,
      name: team.name,
      sport: team.sport,
      season: team.season,
      status: 'active',
      description: team.description ?? '',
      ...(team.maxRosterSize != null && { maxRosterSize: team.maxRosterSize }),
    }).go();

    return result.data as unknown as Team;
  }

  async getById(organizationId: string, teamId: string): Promise<Team | null> {
    const result = await TeamEntity.get({
      organizationId,
      teamId,
    }).go();

    return (result.data as unknown as Team) ?? null;
  }

  async listByOrganization(
    organizationId: string,
    options?: ListOptions,
  ): Promise<ListResult<Team>> {
    const query = TeamEntity.query
      .byOrganization({ organizationId })
      .go({
        limit: options?.limit ?? 25,
        ...(options?.cursor && { cursor: options.cursor }),
      });

    const result = await query;

    return {
      items: result.data as unknown as Team[],
      cursor: result.cursor ?? undefined,
    };
  }

  async update(
    organizationId: string,
    teamId: string,
    data: UpdateTeamDto,
  ): Promise<Team> {
    const { maxRosterSize, ...rest } = data;
    const setData: Record<string, unknown> = { ...rest };
    if (maxRosterSize !== undefined) {
      if (maxRosterSize !== null) {
        setData.maxRosterSize = maxRosterSize;
      }
    }

    const patchOp = TeamEntity.patch({
      organizationId,
      teamId,
    }).set(setData);

    const result = maxRosterSize === null
      ? await patchOp.remove(['maxRosterSize']).go({ response: 'all_new' })
      : await patchOp.go({ response: 'all_new' });

    if (!result.data) {
      throw new NotFoundError(`Team ${teamId} not found`);
    }

    return result.data as unknown as Team;
  }

  async delete(organizationId: string, teamId: string): Promise<void> {
    await TeamEntity.delete({
      organizationId,
      teamId,
    }).go();
  }
}
