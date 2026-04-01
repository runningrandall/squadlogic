import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FrontendStack } from '../lib/frontend-stack.js';

describe('FrontendStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new FrontendStack(app, 'TestFrontendStack', {
      stageName: 'test',
      domainName: 'squadlogic.io',
      appDomainName: 'test.squadlogic.io',
      certificateArn: '',
      hostedZoneId: '',
    });
    template = Template.fromStack(stack);
  });

  test('creates S3 bucket for static assets', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('creates Lambda function for Next.js SSR', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'TeamManager-Frontend-test',
      Runtime: 'nodejs22.x',
      Handler: 'run.sh',
      MemorySize: 1024,
      Timeout: 30,
    });
  });

  test('Lambda function has Web Adapter environment variables', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
          PORT: '8080',
          HOSTNAME: '0.0.0.0',
          NODE_ENV: 'production',
        }),
      },
    });
  });

  test('Lambda function has Web Adapter layer', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Layers: Match.anyValue(),
    });
  });

  test('creates Lambda Function URL', () => {
    template.resourceCountIs('AWS::Lambda::Url', 1);
    template.hasResourceProperties('AWS::Lambda::Url', {
      AuthType: 'NONE',
    });
  });

  test('creates CloudFront distribution', () => {
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
  });

  test('CloudFront has S3 cache behavior for static assets', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        CacheBehaviors: Match.arrayWith([
          Match.objectLike({
            PathPattern: '_next/static/*',
            ViewerProtocolPolicy: 'redirect-to-https',
          }),
        ]),
      },
    });
  });

  test('outputs distribution domain, bucket name, and function URL', () => {
    template.hasOutput('DistributionDomainName', {});
    template.hasOutput('BucketName', {});
    template.hasOutput('FunctionUrl', {});
  });
});
