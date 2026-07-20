import { Entity } from 'electrodb';
import { tableConfig } from '../lib/dynamodb.js';

export const WaveConfigEntity = new Entity(
  {
    model: {
      entity: 'waveConfig',
      version: '1',
      service: 'squadlogic',
    },
    attributes: {
      configId: {
        type: 'string',
        required: true,
      },
      organizationId: {
        type: 'string',
        required: true,
      },
      waveName: {
        type: 'string',
        required: true,
      },
      entries: {
        type: 'list',
        required: true,
        items: {
          type: 'map',
          properties: {
            categoryName: {
              type: 'string',
              required: true,
            },
            stageTime: {
              type: 'string',
              required: true,
            },
            startTime: {
              type: 'string',
              required: true,
            },
            laps: {
              type: 'number',
              required: false,
            },
          },
        },
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
          composite: ['organizationId', 'configId'],
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
          composite: ['configId'],
        },
      },
      allConfigs: {
        index: 'gsi2pk-gsi2sk-index',
        pk: {
          field: 'gsi2pk',
          composite: [],
        },
        sk: {
          field: 'gsi2sk',
          composite: ['organizationId', 'configId'],
        },
      },
    },
  },
  {
    table: tableConfig.table,
    client: tableConfig.client,
  },
);
