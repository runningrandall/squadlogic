import type { ZodSchema } from 'zod';
import { ValidationError } from './errors.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validate<T>(schema: ZodSchema<T, any, any>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const messages = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');

    throw new ValidationError(`Validation failed: ${messages}`);
  }

  return result.data;
}
