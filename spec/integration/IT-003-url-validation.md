---
id: IT-003
title: "RaceResult URL validation"
type: IT
relationships:
  - target: "ix://switchback/squadlogic/FR-001"
    type: "verifies"
---

# [IT-003] RaceResult URL validation

**Status: RETIRED** — there is no longer a URL to validate; upload validation is now covered by [FR-012](../functional/FR-012-validate-callup-list-upload.md) and the malformed/empty workbook cases in [IT-008](./IT-008-callup-list-parsing.md).

## Objective

Verify that the URL validation endpoint correctly accepts valid RaceResult event URLs and rejects invalid ones with appropriate error messages. Without this test, malformed URLs could bypass validation and cause downstream fetch failures with unhelpful error messages.

## Target Integration

The service under test is the race event import endpoint's URL validation layer. This is an internal integration test exercising the Fastify route handler through Zod validation to the response.

## Preconditions

- The Switchback backend service is running and reachable.
- An authenticated user session is established.

## Inputs

A set of URL test cases covering valid and invalid patterns:
- Valid: `https://my.raceresult.com/411620/`
- Valid (no trailing slash): `https://my.raceresult.com/411620`
- Invalid (HTTP scheme): `http://my.raceresult.com/411620/`
- Invalid (wrong host): `https://example.com/411620/`
- Invalid (no event ID): `https://my.raceresult.com/`
- Invalid (non-numeric ID): `https://my.raceresult.com/abc/`
- Invalid (empty string): ``

## Test Procedure

1. Submit the valid URL `https://my.raceresult.com/411620/` to the import endpoint.
   - IT-003-SC-01: The endpoint accepts the URL and returns the extracted event ID `411620`.
2. Submit the valid URL without trailing slash `https://my.raceresult.com/411620`.
   - IT-003-SC-02: The endpoint accepts the URL, normalizes to include trailing slash, and returns event ID `411620`.
3. Submit the HTTP-scheme URL `http://my.raceresult.com/411620/`.
   - IT-003-SC-03: The endpoint returns HTTP 422 with a validation error mentioning the expected format.
4. Submit the wrong-host URL `https://example.com/411620/`.
   - IT-003-SC-04: The endpoint returns HTTP 422 with a validation error.
5. Submit the URL with no event ID `https://my.raceresult.com/`.
   - IT-003-SC-05: The endpoint returns HTTP 422 with a validation error.
6. Submit the URL with non-numeric ID `https://my.raceresult.com/abc/`.
   - IT-003-SC-06: The endpoint returns HTTP 422 with a validation error.
7. Submit an empty string.
   - IT-003-SC-07: The endpoint returns HTTP 422 with a validation error.

## Expected Results

Valid RaceResult URLs are accepted with the extracted event ID. All invalid URLs are rejected with HTTP 422 and a validation error message indicating the expected format. The test passes only when every per-step success criterion holds.

## Metadata

- Priority: Medium
- Target Integration: Internal (Fastify route handler + Zod validation)
- Automation: Automated

## Dependencies

**Upstream**: [FR-001](../functional/FR-001-validate-raceresult-url.md) URL validation. **Downstream**: None.

## Traceability

This integration test verifies FR-001 (URL validation), covering all 7 acceptance criteria (FR-001-AC-1 through FR-001-AC-7).
