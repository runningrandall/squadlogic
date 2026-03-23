# SquadLogic

A **multi-tenant** team management platform for sports teams of all kinds. Multiple organizations with multiple teams operate independently on the platform. SquadLogic provides everything you need for team management -- rosters, groups, tasks, communications, and more -- in one single platform with easy integrations and plugin/app support for calendaring, chat, and beyond.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind CSS v4, AWS Amplify (auth) |
| Backend | Fastify (Node.js 22, TypeScript), Middleware, ElectroDB |
| Database | DynamoDB (Single Table Design), ElectroDB |
| Events | Amazon EventBridge (async messaging) |
| Auth | Amazon Cognito + Verified Permissions (Cedar) |
| Infrastructure | AWS CDK (TypeScript), 3 stacks |
| CI/CD | GitHub Actions |
| Observability | AWS Powertools (Logger, Tracer, Metrics), CloudWatch |
| Security | WAF, cdk-nag |
| Testing | Vitest (backend + frontend), Jest (infra) |
| Validation | Zod |
| Linting | ESLint (flat config) |

## Monorepo Structure

```
squadlogic/
├── frontend/          # Next.js 16 (App Router) - UI
├── backend/           # Fastify server (hexagonal architecture)
├── infra/             # AWS CDK stacks (Auth, Infra, Frontend)
├── docs/              # Documentation
├── scripts/           # Local dev scripts (seed, init DB)
└── plop-templates/    # Code generators
```

## Prerequisites

- **Node.js** >= 22
- **pnpm** >= 9 (packageManager: pnpm@9.15.4)
- **Docker** (for local DynamoDB)
- **AWS CLI** (configured, for deployment)

## Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd team-management

# Install dependencies
pnpm install

# Start local DynamoDB (requires Docker)
pnpm db:start

# Initialize and seed the local database
node scripts/init-local-db.js
node scripts/seed-local-db.js

# Start the frontend dev server
pnpm dev

# Start the backend dev server (in a separate terminal)
pnpm --filter backend run dev
```

The frontend runs on `http://localhost:3000` (Next.js default) and the backend on `http://localhost:3001`.

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the Next.js frontend dev server |
| `pnpm build` | Build all workspaces |
| `pnpm test` | Run tests across all workspaces |
| `pnpm lint` | Lint all workspaces |
| `pnpm commit` | Create a conventional commit (Commitizen) |
| `pnpm generate` | Run the Plop code generator |
| `pnpm db:start` | Start DynamoDB Local via Docker |
| `pnpm --filter frontend dev` | Frontend dev server only |
| `pnpm --filter backend run dev` | Backend dev server only (Fastify with tsx watch) |
| `pnpm --filter backend run build` | Build the backend |
| `pnpm --filter backend run test` | Run backend unit tests |
| `pnpm --filter infra run synth` | Synthesize CloudFormation templates |
| `pnpm --filter infra run deploy` | Deploy all CDK stacks |

## Architecture

SquadLogic follows **hexagonal architecture** (ports and adapters) on the backend. Each entity is organized into clearly separated layers:

- **Handlers** -- Thin HTTP layer (Fastify route definitions)
- **Application** -- Business logic services that orchestrate domain and ports
- **Domain** -- Entity interfaces, types, DTOs, validation schemas (Zod)
- **Ports** -- Port interfaces (repository contracts, event publisher contracts)
- **Adapters** -- Implementations (DynamoDB repositories, EventBridge publisher)
- **Entities** -- ElectroDB entity definitions (DynamoDB schema)

This separation ensures the core business logic has no direct dependencies on infrastructure, making it testable and portable.

For a detailed architecture breakdown, see [docs/architecture.md](docs/architecture.md).

## Multi-Tenancy

All data is scoped by `organizationId`, which serves as the top-level tenant boundary. Every entity's DynamoDB partition key starts with `organizationId`, ensuring strong data isolation between tenants. The `organizationId` is injected into Cognito access tokens and extracted by middleware on every request.

For a deep dive, see the [Architecture documentation](docs/architecture.md#multi-tenancy).

## CI/CD

SquadLogic uses a two-branch deployment strategy with GitHub Actions:

- **`dev` branch** -- A persistent branch for staging. Opening a PR from `dev` to `main` triggers a dev environment deployment.
- **`main` branch** -- Merging to `main` triggers a production deployment.
- **Local development** -- Develop on feature branches locally, then merge to `dev`.

CI runs linting, tests, and coverage checks on every push.

## Contributing

1. Create a feature branch from `dev`.
2. Follow the existing hexagonal architecture patterns.
3. Use Zod for all input validation.
4. Maintain at least 90% code coverage.
5. Use conventional commits (`pnpm commit` for interactive Commitizen prompts).
6. Open a PR against `dev` for review.

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint and Husky. Use `pnpm commit` for a guided commit experience.

## Documentation

- [Architecture](docs/architecture.md) -- System design, hexagonal pattern, DynamoDB schema, event patterns
- [Getting Started](docs/getting-started.md) -- Detailed setup and development guide
- [Deployment](docs/deployment.md) -- CI/CD pipeline, CDK stacks, and deployment procedures

## License

TBD
