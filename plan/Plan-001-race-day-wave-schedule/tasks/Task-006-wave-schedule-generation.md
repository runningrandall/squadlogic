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
Implement wave schedule generation: filter participants to selected team, match each athlete's category to wave config (Task-005), group by wave then category, include per-category stageTime/startTime/laps, sort waves by start time, categories alphabetically, athletes by last name.

## Subtasks
- [ ] **Schedule generator.** Create `backend/src/application/wave-schedule-service.ts` with `generateSchedule(teamName, participants, waveConfig)`.
- [ ] **Category matching.** Match participant category strings to wave config entries. Place unmatched categories in "Unassigned" group.
- [ ] **Grouping + sorting.** Group by wave (ordered by earliest startTime), then category (alpha), then athlete (last name, first name).
- [ ] **Empty wave omission.** Only include waves containing athletes from the selected team.
- [ ] **Endpoint.** `POST /race-events/:eventId/schedule` accepting `{teamName}`.
- [ ] **Unit tests.** TC-027–TC-035 (grouping, sorting, empty team, unassigned, wave omission).

## Deliverables
- Schedule generation service
- Route handler
- Test files with 9 test cases

## Notes
- This is a join task — blocked until both Track A (Task-004) and Track B (Task-005) complete.
- Per-category stageTime and startTime come from the wave config, not computed.
- Unblocks: Task-007 (logistics parameters), Task-008 (timeline calculation).
