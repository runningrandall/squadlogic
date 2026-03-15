# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Versa - a **multi-tenant** team management platform for teams of all sports. Multiple organizations with multip teams can operate independently on the platform (multi-tenant). We offer all your team management needs (team, roster, groups, tasks, communications, etc.) in one single platform. We integrate easily and leverage plugins/apps for calendaring, chat, etc.

## Monorepo Structure

```
├── frontend/    # Next.js 16 (App Router) - UI
├── backend/     # Fastify (uses hexagonal architecture)
├── infra/       # AWS CDK stacks - Infrastructure including EventBridge, DynamoDB, SES, Cognito, etc.
├── docs/        # Documentation
├── scripts/     # Local dev scripts (seed, init DB)
└── plop-templates/  # Code generators
```

## Common Commands

```bash
pnpm dev                  # Start Next.js dev server
pnpm build                # Build all workspaces
pnpm test                 # Test all workspaces
pnpm lint                 # Lint all workspaces
pnpm commit               # Commitizen conventional commit
pnpm generate             # Plop code generator

# Workspace-specific
pnpm --filter frontend dev      # Frontend dev server
pnpm --filter backend run build         # Build Lambda handlers
pnpm --filter backend run test          # Backend unit tests
pnpm --filter infra run synth           # CDK synth CloudFormation
pnpm --filter infra run deploy          # CDK deploy

# Local DynamoDB
pnpm db:start             # Start DynamoDB Local (Docker)
node scripts/init-local-db.js           # Create local table
node scripts/seed-local-db.js           # Seed local data
```

## Architecture

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind CSS v4, AWS Amplify (auth), Cloudfront, S3 |
| Backend | Fastify (Node.js 22, TypeScript), Middleware, ElectroDB |
| Database | DynamoDB (Single Table Design), ElectroDB for database |
| Events | EventBridge for Async Messaging (all key lifecycle events) |
| Auth | Amazon Cognito + Verified Permissions (Cedar) |
| Infrastructure | AWS CDK (TypeScript), 3 stacks |
| CI/CD | GitHub Actions (deploy, teardown, release) |
| Observability | AWS Powertools (Logger, Tracer, Metrics), Cloudwatch |
| Security | WAF, cdk-nag, Lambda Authorizer |
| Testing | Vitest (backend + frontend), Jest (infra) |
| Linting | Eslint for code fixes and linting |
| Validation | Zod for all validation |

## Backend Architecture (Hexagonal)

Each entity follows the hexagonal (domain, ports & adapters) pattern and uses Dynamodb single table design with electrodb.

## Multi-Tenancy

All data is scoped by `organizationId`. The `Organization` entity is the top-level tenant boundary.

- **organizationId** is the first composite in every entity's PK → DynamoDB partitions data by org → strong tenant isolation
- All list operations use `query` (not `scan`) with `organizationId` as the partition prefix
- GSI1 also includes `organizationId` as the first composite in pk for parent lookups within an org
- GSI2 enables cross-org queries for super admin: `gsi2pk: []` (service prefix), `gsi2sk: [organizationId, entityId]`
- Lookup entities use `organizationId = "GLOBAL"` for platform defaults
- Auth: `organizationId` is injected into Cognito access tokens via Pre Token Generation Lambda trigger
- Middleware: `orgContextMiddleware` extracts `organizationId` from authorizer context and attaches to request; org management routes use `superAdminMiddleware` (no org scoping)
- Secrets: Org-sensitive config (Stripe keys, etc.) stored in AWS Secrets Manager at `versa/org/{organizationId}/secrets`

## Entity Model

TODO: document

## Standards

- Hexagonal architecture for all Lambda handlers
- ElectroDB for DynamoDB access patterns
- Zod for all input validation
- pnpm workspaces for dependency management
- Conventional commits (commitlint + Commitizen)
- ESLint flat config in each workspace
- Vitest for backend + frontend tests
- Jest for CDK infrastructure tests
- Must have at least 90% code coverage
- CI/CD runs lint, test, etc.

## CI/CD Pipeline

Leverage a dev branch for test deployment and main branch for prod. Dev is a persistent branch and merging to main triggers prod deploy. Opening a PR from dev to main triggers dev deploy. Otherwise develop locally.
