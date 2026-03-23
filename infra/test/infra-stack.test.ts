import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { InfraStack } from '../lib/infra-stack.js';

describe('InfraStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new InfraStack(app, 'TestInfraStack', {
      stageName: 'test',
      userPoolArn:
        'arn:aws:cognito-idp:us-east-1:123456789012:userpool/us-east-1_TestPool',
      policyStoreId: 'test-policy-store-id',
    });
    template = Template.fromStack(stack);
  });

  test('creates DynamoDB table with 2 GSIs', () => {
    template.resourceCountIs('AWS::DynamoDB::Table', 1);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'TeamManager-Table-test',
      KeySchema: [
        { AttributeName: 'pk', KeyType: 'HASH' },
        { AttributeName: 'sk', KeyType: 'RANGE' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
      GlobalSecondaryIndexes: [
        {
          IndexName: 'gsi1pk-gsi1sk-index',
          KeySchema: [
            { AttributeName: 'gsi1pk', KeyType: 'HASH' },
            { AttributeName: 'gsi1sk', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
        {
          IndexName: 'gsi2pk-gsi2sk-index',
          KeySchema: [
            { AttributeName: 'gsi2pk', KeyType: 'HASH' },
            { AttributeName: 'gsi2sk', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
    });
  });

  test('creates EventBridge event bus', () => {
    template.resourceCountIs('AWS::Events::EventBus', 1);

    template.hasResourceProperties('AWS::Events::EventBus', {
      Name: 'TeamManager-Events-test',
    });
  });

  test('creates S3 uploads bucket with blocked public access', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('outputs table name and event bus name', () => {
    template.hasOutput('TableName', {});
    template.hasOutput('EventBusName', {});
  });
});
