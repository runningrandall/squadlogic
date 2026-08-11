---
id: FR-012
title: "Accept and validate call-up list XLSX upload"
type: FR
relationships:
  - target: "ix://switchback/squadlogic/US-001"
    type: "implements"
  - target: "ix://switchback/squadlogic/FR-013"
    type: "blocks"
---

# [FR-012] Accept and validate call-up list XLSX upload

## Description

The system SHALL accept a base64-encoded `.xlsx` file, along with optional `eventName` and `eventLocation` override strings, as input for importing a race event. The system SHALL decode and validate that the uploaded data represents a parseable workbook before extracting any schedule or participant data. When the uploaded file is missing, empty, or cannot be parsed as a workbook with at least one recognizable category, the system SHALL reject the input with an error identifying the nature of the failure.

## Inputs

- `fileData` (string, required): The base64-encoded contents of the league's Call-Up List `.xlsx` export
- `eventName` (string, optional): Override for the event name (used when the workbook does not carry a usable event name)
- `eventLocation` (string, optional): Override for the event venue location
- `organizationId` (string, required): The tenant context from the authenticated session

## Outputs

- On success: a decoded workbook accepted for downstream parsing ([FR-013](./FR-013-parse-category-schedule.md), [FR-014](./FR-014-extract-callup-participants.md)), along with the resolved event metadata (`eventName`, `eventLocation`, generated `eventId`)
- On failure: a validation error identifying the failure — missing/empty `fileData`, a workbook with no worksheets, or a workbook with no parseable categories

## Behavior

- The system SHALL require `fileData` to be a non-empty string.
- The system SHALL reject the request when `fileData` is missing or an empty string, with a validation error indicating `fileData` (base64-encoded `.xlsx`) is required.
- The system SHALL decode `fileData` from base64 into a binary workbook buffer before parsing.
- The system SHALL reject the upload when the decoded workbook contains no worksheets.
- The system SHALL reject the upload when the workbook contains no parseable category blocks (i.e., zero categories with at least one valid participant row), with an error indicating the file format should be checked.
- The system SHALL apply the `eventName` override when provided, otherwise default to a generic event name.
- The system SHALL apply the `eventLocation` override when provided, otherwise default to an empty string.
- The system SHALL generate a new unique `eventId` for each accepted upload.

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-012-AC-1 | Given a well-formed Call-Up List `.xlsx` encoded as base64, the system accepts the upload and returns a generated `eventId` | Test |
| FR-012-AC-2 | Given a request with `fileData` omitted, the system rejects with a validation error naming `fileData` as required | Test |
| FR-012-AC-3 | Given a request with `fileData` as an empty string, the system rejects with a validation error | Test |
| FR-012-AC-4 | Given a decoded workbook with zero worksheets, the system rejects with an error indicating the file has no worksheets | Test |
| FR-012-AC-5 | Given a decoded workbook with worksheets but no parseable category blocks, the system rejects with an error suggesting the file format be checked | Test |
| FR-012-AC-6 | Given `eventName` and `eventLocation` overrides, the resolved event metadata uses the supplied values instead of workbook-derived defaults | Test |
| FR-012-AC-7 | Given no `eventName`/`eventLocation` overrides, the system falls back to a default event name and an empty location | Test |

## Dependencies

- **Upstream**: [US-001](../usecase/US-001-import-race-event.md) import race event data
- **Downstream**: [FR-013](./FR-013-parse-category-schedule.md) category schedule parsing, [FR-014](./FR-014-extract-callup-participants.md) participant extraction (both blocked until the upload is validated)
