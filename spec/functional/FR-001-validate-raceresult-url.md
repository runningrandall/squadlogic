---
id: FR-001
title: "Accept and validate RaceResult event URL"
type: FR
relationships:
  - target: "ix://switchback/squadlogic/US-001"
    type: "implements"
  - target: "ix://switchback/squadlogic/FR-002"
    type: "blocks"
---

# [FR-001] Accept and validate RaceResult event URL

**Status: RETIRED** — RaceResult URL import was replaced by direct upload of the league's Call-Up List .xlsx export; see [FR-012](./FR-012-validate-callup-list-upload.md) for the current upload validation requirement.

## Description

The system SHALL accept a URL string as input and validate that it conforms to the RaceResult event URL pattern (`https://my.raceresult.com/{eventId}/` where `{eventId}` is a numeric identifier) before initiating any external data fetch. When the URL does not conform to the expected pattern, the system SHALL reject the input with a validation error identifying the expected format.

## Inputs

- `url` (string, required): The user-provided URL string
- `organizationId` (string, required): The tenant context from the authenticated session

## Outputs

- On success: a validated and normalized URL string with the extracted numeric event ID
- On failure: a validation error with the message "URL must be a valid RaceResult event URL (e.g., https://my.raceresult.com/411620/)"

## Behavior

- The system SHALL accept URLs matching the pattern `https://my.raceresult.com/{eventId}/` where `{eventId}` consists of one or more digits.
- The system SHALL accept URLs with or without a trailing slash.
- The system SHALL reject URLs with a non-HTTPS scheme.
- The system SHALL reject URLs whose hostname is not `my.raceresult.com`.
- The system SHALL reject URLs that contain no numeric event ID path segment.
- The system SHALL normalize accepted URLs to include a trailing slash.

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-001-AC-1 | Given `https://my.raceresult.com/411620/`, the system accepts the URL and extracts event ID `411620` | Test |
| FR-001-AC-2 | Given `https://my.raceresult.com/411620` (no trailing slash), the system accepts and normalizes to include trailing slash | Test |
| FR-001-AC-3 | Given `http://my.raceresult.com/411620/` (HTTP scheme), the system rejects with a validation error | Test |
| FR-001-AC-4 | Given `https://example.com/411620/` (wrong hostname), the system rejects with a validation error | Test |
| FR-001-AC-5 | Given `https://my.raceresult.com/` (no event ID), the system rejects with a validation error | Test |
| FR-001-AC-6 | Given an empty string, the system rejects with a validation error | Test |
| FR-001-AC-7 | Given `https://my.raceresult.com/abc/` (non-numeric event ID), the system rejects with a validation error | Test |

## Dependencies

- **Upstream**: [US-001](../usecase/US-001-import-race-event.md) import race event data
- **Downstream**: [FR-002](./FR-002-parse-event-metadata.md) parse event metadata (blocked until URL is validated)
