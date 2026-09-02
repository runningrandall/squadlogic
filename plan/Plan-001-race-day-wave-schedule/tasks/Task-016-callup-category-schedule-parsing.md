---
id: Task-016
title: "FR-013 — Call-up list category schedule parsing"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: ix://switchback/race-day-wave-schedule/Task-015
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/FR-013
    type: references
  - target: ix://switchback/race-day-wave-schedule/IT-008
    type: verifies
---
# Task-016: FR-013 — Call-up list category schedule parsing

## Scope
Implement per-category staging/start time extraction from the uploaded workbook. Recognize `STAGING TIME: MM/DD/YYYY @ H:MM AM/PM` and `START TIME: ...` lines, convert to 24-hour `HH:MM`, and capture the workbook's event date from the first time line encountered.

## Subtasks
- [ ] **Time line matcher.** Implement the `STAGING TIME|START TIME` regex in `backend/src/adapters/callup-list-parser.ts` matching `MM/DD/YYYY @ H:MM AM/PM`.
- [ ] **12-to-24-hour conversion.** Convert parsed hour/minute/meridiem to `HH:MM`, including noon/midnight edge cases (`12:00 PM` → `12:00`, `12:00 AM` → `00:00`).
- [ ] **Event date capture.** Capture the `MM/DD/YYYY` component of the first recognized time line as the workbook's `eventDate`, normalized to ISO 8601.
- [ ] **Category block detection.** Treat a non-blank first-column cell that is not a time line and not the literal table-header row as the start of a new category block.
- [ ] **Unit tests.** Cover AM/PM conversion, noon/midnight edge cases, missing stage/start time per category, and multi-block independence.
- [ ] **Integration tests.** IT-008-SC-01 through SC-06 (multi-category parsing, PM/edge times, blank-row handling).

## Deliverables
- Time line parsing + 24-hour conversion logic in `callup-list-parser.ts`
- Category block detection logic
- Test files covering schedule extraction across representative fixture workbooks

## Notes
- Establishes the category-block parsing infrastructure reused by Task-017 (participant extraction) — both operate on the same row-by-row workbook scan.
- Replaces the retired Task-002 (RaceResult event metadata parsing) — there is no external page to fetch; the event date and per-category schedule now come from the uploaded workbook.
- Unblocks: Task-017 (participant extraction needs established category blocks).
