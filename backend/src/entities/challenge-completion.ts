import { Entity } from 'electrodb';
import { tableConfig } from '../lib/dynamodb.js';

export const ChallengeCompletionEntity = new Entity(
  {
    model: {
      entity: 'challengeCompletion',
      version: '1',
      service: 'squadlogic',
    },
    attributes: {
      completionId: {
        type: 'string',
        required: true,
      },
      challengeId: {
        type: 'string',
        required: true,
      },
      groupId: {
        type: 'string',
        required: true,
      },
      teamId: {
        type: 'string',
        required: true,
      },
      organizationId: {
        type: 'string',
        required: true,
      },
      completedBy: {
        type: 'string',
        required: true,
      },
      completedAt: {
        type: 'string',
        required: true,
      },
      notes: {
        type: 'string',
        required: true,
        default: '',
      },
      status: {
        type: ['pending', 'completed', 'verified'] as const,
        required: true,
        default: 'completed',
      },
      createdAt: {
        type: 'string',
        readOnly: true,
        required: true,
        default: () => new Date().toISOString(),
        set: () => new Date().toISOString(),
      },
      updatedAt: {
        type: 'string',
        watch: '*',
        required: true,
        default: () => new Date().toISOString(),
        set: () => new Date().toISOString(),
      },
    },
    indexes: {
      primary: {
        pk: {
          field: 'pk',
          composite: ['organizationId', 'completionId'],
        },
        sk: {
          field: 'sk',
          composite: [],
        },
      },
      byChallenge: {
        index: 'gsi1pk-gsi1sk-index',
        pk: {
          field: 'gsi1pk',
          composite: ['organizationId', 'challengeId'],
        },
        sk: {
          field: 'gsi1sk',
          composite: ['groupId'],
        },
      },
      byGroup: {
        index: 'gsi2pk-gsi2sk-index',
        pk: {
          field: 'gsi2pk',
          composite: ['organizationId', 'groupId'],
        },
        sk: {
          field: 'gsi2sk',
          composite: ['challengeId'],
        },
      },
    },
  },
  {
    table: tableConfig.table,
    client: tableConfig.client,
  },
);
