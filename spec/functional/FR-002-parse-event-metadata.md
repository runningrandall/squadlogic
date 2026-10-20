---
id: FR-002
title: "Parse race event metadata from RaceResult"
type: FR
relationships:
  - target: "ix://switchback/squadlogic/US-001"
    type: "implements"
  - target: "ix://switchback/squadlogic/FR-001"
    type: "depends_on"
---

# [FR-002] Parse race event metadata from RaceResult

**Status: RETIRED** — RaceResult page fetch/parse was replaced by parsing the uploaded Call-Up List .xlsx directly; see [FR-013](./FR-013-parse-category-schedule.md) (schedule/date extraction) and [FR-012](./FR-012-validate-callup-list-upload.md) (event name/location overrides) for the current requirements.

## Description

When a validated RaceResult URL is submitted, the system SHALL fetch the page content and extract the race event metadata including the event name, event date, teams found in the #divRRPublish > div:nth-child(2) > div.SelectorParent.OnlyOneList > div.Selector select list, and event location. When the system cannot fetch the page or cannot extract the required metadata fields, it SHALL return an error identifying which operation failed.

## Inputs

- Validated RaceResult URL (output of [FR-001](./FR-001-validate-raceresult-url.md))
- Numeric event ID extracted from the URL

## Outputs

- On success: an event metadata object containing:
  - `eventName` (string): The name of the race event
  - `eventDate` (string, ISO 8601 date): The date of the event
  - `eventLocation` (string): The venue location (city, state)
  - `eventId` (string): The numeric RaceResult event identifier
  - `sourceUrl` (string): The original validated URL
  - `teams` (array of strings): The participating teams
- On failure: an error indicating fetch failure (unreachable, timeout, non-200 response) or parse failure (missing required metadata fields)

## Behavior

- The system SHALL fetch the RaceResult page content for the validated URL.
- The system SHALL extract the event name from the page content.
- The system SHALL extract the event date from the page content and normalize it to ISO 8601 format.
- The system SHALL extract the event location from the page content.
- The system SHALL extract the teams from the select list found in the div.ListControl element (or the control element at the top of the page)
- When the page returns a non-200 HTTP status, the system SHALL return a fetch error with the HTTP status code.
- When the fetch times out, the system SHALL return a timeout error.
- When required metadata fields cannot be extracted from the page content, the system SHALL return a parse error identifying the missing fields.

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-002-AC-1 | Given a reachable RaceResult event page, the system extracts eventName, eventDate, and eventLocation | Test |
| FR-002-AC-2 | Given an event date of "08/02/2026" on the page, the system normalizes it to "2026-08-02" | Test |
| FR-002-AC-3 | Given a RaceResult URL that returns HTTP 404, the system returns a fetch error with status 404 | Test |
| FR-002-AC-4 | Given a RaceResult URL that does not respond within the timeout window, the system returns a timeout error | Test |
| FR-002-AC-5 | Given a page that is missing the event name, the system returns a parse error identifying "eventName" as missing | Test |
| FR-002-AC-6 | Given a RaceResult URL that has no teams dropdown list assume there is no teams for the event and supply an empty array | Test |
| FR-002-AC-7 | Given a RaceResult URL with a list of teams in the ListControl select list the teams array should be of equal size | Test |

## Dependencies

- **Upstream**: [FR-001](./FR-001-validate-raceresult-url.md) URL validation
- **Downstream**: [FR-003](./FR-003-extract-participants.md) participant extraction (requires successful metadata parse to proceed)
