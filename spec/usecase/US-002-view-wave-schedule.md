---
id: US-002
title: "View team wave schedule grouped by wave and category"
type: US
relationships:
  - target: "ix://switchback/squadlogic/StR-001"
    type: "traces_to"
---

# [US-002] View team wave schedule grouped by wave and category

## Story

**As a** coach managing athletes across multiple race categories
**I want** to view my team's race schedule organized by wave and then by category within each wave
**So that** I can see at a glance which athletes race when and coordinate preparation across overlapping wave windows.

This story reflects the coach's need for a structured view that mirrors the operational reality of race day: waves go off at specific times, and within each wave multiple categories may be racing. The coach needs to know who is in each wave to allocate preparation time and attention.

## Context

At a typical Utah High School Cycling League race, a team may have athletes spread across 6-8 categories (Varsity Boys, Varsity Girls, JV Boys, JV Girls, Sophomore Boys, Sophomore Girls, Freshman Boys, Freshman Girls) and 3-5 waves. A coach needs to know which athletes are in the first wave so they can prioritize warmup attention, while also tracking later waves. The current approach is a hand-written list on a whiteboard or printed spreadsheet — neither of which connects to the actual registration data.

## Acceptance Examples (Illustrative)

### [US-002-EX-1] Team schedule shows athletes grouped by wave then category

- **Given** an imported race event with participants from the coach's team across multiple waves and categories
- **When** the coach views the wave schedule for their team
- **Then** the schedule shows each wave in start-time order, with categories listed within each wave, and athletes listed under their category with bib numbers

### [US-002-EX-2] Team with athletes in only one wave

- **Given** an imported race event where the coach's team has athletes in only one wave
- **When** the coach views the wave schedule
- **Then** only the relevant wave is displayed with its categories and athletes

### [US-002-EX-3] Empty team selection

- **Given** an imported race event where the selected team has no registered participants
- **When** the coach attempts to view the wave schedule
- **Then** the system indicates no athletes were found for the selected team

## Constraints (Contextual)

Coaches access the schedule on mobile devices trackside. The wave schedule should be scannable on a small screen. This is a usability expectation that may drive layout requirements.

## Dependencies (Contextual)

**Upstream**: Successful race event import (US-001) providing parsed participant data. **Downstream**: Functional requirements for team listing (FR-004) and wave schedule generation (FR-005).

## Priority and Risk (Informative)

Business value is high — this is the core deliverable of the feature. Low technical risk since the grouping logic is straightforward once the data is parsed. The primary risk is data quality: if RaceResult data lacks wave assignments, the schedule cannot be generated.

## Traceability (Informative)

This user story traces to StR-001. It drives functional requirements for team listing and wave schedule generation.
