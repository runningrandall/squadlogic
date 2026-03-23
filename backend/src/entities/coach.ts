import { Entity } from 'electrodb';
import { tableConfig } from '../lib/dynamodb.js';

export const CoachEntity = new Entity(
  {
    model: {
      entity: 'coach',
      version: '1',
      service: 'squadlogic',
    },
    attributes: {
      coachId: {
        type: 'string',
        required: true,
      },
      organizationId: {
        type: 'string',
        required: true,
      },
      firstName: {
        type: 'string',
        required: true,
      },
      lastName: {
        type: 'string',
        required: true,
      },
      email: {
        type: 'string',
        required: true,
      },
      phone: {
        type: 'string',
        required: false,
        default: '',
      },
      certifications: {
        type: 'list',
        items: {
          type: 'string',
        },
        required: true,
        default: [],
      },
      specialties: {
        type: 'list',
        items: {
          type: 'string',
        },
        required: true,
        default: [],
      },
      status: {
        type: ['active', 'inactive'] as const,
        required: true,
        default: 'active',
      },
      notes: {
        type: 'string',
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
          composite: ['organizationId', 'coachId'],
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
          composite: ['coachId'],
        },
      },
      allCoaches: {
        index: 'gsi2pk-gsi2sk-index',
        pk: {
          field: 'gsi2pk',
          composite: [],
        },
        sk: {
          field: 'gsi2sk',
          composite: ['organizationId', 'coachId'],
        },
      },
    },
  },
  {
    table: tableConfig.table,
    client: tableConfig.client,
  },
);
