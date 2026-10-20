---
id: FR-014
title: "Extract participant list with staging number from call-up list"
type: FR
relationships:
  - target: "ix://switchback/squadlogic/US-001"
    type: "implements"
  - target: "ix://switchback/squadlogic/FR-013"
    type: "depends_on"
---

# [FR-014] Extract participant list with staging number from call-up list

## Description

When an uploaded call-up list workbook has been accepted ([FR-012](./FR-012-validate-callup-list-upload.md)), the system SHALL extract a participant record for each data row within a category block, producing the athlete's name, team, category, bib number, and staging/call-up order number. The system SHALL distinguish data rows from category header rows and the literal table-header row, and SHALL skip rows that do not carry a team.

## Inputs

- Decoded workbook buffer (output of [FR-012](./FR-012-validate-callup-list-upload.md))
- Category blocks identified during schedule parsing ([FR-013](./FR-013-parse-category-schedule.md))

## Outputs

- On success: an array of participant records, each containing:
  - `firstName` (string): Participant's first name, title-cased
  - `lastName` (string): Participant's last name, title-cased
  - `team` (string): Team affiliation as listed in the call-up list
  - `category` (string): Race category, from the row's category column or the enclosing category block's name
  - `bibNumber` (string): Assigned bib/plate number
  - `callUpNumber` (string): Staging/call-up order number for the athlete within their category

## Behavior

- The system SHALL identify a data row as a row whose CALLUP column contains a positive integer.
- The system SHALL treat a row whose first column is non-blank and whose CALLUP column is not a positive integer as a category header row (starting a new category block), not a data row — except as noted below for the literal table-header row.
- The system SHALL recognize the literal table-header row (first column value `STAGING`, heading the STAGING/CALLUP/PLATE/... columns) and SHALL NOT treat it as a category header or a data row.
- The system SHALL split the row's single NAME column on whitespace, treating the last token as the last name and the remaining tokens joined as the first name, and title-case both.
- The system SHALL extract the bib number from the PLATE column.
- The system SHALL extract the team from the TEAM column.
- The system SHALL extract the category from the row's category column when present, otherwise fall back to the name of the enclosing category block.
- The system SHALL extract the call-up/staging number from the CALLUP column and include it verbatim as `callUpNumber`.
- The system SHALL skip a data row when it is missing `firstName`, `lastName`, or `team` after extraction.
- The system SHALL ignore data rows encountered before any category block has started.

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-014-AC-1 | Given a data row with NAME "SMITH JANE", the extracted record has `firstName` "Jane" and `lastName` "Smith" | Test |
| FR-014-AC-2 | Given a data row with a CALLUP value of `12`, the extracted record's `callUpNumber` is `"12"` | Test |
| FR-014-AC-3 | Given a data row with a PLATE value, the extracted record's `bibNumber` matches that value | Test |
| FR-014-AC-4 | Given a data row missing a TEAM value, the row is skipped and no participant record is produced for it | Test |
| FR-014-AC-5 | Given a data row with no category column value, the extracted record's `category` falls back to the enclosing category block's name | Test |
| FR-014-AC-6 | Given the literal table-header row (STAGING/CALLUP/PLATE/...), it produces neither a new category block nor a participant record | Test |
| FR-014-AC-7 | Given a workbook with 40 valid data rows across 4 categories, the system extracts exactly 40 participant records | Test |

## Dependencies

- **Upstream**: [FR-013](./FR-013-parse-category-schedule.md) category schedule parsing (establishes the category blocks each data row belongs to)
- **Downstream**: [FR-004](./FR-004-list-teams.md) team listing, [FR-005](./FR-005-generate-wave-schedule.md) wave schedule generation (both consume the extracted participant list)
