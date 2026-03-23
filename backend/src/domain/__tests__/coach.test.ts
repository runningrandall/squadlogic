import {
  CreateCoachSchema,
  UpdateCoachSchema,
} from '../coach.js';

const validCreateData = {
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
};

describe('CreateCoachSchema', () => {
  it('parses valid input with required fields only', () => {
    const result = CreateCoachSchema.parse(validCreateData);
    expect(result.firstName).toBe('Jane');
    expect(result.lastName).toBe('Smith');
    expect(result.email).toBe('jane@example.com');
  });

  it('applies default certifications as empty array', () => {
    const result = CreateCoachSchema.parse(validCreateData);
    expect(result.certifications).toEqual([]);
  });

  it('applies default specialties as empty array', () => {
    const result = CreateCoachSchema.parse(validCreateData);
    expect(result.specialties).toEqual([]);
  });

  it('allows custom certifications', () => {
    const result = CreateCoachSchema.parse({
      ...validCreateData,
      certifications: ['CPR', 'First Aid'],
    });
    expect(result.certifications).toEqual(['CPR', 'First Aid']);
  });

  it('allows custom specialties', () => {
    const result = CreateCoachSchema.parse({
      ...validCreateData,
      specialties: ['Offense', 'Defense'],
    });
    expect(result.specialties).toEqual(['Offense', 'Defense']);
  });

  it('allows optional phone', () => {
    const result = CreateCoachSchema.parse({
      ...validCreateData,
      phone: '555-0100',
    });
    expect(result.phone).toBe('555-0100');
  });

  it('allows optional notes within max length', () => {
    const result = CreateCoachSchema.parse({
      ...validCreateData,
      notes: 'Some notes about the coach',
    });
    expect(result.notes).toBe('Some notes about the coach');
  });

  it('rejects notes over 2000 chars', () => {
    expect(() =>
      CreateCoachSchema.parse({
        ...validCreateData,
        notes: 'a'.repeat(2001),
      }),
    ).toThrow();
  });

  it('rejects empty firstName', () => {
    expect(() =>
      CreateCoachSchema.parse({ ...validCreateData, firstName: '' }),
    ).toThrow();
  });

  it('rejects firstName over 100 chars', () => {
    expect(() =>
      CreateCoachSchema.parse({
        ...validCreateData,
        firstName: 'a'.repeat(101),
      }),
    ).toThrow();
  });

  it('rejects empty lastName', () => {
    expect(() =>
      CreateCoachSchema.parse({ ...validCreateData, lastName: '' }),
    ).toThrow();
  });

  it('rejects lastName over 100 chars', () => {
    expect(() =>
      CreateCoachSchema.parse({
        ...validCreateData,
        lastName: 'a'.repeat(101),
      }),
    ).toThrow();
  });

  it('rejects invalid email', () => {
    expect(() =>
      CreateCoachSchema.parse({
        ...validCreateData,
        email: 'not-an-email',
      }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => CreateCoachSchema.parse({})).toThrow();
  });

  it('parses full valid input with all fields', () => {
    const result = CreateCoachSchema.parse({
      ...validCreateData,
      phone: '555-0100',
      certifications: ['CPR'],
      specialties: ['Offense'],
      notes: 'Great coach',
    });
    expect(result.firstName).toBe('Jane');
    expect(result.certifications).toEqual(['CPR']);
  });
});

describe('UpdateCoachSchema', () => {
  it('parses partial update with only firstName', () => {
    const result = UpdateCoachSchema.parse({ firstName: 'John' });
    expect(result.firstName).toBe('John');
  });

  it('parses empty object (all optional)', () => {
    const result = UpdateCoachSchema.parse({});
    expect(result).toBeDefined();
  });

  it('validates status enum', () => {
    const result = UpdateCoachSchema.parse({ status: 'inactive' });
    expect(result.status).toBe('inactive');
  });

  it('rejects invalid status', () => {
    expect(() =>
      UpdateCoachSchema.parse({ status: 'invalid' }),
    ).toThrow();
  });

  it('accepts all valid status values', () => {
    for (const status of ['active', 'inactive']) {
      const result = UpdateCoachSchema.parse({ status });
      expect(result.status).toBe(status);
    }
  });

  it('rejects invalid email if provided', () => {
    expect(() =>
      UpdateCoachSchema.parse({ email: 'bad' }),
    ).toThrow();
  });

  it('accepts valid email', () => {
    const result = UpdateCoachSchema.parse({ email: 'new@test.com' });
    expect(result.email).toBe('new@test.com');
  });

  it('accepts certifications update', () => {
    const result = UpdateCoachSchema.parse({ certifications: ['NATA'] });
    expect(result.certifications).toEqual(['NATA']);
  });

  it('accepts specialties update', () => {
    const result = UpdateCoachSchema.parse({ specialties: ['Pitching'] });
    expect(result.specialties).toEqual(['Pitching']);
  });

  it('accepts notes update', () => {
    const result = UpdateCoachSchema.parse({ notes: 'Updated notes' });
    expect(result.notes).toBe('Updated notes');
  });

  it('rejects notes over 2000 chars', () => {
    expect(() =>
      UpdateCoachSchema.parse({ notes: 'a'.repeat(2001) }),
    ).toThrow();
  });
});
