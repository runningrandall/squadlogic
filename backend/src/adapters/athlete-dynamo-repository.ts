import type { CreateAthleteDto, Athlete, UpdateAthleteDto } from '../domain/athlete.js';
import type { ListOptions, ListResult } from '../domain/pagination.js';
import { AthleteEntity } from '../entities/athlete.js';
import { NotFoundError } from '../lib/errors.js';
import type { AthleteRepository } from '../ports/athlete-repository.js';

export class AthleteDynamoRepository implements AthleteRepository {
  async create(
    athlete: CreateAthleteDto & { athleteId: string; organizationId: string },
  ): Promise<Athlete> {
    const result = await AthleteEntity.create({
      athleteId: athlete.athleteId,
      organizationId: athlete.organizationId,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      email: athlete.email,
      phone: athlete.phone ?? '',
      status: 'active',
      positions: athlete.positions ?? [],
      ...(athlete.dateOfBirth != null && { dateOfBirth: athlete.dateOfBirth }),
      ...(athlete.jerseyNumber != null && { jerseyNumber: athlete.jerseyNumber }),
      ...(athlete.emergencyContactName != null && { emergencyContactName: athlete.emergencyContactName }),
      ...(athlete.emergencyContactPhone != null && { emergencyContactPhone: athlete.emergencyContactPhone }),
      ...(athlete.notes != null && { notes: athlete.notes }),
    }).go();

    return result.data as unknown as Athlete;
  }

  async getById(organizationId: string, athleteId: string): Promise<Athlete | null> {
    const result = await AthleteEntity.get({
      organizationId,
      athleteId,
    }).go();

    return (result.data as unknown as Athlete) ?? null;
  }

  async listByOrganization(
    organizationId: string,
    options?: ListOptions,
  ): Promise<ListResult<Athlete>> {
    const query = AthleteEntity.query
      .byOrganization({ organizationId })
      .go({
        limit: options?.limit ?? 25,
        ...(options?.cursor && { cursor: options.cursor }),
      });

    const result = await query;

    return {
      items: result.data as unknown as Athlete[],
      cursor: result.cursor ?? undefined,
    };
  }

  async update(
    organizationId: string,
    athleteId: string,
    data: UpdateAthleteDto,
  ): Promise<Athlete> {
    const result = await AthleteEntity.patch({
      organizationId,
      athleteId,
    })
      .set(data)
      .go({ response: 'all_new' });

    if (!result.data) {
      throw new NotFoundError(`Athlete ${athleteId} not found`);
    }

    return result.data as unknown as Athlete;
  }

  async delete(organizationId: string, athleteId: string): Promise<void> {
    await AthleteEntity.delete({
      organizationId,
      athleteId,
    }).go();
  }
}
