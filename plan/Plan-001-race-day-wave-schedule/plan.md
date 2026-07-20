---
id: Plan-001
title: "Race Day Wave Schedule — Implementation Plan"
type: Plan
status: complete
relationships:
  - target: ix://switchback/race-day-wave-schedule/StR-001
    type: references
  - target: ix://switchback/race-day-wave-schedule/FR-001
    type: references
  - target: ix://switchback/race-day-wave-schedule/FR-002
    type: references
  - target: ix://switchback/race-day-wave-schedule/FR-003
    type: references
  - target: ix://switchback/race-day-wave-schedule/FR-004
    type: references
  - target: ix://switchback/race-day-wave-schedule/FR-005
    type: references
  - target: ix://switchback/race-day-wave-schedule/FR-006
    type: references
  - target: ix://switchback/race-day-wave-schedule/FR-007
    type: references
  - target: ix://switchback/race-day-wave-schedule/FR-008
    type: references
  - target: ix://switchback/race-day-wave-schedule/FR-009
    type: references
  - target: ix://switchback/race-day-wave-schedule/FR-010
    type: references
  - target: ix://switchback/race-day-wave-schedule/FR-011
    type: references
  - target: ix://switchback/race-day-wave-schedule/NFR-001
    type: references
  - target: ix://switchback/race-day-wave-schedule/NFR-002
    type: references
---
# Implementation Plan: Race Day Wave Schedule

## Requirements Summary

### Stakeholder Requirements
- [ ] **StR-001**: Team managers need automated race day schedules from registration data

### Functional Requirements
- [ ] **FR-001**: Accept and validate RaceResult event URL
- [ ] **FR-002**: Parse race event metadata from RaceResult (page fetch, JSON-LD, teams dropdown)
- [ ] **FR-003**: Extract participant list from RaceResult dynamic API
- [ ] **FR-004**: List available teams from parsed event data (dropdown, counts)
- [ ] **FR-005**: Generate team wave schedule grouped by wave and category
- [ ] **FR-006**: Define race day logistics timing parameters (per-wave arrival, category-aware defaults)
- [ ] **FR-007**: Calculate per-athlete logistics timeline (per-category staggered times)
- [ ] **FR-008**: Manage wave schedule configuration (DynamoDB, seed defaults, admin CRUD)
- [ ] **FR-009**: Export schedule as branded PDF
- [ ] **FR-010**: Export schedule to Google Sheets
- [ ] **FR-011**: Configure team branding (name, logo, colors)

### Non-Functional Requirements
- [ ] **NFR-001**: External data fetch latency (p95 ≤ 10s)
- [ ] **NFR-002**: Parsed data presentation accuracy (100% field-level)

## Dependency Graph

### Core dependency edges
- `FR-001 -> FR-002`
  Reason: Metadata parsing requires a validated URL with extracted event ID.
- `FR-002 -> FR-003`
  Reason: Participant API fetch requires the API key and listname discovered during page fetch.
- `FR-002 -> FR-004`
  Reason: Team listing populates from the teams array extracted by FR-002.
- `FR-003 -> FR-004`
  Reason: Team listing annotates each team with participant count from FR-003.
- `FR-003 -> FR-005`
  Reason: Wave schedule filters participants to the selected team.
- `FR-004 -> FR-005`
  Reason: Wave schedule requires a team selection from the dropdown.
- `FR-008 -> FR-005`
  Reason: Wave schedule maps categories to waves using the configuration.
- `FR-008 -> FR-006`
  Reason: Logistics defaults use wave config to determine which categories are Varsity/JV A.
- `FR-005 -> FR-006`
  Reason: Per-wave arrival defaults need the wave structure (which categories in each wave).
- `FR-005 -> FR-007`
  Reason: Timeline calculation operates on the generated wave schedule.
- `FR-006 -> FR-007`
  Reason: Timeline calculation uses the logistics parameters.
- `FR-007 -> FR-009`
  Reason: PDF export renders the enriched schedule with logistics times.
- `FR-007 -> FR-010`
  Reason: Sheets export populates from the enriched schedule.
- `FR-011 -> FR-009`
  Reason: PDF export applies team branding (logo, colors).

### Shared dependencies
- **ElectroDB entity + DynamoDB single-table patterns** are shared by FR-008 (wave config), FR-006 (logistics config persistence), and FR-011 (branding config). Extract the DynamoDB table extension as a discrete deliverable (Task-005) before dependent tasks.
- **RaceResult fetch infrastructure** (HTTP client, timeout handling, error mapping) is shared by FR-002 and FR-003. Implement once in Task-002, reused by Task-003.

### Cross-cutting constraints
- `NFR-001` constrains the combined fetch+parse path (FR-002 + FR-003). Timeout config must be wired early.
- `NFR-002` constrains FR-003 → FR-005 → FR-007 data accuracy. Field preservation must be verified end-to-end.
- **Rate limiting** (CloudFront/WAF) applies to all outbound RaceResult requests. Configure as infrastructure before import pipeline goes live.

### The seams
This is greenfield — no existing race day code exists in the Switchback codebase. New entities (wave config, race event import, logistics config, team branding) extend the existing DynamoDB single-table via ElectroDB. New Fastify route handlers follow the existing hexagonal pattern (`handlers/ → application/ → domain/ → ports/ → adapters/ → entities/`). The frontend adds new pages under `/(dashboard)/race-day/`. S3 is already used for frontend hosting; team logo uploads add a new bucket or prefix.

---

## Test Plan

### Unit Tests
- [ ] **TC-001–TC-007** (FR-001): URL validation — accept valid patterns, reject HTTP/wrong-host/empty/non-numeric
- [ ] **TC-009** (FR-002): Date normalization to ISO 8601
- [ ] **TC-012** (FR-002): Parse error for missing metadata fields
- [ ] **TC-016–TC-020** (FR-003): Participant record structure, team preservation, dedup logic
- [ ] **TC-022–TC-025** (FR-004): Dropdown sorting, counts, zero-participant exclusion, empty array
- [ ] **TC-027–TC-035** (FR-005): Wave/category grouping, sorting, unassigned category, omit empty waves
- [ ] **TC-036–TC-047** (FR-006): Category-aware defaults (70/60), overrides, range validation, boundary values, cross-field constraint
- [ ] **TC-048–TC-054** (FR-007): Per-category timeline arithmetic, staggered starts, override, recalculation
- [ ] **TC-059–TC-060** (FR-008): Duplicate category rejection, invalid time format
- [ ] **TC-069** (FR-009): PDF filename pattern
- [ ] **TC-079–TC-082** (FR-011): Logo size/format validation, hex color validation, defaults

### Integration Tests
- [ ] **TC-008, TC-010–TC-011, TC-013–TC-015, TC-021** (FR-002, FR-003): RaceResult fetch, error paths, API response parsing
- [ ] **TC-044** (FR-006): Parameter update without re-import
- [ ] **TC-055–TC-058, TC-061** (FR-008): Config seed, admin CRUD, session override, GLOBAL scope
- [ ] **TC-070–TC-074, TC-076** (FR-010): Google Sheets create, title, data, URL, no-overwrite
- [ ] **TC-077–TC-078** (FR-011): Branding persistence, S3 logo upload
- [ ] **IT-003** (TC-093–TC-105): RaceResult structure validation — DOM selectors, API contract, baseline drift
- [ ] **IT-004**: Team listing integration
- [ ] **IT-005**: Logistics parameter validation + category-aware defaults

### E2E Tests
- [ ] **TC-026** (FR-004): Dropdown is dropdown (no freeform)
- [ ] **TC-062–TC-068** (FR-009): PDF download, header, body, colors, default styling, print format
- [ ] **TC-075** (FR-010): OAuth denial error handling
- [ ] **TC-083–TC-084** (FR-011): Color wheel control, live preview
- [ ] **IT-007** (TC-106–TC-125): Full URL → import → team select → schedule → logistics → PDF export

### Verification (NFRs)
- [ ] **TC-085–TC-087** (NFR-001): Fetch+parse p50/p95 latency, timeout config
- [ ] **TC-088–TC-089** (NFR-002): Field-level accuracy, participant count accuracy

---

## Remaining Work

### Track A: Import Pipeline (serial — critical path)
- **A1 = Task-001** FR-001 URL validation — Easy, ~80 lines; exit: valid URLs accepted, invalid rejected with 422.
- **A2 = Task-002** FR-002 Event metadata parsing — Hard, ~250 lines; exit: event name/date/location/teams extracted from live RaceResult page.
- **A3 = Task-003** FR-003 Participant extraction — Hard, ~200 lines; exit: all participants extracted from dynamic API with correct fields.
- **A4 = Task-004** FR-004 Team listing — Easy, ~100 lines; exit: sorted dropdown with participant counts rendered.
- **Gate = Task-005-gate** Import Pipeline — measures: IT-001 passes against live RaceResult event 411620; pass: all 8 success criteria hold.

### Track B: Wave Configuration (parallel — can start immediately)
- **B1 = Task-005** FR-008 Wave config entity — Medium, ~300 lines; exit: DynamoDB entity seeded with 2026 league schedule, admin CRUD works, GLOBAL scope.

### Track C: Branding & Contract Testing (parallel — can start immediately)
- **C1 = Task-009** FR-011 Team branding — Medium, ~250 lines; exit: team name/logo/colors persisted, S3 upload works, color wheel renders.
- **C2 = Task-012** IT-006 RaceResult structure validation — Medium, ~200 lines; exit: 13 structural assertions pass against live site, baseline snapshot stored.

### Track S: Schedule Generation (join — after Track A gate + Track B)
- **S1 = Task-006** FR-005 Wave schedule generation — Medium, ~200 lines; exit: team athletes grouped by wave/category with per-category start/stage times.
- **S2 = Task-007** FR-006 Logistics parameters — Medium, ~200 lines; exit: category-aware defaults (70/60), range validation, cross-field constraint, DynamoDB persistence.
- **S3 = Task-008** FR-007 Logistics timeline — Easy, ~120 lines; exit: per-category arrival/warmup/staging times calculated correctly for staggered starts.
- **Gate = Task-008-gate** Schedule Accuracy — measures: IT-002 passes with category-aware defaults and staggered times; pass: all 10 success criteria hold.

### Track D: Export (after Schedule gate + Track C branding)
- **D1 = Task-010** FR-009 PDF export — Medium, ~300 lines; exit: branded PDF downloads with correct layout, colors, and logistics data.
- **D2 = Task-011** FR-010 Google Sheets export — Medium, ~250 lines; exit: new spreadsheet created in user's Drive with formatted schedule data.

### Track E: Verification (terminal — after all tracks)
- **E1 = Task-013** IT-007 E2E flow — Medium, ~300 lines; exit: all 20 success criteria pass from URL submission through PDF export.
- **E2 = Task-014** NFR verification — Easy, ~100 lines; exit: p50 ≤ 5s, p95 ≤ 10s, 100% field accuracy.

## Parallel Execution Summary

```
Time →
─────────────────────────────────────────────────────────────────────────

Track A  [Task-001]→[Task-002]→[Task-003]→[Task-004]→[GATE:Import]─┐
                                                                     │
Track B  [Task-005: Wave Config]─────────────────────────────────────┤
                                                                     │
Track C  [Task-009: Branding]────────────────────────────────────┐   │
         [Task-012: Contract Test]───────────────────────────    │   │
                                                             │   │   │
                                                             │   ├───┤
                                                             │   │   │
Track S  ════════════════════════════════[Task-006]→[Task-007]→[Task-008]→[GATE:Schedule]─┐
                                                                                           │
Track D  ═══════════════════════════════════════════════════════════[Task-010: PDF]─────────┤
                                                                    [Task-011: Sheets]─────┤
                                                                                           │
Track E  ══════════════════════════════════════════════════════════════[Task-013: E2E]──────┤
                                                                       [Task-014: NFR]─────┘
```

## Task File Mapping

| Task | Track | Owns (references) | Verified by (verifies) | Status |
|------|-------|--------------------|------------------------|--------|
| Task-001 | A | FR-001 | TC-001–TC-007, IT-003 | not_started |
| Task-002 | A | FR-002 | TC-008–TC-014, IT-001 | not_started |
| Task-003 | A | FR-003 | TC-015–TC-021, IT-001 | not_started |
| Task-004 | A | FR-004 | TC-022–TC-026, IT-004 | not_started |
| Task-005 | B | FR-008 | TC-055–TC-061 | not_started |
| Task-006 | S | FR-005 | TC-027–TC-035, IT-002 | not_started |
| Task-007 | S | FR-006 | TC-036–TC-047, IT-005 | not_started |
| Task-008 | S | FR-007 | TC-048–TC-054, IT-002 | not_started |
| Task-009 | C | FR-011 | TC-077–TC-084 | not_started |
| Task-010 | D | FR-009 | TC-062–TC-069 | not_started |
| Task-011 | D | FR-010 | TC-070–TC-076 | not_started |
| Task-012 | C | IT-006 | TC-093–TC-105 | not_started |
| Task-013 | E | IT-007 | TC-106–TC-125 | not_started |
| Task-014 | E | NFR-001, NFR-002 | TC-085–TC-089 | not_started |

## Coordination Rules

- **Single-writer on ElectroDB entities:** Task-005 (wave config entity) must merge before Task-006 or Task-007 begin, since they reference the entity definition. Task-009 (branding entity) is independent and can merge anytime.
- **RaceResult fetch infrastructure:** Task-002 establishes the HTTP client, timeout handling, and error mapping patterns. Task-003 reuses them. Do not start Task-003 until Task-002's fetch layer is stable.
- **Do not start Track S** until both the Import Pipeline gate passes AND Task-005 (wave config) is done. Starting early risks building against assumptions about the wave config schema.
- **Do not start Track D exports** until the Schedule Accuracy gate passes. PDF/Sheets rendering against incorrect schedule data wastes effort.
- **Merge sequencing:** Tasks within a track merge in order. Cross-track merges are safe since they touch different files/directories. Exception: Task-005 and Task-007 both write to DynamoDB entity definitions — coordinate to avoid schema conflicts.
- **IT-006 (Task-012) should run daily in CI** once merged, independent of other tracks. It's the canary for RaceResult changes.
