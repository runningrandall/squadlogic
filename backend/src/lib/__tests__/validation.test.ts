import { z } from 'zod';
import { validate } from '../validation.js';
import { ValidationError } from '../errors.js';

describe('validate', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  it('returns parsed data for valid input', () => {
    const result = validate(schema, { name: 'Alice', age: 30 });
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('throws ValidationError for invalid input', () => {
    expect(() => validate(schema, { name: '', age: -1 })).toThrow(ValidationError);
  });

  it('includes field paths in error message', () => {
    try {
      validate(schema, { name: '', age: 'not-a-number' });
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).message).toContain('name');
    }
  });

  it('throws for missing required fields', () => {
    expect(() => validate(schema, {})).toThrow(ValidationError);
  });
});
