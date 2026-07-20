---
id: SR-005
title: "Dependency analysis of Race Day Wave Schedule spec"
type: SpecReview
analysis: dependency
scope: "spec/**/*.md"
review_set: all
---

## Summary

Mapped the full dependency graph across 16 spec artifacts. The primary chain is a clean 6-node DAG (FR-001 through FR-007 via FR-005) with no circular dependencies. However, three undeclared dependencies were found: FR-006 needs FR-005 wave data for category-aware defaults, FR-005 needs FR-002 event metadata for its output, and the dual team-source between FR-002 and FR-004 creates a potential inconsistency.

## Findings

| ID | Severity | Summary | Refs |
|----|----------|---------|------|
| FND-001 | high | Undeclared dependency: FR-006 depends on FR-005 wave structure for category-aware arrival defaults but declares no relationship to FR-005 | FR-006, FR-005 |
| FND-002 | high | Single external dependency on RaceResult with high fragility — a DOM change breaks FR-002/FR-003 and cascades to the entire feature | FR-002, FR-003, IT-001 |
| FND-003 | medium | Undeclared dependency: FR-005 output includes eventName/eventDate from FR-002 but only declares dependency on FR-003/FR-004 | FR-005, FR-002 |
| FND-004 | medium | Dual team source: FR-002 extracts teams from CSS selector, FR-004 derives teams from FR-003 participants — no declared relationship, could diverge | FR-002, FR-004 |
| FND-005 | medium | No integration test covers FR-004 (team listing) or FR-006 (logistics parameter validation) | FR-004, FR-006 |
| FND-006 | medium | IT-002 uses flat arrival=60 instead of category-aware defaults — never exercises FR-006 core differentiating behavior | IT-002, FR-006 |
| FND-007 | medium | NFR-001 latency budget covers FR-002+FR-003 jointly but unclear if single or multiple HTTP requests needed for JS-rendered content | NFR-001, FR-002, FR-003 |
| FND-008 | medium | FR-007 requires wave start times but FR-005 marks them optional — implicit data requirement not guaranteed by dependency chain | FR-007, FR-005 |
| FND-009 | low | Critical path is 6 nodes deep (FR-001 -> FR-007) — FR-001 blocks everything | FR-001 through FR-007 |
| FND-010 | low | FR-006 can be implemented in parallel with import chain (FR-001-FR-005) at code level, though has runtime dependency on FR-005 | FR-006, US-003 |
| FND-011 | low | Enablement vs feature: FR-001/FR-002/FR-003 are pure pipeline plumbing; FR-004/FR-005/FR-006/FR-007 deliver user-visible value | FR-001 through FR-007 |
