---
id: FR-007
title: "Calculate per-athlete logistics timeline"
type: FR
relationships:
  - target: "ix://switchback/squadlogic/US-003"
    type: "implements"
  - target: "ix://switchback/squadlogic/FR-005"
    type: "depends_on"
  - target: "ix://switchback/squadlogic/FR-006"
    type: "depends_on"
---

# [FR-007] Calculate per-athlete logistics timeline

## Description

When a wave schedule and logistics parameters are both available, the system SHALL calculate a per-athlete logistics timeline by deriving absolute clock times for arrival, warmup start, warmup end, and staging from the athlete's per-category start time (from the wave configuration) and the configured logistics parameters. Each category within a wave has its own start time and stage time, so athletes in different categories within the same wave may have different logistics timelines. All calculated times SHALL be expressed as absolute clock times in HH:MM format (24-hour).

## Inputs

- Wave schedule (output of [FR-005](./FR-005-generate-wave-schedule.md)) with per-category start times and stage times
- Validated logistics configuration (output of [FR-006](./FR-006-logistics-parameters.md)) including per-wave `arrivalBeforeMinutes`, global `warmupDurationMinutes`

## Outputs

- An enriched wave schedule where each athlete entry includes a `logistics` object containing:
  - `arrivalTime` (string, HH:MM): Absolute time for venue arrival
  - `warmupStart` (string, HH:MM): Absolute time for warmup start (equals arrivalTime)
  - `warmupEnd` (string, HH:MM): Absolute time for warmup end
  - `stagingTime` (string, HH:MM): Absolute time for staging area report (from wave config)
  - `raceStart` (string, HH:MM): Absolute time for category start (from wave config)

## Behavior

- The system SHALL calculate `arrivalTime` as the category's start time minus the wave's `arrivalBeforeMinutes`.
- The system SHALL calculate `warmupStart` as `arrivalTime` (warmup begins upon arrival).
- The system SHALL calculate `warmupEnd` as `warmupStart` plus `warmupDurationMinutes`.
- The system SHALL use the `stagingTime` from the wave schedule configuration for the athlete's category.
- The system SHALL use the `raceStart` from the wave schedule configuration for the athlete's category.
- All calculated times SHALL be expressed as absolute clock times in HH:MM format (24-hour).
- All athletes within the same category SHALL have identical logistics times, since they share the same category start time and wave arrival parameter.
- Athletes in different categories within the same wave may have different staging and start times due to staggered category starts.
- When logistics parameters are updated, the system SHALL recalculate all athlete timelines without requiring re-import or re-generation of the wave schedule.

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-007-AC-1 | Given Varsity Boys in Wave 3 (start=10:10, stage=09:50), arrival=70 (default), warmup=30: arrivalTime=09:00, warmupStart=09:00, warmupEnd=09:30, stagingTime=09:50, raceStart=10:10 | Test |
| FR-007-AC-2 | Given Varsity Girls in Wave 3 (start=10:15, stage=09:55), arrival=70 (default), warmup=30: arrivalTime=09:05, warmupStart=09:05, warmupEnd=09:35, stagingTime=09:55, raceStart=10:15 | Test |
| FR-007-AC-3 | Given JV B Boys in Wave 1 (start=08:00, stage=07:40), arrival=60 (default — no Varsity/JV A), warmup=30: arrivalTime=07:00, warmupStart=07:00, warmupEnd=07:30, stagingTime=07:40, raceStart=08:00 | Test |
| FR-007-AC-4 | Given a user override of arrivalBeforeMinutes=90 for Wave 3, Varsity Boys start=10:10: arrivalTime=08:40 | Test |
| FR-007-AC-5 | All athletes in the same category within a wave have identical logistics times | Test |
| FR-007-AC-6 | Athletes in different categories within the same wave (e.g., Varsity Boys at 10:10 and Varsity Girls at 10:15) have different logistics times | Test |
| FR-007-AC-7 | After changing warmupDurationMinutes from 30 to 20, warmupEnd recalculates from 09:30 to 09:20 for Varsity Boys without re-importing data | Test |

## Dependencies

- **Upstream**: [FR-005](./FR-005-generate-wave-schedule.md) wave schedule generation, [FR-006](./FR-006-logistics-parameters.md) logistics parameters
- **Downstream**: [FR-009](./FR-009-export-pdf.md) PDF export, [FR-010](./FR-010-export-sheets.md) Google Sheets export
