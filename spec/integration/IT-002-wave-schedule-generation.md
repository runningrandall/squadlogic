---
id: IT-002
title: "Wave schedule generation with logistics timing"
type: IT
relationships:
  - target: "ix://switchback/squadlogic/FR-005"
    type: "verifies"
  - target: "ix://switchback/squadlogic/FR-007"
    type: "verifies"
---

# [IT-002] Wave schedule generation with logistics timing

## Objective

Verify the integration between wave schedule generation and logistics timeline calculation: given parsed participant data, a selected team, wave schedule configuration, and logistics parameters (using category-aware defaults), the system produces a correctly grouped wave schedule with accurate per-athlete logistics times. Without this test, errors in the grouping, sorting, or time calculation logic would produce incorrect race day schedules.

## Target Integration

The service under test is the wave schedule generation service. The integration exercised is the internal data flow from parsed participant records through team filtering, wave/category grouping (via wave schedule configuration), and logistics timeline enrichment with category-aware arrival defaults. The DynamoDB wave schedule configuration is a real dependency.

## Preconditions

- The Switchback backend service is running and reachable.
- The DynamoDB wave schedule configuration ([FR-008](../functional/FR-008-wave-schedule-config.md)) is seeded with the league-default schedule.
- A set of parsed participant records is available (from a test fixture representing realistic RaceResult data).
- The test fixture contains at least 15 participants across 3 teams, 4 categories, and 2 waves with known start times.
- An authenticated user session is established.

## Inputs

- A test fixture of 15+ parsed participant records with known values:
  - Team "Alpine" with athletes in Wave 1 - HS (JV B Boys) and Wave 3 - HS (Varsity Boys)
  - Team "Brighton" with athletes in Wave 1 - HS (JV B Boys) and Wave 3 - HS (Varsity Boys start=10:10/stage=09:50, Varsity Girls start=10:15/stage=09:55)
  - Team "Canyon" with athletes in Wave 3 - HS (Varsity Girls)
- Wave schedule configuration from FR-008 defaults:
  - Wave 1 - HS start time: 08:00 (contains JV B Boys, JV C Boys — no Varsity/JV A, so arrival default = 60)
  - Wave 3 - HS start time: 10:10 (contains Varsity Boys — Varsity category, so arrival default = 70)
- Selected team: "Brighton"
- Logistics parameters: warmupDurationMinutes=30, stagingBeforeMinutes=20 (defaults), arrivalBeforeMinutes not overridden (use category-aware defaults)

## Test Procedure

1. Submit the team selection ("Brighton") with default logistics parameters to the schedule generation endpoint.
   - IT-002-SC-01: The endpoint returns HTTP 200 with a wave schedule containing `teamName: "Brighton"`.
2. Validate the wave grouping structure.
   - IT-002-SC-02: The schedule contains exactly 2 wave groups (Wave 1 - HS and Wave 3 - HS).
   - IT-002-SC-03: Wave 1 - HS appears before Wave 3 - HS (ordered by start time 08:00 < 10:10).
3. Validate category grouping within Wave 1 - HS.
   - IT-002-SC-04: Wave 1 - HS contains exactly 1 category group: "JV B Boys".
4. Validate category grouping within Wave 3 - HS.
   - IT-002-SC-05: Wave 3 - HS contains exactly 2 category groups: "Varsity Boys" and "Varsity Girls", in alphabetical order.
5. Validate athlete details within a category.
   - IT-002-SC-06: Each athlete entry contains `firstName`, `lastName`, `bibNumber`, and a `logistics` object.
6. Validate logistics timeline for Wave 1 - HS / JV B Boys (start=08:00, stage=07:40, arrival default 60 — no Varsity/JV A).
   - IT-002-SC-07: JV B Boys athletes have `arrivalTime: "07:00"`, `warmupStart: "07:00"`, `warmupEnd: "07:30"`, `stagingTime: "07:40"`, `raceStart: "08:00"`.
7. Validate logistics timeline for Wave 3 - HS / Varsity Boys (start=10:10, stage=09:50, arrival default 70 — Varsity category).
   - IT-002-SC-08: Varsity Boys athletes have `arrivalTime: "09:00"`, `warmupStart: "09:00"`, `warmupEnd: "09:30"`, `stagingTime: "09:50"`, `raceStart: "10:10"`.
8. Validate staggered start within Wave 3 — Varsity Girls have different times than Varsity Boys.
   - IT-002-SC-10: Varsity Girls athletes have `arrivalTime: "09:05"`, `warmupStart: "09:05"`, `warmupEnd: "09:35"`, `stagingTime: "09:55"`, `raceStart: "10:15"`.
8. Validate that only Brighton athletes appear.
   - IT-002-SC-09: The `totalAthletes` count matches the number of Brighton athletes in the fixture and no athlete from another team appears.

## Expected Results

The schedule endpoint returns a correctly structured wave schedule for "Brighton" with athletes grouped by wave (ordered by start time from configuration) and category (ordered alphabetically), each enriched with logistics times calculated using category-aware arrival defaults (60 for Wave 1, 70 for Wave 3) and global warmup=30, staging=20. Only Brighton athletes appear. The test passes only when every per-step success criterion holds.

## Metadata

- Priority: High
- Target Integration: Internal (wave schedule generation + logistics timeline + DynamoDB wave config)
- Automation: Automated

## Dependencies

**Upstream**: [FR-005](../functional/FR-005-generate-wave-schedule.md) wave schedule generation, [FR-007](../functional/FR-007-athlete-logistics-timeline.md) logistics timeline calculation, and [FR-008](../functional/FR-008-wave-schedule-config.md) wave schedule configuration. **Downstream**: None.

## Traceability

This integration test verifies FR-005 (wave schedule generation) and FR-007 (per-athlete logistics timeline calculation), exercising the complete schedule generation pipeline from parsed data through wave configuration to enriched output with category-aware logistics defaults.
