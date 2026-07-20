---
id: FR-010
title: "Export schedule to Google Sheets"
type: FR
relationships:
  - target: "ix://switchback/squadlogic/US-004"
    type: "implements"
  - target: "ix://switchback/squadlogic/FR-007"
    type: "depends_on"
---

# [FR-010] Export schedule to Google Sheets

## Description

The system SHALL create a new Google Sheet in the user's Google Drive containing the enriched wave schedule data. The system SHALL authenticate with Google via OAuth 2.0 and request the minimum required Drive/Sheets scopes. The spreadsheet SHALL be formatted with wave and category groupings, athlete logistics times, and basic styling.

## Inputs

- Enriched wave schedule with logistics timelines (output of [FR-007](./FR-007-athlete-logistics-timeline.md))
- User's Google OAuth 2.0 authorization
- Event metadata: event name, event date

## Outputs

- A new Google Sheet created in the user's Google Drive containing:
  - Sheet title: `{teamName} - {eventName} - {eventDate}`
  - Header row with event metadata
  - Data organized by wave and category with columns: Wave, Category, Athlete Name, Bib #, Arrival, Warmup Start, Warmup End, Staging, Race Start, Laps
  - Basic formatting: bold headers, wave group borders, frozen header row

## Behavior

- When the user clicks "Export to Google Sheets", the system SHALL initiate Google OAuth 2.0 authorization if the user has not previously authorized.
- The system SHALL request only the `https://www.googleapis.com/auth/spreadsheets` and `https://www.googleapis.com/auth/drive.file` scopes.
- The system SHALL create a new spreadsheet (not overwrite existing).
- The system SHALL populate the spreadsheet with all wave/category/athlete data from the enriched schedule.
- The system SHALL apply basic formatting: bold header row, merged cells for wave group labels, borders between wave sections, frozen header row.
- The system SHALL return the URL of the created spreadsheet to the user.
- When Google OAuth authorization fails or is denied, the system SHALL display an error message suggesting the user retry or use PDF export instead.

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-010-AC-1 | Given a generated schedule, clicking "Export to Google Sheets" creates a new spreadsheet in the user's Google Drive | Test |
| FR-010-AC-2 | The spreadsheet title follows the pattern `{teamName} - {eventName} - {eventDate}` | Test |
| FR-010-AC-3 | The spreadsheet contains all athletes with correct logistics times matching the in-app schedule | Test |
| FR-010-AC-4 | The spreadsheet has bold headers, wave group borders, and a frozen header row | Inspection |
| FR-010-AC-5 | The system returns a clickable URL to the created spreadsheet | Test |
| FR-010-AC-6 | Given the user denies Google OAuth, the system displays an error with a suggestion to use PDF export | Test |
| FR-010-AC-7 | Each export creates a new spreadsheet — existing sheets are not overwritten | Test |

## Dependencies

- **Upstream**: [FR-007](./FR-007-athlete-logistics-timeline.md) enriched schedule
- **Downstream**: None
