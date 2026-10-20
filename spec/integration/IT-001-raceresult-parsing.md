---
id: IT-001
title: "RaceResult page parsing end-to-end"
type: IT
relationships:
  - target: "ix://switchback/squadlogic/FR-002"
    type: "verifies"
  - target: "ix://switchback/squadlogic/FR-003"
    type: "verifies"
---

# [IT-001] RaceResult page parsing end-to-end

**Status: RETIRED** — there is no longer an external RaceResult fetch/parse boundary to verify; see [IT-008](./IT-008-callup-list-parsing.md) for the Call-Up List upload parsing test spec that replaces it.

## Objective

Verify the integration boundary between the Switchback backend and the external RaceResult platform for the success path: a valid, publicly accessible RaceResult event URL is submitted, the system fetches and parses the page, and returns structured event metadata and a complete participant list. Without this test, parsing logic regressions against real RaceResult page structures would go undetected until production use.

## Target Integration

The service under test is the race event import service. The external dependency is the RaceResult platform at `my.raceresult.com`, reached over HTTPS. The integration type exercised is an outbound HTTP fetch from the Switchback backend to RaceResult, followed by HTML/JavaScript content parsing to extract structured data.

## Preconditions

- The Switchback backend service is running and reachable.
- The test RaceResult event URL points to a publicly accessible event with at least 10 registered participants across at least 2 teams and 2 categories.
- Network connectivity to `my.raceresult.com` is available from the test environment.
- An authenticated user session with a valid `organizationId` is established.

## Inputs

A valid RaceResult event URL (e.g., `https://my.raceresult.com/411620/`) for a known event with published participant data. The expected event metadata (name, date, location) and a baseline subset of participants (at least 10 records with known field values) are pre-determined for comparison.

## Test Procedure

1. Submit the RaceResult event URL to the import endpoint via HTTP POST.
   - IT-001-SC-01: The endpoint returns HTTP 200 with a response body containing `eventName`, `eventDate`, `eventLocation`, and a `participants` array.
2. Validate the event metadata fields against the known baseline.
   - IT-001-SC-02: The `eventName` matches the expected event name.
   - IT-001-SC-03: The `eventDate` is a valid ISO 8601 date matching the expected date.
   - IT-001-SC-04: The `eventLocation` contains the expected city and state.
3. Validate the participant list structure and count.
   - IT-001-SC-05: The `participants` array contains at least the expected minimum number of records.
   - IT-001-SC-06: Each participant record contains `firstName`, `lastName`, `team`, `category`, `wave`, and `bibNumber` fields.
4. Validate a known subset of participant records against the baseline.
   - IT-001-SC-07: At least 10 participant records match their baseline values field-by-field (name, team, category).
5. Validate team diversity in the extracted data.
   - IT-001-SC-08: The unique team names extracted from participants include at least 2 distinct teams.

## Expected Results

The import endpoint returns structured event metadata and a participant list that matches the known RaceResult event data. All participant records contain the required fields. A spot-checked subset of records matches the baseline field-by-field. The test passes only when every per-step success criterion holds.

## Metadata

- Priority: High
- Target Integration: RaceResult platform (my.raceresult.com) via HTTPS
- Automation: Automated (with network dependency on external service)

## Dependencies

**Upstream**: [FR-002](../functional/FR-002-parse-event-metadata.md) event metadata parsing and [FR-003](../functional/FR-003-extract-participants.md) participant extraction, which this test verifies. **Downstream**: None.

## Notes

This test depends on the external RaceResult platform being available and the test event page remaining accessible. If the RaceResult page structure changes, this test will fail — which is the intended behavior, as it serves as a canary for parsing logic breakage. Consider maintaining a cached snapshot of a known event page for use when RaceResult is unreachable, while periodically running against the live site.

## Traceability

This integration test verifies FR-002 (event metadata parsing) and FR-003 (participant extraction), exercising the external RaceResult integration boundary end-to-end.
