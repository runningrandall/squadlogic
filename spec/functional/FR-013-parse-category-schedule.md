---
id: FR-013
title: "Extract per-category staging and start schedule from call-up list"
type: FR
relationships:
  - target: "ix://switchback/squadlogic/US-001"
    type: "implements"
  - target: "ix://switchback/squadlogic/FR-012"
    type: "depends_on"
---

# [FR-013] Extract per-category staging and start schedule from call-up list

## Description

When an uploaded call-up list workbook has been accepted ([FR-012](./FR-012-validate-callup-list-upload.md)), the system SHALL scan each category block within the workbook and extract that category's staging time and start time from lines formatted as `STAGING TIME: MM/DD/YYYY @ H:MM AM/PM` and `START TIME: MM/DD/YYYY @ H:MM AM/PM`, converting each to a 24-hour `HH:MM` value. The system SHALL capture the event date from the first such time line encountered in the workbook.

## Inputs

- Decoded workbook buffer (output of [FR-012](./FR-012-validate-callup-list-upload.md))

## Outputs

- On success: for each category block, a `categoryName`, `stageTime` (string, `HH:MM` 24-hour), and `startTime` (string, `HH:MM` 24-hour); and a single `eventDate` (string, ISO 8601 date) for the workbook
- When a category block has no matching staging or start time line, the corresponding field SHALL be an empty string

## Behavior

- The system SHALL recognize a time line matching the pattern `(STAGING TIME|START TIME):\s*MM/DD/YYYY\s*@\s*H:MM\s*(AM|PM)` in the first column of a row.
- The system SHALL convert the parsed hour, minute, and AM/PM meridiem to a 24-hour `HH:MM` value (e.g., `7:45 AM` → `07:45`, `1:15 PM` → `13:15`).
- The system SHALL associate each recognized `STAGING TIME` line with the `stageTime` of the category block currently being parsed, and each `START TIME` line with that block's `startTime`.
- The system SHALL capture the `MM/DD/YYYY` date component of the first time line encountered in the workbook as the workbook's `eventDate`, normalized to ISO 8601 (`YYYY-MM-DD`).
- The system SHALL treat a non-blank first-column cell that is not a recognized time line and not the literal table-header row (see [FR-014](./FR-014-extract-callup-participants.md)) as the start of a new category block, using that cell's text as the category name.
- Time lines encountered before any category block has started SHALL be ignored.

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-013-AC-1 | Given a category block with `STAGING TIME: 09/20/2025 @ 7:45 AM`, the category's `stageTime` is `07:45` | Test |
| FR-013-AC-2 | Given a category block with `START TIME: 09/20/2025 @ 1:15 PM`, the category's `startTime` is `13:15` | Test |
| FR-013-AC-3 | Given the first time line in the workbook is dated `09/20/2025`, the workbook's `eventDate` is `2025-09-20` | Test |
| FR-013-AC-4 | Given a category block with no `STAGING TIME` line, the category's `stageTime` is an empty string | Test |
| FR-013-AC-5 | Given a category block with no `START TIME` line, the category's `startTime` is an empty string | Test |
| FR-013-AC-6 | A `12:00 PM` start time is converted to `12:00`, and a `12:00 AM` staging time is converted to `00:00` | Test |
| FR-013-AC-7 | Given a workbook with 4 category blocks, each block's schedule is parsed independently without bleeding into adjacent blocks | Test |

## Dependencies

- **Upstream**: [FR-012](./FR-012-validate-callup-list-upload.md) upload validation
- **Downstream**: [FR-005](./FR-005-generate-wave-schedule.md) wave schedule generation (consumes the per-category schedule as `categorySchedule`)
