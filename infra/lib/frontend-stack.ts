import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
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

    // CloudFront Function for SPA routing (viewer-request)
    const spaRouter = new cloudfront.Function(this, 'SpaRouter', {
      functionName: `TeamManager-SpaRouter-${stageName}`,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Static assets - pass through
  if (uri.startsWith('/_next/') || /\\.[a-zA-Z0-9]+$/.test(uri)) {
    return request;
  }

  // Dashboard routes - serve dashboard shell
  var dashRoutes = ['/dashboard', '/teams', '/athletes', '/coaches', '/schedule', '/communications', '/admin'];
  for (var i = 0; i < dashRoutes.length; i++) {
    if (uri === dashRoutes[i] || uri === dashRoutes[i] + '/' || uri.startsWith(dashRoutes[i] + '/')) {
      request.uri = '/dashboard/index.html';
      return request;
    }
  }

  // Auth routes - serve their own pages
  var authRoutes = ['/login', '/signup', '/confirm', '/forgot-password'];
  for (var i = 0; i < authRoutes.length; i++) {
    if (uri === authRoutes[i] || uri === authRoutes[i] + '/') {
      request.uri = authRoutes[i] + '/index.html';
      return request;
    }
  }

  // Root or unknown
  request.uri = '/index.html';
  return request;
}
`),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

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

    // CloudFront distribution config
    const distributionProps: cloudfront.DistributionProps = {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(
          this.siteBucket,
          { originAccessControl: oac },
        ),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [{
          function: spaRouter,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
      },
      defaultRootObject: 'index.html',
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

    // Outputs
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: this.siteBucket.bucketName,
      description: 'Frontend S3 Bucket Name',
    });

    if (props.appDomainName) {
      new cdk.CfnOutput(this, 'AppUrl', {
        value: `https://${props.appDomainName}`,
        description: 'Application URL',
      });
    }
  }
}
