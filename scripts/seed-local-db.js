import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: 'us-east-1',
    endpoint: 'http://localhost:8000',
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  }),
  { marshallOptions: { removeUndefinedValues: true } },
);

const TABLE_NAME = 'TeamManager-Table-dev';

const SEED_ORG_ID = '00000000-0000-0000-0000-000000000001';
const SEED_ORG_SLUG = 'demo-org';

async function putIfNotExists(item) {
  try {
    const existing = await client.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { pk: item.pk, sk: item.sk } }),
    );
    if (existing.Item) {
      console.log(`  exists: ${item.pk}`);
      return;
    }
  } catch {
    // item doesn't exist, proceed
  }

  await client.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  console.log(`  seeded: ${item.pk}`);
}

const now = new Date().toISOString();

console.log('Seeding organizations...');
await putIfNotExists({
  pk: `$squadlogic#organizationId_${SEED_ORG_ID}`,
  sk: `$organization_1`,
  gsi1pk: `$squadlogic#slug_${SEED_ORG_SLUG}`,
  gsi1sk: `$organization_1#organizationId_${SEED_ORG_ID}`,
  gsi2pk: `$squadlogic`,
  gsi2sk: `$organization_1#organizationId_${SEED_ORG_ID}`,
  organizationId: SEED_ORG_ID,
  name: 'Demo Organization',
  slug: SEED_ORG_SLUG,
  status: 'active',
  ownerUserId: 'dev-user',
  billingEmail: 'admin@demo.com',
  phone: '555-0100',
  address: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  zip: '62701',
  timezone: 'America/Chicago',
  config: {},
  createdAt: now,
  updatedAt: now,
  __edb_e__: 'organization',
  __edb_v__: '1',
});

console.log('\nSeed complete.');
