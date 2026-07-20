import type { ListOptions, ListResult } from '../domain/pagination.js';
import type { CreateWaveConfigDto, UpdateWaveConfigDto, WaveConfig } from '../domain/wave-config.js';

export interface WaveConfigRepository {
  create(config: CreateWaveConfigDto & { configId: string; organizationId: string }): Promise<WaveConfig>;
  getById(organizationId: string, configId: string): Promise<WaveConfig | null>;
  listByOrganization(organizationId: string, options?: ListOptions): Promise<ListResult<WaveConfig>>;
  update(organizationId: string, configId: string, data: UpdateWaveConfigDto): Promise<WaveConfig>;
  delete(organizationId: string, configId: string): Promise<void>;
}
