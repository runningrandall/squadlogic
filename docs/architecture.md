# Architecture

This document describes the system architecture of SquadLogic, a multi-tenant team management platform.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Clients                                    │
│                  (Browser / Mobile App)                              │
└─────────────┬───────────────────────────────────┬───────────────────┘
              │                                   │
              ▼                                   ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│      CloudFront CDN     │         │     API Gateway + WAF   │
│   (Static Frontend)     │         │   (REST API Endpoint)   │
└─────────────┬───────────┘         └─────────────┬───────────┘
              │                                   │
              ▼                                   ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│     S3 (Frontend)       │         │    Fastify Backend       │
│  Next.js 16 App Router  │         │  (Node.js 22 + TS)      │
│  Tailwind CSS v4        │         │  Hexagonal Architecture  │
│  AWS Amplify (auth)     │         │                          │
└─────────────────────────┘         └──┬──────────┬───────────┘
                                       │          │
                          ┌────────────┘          └────────────┐
                          ▼                                    ▼
              ┌───────────────────────┐          ┌─────────────────────┐
              │   DynamoDB            │          │   EventBridge        │
              │   (Single Table)      │          │   (Async Events)     │
              │   ElectroDB ORM       │          │                      │
              └───────────────────────┘          └─────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Amazon Cognito      │
              │   (Auth + Groups)     │
              │   Verified Perms      │
              │   (Cedar Policies)    │
              └───────────────────────┘
```

## Hexagonal Architecture

The backend follows the **hexagonal architecture** pattern (also known as ports and adapters). The core idea is that business logic sits at the center, with all external dependencies accessed through abstract ports. Concrete adapters implement those ports for specific technologies (DynamoDB, EventBridge, etc.).

### Layer Breakdown

```
backend/src/
├── handlers/          Thin HTTP layer (Fastify routes)
├── application/       Business logic services
├── domain/            Entity interfaces, types, DTOs, Zod schemas
├── ports/             Port interfaces (repository + event contracts)
├── adapters/          Implementations (DynamoDB repos, EventBridge publisher)
├── entities/          ElectroDB entity definitions
└── lib/               Shared utilities (middleware, errors, logger, validation)
```

### Layer Responsibilities

**Handlers** (HTTP layer)

Fastify route definitions. Each entity module registers its routes with the Fastify instance. Handlers are thin -- they parse input, call the application service, and return a response. No business logic lives here.

```
handlers/organizations/routes.ts
  -> validates request body with Zod schema
  -> calls OrganizationService methods
  -> returns HTTP response via helper (created, success, noContent)
```

**Application** (business logic)

Services that orchestrate operations across domain objects and ports. Each service receives its dependencies (repository, event publisher) via constructor injection, keeping it decoupled from infrastructure.

```
application/organization-service.ts
  -> constructor(repository: OrganizationRepository, eventPublisher: EventPublisher)
  -> createOrganization(dto) -> calls repository.create() + eventPublisher.publish()
```

**Domain** (types and contracts)

Pure TypeScript interfaces, types, and Zod validation schemas. No runtime dependencies on AWS or any framework.

```
domain/organization.ts
  -> Organization interface (organizationId, name, slug, status, etc.)
  -> CreateOrganizationSchema (Zod)
  -> UpdateOrganizationSchema (Zod)
```

**Ports** (abstract interfaces)

Repository and event publisher interfaces that define what the application layer needs, without specifying how.

```
ports/organization-repository.ts
  -> interface: create(), getById(), update(), delete(), list()

ports/event-publisher.ts
  -> interface: publish(event)
```

**Adapters** (infrastructure implementations)

Concrete implementations of ports using specific AWS services.

```
adapters/organization-dynamo-repository.ts
  -> implements OrganizationRepository using ElectroDB + DynamoDB

adapters/eventbridge-publisher.ts
  -> implements EventPublisher using AWS EventBridge SDK
```

**Entities** (ElectroDB definitions)

ElectroDB entity schemas that define the DynamoDB access patterns (keys, indexes, attributes).

### Example: Organization Entity Flow

```
POST /organizations
  │
  ▼
routes.ts (handler)
  │  validate(CreateOrganizationSchema, request.body)
  │
  ▼
OrganizationService (application)
  │  createOrganization(dto)
  │
  ├──▶ OrganizationDynamoRepository (adapter)
  │      .create(dto) → DynamoDB PutItem
  │
  └──▶ EventBridgePublisher (adapter)
         .publish("OrganizationCreated", org) → EventBridge PutEvents
```

## Multi-Tenancy

SquadLogic is a multi-tenant platform where each organization is a fully isolated tenant.

### How organizationId Flows Through the System

1. **Authentication**: Users authenticate via Amazon Cognito. The `custom:organizationId` attribute is stored on each user record.
2. **Token Injection**: A Pre Token Generation Lambda trigger injects `organizationId` into the Cognito access token (planned).
3. **Middleware Extraction**: The `orgContextMiddleware` extracts `organizationId` from the authorizer context and attaches it to the request object.
4. **Data Partitioning**: Every DynamoDB partition key begins with `organizationId`, ensuring data from different tenants is physically separated within the table.
5. **Query Scoping**: All list operations use `query` (never `scan`) with `organizationId` as the partition prefix, so a tenant can never accidentally access another tenant's data.

### Tenant Isolation in DynamoDB

```
PK: $squadlogic#organizationId_<orgId>#entityId_<id>
SK: $entity_1

GSI1PK: $squadlogic#organizationId_<orgId>#parentId_<parentId>
GSI1SK: $entity_1#entityId_<id>
```

Every entity's primary key starts with the organizationId, providing partition-level isolation. Cross-org queries are only available via GSI2 for super admin operations.

### Special Cases

- **Lookup entities** (e.g., common reference data) use `organizationId = "GLOBAL"` and are shared across all tenants.
- **Organization management routes** use `superAdminMiddleware` instead of `orgContextMiddleware`, as they operate across tenants.
- **Org-sensitive secrets** are stored in AWS Secrets Manager at the path `squadlogic/org/{organizationId}/secrets`.

## DynamoDB Single Table Design

SquadLogic uses a single DynamoDB table (`SquadLogicTable-{stageName}`) with a composite primary key and two Global Secondary Indexes.

### Table Schema

| Attribute | Type | Description |
|---|---|---|
| `pk` | String | Partition key (always prefixed with organizationId) |
| `sk` | String | Sort key |
| `gsi1pk` | String | GSI1 partition key (cross-entity lookups within an org) |
| `gsi1sk` | String | GSI1 sort key |
| `gsi2pk` | String | GSI2 partition key (cross-org queries, super admin) |
| `gsi2sk` | String | GSI2 sort key |

### Index Purposes

| Index | Purpose | Example Use Case |
|---|---|---|
| **Primary (pk/sk)** | Direct entity lookups by org + entity ID | Get organization by ID |
| **GSI1 (gsi1pk/gsi1sk)** | Cross-entity lookups within an org | List all teams for an organization |
| **GSI2 (gsi2pk/gsi2sk)** | Cross-org queries for super admin | List all organizations by status |

### Key Composition Patterns

**Primary Key:**
- PK always starts with `[organizationId, ...]`, partitioning data by tenant.
- SK provides the entity type and additional sorting dimensions.

**GSI1:**
- Used for parent-child lookups within an org. For example, finding all entities belonging to a specific parent record.
- PK: `[organizationId, parentEntityId]`, SK: `[childEntityId]`

**GSI2:**
- Used for platform-wide queries by super admins.
- PK: `[]` (service prefix only, enabling cross-org access)
- SK: `[organizationId, entityId]`

### Access Pattern via ElectroDB

All DynamoDB access goes through ElectroDB, which manages key composition, index selection, and attribute mapping. Entity definitions live in `backend/src/entities/` and use `service: 'squadlogic'` as the service name.

### Design Principles

- All monetary values are stored as **integers in cents** to avoid floating-point issues.
- Billing mode is **PAY_PER_REQUEST** (on-demand) for automatic scaling.
- Point-in-time recovery is enabled in production, disabled in dev.
- Dev stage resources use `DESTROY` removal policy; prod uses `RETAIN`.

## EventBridge Event Patterns

All domain events are published to a dedicated EventBridge event bus (`squadlogic-events-{stageName}`) with source `squadlogic.api`.

### Event Structure

Every event includes `organizationId` in its detail payload, maintaining tenant context across asynchronous workflows.

```json
{
  "source": "squadlogic.api",
  "detail-type": "OrganizationCreated",
  "detail": {
    "organizationId": "org_abc123",
    "name": "Example Sports Club",
    "slug": "example-sports-club",
    ...
  }
}
```

### Event Catalog

| Event | Trigger |
|---|---|
| `OrganizationCreated` | New organization registered |
| `OrganizationSuspended` | Organization suspended by super admin |
| `OrganizationConfigUpdated` | Organization configuration changed |

Additional entity events will follow the same pattern as more entities are built out (e.g., `TeamCreated`, `MemberAdded`, `ScheduleCreated`).

## Authentication and Authorization

### Authentication (Cognito)

SquadLogic uses Amazon Cognito for user authentication with the following configuration:

- **Sign-in**: Email-based sign-in with self-registration enabled
- **Password policy**: Minimum 8 characters with uppercase, lowercase, digits, and symbols required
- **Account recovery**: Email-only
- **Custom attributes**: `organizationId` (mutable string)

### User Groups

Cognito defines six user groups for role-based access control:

| Group | Description |
|---|---|
| `SuperAdmin` | Platform-level administrators (cross-org access) |
| `Admin` | Organization administrators |
| `Manager` | Team/group managers within an org |
| `User` | Standard team members |
| `Servicer` | Service-level access |
| `Coach` | Coaching staff |

### Authorization (Verified Permissions)

Fine-grained authorization will use Amazon Verified Permissions with Cedar policies (planned). This will allow defining precise permission rules based on user roles, resource ownership, and organizational context.

### Auth Flow

```
Client
  │
  ├──▶ Cognito (authenticate, get tokens)
  │       │
  │       ▼
  │    Pre Token Generation Trigger (planned)
  │       │ injects organizationId into access token
  │       ▼
  ├──▶ API Gateway / Fastify
  │       │
  │       ▼
  │    orgContextMiddleware
  │       │ extracts organizationId from token
  │       │ attaches to request context
  │       ▼
  │    Route Handler
  │       │ uses organizationId for all data operations
  │       ▼
  └──▶ DynamoDB (scoped by organizationId)
```
