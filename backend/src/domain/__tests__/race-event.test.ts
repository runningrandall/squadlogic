import { describe, it, expect } from 'vitest';
import { RaceResultUrlSchema } from '../race-event.js';

describe('RaceResultUrlSchema', () => {
  it('TC-001: accepts valid RaceResult URL with trailing slash', () => {
    const result = RaceResultUrlSchema.safeParse('https://my.raceresult.com/411620/');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventId).toBe('411620');
      expect(result.data.url).toBe('https://my.raceresult.com/411620/');
    }
  });

  it('TC-002: accepts valid URL without trailing slash and normalizes', () => {
    const result = RaceResultUrlSchema.safeParse('https://my.raceresult.com/411620');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBe('https://my.raceresult.com/411620/');
      expect(result.data.eventId).toBe('411620');
    }
  });

  it('TC-003: rejects HTTP scheme URL', () => {
    const result = RaceResultUrlSchema.safeParse('http://my.raceresult.com/411620/');
    expect(result.success).toBe(false);
  });

  it('TC-004: rejects wrong hostname URL', () => {
    const result = RaceResultUrlSchema.safeParse('https://example.com/411620/');
    expect(result.success).toBe(false);
  });

  it('TC-005: rejects URL with no event ID', () => {
    const result = RaceResultUrlSchema.safeParse('https://my.raceresult.com/');
    expect(result.success).toBe(false);
  });

  it('TC-006: rejects empty string', () => {
    const result = RaceResultUrlSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('TC-007: rejects non-numeric event ID', () => {
    const result = RaceResultUrlSchema.safeParse('https://my.raceresult.com/abc/');
    expect(result.success).toBe(false);
  });
});
