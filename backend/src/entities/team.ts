import { Entity } from 'electrodb';
import { tableConfig } from '../lib/dynamodb.js';

export const TeamEntity = new Entity(
  {
    model: {
      entity: 'team',
      version: '1',
      service: 'squadlogic',
    },
    attributes: {
      teamId: {
        type: 'string',
        required: true,
      },
      organizationId: {
        type: 'string',
        required: true,
      },
      name: {
        type: 'string',
        required: true,
      },
      sport: {
        type: 'string',
        required: true,
      },
      season: {
        type: 'string',
        required: true,
      },
      status: {
        type: ['active', 'inactive', 'archived'] as const,
        required: true,
        default: 'active',
      },
      description: {
        type: 'string',
        required: true,
        default: '',
      },
      maxRosterSize: {
        type: 'number',
        required: false,
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
          composite: ['organizationId', 'teamId'],
        },
        sk: {
          field: 'sk',
          composite: [],
        },
      },
      byOrganization: {
        index: 'gsi1pk-gsi1sk-index',
        pk: {
          field: 'gsi1pk',
          composite: ['organizationId'],
        },
        sk: {
          field: 'gsi1sk',
          composite: ['teamId'],
        },
      },
      allTeams: {
        index: 'gsi2pk-gsi2sk-index',
        pk: {
          field: 'gsi2pk',
          composite: [],
        },
        sk: {
          field: 'gsi2sk',
          composite: ['organizationId', 'teamId'],
        },
      },
    },
  },
  {
    table: tableConfig.table,
    client: tableConfig.client,
  },
);
