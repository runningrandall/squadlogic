import type { ListOptions, ListResult } from '../domain/pagination.js';
import type { CreateAthleteDto, Athlete, UpdateAthleteDto } from '../domain/athlete.js';

export interface AthleteRepository {
  create(athlete: CreateAthleteDto & { athleteId: string; organizationId: string }): Promise<Athlete>;
  getById(organizationId: string, athleteId: string): Promise<Athlete | null>;
  listByOrganization(organizationId: string, options?: ListOptions): Promise<ListResult<Athlete>>;
  update(organizationId: string, athleteId: string, data: UpdateAthleteDto): Promise<Athlete>;
  delete(organizationId: string, athleteId: string): Promise<void>;
}
