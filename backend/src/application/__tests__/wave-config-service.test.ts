import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WaveConfigService } from '../wave-config-service.js';
import type { WaveConfigRepository } from '../../ports/wave-config-repository.js';
import type { EventPublisher } from '../../ports/event-publisher.js';
import type { WaveConfig } from '../../domain/wave-config.js';
import { NotFoundError } from '../../lib/errors.js';

function createMockWaveConfig(
  overrides: Partial<WaveConfig> = {},
): WaveConfig {
  return {
    configId: 'config-123',
    organizationId: 'GLOBAL',
    waveName: 'Wave 1 - HS',
    entries: [
      {
        categoryName: 'JV B Boys',
        stageTime: '07:40',
        startTime: '08:00',
        laps: 2,
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockRepository(): WaveConfigRepository {
  return {
    create: vi.fn(),
    getById: vi.fn(),
    listByOrganization: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockPublisher(): EventPublisher {
  return {
    publish: vi.fn(),
  };
}

describe('WaveConfigService', () => {
  let service: WaveConfigService;
  let repository: WaveConfigRepository;
  let publisher: EventPublisher;

  beforeEach(() => {
    repository = createMockRepository();
    publisher = createMockPublisher();
    service = new WaveConfigService(repository, publisher);
  });

  describe('getConfig', () => {
    it('should return existing configs when available', async () => {
      const mockConfigs = [
        createMockWaveConfig({ configId: 'config-1' }),
        createMockWaveConfig({ configId: 'config-2', waveName: 'Wave 2 - HS' }),
      ];

      vi.mocked(repository.listByOrganization).mockResolvedValue({
        items: mockConfigs,
        cursor: undefined,
      });

      const result = await service.getConfig();

      expect(result).toEqual(mockConfigs);
      expect(repository.listByOrganization).toHaveBeenCalledWith('GLOBAL', {
        limit: 100,
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should seed defaults on first access when no configs exist', async () => {
      vi.mocked(repository.listByOrganization).mockResolvedValue({
        items: [],
        cursor: undefined,
      });

      vi.mocked(repository.create).mockImplementation(async (config) =>
        createMockWaveConfig({
          configId: config.configId,
          organizationId: config.organizationId,
          waveName: config.waveName,
          entries: config.entries,
        }),
      );

      const result = await service.getConfig();

      expect(result).toHaveLength(9);
      expect(repository.create).toHaveBeenCalledTimes(9);
      expect(publisher.publish).toHaveBeenCalledWith(
        'WaveConfigSeeded',
        expect.objectContaining({
          organizationId: 'GLOBAL',
          count: 9,
        }),
      );
    });

    it('should use GLOBAL organizationId for all queries', async () => {
      vi.mocked(repository.listByOrganization).mockResolvedValue({
        items: [createMockWaveConfig()],
        cursor: undefined,
      });

      await service.getConfig();

      expect(repository.listByOrganization).toHaveBeenCalledWith(
        'GLOBAL',
        expect.any(Object),
      );
    });
  });

  describe('updateWave', () => {
    it('should update a wave and publish event', async () => {
      const mockConfig = createMockWaveConfig();
      const updatedConfig = createMockWaveConfig({ waveName: 'Updated Wave' });

      vi.mocked(repository.getById).mockResolvedValue(mockConfig);
      vi.mocked(repository.update).mockResolvedValue(updatedConfig);

      const result = await service.updateWave('config-123', {
        waveName: 'Updated Wave',
      });

      expect(result.waveName).toBe('Updated Wave');
      expect(repository.update).toHaveBeenCalledWith('GLOBAL', 'config-123', {
        waveName: 'Updated Wave',
      });
      expect(publisher.publish).toHaveBeenCalledWith(
        'WaveConfigUpdated',
        expect.objectContaining({
          configId: 'config-123',
          organizationId: 'GLOBAL',
          changes: ['waveName'],
        }),
      );
    });

    it('should update entries and persist', async () => {
      const mockConfig = createMockWaveConfig();
      const newEntries = [
        {
          categoryName: 'Varsity Boys',
          stageTime: '10:00',
          startTime: '10:20',
          laps: 4,
        },
      ];
      const updatedConfig = createMockWaveConfig({ entries: newEntries });

      vi.mocked(repository.getById).mockResolvedValue(mockConfig);
      vi.mocked(repository.update).mockResolvedValue(updatedConfig);

      const result = await service.updateWave('config-123', {
        entries: newEntries,
      });

      expect(result.entries).toEqual(newEntries);
      expect(repository.update).toHaveBeenCalledWith('GLOBAL', 'config-123', {
        entries: newEntries,
      });
    });

    it('should throw NotFoundError if config does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.updateWave('non-existent', { waveName: 'Test' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should always use GLOBAL organizationId for updates', async () => {
      const mockConfig = createMockWaveConfig();
      const updatedConfig = createMockWaveConfig({ waveName: 'New Name' });

      vi.mocked(repository.getById).mockResolvedValue(mockConfig);
      vi.mocked(repository.update).mockResolvedValue(updatedConfig);

      await service.updateWave('config-123', { waveName: 'New Name' });

      expect(repository.getById).toHaveBeenCalledWith('GLOBAL', 'config-123');
      expect(repository.update).toHaveBeenCalledWith(
        'GLOBAL',
        'config-123',
        expect.any(Object),
      );
    });
  });

  describe('seedDefaults', () => {
    it('should create 9 default wave configs', async () => {
      vi.mocked(repository.create).mockImplementation(async (config) =>
        createMockWaveConfig({
          configId: config.configId,
          organizationId: config.organizationId,
          waveName: config.waveName,
          entries: config.entries,
        }),
      );

      const result = await service.seedDefaults();

      expect(result).toHaveLength(9);
      expect(repository.create).toHaveBeenCalledTimes(9);
    });

    it('should create all configs with GLOBAL organizationId', async () => {
      vi.mocked(repository.create).mockImplementation(async (config) =>
        createMockWaveConfig({
          configId: config.configId,
          organizationId: config.organizationId,
          waveName: config.waveName,
          entries: config.entries,
        }),
      );

      await service.seedDefaults();

      const calls = vi.mocked(repository.create).mock.calls;
      for (const call of calls) {
        expect(call[0].organizationId).toBe('GLOBAL');
      }
    });

    it('should publish WaveConfigSeeded event', async () => {
      vi.mocked(repository.create).mockImplementation(async (config) =>
        createMockWaveConfig({
          configId: config.configId,
          organizationId: config.organizationId,
          waveName: config.waveName,
          entries: config.entries,
        }),
      );

      await service.seedDefaults();

      expect(publisher.publish).toHaveBeenCalledWith(
        'WaveConfigSeeded',
        expect.objectContaining({
          organizationId: 'GLOBAL',
          count: 9,
        }),
      );
    });
  });
});
