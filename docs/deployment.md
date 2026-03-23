# Deployment

This document covers the CI/CD pipeline, CDK infrastructure stacks, and deployment procedures for SquadLogic.

## CI/CD Pipeline Overview

SquadLogic uses GitHub Actions for continuous integration and deployment with a two-branch strategy.

### Branch Strategy

```
feature branches ──▶ dev (staging) ──▶ main (production)
```

| Branch | Environment | Trigger |
|---|---|---|
| `dev` | Staging | Opening a PR from `dev` to `main` triggers a dev deployment |
| `main` | Production | Merging to `main` triggers a production deployment |
| Feature branches | Local only | Develop locally, merge to `dev` for staging |

### Pipeline Steps

On every push and PR, the CI pipeline runs:

1. **Install** -- `pnpm install` (cached)
2. **Lint** -- `pnpm lint` across all workspaces
3. **Test** -- `pnpm test` across all workspaces (with coverage thresholds)
4. **Build** -- `pnpm build` across all workspaces
5. **CDK Synth** -- `pnpm --filter infra run synth` to validate CloudFormation templates
6. **Deploy** -- `pnpm --filter infra run deploy` (on deploy triggers only)

### Workflow

1. Create a feature branch from `dev`.
2. Develop and test locally.
3. Push to origin and open a PR against `dev`.
4. CI runs lint, tests, and build checks.
5. Merge to `dev`. Opening a PR from `dev` to `main` triggers a staging deployment.
6. Validate in staging.
7. Merge `dev` to `main` to trigger a production deployment.

## CDK Stacks

SquadLogic's infrastructure is defined in three AWS CDK stacks, managed from the `infra/` workspace.

### Stack Dependency Graph

```
AuthStack
    │
    │ exports: userPoolArn
    ▼
InfraStack
    │
    │ (independent)
    │
FrontendStack
```

`InfraStack` depends on `AuthStack` (it receives the `userPoolArn`). `FrontendStack` is independent.

### AuthStack

**Purpose**: User authentication and authorization infrastructure.

**Resources**:
- **Cognito User Pool** (`squadlogic-users-{stage}`)
  - Email-based sign-in with self-registration
  - Password policy: 8+ chars, upper, lower, digits, symbols
  - Custom attribute: `organizationId`
  - Account recovery via email
- **User Pool Client** (`squadlogic-client-{stage}`)
  - SRP and password auth flows
- **User Pool Groups**: SuperAdmin, Admin, Manager, User, Servicer, Coach

**Planned additions**:
- Verified Permissions (Cedar) policy store
- Pre Token Generation Lambda trigger for `organizationId` injection

**Outputs**:
- `UserPoolId`
- `UserPoolClientId`

### InfraStack

**Purpose**: Core backend infrastructure.

**Resources**:
- **DynamoDB Table** (`SquadLogicTable-{stage}`)
  - Partition key: `pk` (String)
  - Sort key: `sk` (String)
  - Billing: PAY_PER_REQUEST (on-demand)
  - GSI1: `gsi1pk`/`gsi1sk` (cross-entity lookups within an org)
  - GSI2: `gsi2pk`/`gsi2sk` (cross-org super admin queries)
  - Point-in-time recovery: enabled in prod, disabled in dev
- **EventBridge Event Bus** (`squadlogic-events-{stage}`)
- **S3 Bucket** (`squadlogic-uploads-{stage}-{accountId}`)
  - Block all public access
  - S3-managed encryption

**Planned additions**:
- API Gateway with WAF
- Lambda functions for entity handlers
- Secrets Manager permissions for `squadlogic/org/*/secrets`

**Outputs**:
- `TableName`
- `EventBusName`

### FrontendStack

**Purpose**: Static frontend hosting.

**Resources**:
- **S3 Bucket** (`squadlogic-frontend-{stage}-{accountId}`)
  - Block all public access
  - S3-managed encryption
- **CloudFront Distribution**
  - Origin Access Control (OAC) for secure S3 access
  - HTTPS redirect
  - Optimized caching policy
  - SPA error handling (403/404 -> /index.html)

**Outputs**:
- `DistributionDomainName`
- `BucketName`

## Stage Configuration

The CDK app reads the `stageName` context variable to determine the deployment environment:

```bash
# Deploy to dev (default)
cdk deploy --all

# Deploy to a specific stage
cdk deploy --all -c stageName=prod
```

### Stage-Specific Behavior

| Setting | Dev | Production |
|---|---|---|
| DynamoDB removal policy | DESTROY | RETAIN |
| DynamoDB point-in-time recovery | Disabled | Enabled |
| S3 removal policy | DESTROY | RETAIN |
| S3 auto-delete objects | Enabled | Disabled |
| Cognito removal policy | DESTROY | RETAIN |

All resources are tagged with `project: squadlogic` and `stage: {stageName}`.

## Manual Deployment

### Prerequisites

- AWS CLI configured with appropriate credentials
- CDK CLI installed (`npm install -g aws-cdk` or via the infra workspace)
- All environment variables set

### Steps

```bash
# 1. Build all workspaces
pnpm build

# 2. Synthesize CloudFormation templates (validates infrastructure)
pnpm --filter infra run synth

# 3. Deploy all stacks
pnpm --filter infra run deploy

# Or deploy individual stacks
cdk deploy SquadLogic-AuthStack-dev
cdk deploy SquadLogic-InfraStack-dev
cdk deploy SquadLogic-FrontendStack-dev
```

### First-Time Deployment

If this is the first CDK deployment to the AWS account/region, you need to bootstrap:

```bash
cdk bootstrap aws://<account-id>/<region>
```

### Post-Deployment

After deployment, note the stack outputs:

- **UserPoolId** and **UserPoolClientId** -- Needed for frontend Amplify configuration
- **TableName** -- DynamoDB table name for backend configuration
- **EventBusName** -- EventBridge bus for event publishing
- **DistributionDomainName** -- CloudFront URL for accessing the frontend

Update your environment variables and frontend configuration with these values.

## Environment Configuration

### Backend Environment Variables (Production)

| Variable | Description | Source |
|---|---|---|
| `TABLE_NAME` | DynamoDB table name | CDK output: `TableName` |
| `EVENT_BUS_NAME` | EventBridge bus name | CDK output: `EventBusName` |
| `AWS_REGION` | AWS region | Deployment region |
| `STAGE_NAME` | Deployment stage | `dev` or `prod` |

### Frontend Environment Variables (Production)

| Variable | Description | Source |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API endpoint | API Gateway URL |
| `NEXT_PUBLIC_USER_POOL_ID` | Cognito User Pool ID | CDK output: `UserPoolId` |
| `NEXT_PUBLIC_USER_POOL_CLIENT_ID` | Cognito Client ID | CDK output: `UserPoolClientId` |

## Teardown

To destroy all resources in a dev environment:

```bash
cdk destroy --all -c stageName=dev
```

Production resources use `RETAIN` removal policies and require manual cleanup for DynamoDB tables, S3 buckets, and Cognito User Pools.
