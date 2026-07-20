---
id: SR-001
title: "Base checklist review of Race Day Wave Schedule spec"
type: SpecReview
analysis: base
scope: "spec/**/*.md"
review_set: all
---

## Summary

Base checklist review of 16 spec artifacts (1 master, 1 StR, 3 US, 7 FR, 2 NFR, 2 IT) for the Race Day Wave Schedule feature. The spec is well-structured with correct ID formats, strong traceability from StR through US to FR, and clear EARS-compliant requirement language. However, significant test coverage gaps exist: three FRs have zero test coverage, and existing ITs omit error-path acceptance criteria.

## Findings

| ID | Severity | Summary | Refs |
|----|----------|---------|------|
| FND-001 | high | No test coverage for FR-001 (URL validation) — 7 acceptance criteria with zero ITs or TCs | FR-001 |
| FND-002 | high | No test coverage for FR-004 (list teams) — 5 acceptance criteria with zero ITs or TCs | FR-004 |
| FND-003 | high | No test coverage for FR-006 (logistics parameters) — 8 acceptance criteria with zero ITs or TCs | FR-006 |
| FND-004 | high | IT-001 omits FR-002 error-path ACs: FR-002-AC-3 (HTTP 404), FR-002-AC-4 (timeout), FR-002-AC-5 (missing field) have no test steps | FR-002, IT-001 |
| FND-005 | high | IT-001 omits FR-003 edge ACs: FR-003-AC-4 (empty bib), FR-003-AC-5 (no participants), FR-003-AC-6 (dedup) have no test steps | FR-003, IT-001 |
| FND-006 | medium | IT-002 does not exercise FR-007 category-aware defaults — uses flat arrival=60 instead of Varsity/JV=70 default | FR-007, IT-002 |
| FND-007 | medium | ITs do not trace to specific AC IDs — IT success criteria reference FRs but never individual AC IDs | IT-001, IT-002 |
| FND-008 | medium | FR-006 boundary values insufficiently tested — ranges (15-180, 5-90, 5-60) defined but only one boundary tested (warmup=0) | FR-006 |
| FND-009 | medium | FR-007 documents no error conditions — no ACs for invalid time formats or missing wave start times | FR-007 |
| FND-010 | medium | US-002 has no Options (Exploratory) section; US-001 and US-003 include Options but without trade-off analysis | US-001, US-002, US-003 |
| FND-011 | low | FR-001 through FR-005 and FR-007 lack formal Constraints sections — constraints embedded in Behavior text without CON IDs | FR-001, FR-002, FR-003, FR-004, FR-005, FR-007 |
| FND-012 | low | IT-002 test fixture uses flat arrivalBeforeMinutes=60 for all waves, masking category-aware default logic (Varsity/JV=70) | IT-002, FR-006 |
| FND-013 | low | US Options sections list alternatives without documenting trade-offs between them | US-001, US-003 |
