import type { CreateWaveConfigDto, UpdateWaveConfigDto, WaveConfig } from '../domain/wave-config.js';
import type { ListOptions, ListResult } from '../domain/pagination.js';
import { WaveConfigEntity } from '../entities/wave-config.js';
import { NotFoundError } from '../lib/errors.js';
import type { WaveConfigRepository } from '../ports/wave-config-repository.js';

export class WaveConfigDynamoRepository implements WaveConfigRepository {
  async create(
    config: CreateWaveConfigDto & { configId: string; organizationId: string },
  ): Promise<WaveConfig> {
    const result = await WaveConfigEntity.create({
      configId: config.configId,
      organizationId: config.organizationId,
      waveName: config.waveName,
      entries: config.entries,
    }).go();

    return result.data as unknown as WaveConfig;
  }

  async getById(organizationId: string, configId: string): Promise<WaveConfig | null> {
    const result = await WaveConfigEntity.get({
      organizationId,
      configId,
    }).go();

    return (result.data as unknown as WaveConfig) ?? null;
  }

  async listByOrganization(
    organizationId: string,
    options?: ListOptions,
  ): Promise<ListResult<WaveConfig>> {
    const query = WaveConfigEntity.query
      .byOrganization({ organizationId })
      .go({
        limit: options?.limit ?? 25,
        ...(options?.cursor && { cursor: options.cursor }),
      });

    const result = await query;

    return {
      items: result.data as unknown as WaveConfig[],
      cursor: result.cursor ?? undefined,
    };
  }

  async update(
    organizationId: string,
    configId: string,
    data: UpdateWaveConfigDto,
  ): Promise<WaveConfig> {
    const setData: Record<string, unknown> = {};
    if (data.waveName !== undefined) {
      setData.waveName = data.waveName;
    }
    if (data.entries !== undefined) {
      setData.entries = data.entries;
    }

    const result = await WaveConfigEntity.patch({
      organizationId,
      configId,
    })
      .set(setData)
      .go({ response: 'all_new' });

    if (!result.data) {
      throw new NotFoundError(`WaveConfig ${configId} not found`);
    }

    return result.data as unknown as WaveConfig;
  }

  async delete(organizationId: string, configId: string): Promise<void> {
    await WaveConfigEntity.delete({
      organizationId,
      configId,
    }).go();
  }
}
