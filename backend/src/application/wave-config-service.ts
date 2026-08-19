import { randomUUID } from 'node:crypto';
import type {
  CreateWaveConfigDto,
  UpdateWaveConfigDto,
  WaveConfig,
} from '../domain/wave-config.js';
import { NotFoundError } from '../lib/errors.js';
import type { EventPublisher } from '../ports/event-publisher.js';
import type { WaveConfigRepository } from '../ports/wave-config-repository.js';

const GLOBAL_ORG_ID = 'GLOBAL';

const DEFAULT_WAVES: CreateWaveConfigDto[] = [
  {
    waveName: 'Wave 1 - HS',
    entries: [
      { categoryName: 'JV B Boys', stageTime: '07:40', startTime: '08:00', laps: 2 },
      { categoryName: 'JV C Boys', stageTime: '07:45', startTime: '08:05', laps: 2 },
    ],
  },
  {
    waveName: 'Wave 2 - HS',
    entries: [
      { categoryName: 'JV A Boys', stageTime: '08:35', startTime: '08:55', laps: 2 },
      { categoryName: 'Freshman A Boys', stageTime: '08:40', startTime: '09:00', laps: 2 },
    ],
  },
  {
    waveName: 'Wave 3 - HS',
    entries: [
      { categoryName: 'Varsity Boys', stageTime: '09:50', startTime: '10:10', laps: 3 },
      { categoryName: 'Varsity Girls', stageTime: '09:55', startTime: '10:15', laps: 2 },
    ],
  },
  {
    waveName: 'Wave 4 - HS',
    entries: [
      { categoryName: 'JV A Girls', stageTime: '11:15', startTime: '11:35', laps: 2 },
      { categoryName: 'JV B Girls', stageTime: '10:00', startTime: '11:40', laps: 2 },
      { categoryName: 'JV C Girls', stageTime: '10:05', startTime: '11:45', laps: 2 },
    ],
  },
  {
    waveName: 'Wave 5 - HS',
    entries: [
      { categoryName: 'Freshman B Boys', stageTime: '12:20', startTime: '12:40', laps: 2 },
      { categoryName: 'JV D Boys', stageTime: '12:25', startTime: '12:45', laps: 2 },
    ],
  },
  {
    waveName: 'Wave 6 - HS',
    entries: [
      { categoryName: 'JV E Boys', stageTime: '13:15', startTime: '13:35', laps: 1 },
      { categoryName: 'Freshman C Boys', stageTime: '13:18', startTime: '13:38', laps: 1 },
      { categoryName: 'JV D Girls', stageTime: '13:21', startTime: '13:41', laps: 1 },
      { categoryName: 'Adventure', stageTime: '13:25', startTime: '13:45', laps: 1 },
    ],
  },
  {
    waveName: 'Wave 7 - JD',
    entries: [
      { categoryName: 'Advanced Boys', stageTime: '14:15', startTime: '14:30', laps: 1 },
      { categoryName: 'Intermediate 8th Grade Boys', stageTime: '14:20', startTime: '14:35', laps: 1 },
      { categoryName: 'Intermediate 7th Grade Boys', stageTime: '14:25', startTime: '14:40', laps: 1 },
    ],
  },
  {
    waveName: 'Wave 8 - JD',
    entries: [
      { categoryName: 'Advanced Girls', stageTime: '14:55', startTime: '15:10', laps: 1 },
      { categoryName: 'Intermediate Girls', stageTime: '15:00', startTime: '15:15', laps: 1 },
      { categoryName: 'Beginner Girls', stageTime: '15:05', startTime: '15:20', laps: 1 },
    ],
  },
  {
    waveName: 'Wave 9 - JD',
    entries: [
      { categoryName: 'Beginner 8th Grade Boys', stageTime: '15:35', startTime: '15:50', laps: 1 },
      { categoryName: 'Beginner 7th Grade Boys', stageTime: '15:40', startTime: '15:55', laps: 1 },
    ],
  },
];

export class WaveConfigService {
  constructor(
    private readonly repository: WaveConfigRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async getConfig(): Promise<WaveConfig[]> {
    const result = await this.repository.listByOrganization(GLOBAL_ORG_ID, {
      limit: 100,
    });

    if (result.items.length === 0) {
      return this.seedDefaults();
    }

    return result.items;
  }

  async updateWave(
    configId: string,
    dto: UpdateWaveConfigDto,
  ): Promise<WaveConfig> {
    const existing = await this.repository.getById(GLOBAL_ORG_ID, configId);
    if (!existing) {
      throw new NotFoundError(`WaveConfig ${configId} not found`);
    }

    const updated = await this.repository.update(GLOBAL_ORG_ID, configId, dto);

    await this.eventPublisher.publish('WaveConfigUpdated', {
      configId,
      organizationId: GLOBAL_ORG_ID,
      changes: Object.keys(dto),
    });

    return updated;
  }

  async seedDefaults(): Promise<WaveConfig[]> {
    const configs: WaveConfig[] = [];

    for (const wave of DEFAULT_WAVES) {
      const configId = randomUUID();
      const config = await this.repository.create({
        ...wave,
        configId,
        organizationId: GLOBAL_ORG_ID,
      });
      configs.push(config);
    }

    await this.eventPublisher.publish('WaveConfigSeeded', {
      organizationId: GLOBAL_ORG_ID,
      count: configs.length,
    });

    return configs;
  }
}
