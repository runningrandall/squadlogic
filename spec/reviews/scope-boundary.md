---
id: SR-007
title: "Scope-boundary analysis of Race Day Wave Schedule spec"
type: SpecReview
analysis: scope-boundary
scope: "spec/**/*.md"
review_set: all
---

## Summary

The spec defines a self-contained feature with strong internal consistency, but has a critical gap in data persistence — the spec never decides whether parsed data and schedules are persisted as DynamoDB entities or treated as ephemeral API responses, which is the most impactful open question for implementation. The feature also operates as a conceptual island from the existing Switchback entity model (Team, Athlete, TeamMember) with no defined reconciliation path.

## Findings

| ID | Severity | Summary | Refs |
|----|----------|---------|------|
| FND-001 | high | Data persistence is undefined — lifecycle implies state, FR-006 allows parameter updates, EventBridge events imply persistence, but no entity/storage model is specified | spec.md, FR-005, FR-006, FR-007 |
| FND-002 | high | Multi-tenancy declared but no entity PK includes organizationId — tenant isolation mechanism is unspecified | spec.md, FR-001 |
| FND-003 | medium | FR-002 embeds CSS selector implementation detail in normative requirement — violates quality policy and couples FR to volatile DOM structure | FR-002, spec.md |
| FND-004 | medium | No relationship defined between RaceResult team name string and existing Switchback Team entity (teamId) — feature is an isolated island | FR-004, FR-005, spec.md |
| FND-005 | medium | EventBridge events declared with no consumers, no payload schema, and no downstream processing defined | spec.md |
| FND-006 | medium | FR-002 conflates HTTP fetching and parsing into one requirement — misaligned with hexagonal architecture port/adapter pattern | FR-002, NFR-001 |
| FND-007 | low | Wave start time source ambiguous — FR-005 marks optional, FR-007 requires it, no manual entry or error path defined | FR-005, FR-007 |
| FND-008 | low | No authorization model — intended users (manager, coach, admin) not mapped to existing Switchback roles or requireRole() middleware | FR-001, spec.md |
| FND-009 | low | Missing Out of Scope: schedule sharing/export — StR-001 identifies athletes/parents as consumers but no export mechanism addressed | StR-001, US-002 |
| FND-010 | low | No concurrency or re-import semantics for same event URL — upsert vs duplicate creation unaddressed | spec.md |
