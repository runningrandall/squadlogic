import {
  CreateChallengeSchema,
  UpdateChallengeSchema,
} from '../challenge.js';

const validCreateData = {
  title: 'Weekly Sprint Challenge',
  teamId: 'team-123',
};

describe('CreateChallengeSchema', () => {
  it('parses valid input', () => {
    const result = CreateChallengeSchema.parse(validCreateData);
    expect(result.title).toBe('Weekly Sprint Challenge');
    expect(result.teamId).toBe('team-123');
  });

  it('applies default description', () => {
    const result = CreateChallengeSchema.parse(validCreateData);
    expect(result.description).toBe('');
  });

  it('applies default dueDate as null', () => {
    const result = CreateChallengeSchema.parse(validCreateData);
    expect(result.dueDate).toBeNull();
  });

  it('applies default points as 0', () => {
    const result = CreateChallengeSchema.parse(validCreateData);
    expect(result.points).toBe(0);
  });

  it('allows custom description', () => {
    const result = CreateChallengeSchema.parse({
      ...validCreateData,
      description: 'Run 100 meters in under 12 seconds',
    });
    expect(result.description).toBe('Run 100 meters in under 12 seconds');
  });

  it('allows custom dueDate', () => {
    const result = CreateChallengeSchema.parse({
      ...validCreateData,
      dueDate: '2026-04-01',
    });
    expect(result.dueDate).toBe('2026-04-01');
  });

  it('allows null dueDate explicitly', () => {
    const result = CreateChallengeSchema.parse({
      ...validCreateData,
      dueDate: null,
    });
    expect(result.dueDate).toBeNull();
  });

  it('allows custom points', () => {
    const result = CreateChallengeSchema.parse({
      ...validCreateData,
      points: 50,
    });
    expect(result.points).toBe(50);
  });

  it('rejects empty title', () => {
    expect(() =>
      CreateChallengeSchema.parse({ ...validCreateData, title: '' }),
    ).toThrow();
  });

  it('rejects title over 255 chars', () => {
    expect(() =>
      CreateChallengeSchema.parse({
        ...validCreateData,
        title: 'a'.repeat(256),
      }),
    ).toThrow();
  });

  it('rejects description over 2000 chars', () => {
    expect(() =>
      CreateChallengeSchema.parse({
        ...validCreateData,
        description: 'a'.repeat(2001),
      }),
    ).toThrow();
  });

  it('rejects negative points', () => {
    expect(() =>
      CreateChallengeSchema.parse({
        ...validCreateData,
        points: -1,
      }),
    ).toThrow();
  });

  it('rejects non-integer points', () => {
    expect(() =>
      CreateChallengeSchema.parse({
        ...validCreateData,
        points: 1.5,
      }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => CreateChallengeSchema.parse({})).toThrow();
  });

  it('rejects missing teamId', () => {
    expect(() =>
      CreateChallengeSchema.parse({ title: 'Test' }),
    ).toThrow();
  });

  it('rejects empty teamId', () => {
    expect(() =>
      CreateChallengeSchema.parse({ ...validCreateData, teamId: '' }),
    ).toThrow();
  });
});

describe('UpdateChallengeSchema', () => {
  it('parses partial update with only title', () => {
    const result = UpdateChallengeSchema.parse({ title: 'New Title' });
    expect(result.title).toBe('New Title');
  });

  it('parses empty object (all optional)', () => {
    const result = UpdateChallengeSchema.parse({});
    expect(result).toBeDefined();
  });

  it('validates status enum', () => {
    const result = UpdateChallengeSchema.parse({ status: 'completed' });
    expect(result.status).toBe('completed');
  });

  it('rejects invalid status', () => {
    expect(() =>
      UpdateChallengeSchema.parse({ status: 'deleted' }),
    ).toThrow();
  });

  it('accepts all valid status values', () => {
    for (const status of ['active', 'completed', 'archived']) {
      const result = UpdateChallengeSchema.parse({ status });
      expect(result.status).toBe(status);
    }
  });

  it('rejects title over 255 chars', () => {
    expect(() =>
      UpdateChallengeSchema.parse({ title: 'a'.repeat(256) }),
    ).toThrow();
  });

  it('rejects description over 2000 chars', () => {
    expect(() =>
      UpdateChallengeSchema.parse({ description: 'a'.repeat(2001) }),
    ).toThrow();
  });

  it('accepts valid description', () => {
    const result = UpdateChallengeSchema.parse({ description: 'Updated desc' });
    expect(result.description).toBe('Updated desc');
  });

  it('accepts nullable dueDate', () => {
    const result = UpdateChallengeSchema.parse({ dueDate: null });
    expect(result.dueDate).toBeNull();
  });

  it('accepts string dueDate', () => {
    const result = UpdateChallengeSchema.parse({ dueDate: '2026-05-01' });
    expect(result.dueDate).toBe('2026-05-01');
  });

  it('accepts valid points', () => {
    const result = UpdateChallengeSchema.parse({ points: 100 });
    expect(result.points).toBe(100);
  });

  it('rejects negative points', () => {
    expect(() =>
      UpdateChallengeSchema.parse({ points: -5 }),
    ).toThrow();
  });

  it('rejects non-integer points', () => {
    expect(() =>
      UpdateChallengeSchema.parse({ points: 2.5 }),
    ).toThrow();
  });
});
