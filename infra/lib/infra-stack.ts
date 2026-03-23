import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';

export interface InfraStackProps extends cdk.StackProps {
  stageName: string;
  userPoolArn: string;
  policyStoreId: string;
}

export class InfraStack extends cdk.Stack {
  public readonly table: dynamodb.Table;
  public readonly eventBus: events.EventBus;
  public readonly uploadsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const { stageName } = props;

    // DynamoDB Single Table
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

    // GSI1: cross-entity lookups within an org
    this.table.addGlobalSecondaryIndex({
      indexName: 'gsi1pk-gsi1sk-index',
      partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: cross-org queries for super admin
    this.table.addGlobalSecondaryIndex({
      indexName: 'gsi2pk-gsi2sk-index',
      partitionKey: { name: 'gsi2pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi2sk', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // EventBridge Event Bus
    this.eventBus = new events.EventBus(this, 'SLEventBus', {
      eventBusName: `TeamManager-Events-${stageName}`,
    });

    // S3 Bucket for uploads
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

    // TODO: Add API Gateway with WAF
    // TODO: Add Lambda functions for all entity handlers
    //   - Pass POLICY_STORE_ID env var (props.policyStoreId) to Lambda functions
    // TODO: Add Secrets Manager permissions for squadlogic/org/*/secrets

    // Outputs
    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      description: 'DynamoDB Table Name',
    });

    new cdk.CfnOutput(this, 'EventBusName', {
      value: this.eventBus.eventBusName,
      description: 'EventBridge Event Bus Name',
    });
  }
}
