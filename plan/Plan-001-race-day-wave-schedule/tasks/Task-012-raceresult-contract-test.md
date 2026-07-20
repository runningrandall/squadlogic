---
id: Task-012
title: "IT-006 — RaceResult structure validation"
type: Task
status: done
track: C
priority: P1
relationships:
  - target: ix://switchback/race-day-wave-schedule/IT-006
    type: references
  - target: ix://switchback/race-day-wave-schedule/TC-093
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-094
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-095
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-096
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-097
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-098
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-099
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-100
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-101
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-102
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-103
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-104
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-105
    type: verifies
---
# Task-012: IT-006 — RaceResult structure validation

## Scope
Implement the RaceResult page structure contract test. Validate HTML DOM elements, JSON-LD schema, RRPublish initialization, teams dropdown CSS selector, participant API endpoint contract, and API response format against a cached baseline snapshot. Schedule for daily CI execution.

## Subtasks
- [ ] **Baseline snapshot.** Capture and store the current RaceResult page structure (JSON-LD fields, RRPublish constructor args, API response format) as test fixture files.
- [ ] **HTML structure assertions.** Test for JSON-LD block, RRPublish init script, load.js availability, teams dropdown selector.
- [ ] **API contract assertions.** Discover key/listname, fetch participant API, validate response structure.
- [ ] **Drift detection.** Compare current structure to baseline, fail on any structural change.
- [ ] **CI scheduling.** Configure GitHub Actions workflow to run this test daily + on deploy.
- [ ] **Alert integration.** Configure failure notifications (e.g., Slack webhook or GitHub issue creation).
- [ ] **Test implementation.** TC-093 through TC-105 (13 assertions).

## Deliverables
- Baseline snapshot fixtures in test fixtures directory
- Contract test suite (13 test cases)
- GitHub Actions daily schedule workflow
- Alert configuration

## Notes
- **Can start immediately** — parallel with Track A.
- When this test fails in production, it means RaceResult changed their page. The team should: investigate → update parser → update baseline → re-validate IT-001.
