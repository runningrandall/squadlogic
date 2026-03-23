# Environment Variables & Secrets

## Local Development

```bash
cp .env.example .env
```

The `.env` file is loaded automatically by `pnpm dev:local`. Default values work for local development — Cognito/Verified Permissions are optional locally since the auth plugin falls back to header-based authentication, and EventBridge events are logged instead of published.

---

## All Environment Variables

### Backend - Core

| Variable | Default | Local | Deployed | Description |
|---|---|---|---|---|
| `NODE_ENV` | — | `development` | `production` | Enables header-based auth fallback in dev/test |
| `PORT` | `3001` | `3001` | `3001` | Backend server port |
| `HOST` | `0.0.0.0` | `0.0.0.0` | `0.0.0.0` | Backend server bind address |

### Backend - AWS Services

| Variable | Default | Local | Deployed | Source |
|---|---|---|---|---|
| `DYNAMODB_ENDPOINT` | — | `http://localhost:8000` | *not set* (uses AWS default) | Manual |
| `TABLE_NAME` | `TeamManager-Table-dev` | `TeamManager-Table-dev` | From CDK output | `TeamManager-Infra-{stage}` → `TableName` |
| `EVENT_BUS_NAME` | `default` | `local-events` | From CDK output | `TeamManager-Infra-{stage}` → `EventBusName` |

### Backend - Auth

| Variable | Default | Local | Deployed | Source |
|---|---|---|---|---|
| `COGNITO_USER_POOL_ID` | — | *empty* (skipped) | From CDK output | `TeamManager-Auth-{stage}` → `UserPoolId` |
| `COGNITO_CLIENT_ID` | — | *empty* (skipped) | From CDK output | `TeamManager-Auth-{stage}` → `UserPoolClientId` |
| `POLICY_STORE_ID` | `''` | *empty* (skipped) | From CDK output | `TeamManager-Auth-{stage}` → `PolicyStoreId` |

### Backend - Third-Party (server-side only)

| Variable | Default | Local | Deployed | Description |
|---|---|---|---|---|
| `RECAPTCHA_SECRET_KEY` | — | *empty* | GitHub secret | reCAPTCHA v3 secret for server-side verification |

### Frontend (`NEXT_PUBLIC_` - exposed to browser)

| Variable | Default | Local | Deployed | Source |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `''` | `http://localhost:3001` | GitHub secret | Backend API URL |
| `NEXT_PUBLIC_USER_POOL_ID` | `''` | *empty* | From CDK output | Same as `COGNITO_USER_POOL_ID` |
| `NEXT_PUBLIC_USER_POOL_CLIENT_ID` | `''` | *empty* | From CDK output | Same as `COGNITO_CLIENT_ID` |
| `NEXT_PUBLIC_COGNITO_DOMAIN` | `''` | *empty* | From CDK output | `TeamManager-Auth-{stage}` → `UserPoolDomain` |
| `NEXT_PUBLIC_REDIRECT_SIGN_IN` | `http://localhost:3000/` | `http://localhost:3000/` | GitHub secret | OAuth callback URL |
| `NEXT_PUBLIC_REDIRECT_SIGN_OUT` | `http://localhost:3000/` | `http://localhost:3000/` | GitHub secret | OAuth logout URL |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | — | *empty* | GitHub secret | Google Maps JavaScript API key |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | — | *empty* | GitHub secret | reCAPTCHA v3 site key (public) |

### CDK Context (passed via `-c` flag during deploy)

| Context Key | Required | Description |
|---|---|---|
| `stageName` | Yes | `dev` or `prod` |
| `googleClientId` | No | Google OAuth Client ID (enables Google sign-in) |
| `googleClientSecret` | No | Google OAuth Client Secret |

---

## How Deployed Variables Flow

```
CDK Deploy
  ├── Creates Cognito User Pool     → outputs UserPoolId, UserPoolClientId, UserPoolDomain
  ├── Creates DynamoDB Table        → outputs TableName
  ├── Creates EventBridge Bus       → outputs EventBusName
  └── Creates Policy Store          → outputs PolicyStoreId

CI/CD Pipeline
  ├── Step 1: Deploy CDK stacks
  ├── Step 2: Fetch stack outputs via CloudFormation API
  ├── Step 3: Build frontend with outputs as NEXT_PUBLIC_* env vars
  └── Step 4: Upload frontend to S3
```

Cognito IDs, table names, etc. are **not** GitHub secrets — they are dynamically fetched from CloudFormation stack outputs after each deploy. This means you never need to manually update them.

---

## GitHub Actions Secrets

Configure in **Settings > Secrets and variables > Actions**.

### Required (for deployment)

| Secret | Description | How to Get |
|---|---|---|
| `AWS_ROLE_ARN_DEV` | IAM OIDC role ARN for dev | Create IAM role with trust policy for GitHub Actions |
| `AWS_ROLE_ARN_PROD` | IAM OIDC role ARN for prod | Same, for prod account |

### Required (for frontend build)

| Secret | Description | Example |
|---|---|---|
| `DEV_API_URL` | Backend API URL for dev | `https://api-dev.squadlogic.ai` |
| `PROD_API_URL` | Backend API URL for prod | `https://api.squadlogic.ai` |
| `DEV_REDIRECT_URL` | OAuth redirect URL for dev | `https://dev.squadlogic.ai/` |
| `PROD_REDIRECT_URL` | OAuth redirect URL for prod | `https://app.squadlogic.ai/` |

### Optional (Google OAuth)

| Secret | Description | How to Get |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Google Cloud Console > APIs & Credentials > OAuth 2.0 Client |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Same as above |

### Optional (Third-party APIs)

| Secret | Description | How to Get |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key | Google Cloud Console > APIs & Credentials > API Keys |
| `RECAPTCHA_SITE_KEY` | reCAPTCHA v3 site key (public) | Google reCAPTCHA admin console |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA v3 secret key | Same as above |

### Auto-provided (no setup needed)

| Secret | Description |
|---|---|
| `GITHUB_TOKEN` | Built-in token for semantic-release, PR comments |

---

## GitHub Environments

Create in **Settings > Environments**:

| Environment | Used By | Recommended Protection |
|---|---|---|
| `dev` | `deploy-dev` job | None |
| `production` | `deploy-prod` job | Required reviewers |

---

## AWS OIDC Setup for GitHub Actions

1. Create an IAM Identity Provider:
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`

2. Create an IAM Role with trust policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Principal": {
         "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
       },
       "Action": "sts:AssumeRoleWithWebIdentity",
       "Condition": {
         "StringEquals": {
           "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
         },
         "StringLike": {
           "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:*"
         }
       }
     }]
   }
   ```

3. Attach permissions for:
   - CloudFormation, IAM (CDK deployments)
   - DynamoDB, EventBridge, S3, CloudFront (resource creation)
   - Cognito, Lambda, Verified Permissions (auth infra)
   - Secrets Manager (org secrets)

4. Set the Role ARN as `AWS_ROLE_ARN_DEV` / `AWS_ROLE_ARN_PROD` secret.

---

## Adding a New Third-Party API Key

When you need a new API key (e.g., Stripe, SendGrid, Twilio):

1. **Frontend (public)**: Add `NEXT_PUBLIC_*` var to `.env.example`, `.env`, `dev-local.sh`, and the CI/CD `Build frontend` step env block
2. **Backend (secret)**: Add to `.env.example`, `.env`, `dev-local.sh`, and pass as Lambda env var in CDK
3. **GitHub**: Add as a repository secret
4. **Docs**: Update this file
