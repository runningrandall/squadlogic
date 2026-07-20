---
id: StR-001
title: "Team managers need automated race day schedules from registration data"
type: StR
relationships:
  - target: "ix://switchback/squadlogic/US-001"
    type: "satisfied_by"
  - target: "ix://switchback/squadlogic/US-002"
    type: "satisfied_by"
  - target: "ix://switchback/squadlogic/US-003"
    type: "satisfied_by"
---

# [StR-001] Team managers need automated race day schedules from registration data

## Stakeholder Need

Team managers and coaches shall be able to generate a structured race day schedule for their team's athletes directly from race registration data published on RaceResult, so that every athlete knows when to arrive, warm up, stage, and race without manual cross-referencing of registration lists and wave assignments.

## Rationale

Mountain bike race events organized through leagues such as the Utah High School Cycling League publish registration and wave assignment data on RaceResult (my.raceresult.com). Team managers currently must manually browse the RaceResult participant list, identify their team's athletes, note each athlete's wave and category, cross-reference wave start times, and then manually build a schedule that accounts for warmup and staging logistics. This process is error-prone, time-consuming, and must be repeated for every race event. Errors in the manual process lead to athletes missing warmup windows, arriving late to staging, or being unprepared for their wave start.

## Validation Criteria

This need is considered satisfied when a team manager can provide a RaceResult event URL, select their team, configure logistics timing, and receive a complete per-athlete schedule showing arrival, warmup, staging, and race start times — all derived automatically from the registration data with no manual data entry beyond the URL and team selection.

## Stakeholders

The primary stakeholders are **team managers and coaches** who are responsible for race day coordination and athlete preparation. Secondary stakeholders are **athletes and parents** who consume the generated schedule. The **organization administrator** is an affected party who benefits from standardized race day operations across teams.

## Context and Assumptions

Race events are published on RaceResult with publicly accessible participant lists. Each event has defined waves with start times, and participants are assigned to categories and waves. It is assumed that the RaceResult page structure provides sufficient data to extract participant names, teams, categories, and wave assignments. The team name on RaceResult matches or can be matched to the team managed in Switchback.

## Stakeholder Constraints (Contextual)

Team managers expect the import and schedule generation to complete within seconds, not minutes, as they often need to generate schedules on race morning with limited connectivity. The generated schedule must be readable on mobile devices since coaches reference it trackside.

## Dependencies

**Upstream**: The availability of race event data on RaceResult as a publicly accessible page. **Downstream**: Functional requirements for URL validation, data parsing, team selection, wave schedule generation, and logistics timeline calculation.

## Priority and Risk (Informative)

Business value is high because race day schedule generation is a recurring, manual pain point for every race event throughout the season. Urgency is medium — the feature enhances operations but does not block core team management. Risk if unmet is continued manual schedule building with associated errors and coach frustration.

## Notes (Informative)

Future consideration: supporting other race registration platforms beyond RaceResult (e.g., BikeReg, USA Cycling). This is explicitly out of scope for this specification but may inform interface design decisions.

## Traceability

This stakeholder need is expected to be satisfied by user stories for race event import (US-001), wave schedule viewing (US-002), and logistics configuration (US-003), which in turn drive the functional requirements for the feature.
