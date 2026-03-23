# Getting Started

This guide walks you through setting up the SquadLogic development environment from scratch.

## Prerequisites

Ensure the following are installed on your machine:

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | >= 22 | JavaScript runtime |
| **pnpm** | >= 9 | Package manager (monorepo workspaces) |
| **Docker** | Latest | Local DynamoDB |
| **AWS CLI** | v2 | AWS resource management and deployment |
| **Git** | Latest | Version control |

### Verify Installations

```bash
node --version    # Should output v22.x.x or higher
pnpm --version    # Should output 9.x.x or higher
docker --version  # Should output Docker version 2x.x.x or higher
aws --version     # Should output aws-cli/2.x.x or higher
```

## Installation

### 1. Clone the Repository

```bash
git clone <repo-url>
cd team-management
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs dependencies for all workspaces: `frontend`, `backend`, and `infra`.

## Environment Variables

Create a `.env` file in the `backend/` directory for local development. Use the following as a template:

```bash
# backend/.env

# Server
PORT=3001
HOST=0.0.0.0

# DynamoDB Local
DYNAMODB_ENDPOINT=http://localhost:8000
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local

# DynamoDB Table
TABLE_NAME=SquadLogicTable-dev

# EventBridge (local dev - events are logged but not published)
EVENT_BUS_NAME=squadlogic-events-dev

# Stage
STAGE_NAME=dev
```

Create a `.env.local` file in the `frontend/` directory:

```bash
# frontend/.env.local

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# Cognito (fill in after deploying AuthStack, or use local mock values)
NEXT_PUBLIC_USER_POOL_ID=<your-user-pool-id>
NEXT_PUBLIC_USER_POOL_CLIENT_ID=<your-user-pool-client-id>
```

## Local DynamoDB Setup

SquadLogic uses DynamoDB Local for development, running as a Docker container.

### 1. Start DynamoDB Local

```bash
pnpm db:start
```

This runs `docker compose up -d dynamodb-local`, starting DynamoDB Local on port 8000.

### 2. Create the Local Table

```bash
node scripts/init-local-db.js
```

This creates the `SquadLogicTable-dev` table with the primary key (`pk`/`sk`) and both Global Secondary Indexes (`gsi1` and `gsi2`).

### 3. Seed Sample Data

```bash
node scripts/seed-local-db.js
```

This populates the local table with sample organizations and related data for development.

### Verify DynamoDB is Running

```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

You should see `SquadLogicTable-dev` in the output.

## Running the Backend

The backend is a Fastify server that runs locally with `tsx watch` for hot reloading.

```bash
pnpm --filter backend run dev
```

The server starts on `http://localhost:3001`. Verify it is running:

```bash
curl http://localhost:3001/health
# Expected: {"status":"ok"}
```

### Available Backend Endpoints

During local development, the following endpoints are available:

- `GET /health` -- Health check
- `POST /organizations` -- Create an organization
- `GET /organizations` -- List organizations (supports `?cursor=` and `?limit=` query params)
- `GET /organizations/:id` -- Get an organization by ID
- `PUT /organizations/:id` -- Update an organization
- `DELETE /organizations/:id` -- Delete an organization

## Running the Frontend

```bash
pnpm dev
# or
pnpm --filter frontend dev
```

The Next.js dev server starts on `http://localhost:3000` with hot module replacement.

## Running Tests

### All Workspaces

```bash
pnpm test
```

### Backend Only

```bash
pnpm --filter backend run test

# With watch mode
pnpm --filter backend run test:watch

# With coverage (enforces 90% threshold)
pnpm --filter backend run test:coverage
```

### Frontend Only

```bash
pnpm --filter frontend run test

# With watch mode
pnpm --filter frontend run test:watch
```

### Infrastructure (CDK)

```bash
pnpm --filter infra run test
```

Infrastructure tests use Jest (not Vitest) for CDK snapshot and assertion testing.

## Linting

```bash
# All workspaces
pnpm lint

# Workspace-specific
pnpm --filter backend run lint
pnpm --filter frontend run lint
pnpm --filter infra run lint
```

ESLint is configured with flat config in each workspace.

## Code Generation

SquadLogic includes Plop-based code generators for scaffolding new entities following the hexagonal architecture pattern:

```bash
pnpm generate
```

This launches an interactive prompt to generate boilerplate for new entities (handlers, services, domain types, ports, adapters, and entity definitions).

## Common Troubleshooting

### DynamoDB Local not starting

**Symptom**: `pnpm db:start` fails or the container exits immediately.

**Solution**: Ensure Docker is running. Check for port conflicts on 8000:
```bash
lsof -i :8000
```

### "Table not found" errors

**Symptom**: Backend returns errors about missing tables.

**Solution**: Ensure you have run the init script:
```bash
node scripts/init-local-db.js
```

### Port already in use

**Symptom**: Backend fails to start with `EADDRINUSE`.

**Solution**: Kill the process using port 3001:
```bash
lsof -i :3001
kill -9 <PID>
```

Or set a different port:
```bash
PORT=3002 pnpm --filter backend run dev
```

### pnpm install fails

**Symptom**: Dependency resolution errors during install.

**Solution**: Ensure you are using pnpm 9+:
```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install
```

### TypeScript errors in IDE

**Symptom**: IDE shows type errors that don't appear during build.

**Solution**: Ensure the workspace is built at least once so TypeScript project references resolve:
```bash
pnpm build
```

### Frontend cannot connect to backend

**Symptom**: API calls fail with network errors.

**Solution**: Verify the backend is running on port 3001 and that `NEXT_PUBLIC_API_URL` is set correctly in `frontend/.env.local`. Also check that CORS is enabled (it is by default in development).
