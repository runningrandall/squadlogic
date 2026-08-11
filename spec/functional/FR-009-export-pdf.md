---
id: FR-009
title: "Export schedule as PDF"
type: FR
relationships:
  - target: "ix://switchback/squadlogic/US-004"
    type: "implements"
  - target: "ix://switchback/squadlogic/FR-007"
    type: "depends_on"
  - target: "ix://switchback/squadlogic/FR-011"
    type: "depends_on"
---

# [FR-009] Export schedule as PDF

## Description

The system SHALL generate a downloadable PDF document from the enriched wave schedule (output of [FR-007](./FR-007-athlete-logistics-timeline.md)). The PDF SHALL apply the team's configured branding ([FR-011](./FR-011-team-branding.md)) including team name, logo, and primary/tertiary colors. The PDF SHALL be formatted for standard letter-size (8.5x11") printing. Each athlete row SHALL include a "Staging #" value — the athlete's call-up/staging order number as sourced from the uploaded call-up list ([FR-014](./FR-014-extract-callup-participants.md)).

## Inputs

- Enriched wave schedule with logistics timelines (output of [FR-007](./FR-007-athlete-logistics-timeline.md))
- Team branding configuration (output of [FR-011](./FR-011-team-branding.md)): team name, logo URL, primary color, tertiary color
- Event metadata: event name, event date, event location

## Outputs

- A downloadable PDF file containing:
  - Header: team logo (if configured), team name, event name, event date, event location
  - Body: wave schedule table grouped by wave, then category, showing each athlete's Staging # (call-up order number) and per-athlete logistics times (arrival, warmup start, warmup end, staging, race start)
  - Styling: primary color applied to header background and wave group headers, tertiary color applied to category sub-headers and table accents

## Behavior

- The system SHALL render the PDF with the team logo in the top-left of the header when a logo is configured.
- The system SHALL display the team name prominently in the header.
- The system SHALL display the event name, date, and location below the team name.
- The system SHALL render each wave as a distinct section with the wave name and start time range.
- Within each wave section, the system SHALL render each category as a sub-table with columns: Athlete Name, Bib #, Staging #, Arrival, Warmup Start, Warmup End, Staging, Race Start.
- The Staging # column SHALL display the athlete's call-up/staging order number as extracted from the uploaded call-up list; when no call-up number is available for an athlete, the cell SHALL be left blank.
- The system SHALL apply the primary color to the header background and wave section headers.
- The system SHALL apply the tertiary color to category sub-headers and alternating row accents.
- When no branding is configured, the system SHALL use default styling (neutral gray header, no logo).
- The system SHALL name the downloaded file as `{teamName}_{eventDate}_schedule.pdf`.

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-009-AC-1 | Given a generated schedule with branding configured, clicking "Export PDF" downloads a PDF file | Test |
| FR-009-AC-2 | The PDF header displays the team logo, team name, event name, event date, and event location | Inspection |
| FR-009-AC-3 | The PDF body contains all waves and categories from the enriched schedule with correct athlete logistics times | Test |
| FR-009-AC-4 | The primary color is applied to the header and wave section headers | Inspection |
| FR-009-AC-5 | The tertiary color is applied to category sub-headers and row accents | Inspection |
| FR-009-AC-6 | Given no branding configured, the PDF uses default neutral styling with no logo | Test |
| FR-009-AC-7 | The PDF is formatted for letter-size (8.5x11") printing with readable font sizes | Inspection |
| FR-009-AC-8 | The downloaded file is named `{teamName}_{eventDate}_schedule.pdf` | Test |
| FR-009-AC-9 | Each athlete row includes a Staging # value taken from the athlete's call-up number in the uploaded call-up list | Test |

## Dependencies

- **Upstream**: [FR-007](./FR-007-athlete-logistics-timeline.md) enriched schedule, [FR-011](./FR-011-team-branding.md) team branding
- **Downstream**: None
