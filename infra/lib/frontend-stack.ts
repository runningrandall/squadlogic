import * as path from 'node:path';
import * as fs from 'node:fs';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import type { Construct } from 'constructs';

export interface FrontendStackProps extends cdk.StackProps {
  stageName: string;
  domainName: string;
  appDomainName: string;
  certificateArn: string;
  hostedZoneId: string;
}

export class FrontendStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;
  public readonly siteBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const { stageName } = props;

    // ── S3 bucket for static assets (_next/static, public files) ──
    this.siteBucket = new s3.Bucket(this, 'StaticAssetsBucket', {
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
    const oac = new cloudfront.S3OriginAccessControl(this, 'StaticOAC', {
      originAccessControlName: `TeamManager-StaticOAC-${stageName}`,
    });

    // ── Lambda function running Next.js standalone via Lambda Web Adapter ──

    // Resolve the standalone build output path. During CDK synth in CI the
    // frontend is built beforehand, so the directory exists. For local
    // development where the build may not have run, create a placeholder so
    // CDK synth does not fail.
    const standalonePath = path.resolve(__dirname, '..', '..', 'frontend', '.next', 'standalone');
    const runShSource = path.resolve(__dirname, '..', '..', 'frontend', 'run.sh');

    if (!fs.existsSync(standalonePath)) {
      fs.mkdirSync(standalonePath, { recursive: true });
      // Create a minimal placeholder so Code.fromAsset succeeds
      fs.writeFileSync(
        path.join(standalonePath, 'server.js'),
        '// placeholder – build frontend before deploying\n',
      );
    }

    // Copy run.sh into standalone dir so it's included in the Lambda package
    if (fs.existsSync(runShSource)) {
      fs.copyFileSync(runShSource, path.join(standalonePath, 'run.sh'));
      fs.chmodSync(path.join(standalonePath, 'run.sh'), 0o755);
    }

    // AWS Lambda Web Adapter layer – translates Lambda invoke events into
    // HTTP requests to a local server running inside the Lambda function.
    const webAdapterLayer = lambda.LayerVersion.fromLayerVersionArn(
      this, 'WebAdapterLayer',
      `arn:aws:lambda:${this.region}:753240598075:layer:LambdaAdapterLayerX86:24`,
    );

    const nextjsFn = new lambda.Function(this, 'NextjsFn', {
      functionName: `TeamManager-Frontend-${stageName}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'run.sh',
      code: lambda.Code.fromAsset(standalonePath),
      layers: [webAdapterLayer],
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        PORT: '8080',
        HOSTNAME: '0.0.0.0',
        NODE_ENV: 'production',
      },
    });

    // Lambda Function URL – CloudFront will use this as the origin for SSR
    const fnUrl = nextjsFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // ── CloudFront distribution with dual origins ──
    // 1. S3 origin for /_next/static/* (immutable cache)
    // 2. Lambda URL origin for everything else (SSR)

    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(
      this.siteBucket,
      { originAccessControl: oac },
    );

    // Extract the domain from the Function URL (https://<id>.lambda-url.<region>.on.aws/)
    const lambdaOrigin = new origins.FunctionUrlOrigin(fnUrl);

    const distributionProps: cloudfront.DistributionProps = {
      defaultBehavior: {
        origin: lambdaOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      },
      additionalBehaviors: {
        '_next/static/*': {
          origin: s3Origin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
    };

    // Add custom domain if certificate is provided
    if (props.certificateArn) {
      const certificate = acm.Certificate.fromCertificateArn(
        this, 'SiteCert', props.certificateArn,
      );

      Object.assign(distributionProps, {
        domainNames: [props.appDomainName],
        certificate,
      });
    }

    this.distribution = new cloudfront.Distribution(
      this, 'SiteDistribution', distributionProps,
    );

    // Route 53 alias record for custom domain
    if (props.certificateArn && props.hostedZoneId) {
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
        this, 'SiteHostedZone', {
          hostedZoneId: props.hostedZoneId,
          zoneName: props.domainName,
        },
      );

      new route53.ARecord(this, 'SiteAliasRecord', {
        zone: hostedZone,
        recordName: props.appDomainName,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.CloudFrontTarget(this.distribution),
        ),
      });
    }

    // ── Outputs ──
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: this.siteBucket.bucketName,
      description: 'Static Assets S3 Bucket Name',
    });

    new cdk.CfnOutput(this, 'FunctionUrl', {
      value: fnUrl.url,
      description: 'Lambda Function URL for Next.js SSR',
    });

    if (props.appDomainName) {
      new cdk.CfnOutput(this, 'AppUrl', {
        value: `https://${props.appDomainName}`,
        description: 'Application URL',
      });
    }
  }
}
