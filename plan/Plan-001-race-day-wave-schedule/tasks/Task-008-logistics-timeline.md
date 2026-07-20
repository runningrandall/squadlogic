---
id: Task-008
title: "FR-007 — Logistics timeline calculation"
type: Task
status: done
track: S
priority: P0
relationships:
  - target: ix://switchback/race-day-wave-schedule/Task-006
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/Task-007
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/FR-007
    type: references
  - target: ix://switchback/race-day-wave-schedule/TC-048
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-049
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-050
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-051
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-052
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-053
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-054
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/IT-002
    type: verifies
---
# Task-008: FR-007 — Logistics timeline calculation

## Scope
Implement per-category logistics timeline enrichment. For each athlete, derive absolute arrival, warmup start/end, staging, and race start times from the per-category start time (from wave config) and logistics parameters (per-wave arrival, global warmup/staging). Handle staggered starts within waves.

## Subtasks
- [ ] **Timeline calculator.** Pure function `calculateLogistics(categoryStartTime, categoryStageTime, arrivalBefore, warmupDuration)` → `{arrivalTime, warmupStart, warmupEnd, stagingTime, raceStart}` in HH:MM format.
- [ ] **Schedule enrichment.** Extend wave schedule service to enrich each athlete entry with logistics object.
- [ ] **Recalculation.** Support parameter changes without re-import — recalculate from stored schedule + new params.
- [ ] **Unit tests.** TC-048–TC-054 (Varsity/JV B timelines, staggered starts, override, same-category identity, different-category divergence, recalculation).

## Deliverables
- Pure timeline calculation function
- Schedule enrichment integration
- Test files with 7 unit test cases

## Notes
- This is a pure function of inputs — no external dependencies, no DynamoDB calls.
- Per-category staggered starts mean athletes in the same wave but different categories get different logistics times. TC-053 explicitly tests this.
- Unblocks: Task-010 (PDF export), Task-011 (Sheets export), Task-013 (E2E test).
