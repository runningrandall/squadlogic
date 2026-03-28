import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'node:path';
import type { Construct } from 'constructs';

export interface InfraStackProps extends cdk.StackProps {
  stageName: string;
  userPoolArn: string;
  userPoolId: string;
  userPoolClientId: string;
  policyStoreId: string;
}

export class InfraStack extends cdk.Stack {
  public readonly table: dynamodb.Table;
  public readonly eventBus: events.EventBus;
  public readonly uploadsBucket: s3.Bucket;
  public readonly api: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const { stageName } = props;

    // ── DynamoDB Single Table ──
    this.table = new dynamodb.Table(this, 'SLTable', {
      tableName: `TeamManager-Table-${stageName}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy:
        stageName === 'dev'
          ? cdk.RemovalPolicy.DESTROY
          : cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: stageName !== 'dev',
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
      },
      environment: {
        NODE_ENV: stageName === 'dev' ? 'development' : 'production',
        TABLE_NAME: this.table.tableName,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
        COGNITO_USER_POOL_ID: props.userPoolId,
        COGNITO_CLIENT_ID: props.userPoolClientId,
        POLICY_STORE_ID: props.policyStoreId,
        UPLOADS_BUCKET: this.uploadsBucket.bucketName,
      },
    });

    // ── IAM Permissions ──
    this.table.grantReadWriteData(backendFn);
    this.eventBus.grantPutEventsTo(backendFn);
    this.uploadsBucket.grantReadWrite(backendFn);

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

    // Root route for /health
    this.api.addRoutes({
      path: '/',
      methods: [apigwv2.HttpMethod.GET],
      integration,
    });

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
  }
}
