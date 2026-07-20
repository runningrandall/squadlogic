---
id: IT-005
title: "Logistics parameter validation and category-aware defaults"
type: IT
relationships:
  - target: "ix://switchback/squadlogic/FR-006"
    type: "verifies"
---

# [IT-005] Logistics parameter validation and category-aware defaults

## Objective

Verify that the logistics parameter endpoint correctly applies category-aware arrival defaults (70 for Varsity/JV A waves, 60 for others), validates parameter ranges and cross-field constraints, rejects invalid inputs with descriptive errors, and persists parameters in DynamoDB. Without this test, incorrect default logic or missing validation could produce wrong logistics timelines or accept invalid configurations.

## Target Integration

The service under test is the logistics parameter configuration endpoint. The integration exercised includes the DynamoDB wave schedule configuration (for determining category-aware defaults), Zod validation, cross-field constraint checking, and DynamoDB persistence of the logistics configuration.

## Preconditions

- The Switchback backend service is running and reachable.
- The DynamoDB wave schedule configuration is seeded with the league-default schedule (FR-008).
- A previously imported event with a selected team is available in DynamoDB.
- An authenticated user session is established.

## Inputs

Multiple test scenarios exercising defaults, overrides, range boundaries, and constraint violations.

## Test Procedure

1. Request logistics parameters with no overrides for an event where the selected team has athletes in Wave 1 - HS (JV B Boys) and Wave 3 - HS (Varsity Boys).
   - IT-005-SC-01: Wave 1 - HS receives arrivalBeforeMinutes=60 (no Varsity/JV A category).
   - IT-005-SC-02: Wave 3 - HS receives arrivalBeforeMinutes=70 (contains Varsity category).
   - IT-005-SC-03: warmupDurationMinutes=30 (global default).
   - IT-005-SC-04: stagingBeforeMinutes=20 (league rule default).
2. Submit an override of arrivalBeforeMinutes=90 for Wave 3 - HS only.
   - IT-005-SC-05: Wave 3 - HS uses 90, Wave 1 - HS retains default of 60.
3. Submit warmupDurationMinutes=0 (below minimum range of 5).
   - IT-005-SC-06: The endpoint returns HTTP 422 with error identifying warmupDurationMinutes, value 0, range 5-90.
4. Submit arrivalBeforeMinutes=14 for Wave 1 (below minimum range of 15).
   - IT-005-SC-07: The endpoint returns HTTP 422 with error identifying arrivalBeforeMinutes, value 14, range 15-180.
5. Submit arrivalBeforeMinutes=40, warmupDurationMinutes=30, stagingBeforeMinutes=20 for Wave 1.
   - IT-005-SC-08: The endpoint returns HTTP 422 with error explaining 40 < 30+20 for Wave 1.
6. Submit all parameters at minimum valid boundary: arrivalBeforeMinutes=15, warmupDurationMinutes=5, stagingBeforeMinutes=5.
   - IT-005-SC-09: The endpoint accepts (15 >= 5+5).
7. Submit all parameters at maximum valid boundary: arrivalBeforeMinutes=180, warmupDurationMinutes=90, stagingBeforeMinutes=60.
   - IT-005-SC-10: The endpoint accepts (180 >= 90+60).
8. Update warmupDurationMinutes from 30 to 20 without re-importing race data.
   - IT-005-SC-11: The update succeeds and subsequent reads return warmupDurationMinutes=20.

## Expected Results

Category-aware defaults are correctly assigned based on wave contents (70 for Varsity/JV A, 60 for others). User overrides replace defaults for the specified wave only. Range violations and cross-field constraint violations are rejected with descriptive errors. Boundary values at both ends of each range are accepted. Parameter updates persist without re-import. The test passes only when every per-step success criterion holds.

## Metadata

- Priority: High
- Target Integration: Internal (logistics parameter endpoint + DynamoDB wave config + DynamoDB persistence)
- Automation: Automated

## Dependencies

**Upstream**: [FR-006](../functional/FR-006-logistics-parameters.md) logistics parameters, [FR-008](../functional/FR-008-wave-schedule-config.md) wave schedule configuration. **Downstream**: None.

## Traceability

This integration test verifies FR-006 (logistics parameters), covering FR-006-AC-1 through FR-006-AC-12 including category-aware defaults (AC-1, AC-2, AC-3), overrides (AC-4), range validation (AC-5, AC-6, AC-7), cross-field constraint (AC-8), parameter updates (AC-9), staging default (AC-10), and boundary values (AC-11, AC-12).
