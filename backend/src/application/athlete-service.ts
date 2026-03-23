import { randomUUID } from 'node:crypto';
import type {
  CreateAthleteDto,
  Athlete,
  UpdateAthleteDto,
} from '../domain/athlete.js';
import type { ListOptions, ListResult } from '../domain/pagination.js';
import { NotFoundError } from '../lib/errors.js';
import type { EventPublisher } from '../ports/event-publisher.js';
import type { AthleteRepository } from '../ports/athlete-repository.js';

export class AthleteService {
  constructor(
    private readonly repository: AthleteRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async createAthlete(
    organizationId: string,
    dto: CreateAthleteDto,
  ): Promise<Athlete> {
    const athleteId = randomUUID();

    const athlete = await this.repository.create({
      ...dto,
      athleteId,
      organizationId,
    });

    await this.eventPublisher.publish('AthleteCreated', {
      organizationId,
      athleteId: athlete.athleteId,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      email: athlete.email,
    });

    return athlete;
  }

  async getAthlete(organizationId: string, athleteId: string): Promise<Athlete> {
    const athlete = await this.repository.getById(organizationId, athleteId);
    if (!athlete) {
      throw new NotFoundError(`Athlete ${athleteId} not found`);
    }

    return athlete;
  }

  async listAthletes(
    organizationId: string,
    options?: ListOptions,
  ): Promise<ListResult<Athlete>> {
    return this.repository.listByOrganization(organizationId, options);
  }

  async updateAthlete(
    organizationId: string,
    athleteId: string,
    dto: UpdateAthleteDto,
  ): Promise<Athlete> {
    const existing = await this.repository.getById(organizationId, athleteId);
    if (!existing) {
      throw new NotFoundError(`Athlete ${athleteId} not found`);
    }

    const updated = await this.repository.update(organizationId, athleteId, dto);

    await this.eventPublisher.publish('AthleteUpdated', {
      organizationId,
      athleteId,
      changes: Object.keys(dto),
    });

    return updated;
  }

  async deleteAthlete(organizationId: string, athleteId: string): Promise<void> {
    const existing = await this.repository.getById(organizationId, athleteId);
    if (!existing) {
      throw new NotFoundError(`Athlete ${athleteId} not found`);
    }

    await this.repository.delete(organizationId, athleteId);

    await this.eventPublisher.publish('AthleteDeleted', {
      organizationId,
      athleteId,
      firstName: existing.firstName,
      lastName: existing.lastName,
    });
  }
}
