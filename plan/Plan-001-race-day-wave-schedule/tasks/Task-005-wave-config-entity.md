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
Create the ElectroDB entity for wave schedule configuration, seed with the 2026 Utah HS MTB League default schedule (24 category entries across 9 waves), and implement admin CRUD endpoints. Store with `organizationId = "GLOBAL"`. WaveConfig supplies wave-to-category grouping and lap count only — per-category `stageTime`/`startTime` fields remain on the entity/schema for backward structural compatibility but are not authoritative for schedule generation (those now come from the uploaded call-up list; see FR-013). There is no session-level override for stage/start time, since the config no longer supplies stage/start time at all.

## Subtasks
- [ ] **ElectroDB entity.** Create `backend/src/entities/wave-config.ts` with attributes: configId, organizationId (GLOBAL), waveName, entries (list of {categoryName, stageTime, startTime, laps}). `stageTime`/`startTime` are retained on the entry shape for backward compatibility but are not read by schedule generation.
- [ ] **Domain types.** Create `backend/src/domain/wave-config.ts` with Zod schemas for create/update, including HH:MM time format validation (still enforced when present, for backward compatibility) and duplicate category check.
- [ ] **Repository + adapter.** Port interface + DynamoDB adapter following existing pattern.
- [ ] **Service.** `backend/src/application/wave-config-service.ts` with seed-on-first-access and admin update. No session-level override — the config now only ever contributes wave grouping and laps to schedule generation.
- [ ] **Route handlers.** `GET /wave-config`, `PUT /wave-config/:waveId` (admin only).
- [ ] **Seed data.** Hardcode the 24-entry default schedule from FR-008 spec table.
- [ ] **Unit tests.** TC-059 (duplicate category), TC-060 (invalid time format).
- [ ] **Integration tests.** TC-055 (seed), TC-056 (admin update of grouping/laps), TC-057 (non-admin rejected), TC-061 (GLOBAL scope).

## Deliverables
- ElectroDB entity definition
- Full hexagonal stack (domain → port → adapter → service → handler)
- Seed data for 2026 league schedule
- Test files

## Notes
- **Can start immediately** — no dependency on Track A. This is the highest-priority parallel task.
- Use `requireRole('SuperAdmin', 'OrgAdmin')` for admin mutations.
- Scope narrowed from the original design: WaveConfig no longer supplies authoritative per-category stage/start times (see FR-008). Do not build session-override logic for stage/start time — it is not read by schedule generation.
- Unblocks: Task-006 (wave schedule generation), Task-007 (logistics defaults).
