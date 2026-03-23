import {
  CreateTeamSchema,
  UpdateTeamSchema,
} from '../team.js';

const validCreateData = {
  name: 'Varsity Football',
  sport: 'Football',
  season: 'Fall 2026',
};

describe('CreateTeamSchema', () => {
  it('parses valid input', () => {
    const result = CreateTeamSchema.parse(validCreateData);
    expect(result.name).toBe('Varsity Football');
    expect(result.sport).toBe('Football');
    expect(result.season).toBe('Fall 2026');
  });

  it('applies default description', () => {
    const result = CreateTeamSchema.parse(validCreateData);
    expect(result.description).toBe('');
  });

  it('applies default maxRosterSize', () => {
    const result = CreateTeamSchema.parse(validCreateData);
    expect(result.maxRosterSize).toBeNull();
  });

  it('allows custom description', () => {
    const result = CreateTeamSchema.parse({
      ...validCreateData,
      description: 'The varsity football team',
    });
    expect(result.description).toBe('The varsity football team');
  });

  it('allows custom maxRosterSize', () => {
    const result = CreateTeamSchema.parse({
      ...validCreateData,
      maxRosterSize: 25,
    });
    expect(result.maxRosterSize).toBe(25);
  });

  it('allows null maxRosterSize', () => {
    const result = CreateTeamSchema.parse({
      ...validCreateData,
      maxRosterSize: null,
    });
    expect(result.maxRosterSize).toBeNull();
  });

  it('rejects empty name', () => {
    expect(() =>
      CreateTeamSchema.parse({ ...validCreateData, name: '' }),
    ).toThrow();
  });

  it('rejects name over 255 chars', () => {
    expect(() =>
      CreateTeamSchema.parse({
        ...validCreateData,
        name: 'a'.repeat(256),
      }),
    ).toThrow();
  });

  it('rejects empty sport', () => {
    expect(() =>
      CreateTeamSchema.parse({ ...validCreateData, sport: '' }),
    ).toThrow();
  });

  it('rejects sport over 100 chars', () => {
    expect(() =>
      CreateTeamSchema.parse({
        ...validCreateData,
        sport: 'a'.repeat(101),
      }),
    ).toThrow();
  });

  it('rejects empty season', () => {
    expect(() =>
      CreateTeamSchema.parse({ ...validCreateData, season: '' }),
    ).toThrow();
  });

  it('rejects season over 100 chars', () => {
    expect(() =>
      CreateTeamSchema.parse({
        ...validCreateData,
        season: 'a'.repeat(101),
      }),
    ).toThrow();
  });

  it('rejects description over 1000 chars', () => {
    expect(() =>
      CreateTeamSchema.parse({
        ...validCreateData,
        description: 'a'.repeat(1001),
      }),
    ).toThrow();
  });

  it('rejects negative maxRosterSize', () => {
    expect(() =>
      CreateTeamSchema.parse({
        ...validCreateData,
        maxRosterSize: -1,
      }),
    ).toThrow();
  });

  it('rejects zero maxRosterSize', () => {
    expect(() =>
      CreateTeamSchema.parse({
        ...validCreateData,
        maxRosterSize: 0,
      }),
    ).toThrow();
  });

  it('rejects non-integer maxRosterSize', () => {
    expect(() =>
      CreateTeamSchema.parse({
        ...validCreateData,
        maxRosterSize: 25.5,
      }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => CreateTeamSchema.parse({})).toThrow();
  });
});

describe('UpdateTeamSchema', () => {
  it('parses partial update with only name', () => {
    const result = UpdateTeamSchema.parse({ name: 'New Name' });
    expect(result.name).toBe('New Name');
  });

  it('parses empty object (all optional)', () => {
    const result = UpdateTeamSchema.parse({});
    expect(result).toBeDefined();
  });

  it('validates status enum', () => {
    const result = UpdateTeamSchema.parse({ status: 'inactive' });
    expect(result.status).toBe('inactive');
  });

  it('rejects invalid status', () => {
    expect(() =>
      UpdateTeamSchema.parse({ status: 'invalid' }),
    ).toThrow();
  });

  it('accepts all valid status values', () => {
    for (const status of ['active', 'inactive', 'archived']) {
      const result = UpdateTeamSchema.parse({ status });
      expect(result.status).toBe(status);
    }
  });

  it('accepts valid sport', () => {
    const result = UpdateTeamSchema.parse({ sport: 'Basketball' });
    expect(result.sport).toBe('Basketball');
  });

  it('rejects empty sport if provided', () => {
    expect(() =>
      UpdateTeamSchema.parse({ sport: '' }),
    ).toThrow();
  });

  it('accepts valid season', () => {
    const result = UpdateTeamSchema.parse({ season: 'Spring 2026' });
    expect(result.season).toBe('Spring 2026');
  });

  it('accepts nullable maxRosterSize', () => {
    const result = UpdateTeamSchema.parse({ maxRosterSize: null });
    expect(result.maxRosterSize).toBeNull();
  });

  it('accepts valid maxRosterSize', () => {
    const result = UpdateTeamSchema.parse({ maxRosterSize: 30 });
    expect(result.maxRosterSize).toBe(30);
  });

  it('rejects invalid maxRosterSize', () => {
    expect(() =>
      UpdateTeamSchema.parse({ maxRosterSize: -5 }),
    ).toThrow();
  });
});
