---
id: NFR-001
title: "External data fetch latency"
type: NFR
quality_attribute: performance_efficiency
relationships:
  - target: "ix://switchback/squadlogic/FR-002"
    type: "constrains"
  - target: "ix://switchback/squadlogic/FR-003"
    type: "constrains"
---

# [NFR-001] External data fetch latency

**Status: RETIRED** — there is no external fetch anymore; the Call-Up List .xlsx is uploaded and parsed locally and synchronously, so no fetch-latency budget applies. See [NFR-002](./NFR-002-data-accuracy.md) for the retained accuracy requirement.

## Statement

The system SHALL complete the fetch and parse of a RaceResult event page (event metadata and full participant list) within 10 seconds under normal network conditions, including all necessary HTTP requests to the external RaceResult platform.

## Scope

- Applies to: the combined operation of fetching the RaceResult page and extracting event metadata and participant data ([FR-002](../functional/FR-002-parse-event-metadata.md), [FR-003](../functional/FR-003-extract-participants.md))
- Operational context: standard server-side network connectivity; excludes client-side rendering time
- Does not apply to: wave schedule generation or logistics calculation, which operate on already-parsed local data

## Rationale

Team managers often generate schedules on race morning with limited time. A fetch-and-parse cycle exceeding 10 seconds risks abandonment and erodes trust in the feature. The 10-second budget accounts for the external dependency on RaceResult's page load time, which is outside the system's control.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|--------|--------|-----------|--------|
| Fetch + parse wall time (p50) | 3 seconds | 5 seconds | Load Test |
| Fetch + parse wall time (p95) | 5 seconds | 10 seconds | Load Test |
| HTTP request timeout | 8 seconds | 10 seconds | Configuration |

## Verification

A load test issues 50 sequential fetch-and-parse requests against a representative RaceResult event page (or a controlled mock endpoint replicating RaceResult's response characteristics) and asserts p50 and p95 latencies are within threshold.

## Dependencies

- **Upstream**: [FR-002](../functional/FR-002-parse-event-metadata.md) event metadata parsing, [FR-003](../functional/FR-003-extract-participants.md) participant extraction
- **Downstream**: None
