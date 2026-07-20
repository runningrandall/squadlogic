---
id: Task-007
title: "FR-006 — Logistics parameters"
type: Task
status: done
track: S
priority: P0
relationships:
  - target: ix://switchback/race-day-wave-schedule/Task-005
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/Task-006
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/FR-006
    type: references
  - target: ix://switchback/race-day-wave-schedule/TC-036
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-037
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-038
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-039
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-040
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-041
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-042
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-043
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-044
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-045
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-046
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-047
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/IT-005
    type: verifies
---
# Task-007: FR-006 — Logistics parameters

## Scope
Implement logistics parameter configuration with category-aware per-wave arrival defaults (70 min for Varsity/JV A, 60 min for others), global warmup (default 30) and staging (default 20, league rule), range validation, cross-field constraint (arrival >= warmup + staging), and DynamoDB persistence.

## Subtasks
- [ ] **Zod schema.** Create `LogisticsConfigSchema` with per-wave arrival overrides, global warmup/staging, range constraints.
- [ ] **Category-aware defaults.** Logic to inspect wave config categories: if any category contains "Varsity" or "JV A" (case-insensitive), default to 70; else 60.
- [ ] **Cross-field validation.** Enforce `arrivalBeforeMinutes >= warmupDurationMinutes + stagingBeforeMinutes` per wave, return error identifying the conflicting wave.
- [ ] **Persistence.** ElectroDB entity or DynamoDB item for logistics config, keyed by event import + user session.
- [ ] **Endpoint.** `PUT /race-events/:eventId/logistics` accepting config, returning validated + defaulted values.
- [ ] **Unit tests.** TC-036–TC-047 (12 test cases covering defaults, overrides, range validation, boundaries).
- [ ] **Integration test.** IT-005 (11 steps).

## Deliverables
- Logistics parameter validation + defaults logic
- DynamoDB persistence
- Route handler
- Test files with 12 unit + 11 integration test cases

## Notes
- Depends on Task-005 (wave config entity) for category inspection and Task-006 (wave schedule) for wave structure.
- Unblocks: Task-008 (timeline calculation needs validated parameters).
