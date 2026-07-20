---
id: US-004
title: "Export and customize race day schedule"
type: US
relationships:
  - target: "ix://switchback/squadlogic/StR-001"
    type: "traces_to"
---

# [US-004] Export and customize race day schedule

## Story

**As a** team manager distributing race day schedules to athletes and parents
**I want** to export the generated schedule as a PDF or Google Sheet with my team's branding (name, logo, and colors)
**So that** I can print professional-looking schedules at the venue or share them digitally before race day.

This story captures the need to get the schedule out of the app and into the hands of athletes, parents, and assistant coaches who may not have access to the platform.

## Context

Coaches and team managers routinely print race day schedules and post them at the team tent or hand them out at pre-race meetings. A plain data table is functional but a branded schedule with the team's logo and colors is more professional, easier to spot in a crowded venue, and builds team identity. Google Sheets export enables collaborative editing (e.g., adding carpool assignments or tent locations) while PDF provides a print-ready format.

## Acceptance Examples (Illustrative)

### [US-004-EX-1] Download a branded PDF schedule

- **Given** a wave schedule with logistics timelines has been generated for "Brighton Blazers"
- **When** the team manager clicks "Export PDF" with team branding configured (logo, blue/white colors)
- **Then** a PDF downloads with the team logo in the header, team name, blue accent colors, and the full wave schedule with logistics times

### [US-004-EX-2] Export to Google Sheets

- **Given** a wave schedule has been generated
- **When** the team manager clicks "Export to Google Sheets"
- **Then** a new Google Sheet is created in their Google Drive with the schedule data in a formatted spreadsheet

### [US-004-EX-3] Configure team branding

- **Given** the team manager has not yet configured branding
- **When** they access the branding settings
- **Then** they can enter a team name, upload a logo, and select primary and tertiary colors from a color wheel

## Dependencies (Contextual)

**Upstream**: Wave schedule with logistics timelines (US-002, US-003). **Downstream**: Functional requirements for PDF export (FR-009), Google Sheets export (FR-010), and team branding configuration (FR-011).

## Priority and Risk (Informative)

Business value is high — without export, the schedule is trapped in the app and cannot reach athletes/parents who are the ultimate consumers. Technical risk is low for PDF generation (well-understood), medium for Google Sheets (requires OAuth integration with Google APIs).

## Traceability (Informative)

This user story traces to StR-001. It drives functional requirements for PDF export, Google Sheets export, and team branding configuration.
