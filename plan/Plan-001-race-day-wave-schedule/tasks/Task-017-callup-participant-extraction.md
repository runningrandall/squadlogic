---
id: Task-017
title: "FR-014 — Call-up list participant extraction"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: ix://switchback/race-day-wave-schedule/Task-016
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/FR-014
    type: references
  - target: ix://switchback/race-day-wave-schedule/IT-008
    type: verifies
---
# Task-017: FR-014 — Call-up list participant extraction

## Scope
Implement participant row extraction within each category block established by Task-016: identify data rows via the CALLUP column, split the NAME column into first/last name, pull team/category/bib/call-up number, skip rows missing a team, and correctly ignore the literal STAGING/CALLUP/PLATE/... table-header row.

## Subtasks
- [ ] **Data row detection.** In `backend/src/adapters/callup-list-parser.ts`, identify a data row as one where the CALLUP column is a positive integer.
- [ ] **Header row exclusion.** Ensure the literal table-header row (first column `STAGING`) is never treated as a category header or a data row.
- [ ] **Name splitting.** Split the NAME column on whitespace; last token is `lastName`, remaining tokens joined are `firstName`; title-case both.
- [ ] **Field extraction.** Extract `bibNumber` (PLATE column), `team` (TEAM column), `category` (category column, falling back to the enclosing category block's name), and `callUpNumber` (CALLUP column).
- [ ] **Row skipping.** Skip a data row when `firstName`, `lastName`, or `team` is missing after extraction.
- [ ] **Domain type.** Add `callUpNumber` to `RaceParticipant`/`ScheduleAthlete` in `backend/src/domain/race-event.ts`.
- [ ] **Unit tests.** Cover name splitting, call-up number capture, bib extraction, missing-team skip, category fallback, header-row exclusion.
- [ ] **Integration tests.** IT-008-SC-07, IT-008-SC-08 (header row exclusion), plus overall participant count assertions.

## Deliverables
- Participant row extraction logic in `callup-list-parser.ts`
- `callUpNumber` field on `RaceParticipant`/`ScheduleAthlete`
- Test files covering extraction, skip conditions, and header-row exclusion

## Notes
- Depends on Task-016 having established category block boundaries within the same row scan.
- Replaces the retired Task-003 (RaceResult participant extraction) — there is no dynamic API to fetch; participants now come from data rows in the uploaded workbook, and each carries a staging/call-up order number that RaceResult never exposed.
- Unblocks: Task-004 (team listing), Task-006 (wave schedule generation) — both consume the extracted participant list.
