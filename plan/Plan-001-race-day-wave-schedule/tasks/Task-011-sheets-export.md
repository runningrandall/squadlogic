---
id: Task-011
title: "FR-010 — Google Sheets export"
type: Task
status: done
track: D
priority: P1
relationships:
  - target: ix://switchback/race-day-wave-schedule/Task-008
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/FR-010
    type: references
  - target: ix://switchback/race-day-wave-schedule/TC-070
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-071
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-072
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-073
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-074
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-075
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-076
    type: verifies
---
# Task-011: FR-010 — Google Sheets export

## Scope
Implement Google Sheets export via OAuth 2.0. Authenticate with Google, create a new spreadsheet in the user's Drive, populate with enriched schedule data, apply basic formatting, return the spreadsheet URL.

## Subtasks
- [ ] **Google OAuth integration.** Implement OAuth 2.0 flow with `spreadsheets` and `drive.file` scopes. Store refresh tokens securely.
- [ ] **Sheets API client.** Create adapter for Google Sheets API to create spreadsheet, write data, apply formatting.
- [ ] **Data population.** Map enriched schedule to spreadsheet rows: Wave, Category, Athlete Name, Bib, Arrival, Warmup Start, Warmup End, Staging, Race Start, Laps.
- [ ] **Formatting.** Bold headers, wave group merged cells and borders, frozen header row.
- [ ] **Error handling.** Handle OAuth denial with user-friendly error suggesting PDF export.
- [ ] **Endpoint.** `POST /race-events/:eventId/export/sheets` returning `{spreadsheetUrl}`.
- [ ] **Integration tests.** TC-070–TC-074, TC-076.
- [ ] **E2E test.** TC-075 (OAuth denial).

## Deliverables
- Google OAuth integration
- Sheets API adapter
- Export endpoint returning spreadsheet URL
- Test files

## Notes
- Depends only on Task-008 (enriched schedule). Does not need branding (Sheets uses plain formatting).
- Google API credentials need to be provisioned and stored in AWS Secrets Manager.
- This is the highest-complexity export task due to OAuth. Consider implementing after PDF export.
