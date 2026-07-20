---
id: Task-013
title: "IT-007 — E2E URL-to-export flow"
type: Task
status: done
track: E
priority: P0
relationships:
  - target: ix://switchback/race-day-wave-schedule/Task-010
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/IT-007
    type: references
  - target: ix://switchback/race-day-wave-schedule/TC-106
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-107
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-108
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-109
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-110
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-111
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-112
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-113
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-114
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-115
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-116
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-117
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-118
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-119
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-120
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-121
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-122
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-123
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-124
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-125
    type: verifies
---
# Task-013: IT-007 — E2E URL-to-export flow

## Scope
Implement the full end-to-end integration test: URL submission → event import → team selection → wave schedule generation → logistics enrichment → PDF export. Validates the entire pipeline with 20 success criteria against a live RaceResult event.

## Subtasks
- [ ] **Test setup.** Seed wave config, pre-configure branding, establish authenticated session.
- [ ] **Phase 1 assertions.** URL validation, metadata + teams extraction, participant extraction, DynamoDB persistence.
- [ ] **Phase 2 assertions.** Team list sorted with counts, selection persisted.
- [ ] **Phase 3 assertions.** Wave schedule with multi-wave groups, per-category start/stage times.
- [ ] **Phase 4 assertions.** Logistics object on every athlete, category-aware arrival (70/60), staging from config.
- [ ] **Phase 5 assertions.** Valid PDF download, correct filename, branding in PDF, athlete data in PDF.
- [ ] **Phase 6 assertions.** Athlete count consistency, traceability from PDF back to import data.
- [ ] **Test implementation.** TC-106 through TC-125 (20 assertions).

## Deliverables
- E2E test suite (20 success criteria)
- Test fixtures and setup scripts

## Notes
- Blocked until Task-010 (PDF export) is complete — this is the terminal test.
- Has live dependency on RaceResult. Skip (not fail) if RaceResult is unreachable and IT-006 is also failing.
- Run on every deploy + nightly.
