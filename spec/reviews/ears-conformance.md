---
id: SR-008
title: "EARS conformance analysis of Race Day Wave Schedule spec"
type: SpecReview
analysis: ears-conformance
scope: "spec/functional/**/*.md, spec/non-functional/**/*.md"
review_set: all
---

## Summary

Analyzed all SHALL statements across 7 FR and 2 NFR artifacts for EARS pattern compliance. Most statements demonstrate strong EARS discipline with named system subjects and concrete responses. The primary recurring defects are multi-SHALL compound sentences (FR-004, FR-006) that bundle two obligations into one statement, a few vague verbs ("accept", "allow", "apply", "present"), and one statement where the user is the subject instead of the system (FR-004).

## Findings

| ID | Severity | Summary | Refs |
|----|----------|---------|------|
| FND-001 | high | FR-004 Description places obligation on the user ("The user SHALL select") — FRs must have the system as subject | FR-004 |
| FND-002 | medium | FR-004 Description contains two SHALLs in one sentence ("SHALL derive and present...The user SHALL select") — violates single-SHALL rule | FR-004 |
| FND-003 | medium | FR-004 Description bundles positive and negative SHALLs in one sentence ("SHALL only accept...SHALL NOT be permitted") | FR-004 |
| FND-004 | medium | FR-006 Description bundles two SHALLs ("SHALL be configurable per wave...SHALL default to 70 minutes") | FR-006 |
| FND-005 | medium | FR-006 Behavior bullet 7 bundles validation SHALL and error-response SHALL in one sentence | FR-006 |
| FND-006 | medium | FR-002 Description error clause "identifying which operation failed" is not fully concrete — does not specify error structure | FR-002 |
| FND-007 | low | FR-001 and FR-006 use vague verb "accept" — does not distinguish receive, validate, persist, or acknowledge | FR-001, FR-006 |
| FND-008 | low | FR-006 Behavior uses vague verbs "apply" and "allow" — "apply defaults" and "allow override" lack concrete system response | FR-006 |
| FND-009 | low | FR-004 Behavior uses vague verb "present" — does not specify what the system produces (rendered element vs data structure) | FR-004 |
| FND-010 | low | FR-001 Behavior bullets 3-5 use Ubiquitous pattern for conditional rejection — should use Unwanted-behavior pattern ("If...then") | FR-001 |
| FND-011 | low | FR-005 Behavior bullet 3 embeds two conditions in one SHALL (ordered by start time OR alphabetically) — should be split | FR-005 |
| FND-012 | low | FR-006 CON-1 and CON-2 lack named subjects ("The system") in their SHALL statements | FR-006 |
| FND-013 | low | NFR-001 uses undefined trigger "under normal network conditions" — not measurable | NFR-001 |
| FND-014 | low | StR-001 uses lowercase "shall" — inconsistent with uppercase SHALL convention in FRs/NFRs | StR-001 |
