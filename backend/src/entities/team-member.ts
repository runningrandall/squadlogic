import { Entity } from 'electrodb';
import { tableConfig } from '../lib/dynamodb.js';

export const TeamMemberEntity = new Entity(
  {
    model: {
      entity: 'teamMember',
      version: '1',
      service: 'squadlogic',
    },
    attributes: {
      teamMemberId: {
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
      memberId: {
        type: 'string',
        required: true,
      },
      memberType: {
        type: ['athlete', 'coach'] as const,
        required: true,
      },
      role: {
        type: ['player', 'captain', 'head_coach', 'assistant_coach', 'manager'] as const,
        required: true,
      },
      jerseyNumber: {
        type: 'string',
        required: false,
      },
      status: {
        type: ['active', 'inactive'] as const,
        required: true,
        default: 'active',
      },
      joinedAt: {
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
          composite: ['organizationId', 'teamMemberId'],
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
          composite: ['memberType', 'memberId'],
        },
      },
      byMember: {
        index: 'gsi2pk-gsi2sk-index',
        pk: {
          field: 'gsi2pk',
          composite: ['organizationId', 'memberId'],
        },
        sk: {
          field: 'gsi2sk',
          composite: ['teamId'],
        },
      },
    },
  },
  {
    table: tableConfig.table,
    client: tableConfig.client,
  },
);
