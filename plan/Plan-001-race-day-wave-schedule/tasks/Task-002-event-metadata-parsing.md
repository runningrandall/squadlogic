---
id: Task-002
title: "FR-002 — Event metadata parsing"
type: Task
status: RETIRED
track: A
priority: P0
relationships:
  - target: ix://switchback/race-day-wave-schedule/Task-001
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/FR-002
    type: references
  - target: ix://switchback/race-day-wave-schedule/TC-008
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-009
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-010
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-011
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-012
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-013
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-014
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/IT-001
    type: verifies
---
# Task-002: FR-002 — Event metadata parsing

**Status: RETIRED** — superseded by Task-016 (FR-013 call-up list category schedule parsing); there is no RaceResult page to fetch anymore.

## Scope
Implement the RaceResult page fetch and metadata extraction. Fetch the event page HTML, parse JSON-LD for event name/date/location, extract teams from the ListControl select element. Establish the HTTP client + timeout + error mapping infrastructure reused by Task-003.

## Subtasks
- [ ] **HTTP client adapter.** Create `backend/src/adapters/raceresult-client.ts` with fetch, timeout (8s default), and error mapping (non-200 → fetch error, timeout → timeout error).
- [ ] **Metadata parser.** Create `backend/src/application/raceresult-parser.ts` extracting JSON-LD schema data (name, startDate, location) and teams dropdown (`#divRRPublish > div:nth-child(2) > div.SelectorParent.OnlyOneList > div.Selector select`).
- [ ] **Date normalization.** Parse RaceResult date formats into ISO 8601.
- [ ] **Service layer.** Create `backend/src/application/race-event-service.ts` orchestrating fetch → parse → return metadata object.
- [ ] **Port interface.** Define `RaceResultPort` in `backend/src/ports/raceresult-port.ts`.
- [ ] **Unit tests.** TC-009 (date normalization), TC-012 (missing field error).
- [ ] **Integration tests.** TC-008, TC-010, TC-011, TC-013, TC-014.

## Deliverables
- HTTP client adapter with timeout and error handling
- Metadata parser with JSON-LD and DOM extraction
- Service + port following hexagonal pattern
- Test files covering success, HTTP errors, timeouts, missing fields, empty/populated teams

## Notes
- This task establishes the HTTP fetch infrastructure reused by Task-003. Design the client adapter for reuse.
- The CSS selector for teams is a known volatility boundary — isolate it for easy update.
- Unblocks: Task-003 (participant API fetch), Task-004 (team listing).
