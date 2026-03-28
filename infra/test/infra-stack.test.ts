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
      userPoolId: 'us-east-1_TestPool',
      userPoolClientId: 'test-client-id',
      policyStoreId: 'test-policy-store-id',
    });
    template = Template.fromStack(stack);
  });

  test('creates DynamoDB table with 2 GSIs', () => {
    template.resourceCountIs('AWS::DynamoDB::Table', 1);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'TeamManager-Table-test',
      BillingMode: 'PAY_PER_REQUEST',
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

  test('creates Lambda function for backend API', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'TeamManager-API-test',
      Runtime: 'nodejs22.x',
      MemorySize: 512,
      Timeout: 29,
    });
  });

  test('creates HTTP API Gateway', () => {
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);

    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      Name: 'TeamManager-API-test',
      ProtocolType: 'HTTP',
    });
  });

  test('outputs table name, event bus name, and API URL', () => {
    template.hasOutput('TableName', {});
    template.hasOutput('EventBusName', {});
    template.hasOutput('ApiUrl', {});
  });
});
