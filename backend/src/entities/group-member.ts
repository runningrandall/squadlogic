import { Entity } from 'electrodb';
import { tableConfig } from '../lib/dynamodb.js';

export const GroupMemberEntity = new Entity(
  {
    model: {
      entity: 'groupMember',
      version: '1',
      service: 'squadlogic',
    },
    attributes: {
      groupMemberId: {
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
      athleteId: {
        type: 'string',
        required: true,
      },
      role: {
        type: ['member', 'leader'] as const,
        required: true,
        default: 'member',
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
          composite: ['organizationId', 'groupMemberId'],
        },
        sk: {
          field: 'sk',
          composite: [],
        },
      },
      byGroup: {
        index: 'gsi1pk-gsi1sk-index',
        pk: {
          field: 'gsi1pk',
          composite: ['organizationId', 'groupId'],
        },
        sk: {
          field: 'gsi1sk',
          composite: ['athleteId'],
        },
      },
      byAthlete: {
        index: 'gsi2pk-gsi2sk-index',
        pk: {
          field: 'gsi2pk',
          composite: ['organizationId', 'athleteId'],
        },
        sk: {
          field: 'gsi2sk',
          composite: ['groupId'],
        },
      },
    },
  },
  {
    table: tableConfig.table,
    client: tableConfig.client,
  },
);
