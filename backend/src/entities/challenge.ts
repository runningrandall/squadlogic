import { Entity } from 'electrodb';
import { tableConfig } from '../lib/dynamodb.js';

export const ChallengeEntity = new Entity(
  {
    model: {
      entity: 'challenge',
      version: '1',
      service: 'squadlogic',
    },
    attributes: {
      challengeId: {
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
      title: {
        type: 'string',
        required: true,
      },
      description: {
        type: 'string',
        required: true,
        default: '',
      },
      dueDate: {
        type: 'string',
        required: false,
        default: undefined,
      },
      status: {
        type: ['active', 'completed', 'archived'] as const,
        required: true,
        default: 'active',
      },
      points: {
        type: 'number',
        required: true,
        default: 0,
      },
      createdBy: {
        type: 'string',
        required: true,
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
          composite: ['organizationId', 'challengeId'],
        },
        sk: {
          field: 'sk',
          composite: [],
        },
      },
      byTeam: {
        index: 'gsi1pk-gsi1sk-index',
        pk: {
          field: 'gsi1pk',
          composite: ['organizationId', 'teamId'],
        },
        sk: {
          field: 'gsi1sk',
          composite: ['challengeId'],
        },
      },
      allChallenges: {
        index: 'gsi2pk-gsi2sk-index',
        pk: {
          field: 'gsi2pk',
          composite: [],
        },
        sk: {
          field: 'gsi2sk',
          composite: ['organizationId', 'challengeId'],
        },
      },
    },
  },
  {
    table: tableConfig.table,
    client: tableConfig.client,
  },
);
