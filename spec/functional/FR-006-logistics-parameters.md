---
id: FR-006
title: "Define race day logistics timing parameters"
type: FR
relationships:
  - target: "ix://switchback/squadlogic/US-003"
    type: "implements"
  - target: "ix://switchback/squadlogic/FR-005"
    type: "depends_on"
---

# [FR-006] Define race day logistics timing parameters

## Description

The system SHALL accept configurable timing parameters that define the race day preparation phases relative to each wave's start time. The `arrivalBeforeMinutes` parameter SHALL be configurable per wave. When no user override is provided, the system SHALL assign a category-aware default: 70 minutes for waves containing any Varsity or JV A category, and 60 minutes for all other waves. The `warmupDurationMinutes` and `stagingBeforeMinutes` parameters SHALL apply globally across all waves. The system SHALL provide default values for all parameters so that a schedule can be generated without manual configuration.

## Inputs

- `arrivalBeforeMinutes` (number, optional, per-wave): Minutes before wave start time the athlete should arrive at the venue. Default: 60 for standard waves, 70 for Varsity and JV A waves. Range: 15–180.
- `warmupDurationMinutes` (number, optional, global): Duration in minutes of the warmup period, which includes getting bikes, walking to the warmup area, warming up, and traveling back to staging. Default: 30. Range: 5–90.
- `stagingBeforeMinutes` (number, optional, global): Minutes before wave start time the athlete should report to the staging area. League rule default: 20. Range: 5–60.
- Wave schedule configuration (output of [FR-008](./FR-008-wave-schedule-config.md)) for determining which categories are in each wave.

## Outputs

- A validated logistics configuration object containing:
  - Per-wave `arrivalBeforeMinutes` values (one per wave, either user-provided or category-aware default)
  - Global `warmupDurationMinutes` value
  - Global `stagingBeforeMinutes` value

## Behavior

- When no `arrivalBeforeMinutes` override is provided for a wave, the system SHALL assign 70 minutes if the wave contains any category whose name includes "Varsity" or "JV A" (case-insensitive match).
- When no `arrivalBeforeMinutes` override is provided for a wave, the system SHALL assign 60 minutes if the wave does not contain any Varsity or JV A category.
- When a user provides an `arrivalBeforeMinutes` override for a specific wave, the system SHALL use the override value instead of the category-aware default.
- When no `warmupDurationMinutes` is provided, the system SHALL assign the default of 30.
- When no `stagingBeforeMinutes` is provided, the system SHALL assign the default of 20.
- When a parameter is outside its permitted range, the system SHALL reject the input and identify which parameter is invalid, its provided value, and the permitted range.
- When a wave's `arrivalBeforeMinutes` is less than `warmupDurationMinutes + stagingBeforeMinutes`, the system SHALL reject the input with an error identifying the conflicting wave and explaining that arrival must be at least warmup + staging.
- The system SHALL store logistics parameters in DynamoDB and allow updates without requiring re-import of race data.

## Constraints

| ID | Constraint | Type | Validation |
|----|------------|------|------------|
| FR-006-CON-1 | The system SHALL enforce that each wave's `arrivalBeforeMinutes` is greater than or equal to `warmupDurationMinutes` + `stagingBeforeMinutes` | Temporal consistency | Test |
| FR-006-CON-2 | The system SHALL set the initial value of `stagingBeforeMinutes` to 20, reflecting the league staging rule | Regulatory | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-006-AC-1 | Given no parameters provided and a wave containing "Varsity Boys", the system assigns arrival=70, warmup=30, staging=20 for that wave | Test |
| FR-006-AC-2 | Given no parameters provided and a wave containing "JV B Boys" (no Varsity or JV A), the system assigns arrival=60, warmup=30, staging=20 for that wave | Test |
| FR-006-AC-3 | Given no parameters provided and a wave containing "JV A Girls", the system assigns arrival=70 for that wave | Test |
| FR-006-AC-4 | Given a user override of arrivalBeforeMinutes=90 for Wave 1, the system uses 90 for Wave 1 and category-aware defaults for other waves | Test |
| FR-006-AC-5 | Given warmupDurationMinutes=0, the system rejects with range error (minimum 5) | Test |
| FR-006-AC-6 | Given warmupDurationMinutes=91, the system rejects with range error (maximum 90) | Test |
| FR-006-AC-7 | Given arrivalBeforeMinutes=14, the system rejects with range error (minimum 15) | Test |
| FR-006-AC-8 | Given arrivalBeforeMinutes=40, warmupDurationMinutes=30, stagingBeforeMinutes=20, the system rejects because 40 < 30+20 and identifies the conflicting wave | Test |
| FR-006-AC-9 | Given valid parameters, updating warmupDurationMinutes from 30 to 20 succeeds without re-importing race data | Test |
| FR-006-AC-10 | Given stagingBeforeMinutes is not provided, the system defaults to 20 | Test |
| FR-006-AC-11 | Given arrivalBeforeMinutes=15, warmupDurationMinutes=5, stagingBeforeMinutes=5, the system accepts (15 >= 5+5, all at minimum range) | Test |
| FR-006-AC-12 | Given arrivalBeforeMinutes=180, warmupDurationMinutes=90, stagingBeforeMinutes=60, the system accepts (180 >= 90+60, all at maximum range) | Test |

## Dependencies

- **Upstream**: [US-003](../usecase/US-003-configure-logistics.md) configure logistics timing, [FR-005](./FR-005-generate-wave-schedule.md) wave schedule (provides wave structure for category-aware defaults), [FR-008](./FR-008-wave-schedule-config.md) wave config (defines which categories are in each wave)
- **Downstream**: [FR-007](./FR-007-athlete-logistics-timeline.md) per-athlete timeline calculation (consumes logistics parameters)
