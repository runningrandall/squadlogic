---
id: Task-001
title: "FR-001 — URL validation"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: ix://switchback/race-day-wave-schedule/FR-001
    type: references
  - target: ix://switchback/race-day-wave-schedule/TC-001
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-002
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-003
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-004
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-005
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-006
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-007
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/IT-003
    type: verifies
---
# Task-001: FR-001 — URL validation

## Scope
Implement Zod validation schema and Fastify route handler for RaceResult URL input. Accept `https://my.raceresult.com/{numericId}/`, reject all other patterns with HTTP 422 and descriptive error message.

## Subtasks
- [ ] **Zod schema.** Create `RaceResultUrlSchema` in `backend/src/domain/race-event.ts` validating HTTPS scheme, `my.raceresult.com` hostname, numeric path segment. Extract `eventId`.
- [ ] **Route handler.** Create `POST /race-events/import` in `backend/src/handlers/race-events/routes.ts` using the validation helper pattern. Return validated URL + eventId on success, 422 on failure.
- [ ] **Unit tests.** Write TC-001 through TC-007 in `backend/src/domain/__tests__/race-event.test.ts`.
- [ ] **Integration test.** Write IT-003 in `backend/src/handlers/__tests__/race-events.test.ts`.

## Deliverables
- `backend/src/domain/race-event.ts` — Zod schema + types
- `backend/src/handlers/race-events/routes.ts` — route stub
- Test files with 7 unit + 7 integration test cases

## Notes
- Follow existing validation pattern from `backend/src/lib/validation.ts`.
- URL normalization: always add trailing slash if missing.
- Unblocks: Task-002 (metadata parsing needs validated URL + event ID).
