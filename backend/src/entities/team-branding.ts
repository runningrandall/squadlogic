import { Entity } from 'electrodb';
import { tableConfig } from '../lib/dynamodb.js';

export const TeamBrandingEntity = new Entity(
  {
    model: {
      entity: 'teamBranding',
      version: '1',
      service: 'squadlogic',
    },
    attributes: {
      brandingId: {
        type: 'string',
        required: true,
      },
      userId: {
        type: 'string',
        required: true,
      },
      teamDisplayName: {
        type: 'string',
        required: true,
      },
      logoUrl: {
        type: 'string',
        required: false,
      },
      primaryColor: {
        type: 'string',
        required: true,
        default: '#333333',
      },
      tertiaryColor: {
        type: 'string',
        required: true,
        default: '#F5F5F5',
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
          composite: ['userId', 'brandingId'],
        },
        sk: {
          field: 'sk',
          composite: [],
        },
      },
      byUser: {
        index: 'gsi1pk-gsi1sk-index',
        pk: {
          field: 'gsi1pk',
          composite: ['userId'],
        },
        sk: {
          field: 'gsi1sk',
          composite: ['brandingId'],
        },
      },
      allBrandings: {
        index: 'gsi2pk-gsi2sk-index',
        pk: {
          field: 'gsi2pk',
          composite: [],
        },
        sk: {
          field: 'gsi2sk',
          composite: ['userId', 'brandingId'],
        },
      },
    },
  },
  {
    table: tableConfig.table,
    client: tableConfig.client,
  },
);
