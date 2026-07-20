---
id: SR-002
title: "Failure domain analysis of Race Day Wave Schedule spec"
type: SpecReview
analysis: failure-domain
scope: "spec/**/*.md"
review_set: all
---

## Summary

Examined 16 spec artifacts for unstated failure modes, identity confusion, purity gaps, and topological edge cases. Found 27 findings concentrated around the RaceResult parsing volatility boundary (no retry/caching strategy, no handling of JS-rendered content), identity confusion in team name deduplication and athlete deduplication keys, and critical gaps where optional wave start times silently break the logistics timeline pipeline.

## Findings

| ID | Severity | Summary | Refs |
|----|----------|---------|------|
| FND-001 | high | waveStartTime is optional in FR-005 output but FR-007 requires it for all calculations — no handling when absent | FR-005, FR-007 |
| FND-002 | high | No rate limiting, retry, or caching strategy for RaceResult fetches — race morning concurrent imports could trigger IP blocking | FR-002, FR-003, NFR-001 |
| FND-003 | high | Concurrent imports of same event by different org users have no locking, dedup, or conflict resolution | spec.md, FR-002, FR-003 |
| FND-004 | high | Category-aware default matching ("Varsity", "JV") depends on exact RaceResult category naming — variants like "Junior Varsity" or "V Boys" silently fall through to 60min | FR-006, FR-003 |
| FND-005 | high | Team name case-insensitive dedup in FR-004 does not specify which display name wins when cases differ ("Brighton" vs "brighton") | FR-003, FR-004, FR-005 |
| FND-006 | medium | FR-003 deduplication uses "first occurrence" but defines no unique key — same-name athletes on same team (siblings) could be incorrectly merged | FR-003 |
| FND-007 | medium | Athlete in multiple categories/waves produces duplicate schedule entries with potentially conflicting logistics times | FR-003, FR-005, FR-007 |
| FND-008 | medium | No FR addresses HTML encoding or special characters in names/teams — could break NFR-002 accuracy guarantee | FR-003, NFR-002 |
| FND-009 | medium | Warmup period can overlap staging when arrival >= warmup+staging but warmupEnd > stagingTime — no validation prevents this | FR-006, FR-007 |
| FND-010 | medium | No persistence model specified — unclear if parsed data is DynamoDB, session, or ephemeral | spec.md, FR-002 through FR-007 |
| FND-011 | medium | EventBridge event failure is silent — no dead-letter, retry, or monitoring specified | spec.md |
| FND-012 | medium | No idempotency for re-importing same event URL — unclear if creates new, overwrites, or merges | FR-001, FR-002 |
| FND-013 | medium | No FR specifies how to handle RaceResult's dynamic JS rendering (headless browser vs API interception) | US-001, FR-002, FR-003 |
| FND-014 | medium | Mixed-category waves give all athletes the Varsity/JV arrival default (70min) even if they are Freshman — unstated and potentially confusing | FR-006 |
| FND-015 | low | Team names with whitespace-only differences ("Corner Canyon" vs "Corner  Canyon") treated as different teams | FR-004 |
| FND-016 | low | Empty/whitespace-only participant names not addressed — would appear as blank in schedule | FR-003, FR-005 |
| FND-017 | low | Determinism guarantee untested — no test runs same input twice to verify identical output | spec.md, IT-002 |
| FND-018 | low | NFR-001 load test is sequential, not concurrent — does not validate race-morning concurrent usage | NFR-001 |
| FND-019 | low | No FR for events with waves but no categories — uncategorized athletes have undefined grouping | FR-005, FR-003 |
| FND-020 | low | No authorization model — any authenticated org user can import/view/modify schedules | spec.md, FR-001 through FR-007 |
| FND-021 | low | IT-001 depends on specific external event (411620) remaining accessible — no mandated cache | IT-001 |
| FND-022 | low | No maximum event size defined — 5000+ participants could exceed memory/latency bounds | NFR-001, FR-003, FR-005 |
