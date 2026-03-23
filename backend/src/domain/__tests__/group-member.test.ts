import {
  AddGroupMemberSchema,
  UpdateGroupMemberSchema,
} from '../group-member.js';

const validAddData = {
  athleteId: 'athlete-123',
};

describe('AddGroupMemberSchema', () => {
  it('parses valid input', () => {
    const result = AddGroupMemberSchema.parse(validAddData);
    expect(result.athleteId).toBe('athlete-123');
  });

  it('applies default role as member', () => {
    const result = AddGroupMemberSchema.parse(validAddData);
    expect(result.role).toBe('member');
  });

  it('allows leader role', () => {
    const result = AddGroupMemberSchema.parse({
      ...validAddData,
      role: 'leader',
    });
    expect(result.role).toBe('leader');
  });

  it('rejects empty athleteId', () => {
    expect(() =>
      AddGroupMemberSchema.parse({ athleteId: '' }),
    ).toThrow();
  });

  it('rejects invalid role', () => {
    expect(() =>
      AddGroupMemberSchema.parse({ ...validAddData, role: 'admin' }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => AddGroupMemberSchema.parse({})).toThrow();
  });

  it('accepts all valid role values', () => {
    for (const role of ['member', 'leader']) {
      const result = AddGroupMemberSchema.parse({ ...validAddData, role });
      expect(result.role).toBe(role);
    }
  });
});

describe('UpdateGroupMemberSchema', () => {
  it('parses partial update with only role', () => {
    const result = UpdateGroupMemberSchema.parse({ role: 'leader' });
    expect(result.role).toBe('leader');
  });

  it('parses empty object (all optional)', () => {
    const result = UpdateGroupMemberSchema.parse({});
    expect(result).toBeDefined();
  });

  it('validates status enum', () => {
    const result = UpdateGroupMemberSchema.parse({ status: 'inactive' });
    expect(result.status).toBe('inactive');
  });

  it('rejects invalid status', () => {
    expect(() =>
      UpdateGroupMemberSchema.parse({ status: 'deleted' }),
    ).toThrow();
  });

  it('accepts all valid status values', () => {
    for (const status of ['active', 'inactive']) {
      const result = UpdateGroupMemberSchema.parse({ status });
      expect(result.status).toBe(status);
    }
  });

  it('rejects invalid role', () => {
    expect(() =>
      UpdateGroupMemberSchema.parse({ role: 'admin' }),
    ).toThrow();
  });

  it('accepts all valid role values', () => {
    for (const role of ['member', 'leader']) {
      const result = UpdateGroupMemberSchema.parse({ role });
      expect(result.role).toBe(role);
    }
  });
});
