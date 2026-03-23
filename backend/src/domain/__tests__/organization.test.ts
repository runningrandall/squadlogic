import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
} from '../organization.js';

const validCreateData = {
  name: 'Test Org',
  slug: 'test-org',
  ownerUserId: 'user-123',
  billingEmail: 'billing@test.com',
  phone: '555-0100',
  address: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  zip: '62701',
};

describe('CreateOrganizationSchema', () => {
  it('parses valid input', () => {
    const result = CreateOrganizationSchema.parse(validCreateData);
    expect(result.name).toBe('Test Org');
    expect(result.slug).toBe('test-org');
  });

  it('applies default timezone', () => {
    const result = CreateOrganizationSchema.parse(validCreateData);
    expect(result.timezone).toBe('America/Chicago');
  });

  it('applies default config', () => {
    const result = CreateOrganizationSchema.parse(validCreateData);
    expect(result.config).toEqual({});
  });

  it('allows custom timezone', () => {
    const result = CreateOrganizationSchema.parse({
      ...validCreateData,
      timezone: 'America/New_York',
    });
    expect(result.timezone).toBe('America/New_York');
  });

  it('allows custom config', () => {
    const result = CreateOrganizationSchema.parse({
      ...validCreateData,
      config: { feature: true },
    });
    expect(result.config).toEqual({ feature: true });
  });

  it('rejects empty name', () => {
    expect(() =>
      CreateOrganizationSchema.parse({ ...validCreateData, name: '' }),
    ).toThrow();
  });

  it('rejects name over 255 chars', () => {
    expect(() =>
      CreateOrganizationSchema.parse({
        ...validCreateData,
        name: 'a'.repeat(256),
      }),
    ).toThrow();
  });

  it('rejects invalid slug format', () => {
    expect(() =>
      CreateOrganizationSchema.parse({
        ...validCreateData,
        slug: 'Invalid Slug!',
      }),
    ).toThrow();
  });

  it('rejects slug over 100 chars', () => {
    expect(() =>
      CreateOrganizationSchema.parse({
        ...validCreateData,
        slug: 'a'.repeat(101),
      }),
    ).toThrow();
  });

  it('rejects invalid email', () => {
    expect(() =>
      CreateOrganizationSchema.parse({
        ...validCreateData,
        billingEmail: 'not-an-email',
      }),
    ).toThrow();
  });

  it('rejects state over 2 chars', () => {
    expect(() =>
      CreateOrganizationSchema.parse({
        ...validCreateData,
        state: 'ILL',
      }),
    ).toThrow();
  });

  it('rejects zip under 5 chars', () => {
    expect(() =>
      CreateOrganizationSchema.parse({
        ...validCreateData,
        zip: '1234',
      }),
    ).toThrow();
  });

  it('rejects zip over 10 chars', () => {
    expect(() =>
      CreateOrganizationSchema.parse({
        ...validCreateData,
        zip: '12345678901',
      }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => CreateOrganizationSchema.parse({})).toThrow();
  });
});

describe('UpdateOrganizationSchema', () => {
  it('parses partial update with only name', () => {
    const result = UpdateOrganizationSchema.parse({ name: 'New Name' });
    expect(result.name).toBe('New Name');
  });

  it('parses empty object (all optional)', () => {
    const result = UpdateOrganizationSchema.parse({});
    expect(result).toBeDefined();
  });

  it('validates status enum', () => {
    const result = UpdateOrganizationSchema.parse({ status: 'suspended' });
    expect(result.status).toBe('suspended');
  });

  it('rejects invalid status', () => {
    expect(() =>
      UpdateOrganizationSchema.parse({ status: 'invalid' }),
    ).toThrow();
  });

  it('rejects invalid email if provided', () => {
    expect(() =>
      UpdateOrganizationSchema.parse({ billingEmail: 'bad' }),
    ).toThrow();
  });

  it('accepts valid email', () => {
    const result = UpdateOrganizationSchema.parse({
      billingEmail: 'new@test.com',
    });
    expect(result.billingEmail).toBe('new@test.com');
  });

  it('accepts all valid status values', () => {
    for (const status of ['active', 'inactive', 'suspended']) {
      const result = UpdateOrganizationSchema.parse({ status });
      expect(result.status).toBe(status);
    }
  });
});
