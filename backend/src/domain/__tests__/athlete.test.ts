import {
  CreateAthleteSchema,
  UpdateAthleteSchema,
} from '../athlete.js';

const validCreateData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
};

describe('CreateAthleteSchema', () => {
  it('parses valid input with required fields only', () => {
    const result = CreateAthleteSchema.parse(validCreateData);
    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Doe');
    expect(result.email).toBe('john@example.com');
  });

  it('applies default positions as empty array', () => {
    const result = CreateAthleteSchema.parse(validCreateData);
    expect(result.positions).toEqual([]);
  });

  it('allows custom positions', () => {
    const result = CreateAthleteSchema.parse({
      ...validCreateData,
      positions: ['Forward', 'Midfielder'],
    });
    expect(result.positions).toEqual(['Forward', 'Midfielder']);
  });

  it('allows optional phone', () => {
    const result = CreateAthleteSchema.parse({
      ...validCreateData,
      phone: '555-0100',
    });
    expect(result.phone).toBe('555-0100');
  });

  it('allows optional dateOfBirth as ISO date string', () => {
    const result = CreateAthleteSchema.parse({
      ...validCreateData,
      dateOfBirth: '2000-01-15',
    });
    expect(result.dateOfBirth).toBe('2000-01-15');
  });

  it('rejects invalid dateOfBirth format', () => {
    expect(() =>
      CreateAthleteSchema.parse({
        ...validCreateData,
        dateOfBirth: 'not-a-date',
      }),
    ).toThrow();
  });

  it('allows optional jerseyNumber', () => {
    const result = CreateAthleteSchema.parse({
      ...validCreateData,
      jerseyNumber: '10',
    });
    expect(result.jerseyNumber).toBe('10');
  });

  it('allows optional emergencyContactName', () => {
    const result = CreateAthleteSchema.parse({
      ...validCreateData,
      emergencyContactName: 'Jane Doe',
    });
    expect(result.emergencyContactName).toBe('Jane Doe');
  });

  it('allows optional emergencyContactPhone', () => {
    const result = CreateAthleteSchema.parse({
      ...validCreateData,
      emergencyContactPhone: '555-0200',
    });
    expect(result.emergencyContactPhone).toBe('555-0200');
  });

  it('allows optional notes within max length', () => {
    const result = CreateAthleteSchema.parse({
      ...validCreateData,
      notes: 'Some notes about the athlete',
    });
    expect(result.notes).toBe('Some notes about the athlete');
  });

  it('rejects notes over 2000 chars', () => {
    expect(() =>
      CreateAthleteSchema.parse({
        ...validCreateData,
        notes: 'a'.repeat(2001),
      }),
    ).toThrow();
  });

  it('rejects empty firstName', () => {
    expect(() =>
      CreateAthleteSchema.parse({ ...validCreateData, firstName: '' }),
    ).toThrow();
  });

  it('rejects firstName over 100 chars', () => {
    expect(() =>
      CreateAthleteSchema.parse({
        ...validCreateData,
        firstName: 'a'.repeat(101),
      }),
    ).toThrow();
  });

  it('rejects empty lastName', () => {
    expect(() =>
      CreateAthleteSchema.parse({ ...validCreateData, lastName: '' }),
    ).toThrow();
  });

  it('rejects lastName over 100 chars', () => {
    expect(() =>
      CreateAthleteSchema.parse({
        ...validCreateData,
        lastName: 'a'.repeat(101),
      }),
    ).toThrow();
  });

  it('rejects invalid email', () => {
    expect(() =>
      CreateAthleteSchema.parse({
        ...validCreateData,
        email: 'not-an-email',
      }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => CreateAthleteSchema.parse({})).toThrow();
  });

  it('parses full valid input with all fields', () => {
    const result = CreateAthleteSchema.parse({
      ...validCreateData,
      phone: '555-0100',
      dateOfBirth: '2000-01-15',
      positions: ['Guard'],
      jerseyNumber: '23',
      emergencyContactName: 'Jane',
      emergencyContactPhone: '555-0200',
      notes: 'Good player',
    });
    expect(result.firstName).toBe('John');
    expect(result.positions).toEqual(['Guard']);
  });
});

describe('UpdateAthleteSchema', () => {
  it('parses partial update with only firstName', () => {
    const result = UpdateAthleteSchema.parse({ firstName: 'Jane' });
    expect(result.firstName).toBe('Jane');
  });

  it('parses empty object (all optional)', () => {
    const result = UpdateAthleteSchema.parse({});
    expect(result).toBeDefined();
  });

  it('validates status enum', () => {
    const result = UpdateAthleteSchema.parse({ status: 'injured' });
    expect(result.status).toBe('injured');
  });

  it('rejects invalid status', () => {
    expect(() =>
      UpdateAthleteSchema.parse({ status: 'invalid' }),
    ).toThrow();
  });

  it('accepts all valid status values', () => {
    for (const status of ['active', 'inactive', 'injured', 'suspended']) {
      const result = UpdateAthleteSchema.parse({ status });
      expect(result.status).toBe(status);
    }
  });

  it('rejects invalid email if provided', () => {
    expect(() =>
      UpdateAthleteSchema.parse({ email: 'bad' }),
    ).toThrow();
  });

  it('accepts valid email', () => {
    const result = UpdateAthleteSchema.parse({ email: 'new@test.com' });
    expect(result.email).toBe('new@test.com');
  });

  it('accepts positions update', () => {
    const result = UpdateAthleteSchema.parse({ positions: ['Center'] });
    expect(result.positions).toEqual(['Center']);
  });

  it('accepts notes update', () => {
    const result = UpdateAthleteSchema.parse({ notes: 'Updated notes' });
    expect(result.notes).toBe('Updated notes');
  });

  it('rejects notes over 2000 chars', () => {
    expect(() =>
      UpdateAthleteSchema.parse({ notes: 'a'.repeat(2001) }),
    ).toThrow();
  });

  it('accepts dateOfBirth update', () => {
    const result = UpdateAthleteSchema.parse({ dateOfBirth: '1999-12-31' });
    expect(result.dateOfBirth).toBe('1999-12-31');
  });

  it('rejects invalid dateOfBirth', () => {
    expect(() =>
      UpdateAthleteSchema.parse({ dateOfBirth: 'not-a-date' }),
    ).toThrow();
  });
});
