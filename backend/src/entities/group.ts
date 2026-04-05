import { Entity } from 'electrodb';
import { tableConfig } from '../lib/dynamodb.js';

export const GroupEntity = new Entity(
  {
    model: {
      entity: 'group',
      version: '1',
      service: 'squadlogic',
    },
    attributes: {
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
      name: {
        type: 'string',
        required: true,
      },
      description: {
        type: 'string',
        required: true,
        default: '',
      },
      aliases: {
        type: 'list',
        items: {
          type: 'string',
        },
        required: false,
        default: [],
      },
      status: {
        type: ['active', 'inactive'] as const,
        required: true,
        default: 'active',
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
          composite: ['organizationId', 'groupId'],
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
          composite: ['groupId'],
        },
      },
      allGroups: {
        index: 'gsi2pk-gsi2sk-index',
        pk: {
          field: 'gsi2pk',
          composite: [],
        },
        sk: {
          field: 'gsi2sk',
          composite: ['organizationId', 'groupId'],
        },
      },
    },
  },
  {
    table: tableConfig.table,
    client: tableConfig.client,
  },
);
