import {
  CreateGroupSchema,
  UpdateGroupSchema,
} from '../group.js';

const validCreateData = {
  name: 'Offense Unit',
  teamId: 'team-123',
};

describe('CreateGroupSchema', () => {
  it('parses valid input', () => {
    const result = CreateGroupSchema.parse(validCreateData);
    expect(result.name).toBe('Offense Unit');
    expect(result.teamId).toBe('team-123');
  });

  it('applies default description', () => {
    const result = CreateGroupSchema.parse(validCreateData);
    expect(result.description).toBe('');
  });

  it('applies default aliases as empty array', () => {
    const result = CreateGroupSchema.parse(validCreateData);
    expect(result.aliases).toEqual([]);
  });

  it('allows custom aliases', () => {
    const result = CreateGroupSchema.parse({
      ...validCreateData,
      aliases: ['First Team', 'A-Team'],
    });
    expect(result.aliases).toEqual(['First Team', 'A-Team']);
  });

  it('rejects non-string aliases', () => {
    expect(() =>
      CreateGroupSchema.parse({ ...validCreateData, aliases: [123] }),
    ).toThrow();
  });

  it('allows custom description', () => {
    const result = CreateGroupSchema.parse({
      ...validCreateData,
      description: 'First string offense',
    });
    expect(result.description).toBe('First string offense');
  });

  it('rejects empty name', () => {
    expect(() =>
      CreateGroupSchema.parse({ ...validCreateData, name: '' }),
    ).toThrow();
  });

  it('rejects name over 255 chars', () => {
    expect(() =>
      CreateGroupSchema.parse({
        ...validCreateData,
        name: 'a'.repeat(256),
      }),
    ).toThrow();
  });

  it('rejects description over 1000 chars', () => {
    expect(() =>
      CreateGroupSchema.parse({
        ...validCreateData,
        description: 'a'.repeat(1001),
      }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => CreateGroupSchema.parse({})).toThrow();
  });

  it('rejects missing teamId', () => {
    expect(() =>
      CreateGroupSchema.parse({ name: 'Test' }),
    ).toThrow();
  });

  it('rejects empty teamId', () => {
    expect(() =>
      CreateGroupSchema.parse({ ...validCreateData, teamId: '' }),
    ).toThrow();
  });
});

describe('UpdateGroupSchema', () => {
  it('parses partial update with only name', () => {
    const result = UpdateGroupSchema.parse({ name: 'New Name' });
    expect(result.name).toBe('New Name');
  });

  it('parses empty object (all optional)', () => {
    const result = UpdateGroupSchema.parse({});
    expect(result).toBeDefined();
  });

  it('validates status enum', () => {
    const result = UpdateGroupSchema.parse({ status: 'inactive' });
    expect(result.status).toBe('inactive');
  });

  it('rejects invalid status', () => {
    expect(() =>
      UpdateGroupSchema.parse({ status: 'deleted' }),
    ).toThrow();
  });

  it('accepts all valid status values', () => {
    for (const status of ['active', 'inactive']) {
      const result = UpdateGroupSchema.parse({ status });
      expect(result.status).toBe(status);
    }
  });

  it('rejects name over 255 chars', () => {
    expect(() =>
      UpdateGroupSchema.parse({ name: 'a'.repeat(256) }),
    ).toThrow();
  });

  it('rejects description over 1000 chars', () => {
    expect(() =>
      UpdateGroupSchema.parse({ description: 'a'.repeat(1001) }),
    ).toThrow();
  });

  it('accepts valid description', () => {
    const result = UpdateGroupSchema.parse({ description: 'Updated desc' });
    expect(result.description).toBe('Updated desc');
  });

  it('accepts aliases update', () => {
    const result = UpdateGroupSchema.parse({ aliases: ['Starters', 'Varsity'] });
    expect(result.aliases).toEqual(['Starters', 'Varsity']);
  });

  it('allows omitting aliases (optional)', () => {
    const result = UpdateGroupSchema.parse({ name: 'Test' });
    expect(result.aliases).toBeUndefined();
  });

  it('rejects non-string aliases in update', () => {
    expect(() =>
      UpdateGroupSchema.parse({ aliases: [42] }),
    ).toThrow();
  });
});
