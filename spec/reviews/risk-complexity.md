---
id: SR-006
title: "Risk-complexity analysis of Race Day Wave Schedule spec"
type: SpecReview
analysis: risk-complexity
scope: "spec/**/*.md"
review_set: all
---

## Summary

The dominant risk is the hard dependency on scraping RaceResult's dynamically-rendered JavaScript content — the spec mandates 100% accuracy and sub-10-second latency for an operation against an uncontrolled third-party page with no API contract, no fallback, and no mitigation strategy. The schedule generation and logistics calculation (FR-004 through FR-007) are straightforward pure-function operations with low technical risk.

## Findings

| ID | Severity | Summary | Refs |
|----|----------|---------|------|
| FND-001 | high | RaceResult page structure is an uncontrolled volatility boundary — single DOM change breaks the entire feature with no fallback or circuit breaker | FR-002, FR-003, IT-001, spec.md |
| FND-002 | high | Dynamic JS rendering (RRPublish library) makes simple HTTP GET insufficient — no spec for headless browser or API interception approach | FR-002, FR-003, US-001 |
| FND-003 | high | NFR-001 latency targets (p50=3s, p95=5s) may be infeasible with headless browser rendering on Lambda cold starts | NFR-001, FR-002, FR-003 |
| FND-004 | high | NFR-002 demands 100% accuracy with zero tolerance for a web-scraping operation — unrealistic as a sustained guarantee | NFR-002, FR-003, FR-005 |
| FND-005 | medium | FR-002 embeds a specific CSS selector as implementation detail in a functional requirement — violates own quality policy | FR-002, spec.md |
| FND-006 | medium | waveStartTime optional in FR-005 but essential for FR-007 — gap between requirements means FR-007 silently fails | FR-005, FR-007 |
| FND-007 | medium | No spec for how wave start times are extracted — neither FR-002 nor FR-003 specifies extraction of start clock times | FR-002, FR-003, FR-005, FR-007 |
| FND-008 | medium | IT-001 depends on live external service with no offline fallback mandated — CI/CD reliability at risk | IT-001 |
| FND-009 | medium | Per-wave category-aware defaults create hidden coupling between FR-005 output and FR-006 logic — category name variants not addressed | FR-006, FR-007 |
| FND-010 | medium | No persistence or state management model for multi-step workflow on Lambda architecture | spec.md, FR-002, FR-003 |
| FND-011 | low | FR-001 URL pattern may reject valid RaceResult URLs with subpaths, query params, or hashes | FR-001 |
| FND-012 | low | Case-insensitive team dedup does not specify which display name wins | FR-004, FR-005 |
| FND-013 | low | No NFR for concurrent multi-user access patterns | spec.md |
| FND-014 | low | No data expiration or cleanup lifecycle for parsed race data | spec.md |
| FND-015 | low | FR-004/FR-005/FR-006/FR-007 are straightforward pure-function operations with low implementation risk | FR-004, FR-005, FR-006, FR-007 |
