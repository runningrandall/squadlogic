import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as path from 'node:path';
import type { Construct } from 'constructs';

export interface InfraStackProps extends cdk.StackProps {
  stageName: string;
  userPoolArn: string;
  userPoolId: string;
  userPoolClientId: string;
  policyStoreId: string;
  domainName: string;
  apiDomainName: string;
  certificateArn: string;
  hostedZoneId: string;
}

export class InfraStack extends cdk.Stack {
  public readonly table: dynamodb.Table;
  public readonly eventBus: events.EventBus;
  public readonly uploadsBucket: s3.Bucket;
  public readonly api: apigwv2.HttpApi;
  public readonly logoBucket: s3.Bucket;
  public readonly googleApiSecret: secretsmanager.Secret;
  public readonly wafWebAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const { stageName } = props;

    // ── DynamoDB Single Table ──
    this.table = new dynamodb.Table(this, 'SLTable', {
      tableName: `TeamManager-Table-${stageName}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy:
        stageName === 'dev'
          ? cdk.RemovalPolicy.DESTROY
          : cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: stageName !== 'dev' },
    });

    this.table.addGlobalSecondaryIndex({
      indexName: 'gsi1pk-gsi1sk-index',
      partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: 'gsi2pk-gsi2sk-index',
      partitionKey: { name: 'gsi2pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi2sk', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ── EventBridge Event Bus ──
    this.eventBus = new events.EventBus(this, 'SLEventBus', {
      eventBusName: `TeamManager-Events-${stageName}`,
    });

    // ── S3 Bucket for uploads ──
    this.uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
      bucketName: `teammanager-uploads-${stageName}-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy:
        stageName === 'dev'
          ? cdk.RemovalPolicy.DESTROY
          : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: stageName === 'dev',
    });

    // ─── Race Day Wave Schedule Feature Resources ───

    // S3 Bucket for Team Logos (publicly readable for PDFs and UI display)
    this.logoBucket = new s3.Bucket(this, 'TeamLogoBucket', {
      bucketName: `switchback-team-logos-${stageName}`,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins:
            stageName === 'prod'
              ? [`https://${props.domainName}`]
              : ['http://localhost:3000', `https://${stageName}.${props.domainName}`],
          exposedHeaders: ['ETag'],
          maxAge: 3600,
        },
      ],
      lifecycleRules: [
        {
          id: 'delete-unused-logos',
          enabled: true,
          expiration: cdk.Duration.days(365),
        },
      ],
      removalPolicy:
        stageName === 'dev'
          ? cdk.RemovalPolicy.DESTROY
          : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: stageName === 'dev',
    });

    this.logoBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'PublicReadGetObject',
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        actions: ['s3:GetObject'],
        resources: [this.logoBucket.arnForObjects('*')],
      }),
    );

    // Secrets Manager placeholder for Google API credentials
    this.googleApiSecret = new secretsmanager.Secret(
      this,
      'GoogleApiCredentials',
      {
        secretName: 'squadlogic/google-api/credentials',
        description:
          'Google API service account credentials for Sheets export',
        removalPolicy:
          stageName === 'dev'
            ? cdk.RemovalPolicy.DESTROY
            : cdk.RemovalPolicy.RETAIN,
      },
    );

    // WAF WebACL with rate limiting for RaceResult import endpoint
    this.wafWebAcl = new wafv2.CfnWebACL(this, 'ApiWafWebAcl', {
      name: `TeamManager-WAF-${stageName}`,
      defaultAction: { allow: {} },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `TeamManager-WAF-${stageName}`,
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'RaceResultImportRateLimit',
          priority: 1,
          action: {
            block: {
              customResponse: {
                responseCode: 429,
              },
            },
          },
          statement: {
            rateBasedStatement: {
              limit: 100,
              aggregateKeyType: 'IP',
              scopeDownStatement: {
                byteMatchStatement: {
                  searchString: '/race-events/import',
                  fieldToMatch: {
                    uriPath: {},
                  },
                  textTransformations: [
                    {
                      priority: 0,
                      type: 'LOWERCASE',
                    },
                  ],
                  positionalConstraint: 'STARTS_WITH',
                },
              },
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: `RaceResultImportRateLimit-${stageName}`,
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    // ── Lambda Function (Fastify backend) ──
    const backendFn = new NodejsFunction(this, 'BackendFn', {
      functionName: `TeamManager-API-${stageName}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.resolve('..', 'backend', 'src', 'lambda.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(29),
      memorySize: 512,
      bundling: {
        format: cdk.aws_lambda_nodejs.OutputFormat.ESM,
        target: 'node22',
        mainFields: ['module', 'main'],
        banner:
          "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
        externalModules: ['@aws-sdk/*'],
        // pdfkit uses __dirname to resolve built-in font files (e.g. Helvetica.afm).
        // Bundling it into the ESM output loses __dirname, so we install it as a
        // real node_modules package where Node's CJS loader provides __dirname correctly.
        nodeModules: ['pdfkit'],
      },
      environment: {
        NODE_ENV: 'production',
        TABLE_NAME: this.table.tableName,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
        COGNITO_USER_POOL_ID: props.userPoolId,
        COGNITO_CLIENT_ID: props.userPoolClientId,
        POLICY_STORE_ID: props.policyStoreId,
        UPLOADS_BUCKET: this.uploadsBucket.bucketName,
        LOGO_BUCKET_NAME: this.logoBucket.bucketName,
        GOOGLE_CREDENTIALS_SECRET_ARN: this.googleApiSecret.secretArn,
      },
    });

    // ── IAM Permissions ──
    this.table.grantReadWriteData(backendFn);
    this.eventBus.grantPutEventsTo(backendFn);
    this.uploadsBucket.grantReadWrite(backendFn);
    this.logoBucket.grantReadWrite(backendFn);
    this.googleApiSecret.grantRead(backendFn);

    backendFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['verifiedpermissions:IsAuthorized', 'verifiedpermissions:IsAuthorizedWithToken'],
        resources: [`arn:aws:verifiedpermissions::${this.account}:policy-store/${props.policyStoreId}`],
      }),
    );

    // ── HTTP API Gateway ──
    const integration = new HttpLambdaIntegration('BackendIntegration', backendFn);

    this.api = new apigwv2.HttpApi(this, 'SLHttpApi', {
      apiName: `TeamManager-API-${stageName}`,
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Organization-Id',
          'X-User-Role',
          'X-User-Id',
          'X-Team-Id',
        ],
        maxAge: cdk.Duration.hours(1),
      },
    });

    this.api.addRoutes({
      path: '/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration,
    });

    this.api.addRoutes({
      path: '/',
      methods: [apigwv2.HttpMethod.GET],
      integration,
    });

    // ── Custom Domain for API ──
    if (props.certificateArn && props.hostedZoneId) {
      const certificate = acm.Certificate.fromCertificateArn(
        this, 'ApiCert', props.certificateArn,
      );

      const apiCustomDomain = new apigwv2.DomainName(this, 'ApiDomain', {
        domainName: props.apiDomainName,
        certificate,
      });

      new apigwv2.ApiMapping(this, 'ApiMapping', {
        api: this.api,
        domainName: apiCustomDomain,
      });

      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
        this, 'ApiHostedZone', {
          hostedZoneId: props.hostedZoneId,
          zoneName: props.domainName,
        },
      );

      new route53.ARecord(this, 'ApiAliasRecord', {
        zone: hostedZone,
        recordName: props.apiDomainName,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.ApiGatewayv2DomainProperties(
            apiCustomDomain.regionalDomainName,
            apiCustomDomain.regionalHostedZoneId,
          ),
        ),
      });
    }

    // ── Outputs ──
    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      description: 'DynamoDB Table Name',
    });

    new cdk.CfnOutput(this, 'EventBusName', {
      value: this.eventBus.eventBusName,
      description: 'EventBridge Event Bus Name',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url!,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'LogoBucketName', {
      value: this.logoBucket.bucketName,
      description: 'S3 Bucket for Team Logos',
    });

    new cdk.CfnOutput(this, 'LogoBucketArn', {
      value: this.logoBucket.bucketArn,
      description: 'S3 Bucket ARN for Team Logos',
    });

    new cdk.CfnOutput(this, 'GoogleApiSecretArn', {
      value: this.googleApiSecret.secretArn,
      description: 'Secrets Manager ARN for Google API credentials',
    });

    new cdk.CfnOutput(this, 'WafWebAclArn', {
      value: this.wafWebAcl.attrArn,
      description: 'WAF WebACL ARN for API rate limiting',
    });
  }
}
