---
id: Task-004
title: "FR-004 — Team listing"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: ix://switchback/race-day-wave-schedule/Task-002
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/Task-003
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/FR-004
    type: references
  - target: ix://switchback/race-day-wave-schedule/TC-022
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-023
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-024
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-025
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-026
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/IT-004
    type: verifies
---
# Task-004: FR-004 — Team listing

## Scope
Implement the team listing endpoint and frontend dropdown. Source team names from FR-002 teams array, annotate with participant counts from FR-003 data, exclude zero-participant teams, sort alphabetically. Frontend renders as dropdown (no freeform text).

## Subtasks
- [ ] **Backend endpoint.** Add `GET /race-events/:eventId/teams` returning sorted team list with counts.
- [ ] **Team derivation logic.** Merge FR-002 teams array with FR-003 participant counts, exclude zero-count teams.
- [ ] **Frontend dropdown.** Create React component at `frontend/src/app/(dashboard)/race-day/components/team-selector.tsx` rendering a select/dropdown control.
- [ ] **Unit tests.** TC-022–TC-025 (sorting, counts, exclusion, empty array).
- [ ] **E2E test.** TC-026 (dropdown control, no freeform).
- [ ] **Integration test.** IT-004 (stored event data → team list).

## Deliverables
- Backend team listing endpoint
- Frontend dropdown component
- Test files covering sort, counts, edge cases

## Notes
- Team names come from the RaceResult select list (FR-002), preserving exact casing from source.
- Unblocks: Task-006 (wave schedule needs team selection).
