---
id: US-003
title: "Configure logistics timing for race day preparation"
type: US
relationships:
  - target: "ix://switchback/squadlogic/StR-001"
    type: "traces_to"
---

# [US-003] Configure logistics timing for race day preparation

## Story

**As a** team manager coordinating race day operations
**I want** to set timing parameters for arrival, warmup, and staging relative to each wave's start time
**So that** I can generate a complete per-athlete timeline that tells each athlete exactly when to arrive, start warming up, and report to staging.

This story captures the team manager's need to layer operational logistics on top of the raw wave schedule. Different races and venues may require different timing buffers, so the parameters must be configurable rather than hardcoded.

## Context

Race day preparation follows a predictable sequence for each athlete: arrive at the venue, check in, begin warmup (on-trainer or pre-ride), move to the staging area, and line up for the wave start. The duration of each phase varies by venue (e.g., a venue with a long warmup loop may need more warmup time), race conditions (weather, altitude), and team preference. Coaches currently calculate these times mentally or on paper for each wave, which becomes complex when managing 15-30 athletes across 4-5 waves.

## Acceptance Examples (Illustrative)

### [US-003-EX-1] Set logistics parameters and see athlete timelines

- **Given** a wave schedule for the team has been generated
- **When** the team manager sets arrival buffer to 60 minutes, warmup duration to 30 minutes, and staging buffer to 15 minutes
- **Then** each athlete's timeline shows their personal arrival time, warmup window, and staging time calculated backward from their wave's start time

### [US-003-EX-2] Adjust parameters and timelines update

- **Given** logistics parameters are already configured
- **When** the team manager changes the warmup duration from 30 to 20 minutes
- **Then** all athlete timelines recalculate immediately to reflect the new warmup duration

### [US-003-EX-3] Different waves produce different absolute times

- **Given** Wave 1 starts at 9:00 AM and Wave 3 starts at 10:30 AM, both with 60-minute arrival buffer
- **When** the team manager views the logistics timeline
- **Then** Wave 1 athletes show arrival at 8:00 AM and Wave 3 athletes show arrival at 9:30 AM

## Options (Exploratory)

Potential extensions discussed: per-wave parameter overrides (e.g., longer warmup for Varsity); saved logistics presets per venue; and push notifications to athletes at their calculated times. These are not committed and may or may not be pursued.

## Constraints (Contextual)

Team managers expect the timeline to update in real-time as parameters are adjusted, without requiring a page reload or re-import. This is a usability expectation from discovery.

## Dependencies (Contextual)

**Upstream**: Wave schedule generation (US-002) providing wave start times and athlete assignments. **Downstream**: Functional requirements for logistics parameter definition (FR-006) and per-athlete timeline calculation (FR-007).

## Priority and Risk (Informative)

Business value is high — the logistics timeline transforms a static wave listing into an actionable race day plan. Technical risk is low since the calculation is deterministic arithmetic. The main risk is usability: the parameters must be intuitive for non-technical team managers.

## Traceability (Informative)

This user story traces to StR-001. It drives functional requirements for logistics parameter definition and per-athlete timeline calculation.
