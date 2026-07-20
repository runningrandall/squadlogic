# Test Matrix

## Overview
This matrix ensures comprehensive test coverage for the Race Day Wave Schedule feature by transforming requirements into test cases across 11 functional requirements, 2 non-functional requirements, and the import lifecycle state model.

## Test Matrix Rules
1. **Coverage Rule**: Every acceptance criterion (AC) must have at least one test case ✅
2. **Option Permutation Rule**: Test all valid combinations of options ✅
3. **Constraint Boundary Rule**: Test at boundaries of each constraint ✅
4. **Error Path Rule**: Test all documented error conditions ✅
5. **State Transition Rule**: Test all valid state transitions ✅
6. **Edge Case Rule**: Identify and test edge cases for each requirement ✅

---

## Requirements Traceability

### Stakeholder Requirement Coverage
| Stakeholder Req | Trace to US/FR | Test/Validation | Coverage Status |
|-----------------|----------------|-----------------|-----------------|
| StR-001 | US-001, US-002, US-003, US-004, FR-001–FR-011 | TC-001 through TC-092, IT-001 through IT-005 | ✅ Complete |

### User Story Coverage
| User Story | Driven FRs | Test Cases | Coverage Status |
|------------|------------|------------|-----------------|
| US-001 | FR-001, FR-002, FR-003 | TC-001–TC-021, IT-001, IT-003 | ✅ Complete |
| US-002 | FR-004, FR-005, FR-008 | TC-022–TC-038, IT-002, IT-004 | ✅ Complete |
| US-003 | FR-006, FR-007 | TC-039–TC-057, IT-005 | ✅ Complete |
| US-004 | FR-009, FR-010, FR-011 | TC-058–TC-080 | ✅ Complete |

### Functional Requirement Coverage
| Functional Req | Acceptance Criteria | Test Cases | Coverage Status |
|----------------|---------------------|------------|-----------------|
| FR-001 | FR-001-AC-1 through AC-7 | TC-001–TC-007 | ✅ Complete |
| FR-002 | FR-002-AC-1 through AC-7 | TC-008–TC-014 | ✅ Complete |
| FR-003 | FR-003-AC-1 through AC-7 | TC-015–TC-021 | ✅ Complete |
| FR-004 | FR-004-AC-1 through AC-5 | TC-022–TC-026 | ✅ Complete |
| FR-005 | FR-005-AC-1 through AC-9 | TC-027–TC-035 | ✅ Complete |
| FR-006 | FR-006-AC-1 through AC-12 | TC-036–TC-047 | ✅ Complete |
| FR-007 | FR-007-AC-1 through AC-7 | TC-048–TC-054 | ✅ Complete |
| FR-008 | FR-008-AC-1 through AC-7 | TC-055–TC-061 | ✅ Complete |
| FR-009 | FR-009-AC-1 through AC-8 | TC-062–TC-069 | ✅ Complete |
| FR-010 | FR-010-AC-1 through AC-7 | TC-070–TC-076 | ✅ Complete |
| FR-011 | FR-011-AC-1 through AC-8 | TC-077–TC-084 | ✅ Complete |

### Non-Functional Requirement Coverage
| Non-Functional Req | Verification Method | Evidence/Test Cases | Status |
|--------------------|---------------------|---------------------|--------|
| NFR-001 | Load Test | TC-085, TC-086, TC-087 | ✅ Complete |
| NFR-002 | Inspection + Test | TC-088, TC-089 | ✅ Complete |

### Constraint Coverage
| Constraint | Verification | Test Cases | Status |
|------------|-------------|------------|--------|
| FR-006-CON-1 | Test | TC-044, TC-046, TC-047 | ✅ Complete |
| FR-006-CON-2 | Inspection + Test | TC-045 | ✅ Complete |

---

## Test Case Summary

### FR-001: URL Validation
| Test ID | Title | Type | Priority | Traces To | Status |
|---------|-------|------|----------|-----------|--------|
| TC-001 | Accept valid RaceResult URL with trailing slash | Unit | P0 | FR-001-AC-1 | 🚧 |
| TC-002 | Accept valid URL without trailing slash and normalize | Unit | P1 | FR-001-AC-2 | 🚧 |
| TC-003 | Reject HTTP scheme URL | Unit | P0 | FR-001-AC-3 | 🚧 |
| TC-004 | Reject wrong hostname URL | Unit | P0 | FR-001-AC-4 | 🚧 |
| TC-005 | Reject URL with no event ID | Unit | P0 | FR-001-AC-5 | 🚧 |
| TC-006 | Reject empty string input | Unit | P1 | FR-001-AC-6 | 🚧 |
| TC-007 | Reject non-numeric event ID | Unit | P0 | FR-001-AC-7 | 🚧 |

### FR-002: Event Metadata Parsing
| Test ID | Title | Type | Priority | Traces To | Status |
|---------|-------|------|----------|-----------|--------|
| TC-008 | Extract eventName, eventDate, eventLocation from valid page | Integration | P0 | FR-002-AC-1 | 🚧 |
| TC-009 | Normalize date format to ISO 8601 | Unit | P1 | FR-002-AC-2 | 🚧 |
| TC-010 | Return fetch error on HTTP 404 | Integration | P0 | FR-002-AC-3 | 🚧 |
| TC-011 | Return timeout error when fetch exceeds timeout window | Integration | P1 | FR-002-AC-4 | 🚧 |
| TC-012 | Return parse error identifying missing eventName field | Unit | P0 | FR-002-AC-5 | 🚧 |
| TC-013 | Return empty teams array when no teams dropdown exists | Integration | P1 | FR-002-AC-6 | 🚧 |
| TC-014 | Teams array matches ListControl select list size | Integration | P0 | FR-002-AC-7 | 🚧 |

### FR-003: Participant Extraction
| Test ID | Title | Type | Priority | Traces To | Status |
|---------|-------|------|----------|-----------|--------|
| TC-015 | Extract all 200 participants from API response | Integration | P0 | FR-003-AC-1 | 🚧 |
| TC-016 | Each participant record contains required fields | Unit | P0 | FR-003-AC-2 | 🚧 |
| TC-017 | Preserve exact team name without normalization | Unit | P1 | FR-003-AC-3 | 🚧 |
| TC-018 | Set empty string for missing bib number | Unit | P1 | FR-003-AC-4 | 🚧 |
| TC-019 | Return error when no participants found | Unit | P0 | FR-003-AC-5 | 🚧 |
| TC-020 | Deduplicate by firstName+lastName+team, keep most complete | Unit | P1 | FR-003-AC-6 | 🚧 |
| TC-021 | Wait for full API response before parsing | Integration | P0 | FR-003-AC-7 | 🚧 |

### FR-004: Team Listing
| Test ID | Title | Type | Priority | Traces To | Status |
|---------|-------|------|----------|-----------|--------|
| TC-022 | Dropdown sorted alphabetically (Alpine, Brighton, Zephyr) | Unit | P0 | FR-004-AC-1 | 🚧 |
| TC-023 | Display participant count per team in dropdown | Unit | P1 | FR-004-AC-2 | 🚧 |
| TC-024 | Exclude zero-participant teams from dropdown | Unit | P1 | FR-004-AC-3 | 🚧 |
| TC-025 | Display message when teams array is empty | Unit | P0 | FR-004-AC-4 | 🚧 |
| TC-026 | Team selection is dropdown only — no freeform text | E2E | P0 | FR-004-AC-5 | 🚧 |

### FR-005: Wave Schedule Generation
| Test ID | Title | Type | Priority | Traces To | Status |
|---------|-------|------|----------|-----------|--------|
| TC-027 | Correct wave/category groupings for multi-wave team | Unit | P0 | FR-005-AC-1 | 🚧 |
| TC-028 | Athletes sorted alphabetically by last name within category | Unit | P1 | FR-005-AC-2 | 🚧 |
| TC-029 | Categories sorted alphabetically within wave | Unit | P1 | FR-005-AC-3 | 🚧 |
| TC-030 | Waves ordered by start time from configuration | Unit | P0 | FR-005-AC-4 | 🚧 |
| TC-031 | Empty schedule for team with zero participants | Unit | P1 | FR-005-AC-5 | 🚧 |
| TC-032 | Each category includes stageTime and startTime from config | Unit | P0 | FR-005-AC-6 | 🚧 |
| TC-033 | Each athlete entry has firstName, lastName, bibNumber | Unit | P0 | FR-005-AC-7 | 🚧 |
| TC-034 | Unassigned group for category not in wave config | Unit | P1 | FR-005-AC-8 | 🚧 |
| TC-035 | Omit waves with no athletes from selected team | Unit | P1 | FR-005-AC-9 | 🚧 |

### FR-006: Logistics Parameters
| Test ID | Title | Type | Priority | Traces To | Status |
|---------|-------|------|----------|-----------|--------|
| TC-036 | Default arrival=70 for Varsity wave | Unit | P0 | FR-006-AC-1 | 🚧 |
| TC-037 | Default arrival=60 for JV B wave (no Varsity/JV A) | Unit | P0 | FR-006-AC-2 | 🚧 |
| TC-038 | Default arrival=70 for JV A Girls wave | Unit | P0 | FR-006-AC-3 | 🚧 |
| TC-039 | User override arrival=90 for specific wave, defaults for others | Unit | P0 | FR-006-AC-4 | 🚧 |
| TC-040 | Reject warmupDurationMinutes=0 (below min 5) | Unit | P0 | FR-006-AC-5 | 🚧 |
| TC-041 | Reject warmupDurationMinutes=91 (above max 90) | Unit | P0 | FR-006-AC-6 | 🚧 |
| TC-042 | Reject arrivalBeforeMinutes=14 (below min 15) | Unit | P0 | FR-006-AC-7 | 🚧 |
| TC-043 | Reject arrival < warmup+staging (40 < 30+20) with wave ID | Unit | P0 | FR-006-AC-8, FR-006-CON-1 | 🚧 |
| TC-044 | Update warmup without re-import | Integration | P1 | FR-006-AC-9 | 🚧 |
| TC-045 | Default stagingBeforeMinutes=20 when not provided | Unit | P0 | FR-006-AC-10, FR-006-CON-2 | 🚧 |
| TC-046 | Accept all parameters at minimum boundary (15, 5, 5) | Unit | P1 | FR-006-AC-11, FR-006-CON-1 | 🚧 |
| TC-047 | Accept all parameters at maximum boundary (180, 90, 60) | Unit | P1 | FR-006-AC-12, FR-006-CON-1 | 🚧 |

### FR-007: Athlete Logistics Timeline
| Test ID | Title | Type | Priority | Traces To | Status |
|---------|-------|------|----------|-----------|--------|
| TC-048 | Varsity Boys timeline: arrival=09:00, warmup 09:00-09:30, staging=09:50, race=10:10 | Unit | P0 | FR-007-AC-1 | 🚧 |
| TC-049 | Varsity Girls staggered: arrival=09:05, warmup 09:05-09:35, staging=09:55, race=10:15 | Unit | P0 | FR-007-AC-2 | 🚧 |
| TC-050 | JV B Boys timeline: arrival=07:00, warmup 07:00-07:30, staging=07:40, race=08:00 | Unit | P0 | FR-007-AC-3 | 🚧 |
| TC-051 | User override arrival=90 for Wave 3 — arrivalTime=08:40 | Unit | P1 | FR-007-AC-4 | 🚧 |
| TC-052 | Same-category athletes have identical logistics times | Unit | P0 | FR-007-AC-5 | 🚧 |
| TC-053 | Different categories in same wave have different times | Unit | P0 | FR-007-AC-6 | 🚧 |
| TC-054 | Warmup recalculates on parameter change without re-import | Integration | P1 | FR-007-AC-7 | 🚧 |

### FR-008: Wave Schedule Configuration
| Test ID | Title | Type | Priority | Traces To | Status |
|---------|-------|------|----------|-----------|--------|
| TC-055 | Seed default schedule on first access | Integration | P0 | FR-008-AC-1 | 🚧 |
| TC-056 | Admin updates Wave 1 start time — persisted for subsequent reads | Integration | P0 | FR-008-AC-2 | 🚧 |
| TC-057 | Non-admin cannot modify persisted config | Integration | P0 | FR-008-AC-3 | 🚧 |
| TC-058 | User session override does not modify persisted default | Integration | P0 | FR-008-AC-4 | 🚧 |
| TC-059 | Reject duplicate category across waves | Unit | P1 | FR-008-AC-5 | 🚧 |
| TC-060 | Reject invalid start time "25:00" | Unit | P1 | FR-008-AC-6 | 🚧 |
| TC-061 | Config stored with organizationId GLOBAL, accessible to all | Integration | P1 | FR-008-AC-7 | 🚧 |

### FR-009: PDF Export
| Test ID | Title | Type | Priority | Traces To | Status |
|---------|-------|------|----------|-----------|--------|
| TC-062 | Export PDF downloads a file when branding configured | E2E | P0 | FR-009-AC-1 | 🚧 |
| TC-063 | PDF header contains logo, team name, event metadata | Inspection | P0 | FR-009-AC-2 | 🚧 |
| TC-064 | PDF body contains all waves/categories with correct logistics | E2E | P0 | FR-009-AC-3 | 🚧 |
| TC-065 | Primary color applied to header and wave headers | Inspection | P1 | FR-009-AC-4 | 🚧 |
| TC-066 | Tertiary color applied to category sub-headers | Inspection | P1 | FR-009-AC-5 | 🚧 |
| TC-067 | Default styling when no branding configured | E2E | P1 | FR-009-AC-6 | 🚧 |
| TC-068 | PDF formatted for letter-size printing | Inspection | P1 | FR-009-AC-7 | 🚧 |
| TC-069 | File named {teamName}_{eventDate}_schedule.pdf | Unit | P1 | FR-009-AC-8 | 🚧 |

### FR-010: Google Sheets Export
| Test ID | Title | Type | Priority | Traces To | Status |
|---------|-------|------|----------|-----------|--------|
| TC-070 | Export creates new spreadsheet in user's Drive | Integration | P0 | FR-010-AC-1 | 🚧 |
| TC-071 | Spreadsheet title matches {team} - {event} - {date} pattern | Integration | P1 | FR-010-AC-2 | 🚧 |
| TC-072 | Spreadsheet data matches in-app schedule | Integration | P0 | FR-010-AC-3 | 🚧 |
| TC-073 | Spreadsheet has bold headers, borders, frozen row | Inspection | P2 | FR-010-AC-4 | 🚧 |
| TC-074 | Returns clickable URL to created spreadsheet | Integration | P1 | FR-010-AC-5 | 🚧 |
| TC-075 | Error message when user denies OAuth | E2E | P0 | FR-010-AC-6 | 🚧 |
| TC-076 | Each export creates new sheet, no overwrite | Integration | P1 | FR-010-AC-7 | 🚧 |

### FR-011: Team Branding
| Test ID | Title | Type | Priority | Traces To | Status |
|---------|-------|------|----------|-----------|--------|
| TC-077 | Persist team name and colors, returned on subsequent reads | Integration | P0 | FR-011-AC-1 | 🚧 |
| TC-078 | Upload 1MB PNG logo stored in S3 | Integration | P0 | FR-011-AC-2 | 🚧 |
| TC-079 | Reject 3MB logo with file size error | Unit | P0 | FR-011-AC-3 | 🚧 |
| TC-080 | Reject .gif logo with format error | Unit | P0 | FR-011-AC-4 | 🚧 |
| TC-081 | Reject invalid hex color "#ZZZ" | Unit | P1 | FR-011-AC-5 | 🚧 |
| TC-082 | Default colors and null logo when unconfigured | Unit | P1 | FR-011-AC-6 | 🚧 |
| TC-083 | Color wheel control — not text input | E2E | P1 | FR-011-AC-7 | 🚧 |
| TC-084 | Live preview updates on color/logo change | E2E | P1 | FR-011-AC-8 | 🚧 |

### NFR Tests
| Test ID | Title | Type | Priority | Traces To | Status |
|---------|-------|------|----------|-----------|--------|
| TC-085 | Fetch+parse p50 latency ≤ 5s (target 3s) | Load | P1 | NFR-001 | 🚧 |
| TC-086 | Fetch+parse p95 latency ≤ 10s (target 5s) | Load | P1 | NFR-001 | 🚧 |
| TC-087 | HTTP request timeout configured at ≤ 10s | Configuration | P1 | NFR-001 | 🚧 |
| TC-088 | Field-level accuracy 100% against verified baseline (30+ participants) | Inspection | P0 | NFR-002 | 🚧 |
| TC-089 | Participant count matches source count exactly | Inspection | P0 | NFR-002 | 🚧 |

### RaceResult Structure Validation (IT-006)
| Test ID | Title | Type | Priority | Traces To | Status |
|---------|-------|------|----------|-----------|--------|
| TC-093 | Page returns HTTP 200 with text/html content | Integration | P0 | IT-006-SC-01 | 🚧 |
| TC-094 | JSON-LD structured data present with name, startDate, location | Integration | P0 | IT-006-SC-02 | 🚧 |
| TC-095 | RRPublish initialization script present with event ID | Integration | P0 | IT-006-SC-03 | 🚧 |
| TC-096 | RRPublish load.js returns HTTP 200 | Integration | P1 | IT-006-SC-04 | 🚧 |
| TC-097 | Teams dropdown selector structure present | Integration | P0 | IT-006-SC-05 | 🚧 |
| TC-098 | Participant API key discoverable from page | Integration | P0 | IT-006-SC-06 | 🚧 |
| TC-099 | Participant API listname discoverable from page | Integration | P0 | IT-006-SC-07 | 🚧 |
| TC-100 | Participant API endpoint returns HTTP 200 | Integration | P0 | IT-006-SC-08 | 🚧 |
| TC-101 | API response contains parseable participant data | Integration | P0 | IT-006-SC-09 | 🚧 |
| TC-102 | Participant records contain name, team, category fields | Integration | P0 | IT-006-SC-10 | 🚧 |
| TC-103 | JSON-LD schema matches cached baseline | Integration | P0 | IT-006-SC-11 | 🚧 |
| TC-104 | RRPublish constructor signature matches baseline | Integration | P1 | IT-006-SC-12 | 🚧 |
| TC-105 | Participant API response format matches baseline | Integration | P0 | IT-006-SC-13 | 🚧 |

### E2E: URL to Export (IT-007)
| Test ID | Title | Type | Priority | Traces To | Status |
|---------|-------|------|----------|-----------|--------|
| TC-106 | URL accepted and validated | E2E | P0 | IT-007-SC-01 | 🚧 |
| TC-107 | Event metadata and teams extracted | E2E | P0 | IT-007-SC-02 | 🚧 |
| TC-108 | Participants array with 10+ records | E2E | P0 | IT-007-SC-03 | 🚧 |
| TC-109 | Import data persisted and retrievable | E2E | P0 | IT-007-SC-04 | 🚧 |
| TC-110 | Teams dropdown sorted with counts | E2E | P0 | IT-007-SC-05 | 🚧 |
| TC-111 | Team selection accepted and persisted | E2E | P0 | IT-007-SC-06 | 🚧 |
| TC-112 | Wave schedule contains selected team | E2E | P0 | IT-007-SC-07 | 🚧 |
| TC-113 | Schedule has 2+ wave groups | E2E | P0 | IT-007-SC-08 | 🚧 |
| TC-114 | Per-category startTime and stageTime from config | E2E | P0 | IT-007-SC-09 | 🚧 |
| TC-115 | Athletes grouped and sorted correctly | E2E | P1 | IT-007-SC-10 | 🚧 |
| TC-116 | Logistics object on every athlete entry | E2E | P0 | IT-007-SC-11 | 🚧 |
| TC-117 | Varsity/JV A wave arrival reflects 70-min buffer | E2E | P0 | IT-007-SC-12 | 🚧 |
| TC-118 | Non-Varsity wave arrival reflects 60-min buffer | E2E | P0 | IT-007-SC-13 | 🚧 |
| TC-119 | StagingTime matches wave config stageTime | E2E | P0 | IT-007-SC-14 | 🚧 |
| TC-120 | PDF export returns valid PDF file | E2E | P0 | IT-007-SC-15 | 🚧 |
| TC-121 | PDF file name matches pattern | E2E | P1 | IT-007-SC-16 | 🚧 |
| TC-122 | PDF contains team name from branding | E2E | P0 | IT-007-SC-17 | 🚧 |
| TC-123 | PDF contains at least one imported athlete name | E2E | P0 | IT-007-SC-18 | 🚧 |
| TC-124 | Athlete count matches imported participant count for team | E2E | P0 | IT-007-SC-19 | 🚧 |
| TC-125 | Every PDF athlete traceable to import data | E2E | P0 | IT-007-SC-20 | 🚧 |

### State Transition Tests
| Test ID | Title | Type | Priority | Traces To | Status |
|---------|-------|------|----------|-----------|--------|
| TC-090 | URL_SUBMITTED → FETCHING → PARSED on valid URL | Integration | P0 | spec.md | 🚧 |
| TC-091 | FETCHING → URL_SUBMITTED on fetch failure with error message | Integration | P0 | spec.md | 🚧 |
| TC-092 | PARSED → TEAM_SELECTED only after explicit team selection | Integration | P0 | spec.md | 🚧 |

---

## Constraint Boundary Tests

| Constraint | Boundary Type | Test Value | Test Case | Expected |
|------------|---------------|------------|-----------|----------|
| FR-006-CON-1 (arrival ≥ warmup+staging) | At boundary (equal) | arrival=50, warmup=30, staging=20 | TC-046 | Pass |
| FR-006-CON-1 | Below boundary | arrival=40, warmup=30, staging=20 | TC-043 | Error |
| FR-006-CON-1 | All at minimum | arrival=15, warmup=5, staging=5 | TC-046 | Pass |
| FR-006-CON-1 | All at maximum | arrival=180, warmup=90, staging=60 | TC-047 | Pass |
| arrivalBeforeMinutes range (15–180) | Min valid | 15 | TC-046 | Pass |
| arrivalBeforeMinutes range | Below min | 14 | TC-042 | Error |
| arrivalBeforeMinutes range | Max valid | 180 | TC-047 | Pass |
| arrivalBeforeMinutes range | Above max | 181 | EC-006 | Error |
| warmupDurationMinutes range (5–90) | Min valid | 5 | TC-046 | Pass |
| warmupDurationMinutes range | Below min | 0 | TC-040 | Error |
| warmupDurationMinutes range | Max valid | 90 | TC-047 | Pass |
| warmupDurationMinutes range | Above max | 91 | TC-041 | Error |
| stagingBeforeMinutes range (5–60) | Min valid | 5 | TC-046 | Pass |
| stagingBeforeMinutes range | Below min | 4 | EC-007 | Error |
| stagingBeforeMinutes range | Max valid | 60 | TC-047 | Pass |
| stagingBeforeMinutes range | Above max | 61 | EC-008 | Error |
| Logo file size (≤ 2MB) | At limit | 2MB | EC-009 | Pass |
| Logo file size | Over limit | 3MB | TC-079 | Error |
| Hex color format | Valid | "#1E3A5F" | TC-077 | Pass |
| Hex color format | Invalid | "#ZZZ" | TC-081 | Error |
| Start time format (HH:MM) | Valid | "08:00" | TC-055 | Pass |
| Start time format | Invalid | "25:00" | TC-060 | Error |

---

## Edge Cases

| ID | Description | Related Req | Test Case | Risk if Untested |
|----|-------------|-------------|-----------|------------------|
| EC-001 | Event with single participant on selected team | FR-005 | EC-TC-001 | Schedule rendering breaks on minimal data |
| EC-002 | Athlete in category not in wave config ("Unassigned") | FR-005 | TC-034 | Athlete silently dropped from schedule |
| EC-003 | All team athletes in one wave — only one wave group rendered | FR-005 | EC-TC-002 | UI assumes multi-wave layout |
| EC-004 | Team name with special characters (O'Brien Racing) | FR-004 | EC-TC-003 | Display or matching error |
| EC-005 | Athlete name with accented characters (José García) | FR-003 | EC-TC-004 | Encoding corruption in parse or export |
| EC-006 | arrivalBeforeMinutes=181 (above max) | FR-006 | EC-TC-005 | Silently accepted, breaks constraint |
| EC-007 | stagingBeforeMinutes=4 (below min) | FR-006 | EC-TC-006 | Silently accepted, insufficient staging |
| EC-008 | stagingBeforeMinutes=61 (above max) | FR-006 | EC-TC-007 | Silently accepted |
| EC-009 | Logo exactly 2MB (at limit) | FR-011 | EC-TC-008 | Off-by-one rejection |
| EC-010 | Two athletes with same name on same team (siblings) | FR-003 | EC-TC-009 | Incorrect dedup merges different people |
| EC-011 | Event with 1000+ participants | FR-003, NFR-001 | EC-TC-010 | Timeout or memory exhaustion |
| EC-012 | PDF export with 50+ athletes across 8 waves | FR-009 | EC-TC-011 | Multi-page PDF rendering issues |
| EC-013 | Google OAuth token expired mid-export | FR-010 | EC-TC-012 | Silent failure, no sheet created |
| EC-014 | Re-import same event URL — verify idempotent behavior | FR-002 | EC-TC-013 | Duplicate data or state corruption |
| EC-015 | Wave config with stageTime after startTime (misconfiguration) | FR-008 | EC-TC-014 | Negative staging window confuses coaches |
| EC-016 | Empty team display name in branding config | FR-011 | EC-TC-015 | PDF header renders blank |
| EC-017 | Category name matching "JV A" vs "JVA" (space sensitivity) | FR-006 | EC-TC-016 | Incorrect arrival default applied |

---

## Integration Test Matrix

### External Service Integrations
| Integration ID | Purpose | Target | Type | Test Cases | Status |
|----------------|---------|--------|------|------------|--------|
| INT-001 | RaceResult page fetch + metadata parse | my.raceresult.com | service | IT-001 (8 steps) | 🚧 |
| INT-002 | RaceResult participant API fetch | my-us-1.raceresult.com | service | IT-001 (steps 3-5) | 🚧 |
| INT-004 | RaceResult page structure contract validation | my.raceresult.com | service | IT-006 (13 steps) | 🚧 |
| INT-005 | Full E2E: URL → import → schedule → export | Full pipeline | service | IT-007 (20 steps) | 🚧 |
| INT-003 | Google Sheets export via OAuth | Google Sheets API | service | TC-070–TC-076 | 🚧 |

### Local Service Integrations
| Integration ID | Purpose | Target | Type | Test Cases | Status |
|----------------|---------|--------|------|------------|--------|
| INT-010 | Wave schedule config CRUD | DynamoDB | database | IT-005, TC-055–TC-061 | 🚧 |
| INT-011 | Logistics parameter persistence | DynamoDB | database | IT-005 (steps 1-8) | 🚧 |
| INT-012 | Event import data persistence | DynamoDB | database | IT-004 (steps 1-6) | 🚧 |
| INT-013 | Team logo storage | S3 | service | TC-078 | 🚧 |
| INT-014 | Domain event publication | EventBridge | event | EC-TC-017 | 🚧 |

### Browser/UI Integrations
| Integration ID | Purpose | Target | Type | Test Cases | Status |
|----------------|---------|--------|------|------------|--------|
| INT-020 | Team dropdown rendering | Browser | browser | TC-022–TC-026 | 🚧 |
| INT-021 | Color wheel interaction | Browser | browser | TC-083 | 🚧 |
| INT-022 | Live branding preview | Browser | browser | TC-084 | 🚧 |
| INT-023 | PDF download trigger | Browser | browser | TC-062 | 🚧 |

### Integration Test Details

| Test Case | Integration | Scenario | Input | Expected | Priority |
|-----------|-------------|----------|-------|----------|----------|
| IT-001 | INT-001 | Full parse success path | Valid event URL | Metadata + participants extracted | P0 |
| IT-002 | INT-010, INT-011 | Schedule generation with logistics | Fixture data + wave config | Correct groupings and timeline calculations | P0 |
| IT-003 | INT-001 | URL validation (7 scenarios) | Valid/invalid URLs | Accept valid, reject invalid with 422 | P0 |
| IT-004 | INT-012 | Team listing from stored event | Stored event with 4 teams | Sorted list excluding zero-participant teams | P1 |
| IT-005 | INT-010, INT-011 | Logistics param validation + defaults | Category-aware waves + boundary values | Correct defaults, range/constraint enforcement | P0 |
| TC-070 | INT-003 | Google Sheets happy path | Generated schedule + OAuth | New spreadsheet created in Drive | P0 |
| TC-075 | INT-003 | OAuth denial handling | User denies OAuth | Error message with PDF fallback suggestion | P0 |
| TC-078 | INT-013 | Logo upload to S3 | 1MB PNG file | Stored in S3, URL persisted | P0 |
| EC-TC-017 | INT-014 | EventBridge publication | RaceEventImported event | Event published, response not blocked | P2 |

---

## Coverage Gaps

| Gap ID | Description | Risk Level | Mitigation |
|--------|-------------|------------|------------|
| GAP-001 | ~~No IT covers full end-to-end flow~~ | ~~Medium~~ | ✅ Closed — IT-007 covers URL → import → team select → schedule → logistics → PDF export (20 success criteria) |
| GAP-002 | ~~RaceResult page structure change detection not tested~~ | ~~High~~ | ✅ Closed — IT-006 validates DOM selectors, JSON-LD schema, RRPublish contract, and participant API format against cached baseline (13 success criteria, runs daily) |
| GAP-003 | Concurrent import of same event by multiple users not tested | Low | DynamoDB conditional writes handle conflicts; add EC-TC-018 if needed |
| GAP-004 | EventBridge event schema and payload not specified or tested | Low | Define event schema in FR, add EC-TC-017 |

---

## Test Execution Summary

| Category | Total | Passed | Failed | Blocked | Coverage |
|----------|-------|--------|--------|---------|----------|
| Unit | 48 | 0 | 0 | 0 | 🚧 |
| Integration | 40 | 0 | 0 | 0 | 🚧 |
| E2E | 27 | 0 | 0 | 0 | 🚧 |
| Load | 2 | 0 | 0 | 0 | 🚧 |
| Inspection | 8 | 0 | 0 | 0 | 🚧 |
| Configuration | 1 | 0 | 0 | 0 | 🚧 |
| Edge Case | 17 | 0 | 0 | 0 | 🚧 |
| **Total** | **143** | **0** | **0** | **0** | **🚧 In Progress** |
