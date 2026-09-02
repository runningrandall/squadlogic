---
id: IT-008
title: "Call-up list XLSX parsing"
type: IT
relationships:
  - target: "ix://switchback/squadlogic/FR-012"
    type: "verifies"
  - target: "ix://switchback/squadlogic/FR-013"
    type: "verifies"
  - target: "ix://switchback/squadlogic/FR-014"
    type: "verifies"
---

# [IT-008] Call-up list XLSX parsing

## Objective

Verify the integration between the call-up list upload endpoint and the `.xlsx` parsing adapter against representative fixture workbooks. Without this test, changes to the parser or to the assumed workbook layout could silently corrupt or drop category schedule and participant data extracted from a league's Call-Up List export.

## Target Integration

The service under test is the call-up list import service (`CallUpListService`) and its `.xlsx` parsing adapter (`parseCallUpList`, built on ExcelJS). The integration type exercised is in-process binary workbook parsing — no external network dependency — driven by fixture `.xlsx` files representing real and edge-case Call-Up List layouts.

## Preconditions

- The Switchback backend service is running and reachable, or the parser module is exercised directly in-process.
- A set of fixture `.xlsx` files is available covering: a multi-category workbook, a workbook with PM-only and mixed AM/PM staging and start times, a workbook with blank rows between category blocks, a workbook whose literal STAGING/CALLUP/PLATE/... table-header row could be mistaken for a category header, and a malformed/empty workbook.

## Inputs

- `multi-category.xlsx`: at least 3 category blocks, each with staging/start time lines and multiple data rows.
- `pm-times.xlsx`: category blocks using PM (and 12:00 AM/PM edge) staging/start times.
- `blank-rows.xlsx`: category blocks separated by one or more fully blank rows.
- `header-row.xlsx`: a workbook containing the literal table-header row (STAGING/CALLUP/PLATE/...) immediately before or between category blocks.
- `empty.xlsx`: a workbook with a worksheet but no category blocks or data rows.
- `no-worksheets.xlsx`: a workbook with zero worksheets (or an invalid/corrupt binary payload).

## Test Procedure

1. Parse `multi-category.xlsx`.
   - IT-008-SC-01: The parser returns all category blocks present in the workbook, each with a non-empty `categoryName`.
   - IT-008-SC-02: Each category block's participant list matches the expected count and field values from the fixture's known baseline.
2. Parse `pm-times.xlsx`.
   - IT-008-SC-03: PM staging/start times are converted to the correct 24-hour `HH:MM` value (e.g., `1:15 PM` → `13:15`).
   - IT-008-SC-04: `12:00 PM` converts to `12:00` and `12:00 AM` converts to `00:00`.
3. Parse `blank-rows.xlsx`.
   - IT-008-SC-05: Blank rows between category blocks are skipped without terminating the current block or creating spurious empty categories.
   - IT-008-SC-06: Participants after a blank-row gap are still attributed to the correct category block.
4. Parse `header-row.xlsx`.
   - IT-008-SC-07: The literal STAGING/CALLUP/PLATE/... table-header row does not create a new category block.
   - IT-008-SC-08: The literal table-header row does not produce a participant record.
5. Parse `empty.xlsx`.
   - IT-008-SC-09: The parser rejects the workbook with a clear error indicating no categories were found.
6. Parse `no-worksheets.xlsx`.
   - IT-008-SC-10: The parser rejects the workbook with a clear error indicating it has no worksheets.

## Expected Results

Representative fixture workbooks are parsed into accurate category schedules and participant lists, matching known baselines field-by-field. PM and boundary (noon/midnight) times convert correctly to 24-hour format. Blank rows and the literal table-header row do not corrupt category grouping. Malformed or empty workbooks produce clear, distinguishable errors rather than silent data loss. The test passes only when every per-step success criterion holds.

## Metadata

- Priority: High
- Target Integration: In-process `.xlsx` parsing adapter (ExcelJS) — no external network dependency
- Automation: Automated

## Dependencies

**Upstream**: [FR-012](../functional/FR-012-validate-callup-list-upload.md) upload validation, [FR-013](../functional/FR-013-parse-category-schedule.md) category schedule parsing, [FR-014](../functional/FR-014-extract-callup-participants.md) participant extraction, which this test verifies. **Downstream**: None.

## Notes

Unlike the retired IT-001/IT-006 (which depended on the availability and unchanged structure of the external RaceResult platform), this test has no external dependency and no volatility boundary outside the codebase's own fixture files — the fixture workbooks are the contract. Fixture files should be stored in the test fixtures directory and versioned in git; new edge cases discovered in real league exports should be added as new fixtures over time.

## Traceability

This integration test verifies FR-012 (upload validation), FR-013 (category schedule parsing), and FR-014 (participant extraction), exercising the `.xlsx` parsing boundary end-to-end against representative and edge-case fixtures.
