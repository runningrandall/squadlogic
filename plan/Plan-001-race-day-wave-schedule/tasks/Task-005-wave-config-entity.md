---
id: Task-005
title: "FR-008 — Wave schedule config entity"
type: Task
status: done
track: B
priority: P0
relationships:
  - target: ix://switchback/race-day-wave-schedule/FR-008
    type: references
  - target: ix://switchback/race-day-wave-schedule/TC-055
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-056
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-057
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-058
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-059
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-060
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-061
    type: verifies
---
# Task-005: FR-008 — Wave schedule config entity

## Scope
Create the ElectroDB entity for wave schedule configuration, seed with the 2026 Utah HS MTB League default schedule (24 category entries across 9 waves), implement admin CRUD endpoints, and support session-level overrides. Store with `organizationId = "GLOBAL"`.

## Subtasks
- [ ] **ElectroDB entity.** Create `backend/src/entities/wave-config.ts` with attributes: configId, organizationId (GLOBAL), waveName, entries (list of {categoryName, stageTime, startTime, laps}).
- [ ] **Domain types.** Create `backend/src/domain/wave-config.ts` with Zod schemas for create/update, including HH:MM time format validation and duplicate category check.
- [ ] **Repository + adapter.** Port interface + DynamoDB adapter following existing pattern.
- [ ] **Service.** `backend/src/application/wave-config-service.ts` with seed-on-first-access, admin update, session override (not persisted).
- [ ] **Route handlers.** `GET /wave-config`, `PUT /wave-config/:waveId` (admin only).
- [ ] **Seed data.** Hardcode the 24-entry default schedule from FR-008 spec table.
- [ ] **Unit tests.** TC-059 (duplicate category), TC-060 (invalid time format).
- [ ] **Integration tests.** TC-055 (seed), TC-056 (admin update), TC-057 (non-admin rejected), TC-058 (session override), TC-061 (GLOBAL scope).

## Deliverables
- ElectroDB entity definition
- Full hexagonal stack (domain → port → adapter → service → handler)
- Seed data for 2026 league schedule
- Test files

## Notes
- **Can start immediately** — no dependency on Track A. This is the highest-priority parallel task.
- Use `requireRole('SuperAdmin', 'OrgAdmin')` for admin mutations.
- Unblocks: Task-006 (wave schedule generation), Task-007 (logistics defaults).
