import { randomUUID } from 'node:crypto';
import type {
  CreateTeamDto,
  Team,
  UpdateTeamDto,
} from '../domain/team.js';
import type { ListOptions, ListResult } from '../domain/pagination.js';
import { NotFoundError } from '../lib/errors.js';
import type { EventPublisher } from '../ports/event-publisher.js';
import type { TeamRepository } from '../ports/team-repository.js';

export class TeamService {
  constructor(
    private readonly repository: TeamRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async createTeam(
    organizationId: string,
    dto: CreateTeamDto,
  ): Promise<Team> {
    const teamId = randomUUID();

    const team = await this.repository.create({
      ...dto,
      teamId,
      organizationId,
    });

    await this.eventPublisher.publish('TeamCreated', {
      organizationId,
      teamId: team.teamId,
      name: team.name,
      sport: team.sport,
    });

    return team;
  }

  async getTeam(organizationId: string, teamId: string): Promise<Team> {
    const team = await this.repository.getById(organizationId, teamId);
    if (!team) {
      throw new NotFoundError(`Team ${teamId} not found`);
    }

    return team;
  }

  async listTeams(
    organizationId: string,
    options?: ListOptions,
  ): Promise<ListResult<Team>> {
    return this.repository.listByOrganization(organizationId, options);
  }

  async updateTeam(
    organizationId: string,
    teamId: string,
    dto: UpdateTeamDto,
  ): Promise<Team> {
    const existing = await this.repository.getById(organizationId, teamId);
    if (!existing) {
      throw new NotFoundError(`Team ${teamId} not found`);
    }

    const updated = await this.repository.update(organizationId, teamId, dto);

    await this.eventPublisher.publish('TeamUpdated', {
      organizationId,
      teamId,
      changes: Object.keys(dto),
    });

    return updated;
  }

  async deleteTeam(organizationId: string, teamId: string): Promise<void> {
    const existing = await this.repository.getById(organizationId, teamId);
    if (!existing) {
      throw new NotFoundError(`Team ${teamId} not found`);
    }

    await this.repository.delete(organizationId, teamId);

    await this.eventPublisher.publish('TeamDeleted', {
      organizationId,
      teamId,
      name: existing.name,
    });
  }
}
