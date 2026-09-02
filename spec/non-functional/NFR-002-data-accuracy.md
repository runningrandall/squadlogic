---
id: NFR-002
title: "Parsed data presentation accuracy"
type: NFR
quality_attribute: functional_suitability
relationships:
  - target: "ix://switchback/squadlogic/FR-014"
    type: "constrains"
  - target: "ix://switchback/squadlogic/FR-005"
    type: "constrains"
---

# [NFR-002] Parsed data presentation accuracy

## Statement

The system SHALL present participant data (names, teams, categories, bib numbers, staging/call-up numbers) and per-category schedule data (staging time, start time) exactly as published in the uploaded call-up list workbook, with zero field-level discrepancies between the uploaded file and the generated wave schedule.

## Scope

- Applies to: the end-to-end path from the uploaded call-up list `.xlsx` through category schedule parsing ([FR-013](../functional/FR-013-parse-category-schedule.md)) and participant extraction ([FR-014](../functional/FR-014-extract-callup-participants.md)) to wave schedule output ([FR-005](../functional/FR-005-generate-wave-schedule.md))
- Covers: all fields that originate from the uploaded workbook (names, teams, categories, bib numbers, call-up numbers, stage times, start times)
- Does not apply to: logistics timeline calculations, which are derived from user-provided parameters and not from the uploaded workbook

## Rationale

Coaches and team managers make race day decisions based on the generated schedule. An athlete assigned to the wrong category, staging number, or start time in the schedule — due to a parsing error — could miss their start or prepare for the wrong race distance. Accuracy is non-negotiable for this feature's trustworthiness, and is now fully within the system's control since the source data is a file the league itself produced and the team manager uploaded directly (no external platform in the loop).

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|--------|--------|-----------|--------|
| Field-level accuracy (participant name, team, category, bib, call-up number) | 100% | 100% | Inspection |
| Field-level accuracy (category stage time, start time) | 100% | 100% | Inspection |
| Participant count accuracy (parsed vs. workbook) | 100% | 100% | Inspection |

## Verification

A verification test compares the system's parsed participant records and per-category schedule field-by-field against a manually verified baseline of a known fixture call-up list workbook. The test SHALL cover at least 30 participants across at least 3 teams and 4 categories. Zero discrepancies are permitted.

## Acceptance Criteria

This is a zero-tolerance accuracy requirement. The Measurement table above serves as the acceptance criteria. Any field-level discrepancy between the uploaded workbook and the parsed data is a defect.

## Dependencies

- **Upstream**: [FR-013](../functional/FR-013-parse-category-schedule.md) category schedule parsing, [FR-014](../functional/FR-014-extract-callup-participants.md) participant extraction, [FR-005](../functional/FR-005-generate-wave-schedule.md) wave schedule generation
- **Downstream**: None
