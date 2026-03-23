import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import type { Construct } from 'constructs';

export interface FrontendStackProps extends cdk.StackProps {
  stageName: string;
}

export class FrontendStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;
  public readonly siteBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const { stageName } = props;

    // S3 bucket for static site hosting
    this.siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `teammanager-frontend-${stageName}-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy:
        stageName === 'dev'
          ? cdk.RemovalPolicy.DESTROY
          : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: stageName === 'dev',
    });

    // Origin Access Control for CloudFront -> S3
    const oac = new cloudfront.S3OriginAccessControl(this, 'SiteOAC', {
      originAccessControlName: `TeamManager-OAC-${stageName}`,
    });

    // CloudFront distribution
    this.distribution = new cloudfront.Distribution(
      this,
      'SiteDistribution',
      {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(
            this.siteBucket,
            { originAccessControl: oac },
          ),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        defaultRootObject: 'index.html',
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(5),
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(5),
          },
        ],
      },
    );

    // Outputs
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: this.siteBucket.bucketName,
      description: 'Frontend S3 Bucket Name',
    });
  }
}
