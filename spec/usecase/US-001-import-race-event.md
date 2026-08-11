---
id: US-001
title: "Import race event data from a call-up list upload"
type: US
relationships:
  - target: "ix://switchback/squadlogic/StR-001"
    type: "traces_to"
---

# [US-001] Import race event data from a call-up list upload

## Story

**As a** team manager preparing for a race event
**I want** to upload the league's official Call-Up List file and have the system extract the event's participant roster, categories, and staging/start schedule
**So that** I have a structured dataset of all registered participants without manually copying data from a spreadsheet.

This story captures the team manager's need to turn the league-published call-up list into a structured dataset the team management workflow can use. The mechanism for parsing or the specific data fields extracted are left to the functional requirements.

## Context

Race events organized through the Utah High School Cycling League and similar organizations publish a "Call-Up List" — an `.xlsx` export — ahead of race day. It is organized into per-category blocks, each carrying that category's staging time and start time, followed by a data row per athlete with their staging/call-up order number, bib, name, and team. This file is the league's authoritative source for staging and start schedule data — that data is not exposed anywhere else, including on the RaceResult event page originally explored for this feature (confirmed against two real events: RaceResult never surfaces wave/staging schedule data to non-organizers). Today, team managers must manually read this spreadsheet and transcribe the relevant rows for their team — a process repeated for every race throughout the season.

## Acceptance Examples (Illustrative)

These examples clarify the team manager's expectations. They are illustrative only — not test cases and not verification criteria.

### [US-001-EX-1] Valid call-up list upload is accepted and data is extracted

- **Given** a well-formed Call-Up List `.xlsx` export from the league
- **When** the team manager uploads the file
- **Then** the system extracts the event data and displays the event name, date, and a summary of extracted participants

### [US-001-EX-2] Invalid or unparseable file is reported

- **Given** a file that is missing, empty, or not a parseable call-up list workbook
- **When** the team manager attempts to upload it
- **Then** the system informs the team manager that the file could not be processed and suggests checking the file format

### [US-001-EX-3] Workbook with no categories is surfaced

- **Given** an uploaded workbook with no recognizable category blocks or participant rows
- **When** the team manager uploads the file
- **Then** the system informs the team manager that no categories were found in the call-up list

## Options (Exploratory)

Approaches discussed during discovery: scraping the RaceResult event page and its dynamic JavaScript API; a generic CSV upload; and uploading the league's own Call-Up List `.xlsx` export directly. The RaceResult and generic-CSV approaches were ruled out — RaceResult never exposes wave/staging schedule data to non-organizers, and a generic CSV lacks the per-category staging/start time structure the league's own export carries. Direct `.xlsx` upload of the league's Call-Up List is the approach carried forward into the functional requirements.

## Constraints (Contextual)

Team managers noted that race day mornings often have limited cellular connectivity at mountain venues. The import should work from a single file upload without requiring multiple round-trips to an external service. This context may be refined during requirements analysis.

## Dependencies (Contextual)

**Upstream**: The league's Call-Up List `.xlsx` export, produced and distributed ahead of each race event. **Downstream**: Functional requirements for upload validation (FR-012), category schedule parsing (FR-013), and participant extraction (FR-014).

## Priority and Risk (Informative)

Business value is high as this is the entry point for the entire feature — without successful data import, no schedule can be generated. The primary risk is drift in the league's spreadsheet layout from season to season, which could break parsing logic without warning.

## Notes (Informative)

The Call-Up List workbook mixes category-header rows (carrying staging/start time text), a repeating literal table-header row, and per-athlete data rows within a single flat worksheet layout. This is a technical constraint that will influence the parsing approach but should not be specified at the user story level.

## Traceability (Informative)

This user story traces to StR-001 (team managers need automated race day schedules). It is expected to drive functional requirements for upload validation, category schedule parsing, and participant extraction.
