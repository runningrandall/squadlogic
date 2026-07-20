---
id: SR-003
title: "Evidence analysis review of Race Day Wave Schedule spec"
type: SpecReview
analysis: evidence
scope: "spec/**/*.md"
review_set: all
---

## Summary

The evidence analysis examined verification methods, evidence artifacts, and test feasibility across all 16 spec artifacts. Every FR acceptance criterion specifies a verification method, but three FRs (FR-001, FR-004, FR-006) lack integration test coverage entirely, NFR acceptance criteria lack structured AC IDs for traceability, and several verification methods reference undefined procedures or baseline artifacts.

## Findings

| ID | Severity | Summary | Refs |
|----|----------|---------|------|
| FND-001 | high | FR-001 (URL validation) has no integration test coverage — 7 ACs verified only at unit level | FR-001, IT-001, IT-002 |
| FND-002 | high | FR-004 (list teams) has no integration test coverage — dropdown and dedup behavior unverified at integration level | FR-004, IT-001, IT-002 |
| FND-003 | high | FR-006 (logistics parameters) has no integration test coverage — validation and category-aware defaults unverified | FR-006, IT-001, IT-002 |
| FND-004 | medium | NFR-001 has no structured AC table with IDs — verification paragraph describes approach but lacks discrete pass/fail criteria | NFR-001 |
| FND-005 | medium | NFR-002 acceptance criteria are implicit — states "Measurement table serves as AC" but provides no AC IDs, breaking identifier schema | NFR-002, spec.md |
| FND-006 | medium | FR-004-AC-5 uses Demonstration method but defines no demonstration procedure, screenshot requirement, or inspector checklist | FR-004 |
| FND-007 | medium | IT-002 does not exercise FR-006 category-aware arrival defaults — uses flat arrival=60, bypassing Varsity/JV=70 default logic | IT-002, FR-006 |
| FND-008 | medium | IT-001 covers only the success path — FR-002 error ACs (HTTP 404, timeout, missing field) and FR-003 edge ACs unverified | IT-001, FR-002, FR-003 |
| FND-009 | medium | No IT covers full end-to-end flow from URL submission through logistics timeline output — cross-boundary defects could escape | IT-001, IT-002 |
| FND-010 | low | NFR-001 verification depends on undefined "normal network conditions" and unspecified mock endpoint fidelity criteria | NFR-001 |
| FND-011 | low | NFR-002 verification depends on a manually verified baseline dataset that is not identified or maintained | NFR-002 |
| FND-012 | low | StR-001 validation criteria lack a formal verification method (Test/Demonstration/Analysis/Inspection) | StR-001 |
| FND-013 | low | FR-006-CON-2 uses Inspection method but defines no inspection checklist or evidence artifact | FR-006 |
