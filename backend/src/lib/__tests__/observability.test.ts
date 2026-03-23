import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { logger } from '../logger.js';
import { tracer } from '../tracer.js';
import { metrics } from '../metrics.js';

describe('observability', () => {
  it('exports logger as Logger instance', () => {
    expect(logger).toBeInstanceOf(Logger);
  });

  it('exports tracer as Tracer instance', () => {
    expect(tracer).toBeInstanceOf(Tracer);
  });

  it('exports metrics as Metrics instance', () => {
    expect(metrics).toBeInstanceOf(Metrics);
  });
});
