---
id: Task-006
title: "FR-005 — Wave schedule generation"
type: Task
status: done
track: S
priority: P0
relationships:
  - target: ix://switchback/race-day-wave-schedule/Task-004
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/Task-005
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/Task-016
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/Task-017
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/FR-005
    type: references
  - target: ix://switchback/race-day-wave-schedule/TC-027
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-028
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-029
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-030
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-031
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-032
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-033
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-034
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-035
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/IT-002
    type: verifies
---
# Task-006: FR-005 — Wave schedule generation

## Scope
Implement wave schedule generation: filter participants to selected team, match each athlete's category to wave config (Task-005) for wave grouping and lap count only, resolve each category's stageTime/startTime from the per-category schedule extracted from the uploaded call-up list (Task-016), group by wave then category, sort waves by earliest resolved start time, categories alphabetically, athletes by last name.

## Subtasks
- [ ] **Schedule generator.** Create `backend/src/application/wave-schedule-service.ts` with `generateSchedule(teamName, participants, waveConfig, categorySchedule, eventName, eventDate)`.
- [ ] **Category matching.** Match participant category strings to wave config entries for wave-name grouping and lap count. A category absent from the wave config becomes its own standalone wave, named after the category itself (not an "Unassigned" catch-all).
- [ ] **Stage/start time resolution.** Resolve each category's `stageTime`/`startTime` from `categorySchedule` (the per-category schedule from the uploaded call-up list), not from the wave config.
- [ ] **Grouping + sorting.** Group by wave (ordered by earliest resolved startTime; waves with no known start time sort last), then category (alpha), then athlete (last name, first name).
- [ ] **Empty wave omission.** Only include waves containing athletes from the selected team.
- [ ] **Endpoint.** `POST /race-events/:eventId/schedule` accepting `{teamName}`.
- [ ] **Unit tests.** TC-027–TC-035 (grouping, sorting, empty team, standalone-wave fallback, wave omission).

## Deliverables
- Schedule generation service
- Route handler
- Test files with 9 test cases

## Notes
- This is a join task — blocked until Track A's call-up list parsing (Task-016, Task-017) and Track B's wave config (Task-005) complete.
- Per-category stageTime and startTime come from the uploaded call-up list's parsed schedule, not the wave config — the wave config now only supplies wave-name grouping and lap count.
- Unblocks: Task-007 (logistics parameters), Task-008 (timeline calculation).
