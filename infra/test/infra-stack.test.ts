import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
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
      domainName: 'squadlogic.io',
      apiDomainName: 'api-test.squadlogic.io',
      certificateArn: '',
      hostedZoneId: '',
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
      BucketEncryption: Match.objectLike({
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({
            ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' },
          }),
        ]),
      }),
    });
  });

  // ─── Race Day Wave Schedule Feature Tests ───

  test('creates S3 logo bucket with correct name pattern', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'switchback-team-logos-test',
    });
  });

  test('logo bucket has CORS configuration', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'switchback-team-logos-test',
      CorsConfiguration: {
        CorsRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: Match.arrayWith(['GET', 'PUT', 'POST', 'DELETE']),
            AllowedOrigins: ['https://*.cloudfront.net'],
            ExposedHeaders: ['ETag'],
            MaxAge: 3600,
          },
        ],
      },
    });
  });

  test('logo bucket allows public read access (not blocked)', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'switchback-team-logos-test',
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        BlockPublicPolicy: false,
        IgnorePublicAcls: false,
        RestrictPublicBuckets: false,
      },
    });
  });

  test('logo bucket has lifecycle rule to delete objects after 365 days', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'switchback-team-logos-test',
      LifecycleConfiguration: {
        Rules: [
          {
            Id: 'delete-unused-logos',
            Status: 'Enabled',
            ExpirationInDays: 365,
          },
        ],
      },
    });
  });

  test('logo bucket has public read bucket policy', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: { AWS: '*' },
            Action: 's3:GetObject',
          }),
        ]),
      },
    });
  });

  test('creates Secrets Manager secret for Google API credentials', () => {
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'squadlogic/google-api/credentials',
      Description:
        'Google API service account credentials for Sheets export',
    });
  });

  test('creates WAF WebACL with rate limiting rule', () => {
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Name: 'TeamManager-WAF-test',
      DefaultAction: { Allow: {} },
      Scope: 'REGIONAL',
      Rules: [
        Match.objectLike({
          Name: 'RaceResultImportRateLimit',
          Action: {
            Block: {
              CustomResponse: {
                ResponseCode: 429,
              },
            },
          },
          Statement: {
            RateBasedStatement: {
              Limit: 100,
              AggregateKeyType: 'IP',
              ScopeDownStatement: {
                ByteMatchStatement: {
                  SearchString: '/race-events/import',
                  FieldToMatch: {
                    UriPath: {},
                  },
                  PositionalConstraint: 'STARTS_WITH',
                },
              },
            },
          },
        }),
      ],
    });
  });

  test('WAF WebACL has CloudWatch metrics enabled', () => {
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      VisibilityConfig: {
        CloudWatchMetricsEnabled: true,
        SampledRequestsEnabled: true,
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

  test('outputs logo bucket name and ARN', () => {
    template.hasOutput('LogoBucketName', {});
    template.hasOutput('LogoBucketArn', {});
  });

  test('outputs Google API secret ARN', () => {
    template.hasOutput('GoogleApiSecretArn', {});
  });

  test('outputs WAF WebACL ARN', () => {
    template.hasOutput('WafWebAclArn', {});
  });
});
