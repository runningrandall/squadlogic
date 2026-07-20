---
id: IT-004
title: "Team listing from event data"
type: IT
relationships:
  - target: "ix://switchback/squadlogic/FR-004"
    type: "verifies"
---

# [IT-004] Team listing from event data

## Objective

Verify that the team listing endpoint correctly derives a sorted dropdown list from the FR-002 teams array, annotates entries with participant counts from FR-003 data, excludes teams with zero participants, and constrains selection to dropdown values only. Without this test, the team selection flow could present incorrect teams or counts.

## Target Integration

The service under test is the team listing endpoint. The integration exercised is the data flow from stored event metadata (teams array) and participant records through to the team list response. DynamoDB is a real dependency for reading the stored event data.

## Preconditions

- The Switchback backend service is running and reachable.
- A previously imported event is stored in DynamoDB with:
  - Teams array: ["Zephyr Racing", "Alpine Riders", "Brighton Blazers", "Ghost Team"]
  - Participant records: 5 from "Brighton Blazers", 3 from "Alpine Riders", 2 from "Zephyr Racing", 0 from "Ghost Team"
- An authenticated user session is established.

## Inputs

- The event ID of the previously imported event.

## Test Procedure

1. Request the team list for the imported event.
   - IT-004-SC-01: The endpoint returns HTTP 200 with a `teams` array.
2. Validate the team list is sorted alphabetically.
   - IT-004-SC-02: The teams appear in order: "Alpine Riders", "Brighton Blazers", "Zephyr Racing".
3. Validate participant counts are displayed.
   - IT-004-SC-03: Entries show "Alpine Riders (3)", "Brighton Blazers (5)", "Zephyr Racing (2)".
4. Validate zero-participant team is excluded.
   - IT-004-SC-04: "Ghost Team" does not appear in the list despite being in the teams array.
5. Submit a valid team selection of "Brighton Blazers".
   - IT-004-SC-05: The selection is accepted.
6. Validate the response confirms the selection.
   - IT-004-SC-06: The response includes `selectedTeam: "Brighton Blazers"`.

## Expected Results

The team list endpoint returns a sorted, count-annotated list of teams excluding those with zero participants. A valid selection from the list is accepted. The test passes only when every per-step success criterion holds.

## Metadata

- Priority: Medium
- Target Integration: Internal (team listing endpoint + DynamoDB event data)
- Automation: Automated

## Dependencies

**Upstream**: [FR-004](../functional/FR-004-list-teams.md) team listing. **Downstream**: None.

## Traceability

This integration test verifies FR-004 (team listing), covering FR-004-AC-1 through FR-004-AC-4.
