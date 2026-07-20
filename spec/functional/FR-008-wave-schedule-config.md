---
id: FR-008
title: "Manage wave schedule configuration"
type: FR
object: configuration
relationships:
  - target: "ix://switchback/squadlogic/US-002"
    type: "implements"
  - target: "ix://switchback/squadlogic/FR-005"
    type: "specifies"
---

# [FR-008] Manage wave schedule configuration

## Description

The system SHALL store a wave schedule configuration in DynamoDB that maps each wave to its categories, start time, and lap count. The system SHALL seed this configuration with the league-default schedule below. An admin SHALL be able to update wave start times and category assignments. When generating a wave schedule ([FR-005](./FR-005-generate-wave-schedule.md)), the system SHALL present the stored configuration as the default wave-to-start-time mapping, and the user SHALL be able to override start times for a specific session without modifying the persisted defaults.

## Default Wave Schedule (2026 Utah HS MTB League)

| Wave | Category | Stage Time | Start Time | Laps |
|------|----------|------------|------------|------|
| Wave 1 - HS | JV B Boys | 7:40 | 8:00 | 2 |
| Wave 1 - HS | JV C Boys | 7:45 | 8:05 | 2 |
| Wave 2 - HS | JV A Boys | 8:35| 8:55 | 3 |
| Wave 2 - HS | Freshman A Boys | 8:40| 9:00 | 2 |
| Wave 3 - HS | Varsity Boys | 9:50 | 10:10 | 4 |
| Wave 3 - HS | Varsity Girls | 9:55 | 10:15 | 3 |
| Wave 4 - HS | JV A Girls | 11:15 | 11:35 | 2 |
| Wave 4 - HS | JV B Girls | 10:00 | 11:40 | 2 |
| Wave 4 - HS | JV C Girls | 10:05 | 11:45 | 2 |
| Wave 5 - HS | Freshman B Boys | 12:20 | 12:40 | 2 |
| Wave 5 - HS | JV D Boys | 12:25 | 12:45 | 2 |
| Wave 6 - HS | JV E Boys | 13:15 | 13:35 | 1 |
| Wave 6 - HS | Freshman C Boys | 13:18 | 13:38 | 1 |
| Wave 6 - HS | JV D Girls | 13:21 | 13:41 | 1 |
| Wave 6 - HS | Adventure* | 13:25 | 13:45 | 1 |
| Wave 7 - JV DEVO | Advanced Boys | 14:10 | 14:30 | 1 |
| Wave 7 - JV DEVO | Intermediate Boys 8 | 14:15| 14:35 | 1 |
| Wave 7 - JV DEVO | Intermediate Boys 7 | 14:20 | 14:40 | 1 |
| Wave 8 - JV DEVO | Advanced Girls | 14:50 | 15:10 | 1 |
| Wave 8 - JV DEVO | Intermediate Girls | 14:55 | 15:15 | 1 |
| Wave 8 - JV DEVO | Intermediate Girls | 15:00 | 15:20 | 1 |
| Wave 9 - JV DEVO | Beginner Boys 8 | 13:30 | 13:50 | 1 |
| Wave 9 - JV DEVO | Beginner Boys 7 | 13:35 | 13:55 | 1 |

*Adventure category: Non-competitive. No race medals awarded.*
*HS Podiums @ 14:45. JV DEVO Podiums @ 17:00-17:30.*
*Schedule is subject to change.*

## Inputs

- For read: no input required (returns current configuration)
- For update (admin only): wave identifier, updated start time, and/or updated category list

## Outputs

- The complete wave schedule configuration as an array of wave objects, each containing:
  - `waveName` (string): Wave identifier (e.g., "Wave 1 - HS")
  - `entries` (array): Per-category entries in this wave, each containing:
    - `categoryName` (string): Category name (e.g., "JV B Boys")
    - `stageTime` (string, HH:MM 24-hour): Staging area report time
    - `startTime` (string, HH:MM 24-hour): Race start time
    - `laps` (number or null): Number of laps for this category

## Behavior

- The system SHALL store the wave schedule configuration in a DynamoDB entity with `organizationId = "GLOBAL"` to indicate league-wide scope.
- The system SHALL seed the configuration with the default schedule on first access if no configuration exists.
- The system SHALL allow admin users to update wave start times and category assignments.
- The system SHALL validate that start times are in HH:MM 24-hour format.
- The system SHALL validate that no duplicate categories exist across waves (each category belongs to exactly one wave).
- When a user generates a wave schedule, the system SHALL present the stored configuration as the default start times, and the user SHALL be able to override any wave's start time for that session without modifying the persisted configuration.

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-008-AC-1 | On first access with no existing configuration, the system seeds the default schedule from the table above | Test |
| FR-008-AC-2 | An admin updates Wave 1 start time from 8:00 to 8:15 — the persisted configuration reflects 8:15 for subsequent reads | Test |
| FR-008-AC-3 | A non-admin user cannot modify the persisted wave schedule configuration | Test |
| FR-008-AC-4 | A user overrides Wave 1 start time to 8:30 for their session — the persisted default remains 8:00 | Test |
| FR-008-AC-5 | Given a category "JV A Boys" assigned to Wave 2, attempting to also assign it to Wave 3 is rejected as a duplicate | Test |
| FR-008-AC-6 | Given a start time value of "25:00", the system rejects with a validation error | Test |
| FR-008-AC-7 | The configuration is stored with organizationId "GLOBAL" and is accessible to all authenticated users | Test |

## Dependencies

- **Upstream**: [US-002](../usecase/US-002-view-wave-schedule.md) view wave schedule
- **Downstream**: [FR-005](./FR-005-generate-wave-schedule.md) wave schedule generation (consumes wave config for start times), [FR-007](./FR-007-athlete-logistics-timeline.md) logistics timeline (uses start times from config)
