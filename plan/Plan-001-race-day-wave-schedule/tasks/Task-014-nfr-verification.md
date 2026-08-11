---
id: Task-014
title: "NFR-002 — Accuracy verification"
type: Task
status: done
track: E
priority: P1
relationships:
  - target: ix://switchback/race-day-wave-schedule/Task-008
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/NFR-002
    type: references
  - target: ix://switchback/race-day-wave-schedule/TC-087
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-088
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-089
    type: verifies
---
# Task-014: NFR-002 — Accuracy verification

**Note**: This task originally covered both NFR-001 (fetch latency) and NFR-002 (accuracy). NFR-001 is retired — there is no external fetch anymore, so no latency budget applies. This task now covers NFR-002 only, and runs against a fixture workbook rather than a live external baseline.

## Scope
Implement inspection-based accuracy verification (NFR-002) for the call-up list parsing pipeline (FR-013/FR-014), comparing parsed output field-by-field against a manually verified fixture call-up list workbook.

## Subtasks
- [ ] **Accuracy baseline.** Manually verify 30+ participants and their category's stage/start time from a fixture call-up list workbook (name, team, category, bib, call-up number, stageTime, startTime). Store the workbook and the verified baseline as test fixtures.
- [ ] **Accuracy test.** Compare system-parsed participants and per-category schedule field-by-field against the manual baseline. Assert 100% match on all fields and participant count.
- [ ] **Test implementation.** TC-087–TC-089.

## Deliverables
- Manual accuracy baseline fixture (30+ participants, fixture workbook)
- Accuracy comparison test
- Test report template

## Notes
- Depends on Task-008 (complete pipeline needed for end-to-end accuracy comparison against the enriched schedule).
- The accuracy baseline is a one-time manual effort against a checked-in fixture workbook — unlike the retired RaceResult-based baseline, it does not need to be re-verified against a live external event and will not drift due to third-party changes.
