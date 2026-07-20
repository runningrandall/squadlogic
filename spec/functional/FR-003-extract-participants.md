---
id: FR-003
title: "Extract participant list from RaceResult event data"
type: FR
relationships:
  - target: "ix://switchback/squadlogic/US-001"
    type: "implements"
  - target: "ix://switchback/squadlogic/FR-002"
    type: "depends_on"
---

# [FR-003] Extract participant list from RaceResult event data

## Description

When event metadata has been successfully parsed, the system SHALL fetch participant data from the RaceResult dynamic API endpoint (e.g., `https://my-us-1.raceresult.com/{eventId}/participants/list?key={key}&listname={listname}&page=participants&contest=0&r=all&l=0`) and extract the complete participant list, producing a structured record for each participant. The system SHALL wait for the API response to complete before parsing. When the system cannot fetch or parse participant data, it SHALL return an error indicating the failure.

## Inputs

- Parsed event metadata (output of [FR-002](./FR-002-parse-event-metadata.md)) including the event ID
- The dynamic API key and list name parameters discovered during the initial page fetch in FR-002

## Outputs

- On success: an array of participant records, each containing:
  - `firstName` (string): Participant's first name
  - `lastName` (string): Participant's last name
  - `team` (string): Team or club affiliation as listed on RaceResult
  - `category` (string): Race category (e.g., "JV A Boys", "Varsity Girls", "Freshman Boys")
  - `bibNumber` (string): Assigned bib/plate number
- On failure: an error indicating the API endpoint was unreachable, the response was malformed, or no participants were found

## Behavior

- The system SHALL construct the participant API URL using the event ID, API key, and list name parameters obtained during the FR-002 page fetch.
- The system SHALL issue a GET request to the constructed API endpoint and wait for the response to complete before proceeding.
- The system SHALL extract all participants registered for the event from the API response.
- The system SHALL preserve the exact team name as returned by the API without normalization.
- The system SHALL preserve the exact category name as returned by the API.
- When a participant record is missing an optional field (e.g., bib number not yet assigned), the system SHALL include the participant with the missing field set to an empty string.
- When no participants are found in the API response, the system SHALL return an error with the message "No participants found for this event."
- The system SHALL deduplicate participants that appear multiple times in the response, matching on the combination of firstName, lastName, and team. When duplicates are found, the system SHALL retain the record with the most complete data (fewest empty fields).

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-003-AC-1 | Given an event with 200 registered participants, the system extracts all 200 participant records from the API response | Test |
| FR-003-AC-2 | Each extracted participant record contains firstName, lastName, team, category, and bibNumber fields | Test |
| FR-003-AC-3 | Given a participant with team "Corner Canyon Chargers", the team field contains exactly "Corner Canyon Chargers" | Test |
| FR-003-AC-4 | Given a participant without an assigned bib number, the bibNumber field is an empty string | Test |
| FR-003-AC-5 | Given an API response with no registered participants, the system returns a "No participants found" error | Test |
| FR-003-AC-6 | Given two records with the same firstName, lastName, and team, only the record with the most complete data is retained | Test |
| FR-003-AC-7 | The system waits for the full API response before parsing — partial responses are not processed | Test |

## Dependencies

- **Upstream**: [FR-002](./FR-002-parse-event-metadata.md) event metadata parsing (provides API key and list name parameters)
- **Downstream**: [FR-004](./FR-004-list-teams.md) team listing (requires participant data to derive category-to-team mappings)
