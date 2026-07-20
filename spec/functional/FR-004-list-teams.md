---
id: FR-004
title: "List available teams from parsed event data"
type: FR
relationships:
  - target: "ix://switchback/squadlogic/US-002"
    type: "implements"
  - target: "ix://switchback/squadlogic/FR-002"
    type: "depends_on"
---

# [FR-004] List available teams from parsed event data

## Description

When event metadata has been extracted, the system SHALL populate a dropdown selection control with the team names obtained from the [FR-002](./FR-002-parse-event-metadata.md) `teams` array (sourced from the RaceResult ListControl select element). The system SHALL sort the dropdown entries in ascending alphabetical order. The system SHALL require the user to select exactly one team from the dropdown before proceeding to wave schedule generation. The system SHALL not permit freeform text entry.

## Inputs

- `teams` array from event metadata (output of [FR-002](./FR-002-parse-event-metadata.md))
- Array of participant records (output of [FR-003](./FR-003-extract-participants.md)) for participant counts

## Outputs

- A dropdown control populated with team names from the `teams` array, each annotated with a participant count
- The user's selected team name string (constrained to values in the dropdown)

## Behavior

- The system SHALL populate the dropdown with team names from the FR-002 `teams` array, preserving the exact casing from the source.
- The system SHALL sort team names in ascending alphabetical order (case-insensitive sort).
- The system SHALL compute and display the count of participants per team from the FR-003 participant records alongside each team name in the dropdown.
- The system SHALL exclude team names with zero participants from the dropdown.
- The system SHALL require exactly one selection from the dropdown before enabling wave schedule generation.
- When the `teams` array is empty, the system SHALL display a message indicating no teams were found for this event.

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-004-AC-1 | Given teams array ["Zephyr", "Alpine", "Brighton"], the dropdown displays entries in order: Alpine, Brighton, Zephyr | Test |
| FR-004-AC-2 | Given 5 participants from "Brighton" and 3 from "Alpine", the dropdown displays "Brighton (5)" and "Alpine (3)" | Test |
| FR-004-AC-3 | Given a team in the teams array with zero matching participants, that team is excluded from the dropdown | Test |
| FR-004-AC-4 | Given an empty teams array, the system displays "No teams found for this event" | Test |
| FR-004-AC-5 | The team selection control is a dropdown; freeform text entry is not permitted | Demonstration |

## Dependencies

- **Upstream**: [FR-002](./FR-002-parse-event-metadata.md) event metadata (provides teams array), [FR-003](./FR-003-extract-participants.md) participant extraction (provides participant counts)
- **Downstream**: [FR-005](./FR-005-generate-wave-schedule.md) wave schedule generation (requires team selection)
