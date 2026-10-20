---
id: FR-005
title: "Generate team wave schedule grouped by wave and category"
type: FR
relationships:
  - target: "ix://switchback/squadlogic/US-002"
    type: "implements"
  - target: "ix://switchback/squadlogic/FR-004"
    type: "depends_on"
  - target: "ix://switchback/squadlogic/FR-008"
    type: "depends_on"
---

# [FR-005] Generate team wave schedule grouped by wave and category

## Description

When a team has been selected, the system SHALL filter the participant list to only that team's athletes, match each athlete's category to the wave schedule configuration ([FR-008](./FR-008-wave-schedule-config.md)) to determine wave grouping and lap count, and generate a wave schedule that groups athletes first by wave (ordered by earliest start time within the wave) and then by category within each wave. Each category's `stageTime` and `startTime` SHALL be sourced from the per-category schedule extracted from the uploaded call-up list ([FR-013](./FR-013-parse-category-schedule.md)), not from the wave schedule configuration — WaveConfig supplies wave-name grouping and lap count only. A category with no matching entry in the wave schedule configuration SHALL become its own standalone wave, named after the category itself, rather than being placed in a catch-all group. Each entry in the schedule SHALL include the athlete's name, bib number, staging/call-up number, category, and wave assignment.

## Inputs

- Array of participant records (output of [FR-014](./FR-014-extract-callup-participants.md))
- Selected team name (output of [FR-004](./FR-004-list-teams.md))
- Per-category schedule (output of [FR-013](./FR-013-parse-category-schedule.md)) providing each category's `stageTime` and `startTime`
- Wave schedule configuration (output of [FR-008](./FR-008-wave-schedule-config.md)) providing wave-to-category grouping and lap count only

## Outputs

- A structured wave schedule object containing:
  - `teamName` (string): The selected team
  - `eventName` (string): The event name from metadata
  - `eventDate` (string): The event date from metadata
  - `totalAthletes` (number): Count of team athletes in the schedule
  - `waves` (array): Ordered list of wave groups, each containing:
    - `waveName` (string): Wave identifier (e.g., "Wave 1 - HS")
    - `categories` (array): Ordered list of category groups within the wave, each containing:
      - `categoryName` (string): Category name (e.g., "JV A Boys")
      - `stageTime` (string, HH:MM): Staging area report time from configuration
      - `startTime` (string, HH:MM): Race start time from configuration
      - `laps` (number or null): Number of laps for this category
      - `athletes` (array): Athletes in this category, each containing:
        - `firstName` (string)
        - `lastName` (string)
        - `bibNumber` (string)
        - `callUpNumber` (string or null)

## Behavior

- The system SHALL filter participants to include only those whose team matches the selected team.
- The system SHALL match each athlete's category to the wave schedule configuration to determine their wave assignment and lap count only.
- The system SHALL resolve each category's `stageTime` and `startTime` from the per-category schedule extracted from the uploaded call-up list, not from the wave schedule configuration.
- The system SHALL order waves by their earliest category start time (ascending); waves whose categories have no known start time SHALL sort last.
- Within each wave, the system SHALL group athletes by category.
- Categories within a wave SHALL be ordered alphabetically by category name.
- Within each category, the system SHALL order athletes alphabetically by last name, then first name.
- When an athlete's category does not match any entry in the wave schedule configuration, the system SHALL place that athlete's category in its own standalone wave, named after the category itself, rather than a catch-all "Unassigned" group.
- When the selected team has zero participants after filtering, the system SHALL return an empty schedule with `totalAthletes: 0` and an empty `waves` array.
- The system SHALL only include waves that contain at least one athlete from the selected team (empty waves are omitted).

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-005-AC-1 | Given 3 athletes from "Brighton" in Wave 1 (2 JV B Boys, 1 JV C Boys) and 2 in Wave 3 (2 Varsity Boys), the schedule contains 2 wave groups with correct category groupings | Test |
| FR-005-AC-2 | Athletes within a category are sorted alphabetically by last name | Test |
| FR-005-AC-3 | Categories within a wave are sorted alphabetically by category name | Test |
| FR-005-AC-4 | Waves are ordered by earliest category start time, sourced from the uploaded call-up list's per-category schedule | Test |
| FR-005-AC-5 | Given a team with zero participants, the schedule returns totalAthletes 0 and empty waves array | Test |
| FR-005-AC-6 | Each category entry includes a stageTime and startTime sourced from the per-category schedule, not from the wave schedule configuration | Test |
| FR-005-AC-7 | Each athlete entry in the schedule contains firstName, lastName, bibNumber, and callUpNumber | Test |
| FR-005-AC-8 | Given an athlete whose category is not in the wave schedule configuration, that category appears as its own standalone wave named after the category | Test |
| FR-005-AC-9 | Given the selected team has athletes in Wave 1 and Wave 3 only, Wave 2 is omitted from the schedule | Test |

## Dependencies

- **Upstream**: [FR-013](./FR-013-parse-category-schedule.md) category schedule parsing, [FR-014](./FR-014-extract-callup-participants.md) participant extraction, [FR-004](./FR-004-list-teams.md) team selection, [FR-008](./FR-008-wave-schedule-config.md) wave schedule configuration (grouping + laps only)
- **Downstream**: [FR-007](./FR-007-athlete-logistics-timeline.md) logistics timeline calculation (operates on the generated wave schedule)
