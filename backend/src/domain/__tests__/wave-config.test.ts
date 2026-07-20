import { describe, it, expect } from 'vitest';
import {
  CreateWaveConfigSchema,
  UpdateWaveConfigSchema,
} from '../wave-config.js';

const validEntry = {
  categoryName: 'JV B Boys',
  stageTime: '08:00',
  startTime: '08:20',
  laps: 2,
};

const validData = {
  waveName: 'Wave 1 - HS',
  entries: [validEntry],
};

describe('CreateWaveConfigSchema', () => {
  it('parses valid input', () => {
    const result = CreateWaveConfigSchema.parse(validData);
    expect(result.waveName).toBe('Wave 1 - HS');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].categoryName).toBe('JV B Boys');
  });

  it('accepts valid HH:MM times', () => {
    const times = ['00:00', '08:00', '12:30', '23:59', '14:05'];
    for (const time of times) {
      const result = CreateWaveConfigSchema.parse({
        ...validData,
        entries: [{ ...validEntry, stageTime: time, startTime: time }],
      });
      expect(result.entries[0].stageTime).toBe(time);
    }
  });

  it('rejects invalid HH:MM times', () => {
    const invalidTimes = ['25:00', '24:00', '12:60', '8:00', 'abc', '12:5', ''];
    for (const time of invalidTimes) {
      expect(() =>
        CreateWaveConfigSchema.parse({
          ...validData,
          entries: [{ ...validEntry, stageTime: time }],
        }),
      ).toThrow();
    }
  });

  it('rejects invalid startTime format', () => {
    expect(() =>
      CreateWaveConfigSchema.parse({
        ...validData,
        entries: [{ ...validEntry, startTime: '25:00' }],
      }),
    ).toThrow();
  });

  it('rejects duplicate categoryName within entries', () => {
    expect(() =>
      CreateWaveConfigSchema.parse({
        ...validData,
        entries: [
          { categoryName: 'JV B Boys', stageTime: '08:00', startTime: '08:20', laps: 2 },
          { categoryName: 'JV B Boys', stageTime: '08:05', startTime: '08:25', laps: 2 },
        ],
      }),
    ).toThrow();
  });

  it('allows distinct categoryNames within entries', () => {
    const result = CreateWaveConfigSchema.parse({
      ...validData,
      entries: [
        { categoryName: 'JV B Boys', stageTime: '08:00', startTime: '08:20', laps: 2 },
        { categoryName: 'JV C Boys', stageTime: '08:05', startTime: '08:25', laps: 2 },
      ],
    });
    expect(result.entries).toHaveLength(2);
  });

  it('defaults laps to null when not provided', () => {
    const result = CreateWaveConfigSchema.parse({
      ...validData,
      entries: [{ categoryName: 'JV B Boys', stageTime: '08:00', startTime: '08:20' }],
    });
    expect(result.entries[0].laps).toBeNull();
  });

  it('accepts null laps explicitly', () => {
    const result = CreateWaveConfigSchema.parse({
      ...validData,
      entries: [{ ...validEntry, laps: null }],
    });
    expect(result.entries[0].laps).toBeNull();
  });

  it('rejects empty entries array', () => {
    expect(() =>
      CreateWaveConfigSchema.parse({
        ...validData,
        entries: [],
      }),
    ).toThrow();
  });

  it('rejects empty waveName', () => {
    expect(() =>
      CreateWaveConfigSchema.parse({
        ...validData,
        waveName: '',
      }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => CreateWaveConfigSchema.parse({})).toThrow();
  });
});

describe('UpdateWaveConfigSchema', () => {
  it('parses partial update with only waveName', () => {
    const result = UpdateWaveConfigSchema.parse({ waveName: 'Updated Wave' });
    expect(result.waveName).toBe('Updated Wave');
  });

  it('parses empty object (all optional)', () => {
    const result = UpdateWaveConfigSchema.parse({});
    expect(result).toBeDefined();
  });

  it('rejects duplicate categoryName in update entries', () => {
    expect(() =>
      UpdateWaveConfigSchema.parse({
        entries: [
          { categoryName: 'Varsity Boys', stageTime: '09:50', startTime: '10:10', laps: 4 },
          { categoryName: 'Varsity Boys', stageTime: '09:55', startTime: '10:15', laps: 3 },
        ],
      }),
    ).toThrow();
  });

  it('validates time format in update entries', () => {
    expect(() =>
      UpdateWaveConfigSchema.parse({
        entries: [
          { categoryName: 'Varsity Boys', stageTime: '25:00', startTime: '10:10', laps: 4 },
        ],
      }),
    ).toThrow();
  });

  it('accepts valid update entries', () => {
    const result = UpdateWaveConfigSchema.parse({
      entries: [
        { categoryName: 'Varsity Boys', stageTime: '09:50', startTime: '10:10', laps: 4 },
      ],
    });
    expect(result.entries).toHaveLength(1);
  });
});
