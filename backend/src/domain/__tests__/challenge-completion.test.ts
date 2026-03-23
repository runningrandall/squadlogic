import {
  CreateChallengeCompletionSchema,
  UpdateChallengeCompletionSchema,
} from '../challenge-completion.js';

const validCreateData = {
  groupId: 'group-123',
};

describe('CreateChallengeCompletionSchema', () => {
  it('parses valid input', () => {
    const result = CreateChallengeCompletionSchema.parse(validCreateData);
    expect(result.groupId).toBe('group-123');
  });

  it('applies default notes', () => {
    const result = CreateChallengeCompletionSchema.parse(validCreateData);
    expect(result.notes).toBe('');
  });

  it('applies default status as completed', () => {
    const result = CreateChallengeCompletionSchema.parse(validCreateData);
    expect(result.status).toBe('completed');
  });

  it('allows custom notes', () => {
    const result = CreateChallengeCompletionSchema.parse({
      ...validCreateData,
      notes: 'Great performance!',
    });
    expect(result.notes).toBe('Great performance!');
  });

  it('allows pending status', () => {
    const result = CreateChallengeCompletionSchema.parse({
      ...validCreateData,
      status: 'pending',
    });
    expect(result.status).toBe('pending');
  });

  it('allows verified status', () => {
    const result = CreateChallengeCompletionSchema.parse({
      ...validCreateData,
      status: 'verified',
    });
    expect(result.status).toBe('verified');
  });

  it('rejects empty groupId', () => {
    expect(() =>
      CreateChallengeCompletionSchema.parse({ groupId: '' }),
    ).toThrow();
  });

  it('rejects notes over 1000 chars', () => {
    expect(() =>
      CreateChallengeCompletionSchema.parse({
        ...validCreateData,
        notes: 'a'.repeat(1001),
      }),
    ).toThrow();
  });

  it('rejects invalid status', () => {
    expect(() =>
      CreateChallengeCompletionSchema.parse({
        ...validCreateData,
        status: 'invalid',
      }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => CreateChallengeCompletionSchema.parse({})).toThrow();
  });

  it('accepts all valid status values', () => {
    for (const status of ['pending', 'completed', 'verified']) {
      const result = CreateChallengeCompletionSchema.parse({ ...validCreateData, status });
      expect(result.status).toBe(status);
    }
  });
});

describe('UpdateChallengeCompletionSchema', () => {
  it('parses partial update with only notes', () => {
    const result = UpdateChallengeCompletionSchema.parse({ notes: 'Updated notes' });
    expect(result.notes).toBe('Updated notes');
  });

  it('parses empty object (all optional)', () => {
    const result = UpdateChallengeCompletionSchema.parse({});
    expect(result).toBeDefined();
  });

  it('validates status enum', () => {
    const result = UpdateChallengeCompletionSchema.parse({ status: 'verified' });
    expect(result.status).toBe('verified');
  });

  it('rejects invalid status', () => {
    expect(() =>
      UpdateChallengeCompletionSchema.parse({ status: 'deleted' }),
    ).toThrow();
  });

  it('accepts all valid status values', () => {
    for (const status of ['pending', 'completed', 'verified']) {
      const result = UpdateChallengeCompletionSchema.parse({ status });
      expect(result.status).toBe(status);
    }
  });

  it('rejects notes over 1000 chars', () => {
    expect(() =>
      UpdateChallengeCompletionSchema.parse({ notes: 'a'.repeat(1001) }),
    ).toThrow();
  });

  it('accepts valid notes', () => {
    const result = UpdateChallengeCompletionSchema.parse({ notes: 'Good job' });
    expect(result.notes).toBe('Good job');
  });
});
