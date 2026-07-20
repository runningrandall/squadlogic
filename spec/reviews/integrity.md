---
id: SR-004
title: "Integrity analysis of Race Day Wave Schedule spec"
type: SpecReview
analysis: integrity
scope: "spec/**/*.md"
review_set: all
---

## Summary

Examined completeness, consistency, and atomicity across all 16 spec artifacts. The traceability chain (StR -> US -> FR -> IT) is solid, but found consistency conflicts in IT-002's test fixture contradicting FR-006 category-aware defaults, a dual team-source ambiguity between FR-002 and FR-004, optional waveStartTime creating a silent dependency gap for FR-007, and atomicity concerns where FR-004 and FR-006 bundle multiple testable behaviors.

## Findings

| ID | Severity | Summary | Refs |
|----|----------|---------|------|
| FND-001 | high | IT-002 uses arrivalBeforeMinutes=60 globally but FR-006 mandates Varsity/JV waves default to 70 — IT-002 contradicts or bypasses category-aware defaults | IT-002, FR-006 |
| FND-002 | high | IT-002 uses stagingBeforeMinutes=10 but FR-006 defaults to 20 — test fixture inconsistent with spec defaults | IT-002, FR-006 |
| FND-003 | medium | FR-002 extracts teams from CSS selector but FR-004 independently derives teams from FR-003 participant records — two team sources could diverge | FR-002, FR-004 |
| FND-004 | medium | FR-003 preserves exact team names vs FR-004 applies case-insensitive dedup — no rule for which casing is canonical | FR-003, FR-004 |
| FND-005 | medium | No integration test covers FR-001 (URL validation), FR-004 (team listing), or FR-006 (logistics parameters) | FR-001, FR-004, FR-006 |
| FND-006 | medium | No NFR covers schedule generation or logistics calculation performance — only fetch+parse latency is constrained | NFR-001, NFR-002, StR-001 |
| FND-007 | medium | FR-005 waveStartTime is optional but FR-007 requires it — no requirement addresses the absent-start-time case | FR-005, FR-007 |
| FND-008 | medium | FR-004 bundles UI prescription (dropdown control) with data logic (dedup, sort, count) — mixed concerns reduce atomicity | FR-004 |
| FND-009 | medium | FR-006 is compound: defines parameter schemas, category-aware defaults, range validation, cross-field validation, and update behavior in one FR | FR-006 |
| FND-010 | low | FR-006-CON-1 minimum arrival (15) can conflict with warmup+staging minimums (5+5=10 is fine, but higher combos could exceed 15) | FR-006 |
| FND-011 | low | spec.md references matrix/ and analysis/ directories but no files exist there | spec.md |
| FND-012 | low | No requirement addresses persistence or session state — lifecycle model implies state but no FR governs it | spec.md, FR-006 |
| FND-013 | low | FR-007 warmupStart always equals arrivalTime — redundant field | FR-007 |
| FND-014 | low | EventBridge events in spec.md have no corresponding FR or NFR governing payload or publication | spec.md |
| FND-015 | low | NFR-001 timeout values (8s/10s) not referenced by FR-002's timeout behavior description | NFR-001, FR-002 |
