---
id: IT-006
title: "RaceResult page structure validation"
type: IT
relationships:
  - target: "ix://switchback/squadlogic/FR-002"
    type: "verifies"
  - target: "ix://switchback/squadlogic/FR-003"
    type: "verifies"
---

# [IT-006] RaceResult page structure validation

**Status: RETIRED** — there is no longer an external RaceResult page/API structure to act as a volatility boundary; the analogous contract-style coverage for the new upload format (fixture workbook shapes, header row detection) lives in [IT-008](./IT-008-callup-list-parsing.md).

## Objective

Validate that the RaceResult page structure and dynamic API contract have not changed in ways that would break parsing. This test acts as a contract test and early-warning canary — it verifies the specific DOM elements, CSS selectors, and API endpoint patterns that FR-002 and FR-003 depend on, catching structural drift before it surfaces as corrupt data or silent failures in production.

This test is distinct from IT-001 (which verifies data correctness). IT-006 verifies that the expected structural contracts still hold, independent of specific event data.

## Target Integration

The service under test is the RaceResult page structure itself. The integration type is structural validation of the external dependency's response format — HTML DOM selectors for metadata and teams, and the dynamic participant API endpoint contract.

## Preconditions

- Network connectivity to `my.raceresult.com` and `my-us-1.raceresult.com` is available.
- A known RaceResult event URL with published participant data is accessible (e.g., `https://my.raceresult.com/411620/`).
- A cached baseline snapshot of the expected page structure is available for comparison when the live site is unreachable.

## Inputs

- A known RaceResult event URL (e.g., `https://my.raceresult.com/411620/`)
- Expected structural contracts:
  - JSON-LD schema containing event name, date, location
  - RRPublish JavaScript initialization with event ID
  - Teams dropdown at CSS selector `#divRRPublish > div:nth-child(2) > div.SelectorParent.OnlyOneList > div.Selector select`
  - Dynamic participant API endpoint pattern: `https://my-us-1.raceresult.com/{eventId}/participants/list?key={key}&listname={listname}&page=participants&contest=0&r=all&l=0`

## Test Procedure

### Phase 1: HTML Page Structure Validation

1. Fetch the RaceResult event page via HTTP GET.
   - IT-006-SC-01: The page returns HTTP 200 with content-type `text/html`.
2. Validate JSON-LD structured data is present.
   - IT-006-SC-02: The page contains a `<script type="application/ld+json">` block with a JSON object containing `name`, `startDate`, and `location` fields.
3. Validate the RRPublish initialization script is present.
   - IT-006-SC-03: The page contains a script block calling `new RRPublish(...)` with the numeric event ID as the second argument.
4. Validate the RRPublish JavaScript library is loadable.
   - IT-006-SC-04: The script source `/RRPublish/load.js` returns HTTP 200.
5. Validate the teams dropdown selector is present.
   - IT-006-SC-05: The page content (after JS evaluation or from the initial HTML) contains an element matching the CSS selector path for the teams dropdown, OR the RRPublish initialization references the expected list/selector structure.

### Phase 2: Dynamic API Contract Validation

6. Discover the dynamic API parameters from the page content.
   - IT-006-SC-06: The page or RRPublish initialization provides a `key` parameter (alphanumeric hash) for the participant API.
   - IT-006-SC-07: The page or RRPublish initialization provides at least one `listname` value.
7. Construct and fetch the participant API endpoint.
   - IT-006-SC-08: A GET request to `https://my-us-1.raceresult.com/{eventId}/participants/list` with the discovered parameters returns HTTP 200.
8. Validate the API response structure.
   - IT-006-SC-09: The response contains parseable participant data (HTML table rows or JSON array).
   - IT-006-SC-10: Each participant record in the response contains identifiable fields for name, team, and category.

### Phase 3: Structural Drift Detection

9. Compare the current page structure against the cached baseline snapshot.
   - IT-006-SC-11: The JSON-LD schema structure (field names and types) matches the baseline.
   - IT-006-SC-12: The RRPublish constructor signature (argument count and positions) matches the baseline.
   - IT-006-SC-13: The participant API response format (field positions or JSON keys) matches the baseline.

## Expected Results

All structural contracts — HTML page elements, JSON-LD schema, RRPublish initialization, teams dropdown selector, participant API endpoint, and API response format — are present and match the expected patterns. Any structural drift from the baseline is detected and reported as a failing success criterion, triggering investigation before the parsing logic breaks silently.

## Metadata

- Priority: High
- Target Integration: RaceResult platform (my.raceresult.com, my-us-1.raceresult.com)
- Automation: Automated, scheduled to run daily in CI and on every deploy
- Alert: Failures trigger an alert to the development team (not just a red build)

## Dependencies

**Upstream**: [FR-002](../functional/FR-002-parse-event-metadata.md) (relies on page structure for metadata extraction), [FR-003](../functional/FR-003-extract-participants.md) (relies on API contract for participant extraction). **Downstream**: IT-001 (data correctness depends on structural contracts holding).

## Notes

This test SHOULD be run on a schedule (daily) in addition to on-deploy, since RaceResult can change their page structure at any time independent of Switchback deployments. When the test fails:

1. **Investigate**: Compare the current page structure to the baseline to identify what changed.
2. **Update parser**: Adjust FR-002/FR-003 parsing logic to handle the new structure.
3. **Update baseline**: Snapshot the new structure as the updated baseline.
4. **Re-validate**: Run IT-001 to confirm data correctness against the updated parser.

The cached baseline snapshot should be stored in the test fixtures directory and versioned in git so that structural changes are tracked over time.

## Traceability

This integration test verifies the structural contracts that FR-002 and FR-003 depend on, serving as an early-warning system for third-party page changes that would break the import pipeline.
