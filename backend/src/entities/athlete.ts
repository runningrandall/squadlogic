import { Entity } from 'electrodb';
import { tableConfig } from '../lib/dynamodb.js';

export const AthleteEntity = new Entity(
  {
    model: {
      entity: 'athlete',
      version: '1',
      service: 'squadlogic',
    },
    attributes: {
      athleteId: {
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
        required: false,
        default: '',
      },
      phone: {
        type: 'string',
        required: false,
        default: '',
      },
      dateOfBirth: {
        type: 'string',
        required: false,
      },
      positions: {
        type: 'list',
        items: {
          type: 'string',
        },
        required: true,
        default: [],
      },
      jerseyNumber: {
        type: 'string',
        required: false,
      },
      status: {
        type: ['active', 'inactive', 'injured', 'suspended'] as const,
        required: true,
        default: 'active',
      },
      emergencyContactName: {
        type: 'string',
        required: false,
      },
      emergencyContactPhone: {
        type: 'string',
        required: false,
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
          composite: ['organizationId', 'athleteId'],
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
          composite: ['athleteId'],
        },
      },
      allAthletes: {
        index: 'gsi2pk-gsi2sk-index',
        pk: {
          field: 'gsi2pk',
          composite: [],
        },
        sk: {
          field: 'gsi2sk',
          composite: ['organizationId', 'athleteId'],
        },
      },
    },
  },
  {
    table: tableConfig.table,
    client: tableConfig.client,
  },
);
