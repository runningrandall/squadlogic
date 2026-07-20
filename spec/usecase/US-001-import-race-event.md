---
id: US-001
title: "Import race event data from a RaceResult URL"
type: US
relationships:
  - target: "ix://switchback/squadlogic/StR-001"
    type: "traces_to"
---

# [US-001] Import race event data from a RaceResult URL

## Story

**As a** team manager preparing for a race event
**I want** to provide a RaceResult event URL and have the system extract the event's participant roster, categories, and wave assignments
**So that** I have a structured dataset of all registered participants without manually copying data from the RaceResult website.

This story captures the team manager's need to bridge the gap between the external race registration platform and their team management workflow. The mechanism for parsing or the specific data fields extracted are left to the functional requirements.

## Context

Race events organized through the Utah High School Cycling League and similar organizations publish registration data on RaceResult (my.raceresult.com). Each event has a unique URL (e.g., `https://my.raceresult.com/411620/`). The participant data includes athlete names, team affiliations, race categories (e.g., JV Boys, Varsity Girls), bib numbers, and wave assignments. Today, team managers must manually browse these pages and transcribe the relevant information for their team — a process repeated for every race throughout the season.

## Acceptance Examples (Illustrative)

These examples clarify the team manager's expectations. They are illustrative only — not test cases and not verification criteria.

### [US-001-EX-1] Valid RaceResult URL is accepted and data is extracted

- **Given** a publicly accessible RaceResult event URL like `https://my.raceresult.com/411620/`
- **When** the team manager submits the URL
- **Then** the system retrieves the event data and displays the event name, date, and a summary of extracted participants

### [US-001-EX-2] Invalid or unreachable URL is reported

- **Given** a URL that is not a valid RaceResult event page or is unreachable
- **When** the team manager submits the URL
- **Then** the system informs the team manager that the URL could not be processed and suggests checking the URL

### [US-001-EX-3] Event with no participants is surfaced

- **Given** a valid RaceResult event URL for an event with no registered participants
- **When** the team manager submits the URL
- **Then** the system informs the team manager that no participants were found for this event

## Options (Exploratory)

Approaches discussed during discovery: server-side scraping of the RaceResult HTML page; leveraging RaceResult's dynamic JavaScript API endpoints if available; or allowing manual CSV upload as a fallback. These options may or may not influence later requirements.

## Constraints (Contextual)

Team managers noted that race day mornings often have limited cellular connectivity at mountain venues. The import should work on a single page load without requiring multiple round-trips. This context may be refined during requirements analysis.

## Dependencies (Contextual)

**Upstream**: The RaceResult platform's publicly accessible event pages. **Downstream**: Functional requirements for URL validation (FR-001), event metadata parsing (FR-002), and participant extraction (FR-003).

## Priority and Risk (Informative)

Business value is high as this is the entry point for the entire feature — without successful data import, no schedule can be generated. The primary risk is volatility in the RaceResult page structure, which could break parsing logic without warning.

## Notes (Informative)

The RaceResult page loads participant data dynamically via JavaScript (RRPublish library). The static HTML contains minimal data. This is a technical constraint that will influence the parsing approach but should not be specified at the user story level.

## Traceability (Informative)

This user story traces to StR-001 (team managers need automated race day schedules). It is expected to drive functional requirements for URL validation, event metadata parsing, and participant extraction.
