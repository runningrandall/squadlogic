---
id: Task-014
title: "NFR-001/NFR-002 — Performance and accuracy verification"
type: Task
status: done
track: E
priority: P1
relationships:
  - target: ix://switchback/race-day-wave-schedule/Task-008
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/NFR-001
    type: references
  - target: ix://switchback/race-day-wave-schedule/NFR-002
    type: references
  - target: ix://switchback/race-day-wave-schedule/TC-085
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-086
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-087
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-088
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-089
    type: verifies
---
# Task-014: NFR-001/NFR-002 — Performance and accuracy verification

## Scope
Implement load tests for fetch+parse latency (NFR-001) and inspection-based accuracy verification (NFR-002) against a known RaceResult event baseline.

## Subtasks
- [ ] **Load test script.** Run 50 sequential fetch+parse requests against RaceResult event 411620. Measure p50 and p95 latency. Assert p50 ≤ 5s, p95 ≤ 10s.
- [ ] **Timeout configuration verification.** Assert HTTP request timeout is configured at ≤ 10s.
- [ ] **Accuracy baseline.** Manually verify 30+ participants from event 411620 (name, team, category, bib). Store as test fixture.
- [ ] **Accuracy test.** Compare system-extracted participants field-by-field against the manual baseline. Assert 100% match on all fields and participant count.
- [ ] **Test implementation.** TC-085–TC-089.

## Deliverables
- Load test script + assertions
- Manual accuracy baseline fixture (30+ participants)
- Accuracy comparison test
- Test report template

## Notes
- Depends on Task-008 (complete pipeline needed for end-to-end latency measurement).
- The accuracy baseline is a one-time manual effort but must be maintained if the test event changes.
