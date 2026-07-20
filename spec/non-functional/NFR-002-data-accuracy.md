---
id: NFR-002
title: "Parsed data presentation accuracy"
type: NFR
quality_attribute: functional_suitability
relationships:
  - target: "ix://switchback/squadlogic/FR-003"
    type: "constrains"
  - target: "ix://switchback/squadlogic/FR-005"
    type: "constrains"
---

# [NFR-002] Parsed data presentation accuracy

## Statement

The system SHALL present participant data (names, teams, categories, waves, bib numbers) exactly as published on the RaceResult source page, with zero field-level discrepancies between the source and the generated wave schedule.

## Scope

- Applies to: the end-to-end path from RaceResult page content through participant extraction ([FR-003](../functional/FR-003-extract-participants.md)) to wave schedule output ([FR-005](../functional/FR-005-generate-wave-schedule.md))
- Covers: all string fields that originate from RaceResult (names, teams, categories, waves, bib numbers)
- Does not apply to: logistics timeline calculations, which are derived from user-provided parameters and not from source data

## Rationale

Coaches and team managers make race day decisions based on the generated schedule. An athlete assigned to the wrong wave or category in the schedule — due to a parsing or display error — could miss their start or prepare for the wrong race distance. Accuracy is non-negotiable for this feature's trustworthiness.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|--------|--------|-----------|--------|
| Field-level accuracy (participant name, team, category, wave, bib) | 100% | 100% | Inspection |
| Participant count accuracy (extracted vs. source) | 100% | 100% | Inspection |

## Verification

A verification test compares the system's extracted participant records field-by-field against a manually verified baseline of a known RaceResult event page. The test SHALL cover at least 30 participants across at least 3 teams and 4 categories. Zero discrepancies are permitted.

## Acceptance Criteria

This is a zero-tolerance accuracy requirement. The Measurement table above serves as the acceptance criteria. Any field-level discrepancy between the source page and the extracted data is a defect.

## Dependencies

- **Upstream**: [FR-003](../functional/FR-003-extract-participants.md) participant extraction, [FR-005](../functional/FR-005-generate-wave-schedule.md) wave schedule generation
- **Downstream**: None
