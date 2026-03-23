import { Entity } from 'electrodb';
import { tableConfig } from '../lib/dynamodb.js';

export const OrganizationEntity = new Entity(
  {
    model: {
      entity: 'organization',
      version: '1',
      service: 'squadlogic',
    },
    attributes: {
      organizationId: {
        type: 'string',
        required: true,
      },
      name: {
        type: 'string',
        required: true,
      },
      slug: {
        type: 'string',
        required: true,
      },
      status: {
        type: ['active', 'inactive', 'suspended'] as const,
        required: true,
        default: 'active',
      },
      ownerUserId: {
        type: 'string',
        required: true,
      },
      billingEmail: {
        type: 'string',
        required: true,
      },
      phone: {
        type: 'string',
        required: true,
      },
      address: {
        type: 'string',
        required: true,
      },
      city: {
        type: 'string',
        required: true,
      },
      state: {
        type: 'string',
        required: true,
      },
      zip: {
        type: 'string',
        required: true,
      },
      timezone: {
        type: 'string',
        required: true,
        default: 'America/Chicago',
      },
      config: {
        type: 'any',
        default: {},
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
          composite: ['organizationId'],
        },
        sk: {
          field: 'sk',
          composite: [],
        },
      },
      bySlug: {
        index: 'gsi1pk-gsi1sk-index',
        pk: {
          field: 'gsi1pk',
          composite: ['slug'],
        },
        sk: {
          field: 'gsi1sk',
          composite: ['organizationId'],
        },
      },
      allOrganizations: {
        index: 'gsi2pk-gsi2sk-index',
        pk: {
          field: 'gsi2pk',
          composite: [],
        },
        sk: {
          field: 'gsi2sk',
          composite: ['organizationId'],
        },
      },
    },
  },
  {
    table: tableConfig.table,
    client: tableConfig.client,
  },
);
