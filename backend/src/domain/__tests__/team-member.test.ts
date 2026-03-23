import {
  AddTeamMemberSchema,
  UpdateTeamMemberSchema,
} from '../team-member.js';

const validAddData = {
  memberId: 'athlete-123',
  memberType: 'athlete' as const,
  role: 'player' as const,
};

describe('AddTeamMemberSchema', () => {
  it('parses valid input', () => {
    const result = AddTeamMemberSchema.parse(validAddData);
    expect(result.memberId).toBe('athlete-123');
    expect(result.memberType).toBe('athlete');
    expect(result.role).toBe('player');
  });

  it('applies default jerseyNumber as null', () => {
    const result = AddTeamMemberSchema.parse(validAddData);
    expect(result.jerseyNumber).toBeNull();
  });

  it('allows custom jerseyNumber', () => {
    const result = AddTeamMemberSchema.parse({
      ...validAddData,
      jerseyNumber: '42',
    });
    expect(result.jerseyNumber).toBe('42');
  });

  it('allows null jerseyNumber explicitly', () => {
    const result = AddTeamMemberSchema.parse({
      ...validAddData,
      jerseyNumber: null,
    });
    expect(result.jerseyNumber).toBeNull();
  });

  it('rejects empty memberId', () => {
    expect(() =>
      AddTeamMemberSchema.parse({ ...validAddData, memberId: '' }),
    ).toThrow();
  });

  it('rejects invalid memberType', () => {
    expect(() =>
      AddTeamMemberSchema.parse({ ...validAddData, memberType: 'fan' }),
    ).toThrow();
  });

  it('accepts all valid memberType values', () => {
    for (const memberType of ['athlete', 'coach']) {
      const result = AddTeamMemberSchema.parse({ ...validAddData, memberType });
      expect(result.memberType).toBe(memberType);
    }
  });

  it('accepts all valid role values', () => {
    for (const role of ['player', 'captain', 'head_coach', 'assistant_coach', 'manager']) {
      const result = AddTeamMemberSchema.parse({ ...validAddData, role });
      expect(result.role).toBe(role);
    }
  });

  it('rejects invalid role', () => {
    expect(() =>
      AddTeamMemberSchema.parse({ ...validAddData, role: 'owner' }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => AddTeamMemberSchema.parse({})).toThrow();
  });
});

describe('UpdateTeamMemberSchema', () => {
  it('parses partial update with only role', () => {
    const result = UpdateTeamMemberSchema.parse({ role: 'captain' });
    expect(result.role).toBe('captain');
  });

  it('parses empty object (all optional)', () => {
    const result = UpdateTeamMemberSchema.parse({});
    expect(result).toBeDefined();
  });

  it('validates status enum', () => {
    const result = UpdateTeamMemberSchema.parse({ status: 'inactive' });
    expect(result.status).toBe('inactive');
  });

  it('rejects invalid status', () => {
    expect(() =>
      UpdateTeamMemberSchema.parse({ status: 'deleted' }),
    ).toThrow();
  });

  it('accepts all valid status values', () => {
    for (const status of ['active', 'inactive']) {
      const result = UpdateTeamMemberSchema.parse({ status });
      expect(result.status).toBe(status);
    }
  });

  it('accepts jerseyNumber update', () => {
    const result = UpdateTeamMemberSchema.parse({ jerseyNumber: '99' });
    expect(result.jerseyNumber).toBe('99');
  });

  it('accepts null jerseyNumber', () => {
    const result = UpdateTeamMemberSchema.parse({ jerseyNumber: null });
    expect(result.jerseyNumber).toBeNull();
  });

  it('rejects invalid role', () => {
    expect(() =>
      UpdateTeamMemberSchema.parse({ role: 'owner' }),
    ).toThrow();
  });
});
