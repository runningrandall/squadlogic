---
id: Task-003
title: "FR-003 — Participant extraction"
type: Task
status: RETIRED
track: A
priority: P0
relationships:
  - target: ix://switchback/race-day-wave-schedule/Task-002
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/FR-003
    type: references
  - target: ix://switchback/race-day-wave-schedule/TC-015
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-016
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-017
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-018
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-019
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-020
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-021
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/IT-001
    type: verifies
---
# Task-003: FR-003 — Participant extraction

**Status: RETIRED** — superseded by Task-017 (FR-014 call-up list participant extraction); there is no RaceResult dynamic API to fetch anymore.

## Scope
Implement participant list extraction from the RaceResult dynamic API endpoint. Discover API key and listname from the initial page fetch (Task-002), construct the participant API URL, fetch the response, parse into structured participant records.

## Subtasks
- [ ] **API discovery.** Extend `raceresult-parser.ts` to extract the API key and listname parameters from the page content or RRPublish initialization.
- [ ] **Participant fetch.** Add method to `raceresult-client.ts` for GET to `my-us-1.raceresult.com/{eventId}/participants/list?key={key}&listname={listname}&...`. Wait for complete response.
- [ ] **Participant parser.** Parse API response into `{firstName, lastName, team, category, bibNumber}` records. Preserve exact field values without normalization.
- [ ] **Deduplication.** Deduplicate on `firstName+lastName+team`, keeping record with most complete data.
- [ ] **DynamoDB persistence.** Store parsed participants in DynamoDB as ephemeral import data (keyed by eventId).
- [ ] **Unit tests.** TC-016–TC-020 (record structure, team preservation, empty bib, dedup).
- [ ] **Integration tests.** TC-015 (200 participants), TC-021 (full response wait).

## Deliverables
- API discovery logic
- Participant fetch + parse pipeline
- DynamoDB persistence for import data
- Test files covering extraction, dedup, empty fields, no-participants error

## Notes
- The API endpoint uses a different subdomain (`my-us-1.raceresult.com` vs `my.raceresult.com`). Handle both.
- Unblocks: Task-004 (team listing needs participant counts).
