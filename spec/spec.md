---
type: master-requirements
name: race-day-wave-schedule
org: switchback
component_type: fastify-service
tags:
  - dynamodb
  - raceresult
  - scheduling
implementation_language: typescript
depends_on:
  - "@fastify/sensible"
  - electrodb
  - zod
relationships: []

standards_alignment:
  - iso-iec-ieee-29148
---
# Master Requirements Specification
## Race Day Wave Schedule

---

## Purpose

This document defines the **scope, intent, and governing requirements framework** for the Race Day Wave Schedule feature within the Switchback platform.

It establishes:
- The problem space of race day logistics coordination for team managers and coaches
- The boundaries of the feature's responsibility within the broader Switchback platform
- The authoritative structure for requirements, verification, and change control
- The relationship between team management intent, system behavior, and test evidence

This document is the **top-level requirements artifact** for the Race Day Wave Schedule feature.

---

## Scope

### In Scope

This specification governs:
- Accepting a RaceResult event URL as input and validating it
- Fetching and parsing race event data from RaceResult (event metadata, participants, categories, waves)
- Listing available teams from the RaceResult select list for user selection via dropdown
- Managing a league-wide wave schedule configuration (wave-to-category mapping and start times) in DynamoDB
- Generating a wave schedule for the selected team, grouped by wave and category
- Configuring race day logistics timing parameters (per-wave arrival buffer, warmup duration, staging buffer)
- Calculating per-athlete logistics timelines derived from per-category start times and logistics configuration
- Exporting the generated schedule as PDF or Google Sheets for printing and distribution
- Configuring team branding (team name, logo, primary and tertiary colors) applied to exported schedules
- Persisting imported event data, wave configuration, and logistics parameters in DynamoDB
- Rate limiting external RaceResult fetches via CloudFront/WAF

### Out of Scope

This specification does not govern:
- Syncing parsed RaceResult athletes with existing Switchback athlete records
- Supporting race registration platforms other than RaceResult (my.raceresult.com)
- Live race tracking, timing, or result recording
- Automated notifications or communications to athletes about their schedules
- Historical race data storage, trending, or analytics across seasons
- Payment processing or race registration management
- Course maps, elevation profiles, or venue logistics beyond athlete timing
- Supporting authenticated or private RaceResult events (only publicly accessible events)
- Mapping RaceResult team names to existing Switchback Team entities

---

## System Overview

### System Description

The Race Day Wave Schedule feature enables team managers and coaches to import race registration data from a publicly accessible RaceResult event URL, select their team from the list of registered teams, and generate a structured wave schedule. The schedule groups the team's athletes by wave and category, and applies configurable logistics timing parameters to produce a per-athlete timeline covering arrival, warmup, staging, and race start.

This feature addresses the operational challenge of coordinating multiple athletes across staggered wave starts at mountain bike races organized through the Utah High School Cycling League and similar organizations that use RaceResult for event management.

### Intended Users

- **Team managers**: Coordinate race day logistics for their team's athletes across multiple waves and categories
- **Coaches**: Plan warmup routines and staging logistics to ensure athletes are prepared for their start times
- **Team administrators**: Generate and distribute race day schedules to athletes and parents

---

## Requirements Architecture

Requirements are decomposed and managed using a **hierarchical structure** consistent with ISO/IEC/IEEE 29148.

```
spec/
├── spec.md               # This document (master specification)
├── stakeholder/           # Stakeholder requirements (StR-XXX)
├── usecase/               # User intent and usage scenarios (US-XXX)
├── functional/            # System / functional requirements (FR-XXX)
├── non-functional/        # Non-functional requirements (NFR-XXX)
├── integration/           # Integration test specifications (IT-XXX)
├── matrix/                # Test matrix
└── analysis/              # Analysis artifacts
```

---

## Requirement Classes

### Stakeholder Requirements

Stakeholder Requirements capture **authoritative needs and expectations**.

- Format: `StR-XXX`
- Location: `stakeholder/`
- Nature: Normative for intent
- Purpose: Drive system requirements

| ID | Title | Status |
|----|-------|--------|
| StR-001 | Team managers need automated race day schedules from registration data | DRAFT |

---

### User Requirements

User Stories describe **intent, expectations, and usage outcomes**.

- Format: `US-XXX`
- Location: `usecase/`
- Nature: Informational, non-binding
- Purpose: Drive functional requirements

| ID | Title | Traces To | Status |
|----|-------|-----------|--------|
| US-001 | Import race event data from a RaceResult URL | StR-001 | DRAFT |
| US-002 | View team wave schedule grouped by wave and category | StR-001 | DRAFT |
| US-003 | Configure logistics timing for race day preparation | StR-001 | DRAFT |
| US-004 | Export and customize race day schedule | StR-001 | DRAFT |

---

### Functional Requirements

Functional Requirements define **authoritative, testable system behavior**.

- Format: `FR-XXX`
- Location: `functional/`
- Nature: Normative and binding
- Purpose: Define observable behavior

| ID | Title | Implements | Status |
|----|-------|------------|--------|
| FR-001 | Accept and validate RaceResult event URL | US-001 | DRAFT |
| FR-002 | Parse race event metadata from RaceResult | US-001 | DRAFT |
| FR-003 | Extract participant list from RaceResult event data | US-001 | DRAFT |
| FR-004 | List available teams from parsed event data | US-002 | DRAFT |
| FR-005 | Generate team wave schedule grouped by wave and category | US-002 | DRAFT |
| FR-006 | Define race day logistics timing parameters | US-003 | DRAFT |
| FR-007 | Calculate per-athlete logistics timeline | US-003 | DRAFT |
| FR-008 | Manage wave schedule configuration | US-002 | DRAFT |
| FR-009 | Export schedule as PDF | US-004 | DRAFT |
| FR-010 | Export schedule to Google Sheets | US-004 | DRAFT |
| FR-011 | Configure team branding | US-004 | DRAFT |

---

### Non-Functional Requirements

Non-Functional Requirements define **quality constraints** (performance, reliability, usability).

- Format: `NFR-XXX`
- Location: `non-functional/`
- Nature: Normative and binding
- Purpose: Constrain system qualities

| ID | Title | Quality Attribute | Status |
|----|-------|-------------------|--------|
| NFR-001 | External data fetch latency | performance_efficiency | DRAFT |
| NFR-002 | Parsed data presentation accuracy | functional_suitability | DRAFT |

---

### Acceptance Criteria

Acceptance criteria define **verifiable outcomes** for functional requirements.

- Format: `{FR-XXX}-AC-N`
- Location: Within each functional requirement file
- Purpose: Verification anchor

---

## Requirement Identification

### Identifier Schema

| Artifact | Format | Example |
|----------|--------|---------|
| Stakeholder Requirement | `StR-XXX` | `StR-001` |
| User Story | `US-XXX` | `US-002` |
| Functional Requirement | `FR-XXX` | `FR-005` |
| Non-Functional Requirement | `NFR-XXX` | `NFR-001` |
| Acceptance Criteria | `{FR}-AC-N` | `FR-005-AC-1` |
| Integration Test | `IT-XXX` | `IT-001` |

Identifiers are immutable once assigned.

---

## Requirement Quality Policy

All **functional requirements** SHALL:
- Define observable behavior
- Be unambiguous and atomic
- Avoid implementation details unless required
- Be testable through explicit criteria

Functional requirements SHALL NOT:
- Encode application-specific policy
- Contain compound behaviors
- Use subjective language

---

## Persistence Model

### Data Storage

All feature data is persisted in DynamoDB using the existing single-table design with ElectroDB:

- **WaveScheduleConfig**: League-wide wave-to-category mapping and start times. Stored with `organizationId = "GLOBAL"`. Admin-managed with seed defaults from the Utah HS MTB League 2026 schedule. Accessible to all authenticated users regardless of organization.
- **RaceEventImport**: Parsed event metadata, teams list, and participant records for a specific RaceResult event. Keyed by event ID. Ephemeral — may include TTL for automatic expiration after race day.
- **LogisticsConfig**: Per-session logistics parameters (per-wave arrival overrides, global warmup, global staging). Keyed by event import ID and user session.

### Multi-Tenancy

This feature is org-agnostic — all teams in the mountain bike league use the same wave schedule and the feature behaves identically for all users. The `WaveScheduleConfig` entity uses `organizationId = "GLOBAL"` consistent with the existing lookup entity pattern. Individual session data (event imports, logistics configs) does not require org-scoping since it is user-specific and ephemeral.

### Rate Limiting

External RaceResult fetches SHALL be rate-limited via the CloudFront distribution or WAF rules to prevent excessive requests to the third-party platform, particularly during race-morning usage spikes.

---

## State and Execution Model

### Race Event Import Lifecycle

A race event import progresses through the following states:
- **URL_SUBMITTED**: User has provided a RaceResult URL
- **FETCHING**: System is retrieving data from the external source
- **PARSED**: Event data has been successfully extracted and persisted to DynamoDB
- **TEAM_SELECTED**: User has selected their team from parsed data
- **SCHEDULE_GENERATED**: Wave schedule has been produced with logistics timelines

### Transition Semantics

Transitions are linear and user-driven. The system SHALL NOT advance past PARSED without explicit user selection of a team. A failed fetch or parse SHALL return the user to URL_SUBMITTED with an error message. State is persisted in DynamoDB, allowing users to resume a session.

### Determinism Guarantees

Given identical RaceResult source data, wave schedule configuration, and logistics parameters, the system SHALL produce identical wave schedules. Schedule generation is a pure function of inputs.

---

## Events and Signals

### Event Model

The feature publishes domain events through EventBridge consistent with Switchback conventions:
- `RaceEventImported`: Emitted when event data is successfully parsed from RaceResult
- `WaveScheduleGenerated`: Emitted when a wave schedule is generated for a team

### Event Guarantees

- Events are published at-least-once via EventBridge
- Event ordering within a single import session is guaranteed
- Failed event publication SHALL NOT block the user-facing response

---

## Error and Failure Model

### Error Classification

- **External fetch errors**: RaceResult URL unreachable, timeout, non-200 response
- **Parse errors**: Unexpected page structure, missing required data fields
- **Validation errors**: Invalid URL format, missing required logistics parameters
- **Data errors**: No participants found, selected team not in participant list

### Failure Handling Guarantees

External fetch failures SHALL return a user-actionable error message indicating the nature of the failure. Parse failures SHALL identify what data could not be extracted. The system SHALL NOT persist partial or corrupt parsed data.

---

## Traceability

Bidirectional traceability SHALL be maintained between:
- Stakeholder Requirements → User Stories / Functional Requirements
- User Stories → Functional Requirements
- Functional Requirements → Acceptance Criteria
- Acceptance Criteria → Integration Tests

---

## Verification Strategy

Functional requirements SHALL be verified using one or more of:
- Automated tests
- Manual tests
- Analysis
- Inspection

Integration tests SHALL exercise the external RaceResult integration boundary with controlled test data.

---

## Change Management

All requirements artifacts are **configuration-controlled items**.

- Changes are proposed via change requests (`CR-XXX`)
- Changes require impact analysis
- Approved changes update affected requirements, tests, and traceability
- Historical versions are preserved

---

## Lifecycle Status

All requirements in this specification are currently in **DRAFT** status.

---

## Governance Notes

- This document defines **system intent**, not implementation
- Functional requirements SHALL precede code changes
- The RaceResult integration is with a third-party platform whose page structure may change without notice; the parse logic must be treated as a volatility boundary

---

## References

- ISO/IEC/IEEE 29148 — Requirements Engineering
- RaceResult Platform — https://my.raceresult.com
- Utah High School Cycling League — Event organizer using RaceResult
- Switchback Architecture — `docs/architecture.md`

---
