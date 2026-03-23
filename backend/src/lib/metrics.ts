import { Metrics } from '@aws-lambda-powertools/metrics';

export const metrics = new Metrics({
  serviceName: 'squadlogic-api',
  namespace: 'SquadLogic',
});
