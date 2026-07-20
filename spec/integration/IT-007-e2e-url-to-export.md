---
id: IT-007
title: "End-to-end flow from URL submission to schedule export"
type: IT
relationships:
  - target: "ix://switchback/squadlogic/FR-001"
    type: "verifies"
  - target: "ix://switchback/squadlogic/FR-002"
    type: "verifies"
  - target: "ix://switchback/squadlogic/FR-003"
    type: "verifies"
  - target: "ix://switchback/squadlogic/FR-004"
    type: "verifies"
  - target: "ix://switchback/squadlogic/FR-005"
    type: "verifies"
  - target: "ix://switchback/squadlogic/FR-006"
    type: "verifies"
  - target: "ix://switchback/squadlogic/FR-007"
    type: "verifies"
  - target: "ix://switchback/squadlogic/FR-009"
    type: "verifies"
---

# [IT-007] End-to-end flow from URL submission to schedule export

## Objective

Verify the complete user journey from RaceResult URL submission through schedule generation to PDF export, exercising every functional requirement in the pipeline as a single integrated flow. This test catches cross-boundary defects that individual integration tests (IT-001 through IT-005) cannot detect — issues in the handoff between parse, team selection, schedule generation, logistics enrichment, and export.

## Target Integration

The full Switchback backend pipeline: Fastify route handlers → RaceResult external fetch → DynamoDB persistence → wave schedule configuration → logistics calculation → PDF generation. All services are real (no mocks). The external RaceResult dependency is live.

## Preconditions

- The Switchback backend service is running and reachable.
- DynamoDB is running with the wave schedule configuration seeded (FR-008 defaults).
- Network connectivity to `my.raceresult.com` and `my-us-1.raceresult.com` is available.
- A known RaceResult event URL (`https://my.raceresult.com/411620/`) is accessible with at least one team having athletes across multiple waves.
- Team branding is pre-configured: teamDisplayName="Test Team", primaryColor="#1E3A5F", tertiaryColor="#FFFFFF", logo uploaded.
- An authenticated user session is established.

## Inputs

- RaceResult event URL: `https://my.raceresult.com/411620/`
- Target team: selected from the teams dropdown after import (a team known to have athletes in at least 2 waves)
- Logistics parameters: defaults (no overrides — category-aware arrival defaults apply)
- Export format: PDF

## Test Procedure

### Phase 1: URL Submission and Event Import (FR-001, FR-002, FR-003)

1. Submit the RaceResult URL to the import endpoint.
   - IT-007-SC-01: The URL is accepted and validated (FR-001).
   - IT-007-SC-02: The response contains `eventName`, `eventDate`, `eventLocation`, and a non-empty `teams` array (FR-002).
   - IT-007-SC-03: The response contains a `participants` array with at least 10 records (FR-003).
   - IT-007-SC-04: The import data is persisted in DynamoDB and a subsequent GET returns the same data.

### Phase 2: Team Selection (FR-004)

2. Request the team list for the imported event.
   - IT-007-SC-05: The teams dropdown list is returned, sorted alphabetically, with participant counts.
3. Select a team known to have athletes in multiple waves.
   - IT-007-SC-06: The selection is accepted and the selected team is persisted.

### Phase 3: Wave Schedule Generation (FR-005, FR-008)

4. Request the wave schedule for the selected team.
   - IT-007-SC-07: The response contains a wave schedule with `teamName` matching the selected team.
   - IT-007-SC-08: The schedule contains at least 2 wave groups (team has athletes in multiple waves).
   - IT-007-SC-09: Each wave group contains a `startTime` and `stageTime` per category from the wave configuration.
   - IT-007-SC-10: Athletes are grouped by wave then category, sorted correctly.

### Phase 4: Logistics Timeline Enrichment (FR-006, FR-007)

5. Verify the schedule includes logistics timelines with category-aware defaults.
   - IT-007-SC-11: Each athlete entry includes a `logistics` object with `arrivalTime`, `warmupStart`, `warmupEnd`, `stagingTime`, and `raceStart`.
   - IT-007-SC-12: For a wave containing a Varsity or JV A category, the arrivalTime reflects a 70-minute buffer from the category's start time.
   - IT-007-SC-13: For a wave without Varsity or JV A categories, the arrivalTime reflects a 60-minute buffer.
   - IT-007-SC-14: The `stagingTime` matches the `stageTime` from the wave configuration for that category.

### Phase 5: PDF Export (FR-009, FR-011)

6. Request PDF export of the enriched schedule.
   - IT-007-SC-15: The response is a valid PDF file (content-type `application/pdf`, non-zero byte length).
   - IT-007-SC-16: The PDF file name follows the `{teamName}_{eventDate}_schedule.pdf` pattern.
7. Validate PDF content.
   - IT-007-SC-17: The PDF contains the team name from branding configuration.
   - IT-007-SC-18: The PDF contains at least one athlete name that matches a participant from the imported data.

### Phase 6: Data Consistency Validation

8. Verify data consistency across the pipeline.
   - IT-007-SC-19: The number of athletes in the wave schedule equals the number of participants matching the selected team in the imported data.
   - IT-007-SC-20: Every athlete in the PDF output can be traced back to a participant record in the original import.

## Expected Results

The complete flow from URL submission to PDF download executes without errors. Event data is imported, teams are listed, a team is selected, the wave schedule is generated with per-category start times and staggered logistics timelines using category-aware arrival defaults, and a branded PDF is exported containing all scheduled athletes with correct logistics times. Data is consistent across every stage of the pipeline. The test passes only when all 20 success criteria hold.

## Metadata

- Priority: Critical (P0)
- Target Integration: Full pipeline (RaceResult → Fastify → DynamoDB → PDF generator)
- Automation: Automated
- Run frequency: Every deploy + nightly

## Dependencies

**Upstream**: All functional requirements FR-001 through FR-009 and FR-011. Wave schedule configuration (FR-008) must be seeded. Team branding (FR-011) must be pre-configured. **Downstream**: None — this is the terminal verification test.

## Notes

This test has a hard dependency on the external RaceResult platform. If RaceResult is unreachable, this test should be skipped (not failed) and IT-006 structural validation should be checked for the cause. The test uses a real team from the event — the specific team name should be parameterized in the test fixture so it can be updated if the event's team roster changes.

This test is intentionally broad rather than deep — it validates the happy path across all boundaries. Edge cases and error paths are covered by IT-001 through IT-005 and the unit test suite.

## Traceability

This integration test exercises the full requirement chain: FR-001 (URL validation) → FR-002 (metadata parse) → FR-003 (participant extraction) → FR-004 (team listing) → FR-005 (wave schedule generation) → FR-008 (wave config) → FR-006 (logistics defaults) → FR-007 (timeline calculation) → FR-011 (branding) → FR-009 (PDF export). It closes GAP-001 from the test matrix.
