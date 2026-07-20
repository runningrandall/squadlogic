---
id: Task-009
title: "FR-011 — Team branding configuration"
type: Task
status: done
track: C
priority: P1
relationships:
  - target: ix://switchback/race-day-wave-schedule/FR-011
    type: references
  - target: ix://switchback/race-day-wave-schedule/TC-077
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-078
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-079
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-080
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-081
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-082
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-083
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-084
    type: verifies
---
# Task-009: FR-011 — Team branding configuration

## Scope
Implement team branding configuration: team display name, logo upload (PNG/JPG/SVG, ≤2MB) to S3, primary and tertiary color selection via color wheel, DynamoDB persistence keyed by user identity, live preview in frontend.

## Subtasks
- [ ] **Backend entity + service.** ElectroDB entity for branding config. Zod validation for hex colors, file type/size. CRUD endpoints.
- [ ] **S3 logo upload.** Pre-signed URL upload flow or direct upload to S3 bucket/prefix. Store S3 URL in branding config.
- [ ] **Frontend branding page.** Create `frontend/src/app/(dashboard)/race-day/branding/page.tsx` with team name input, color wheel (use a React color picker library), logo upload, live preview panel.
- [ ] **Unit tests.** TC-079–TC-082 (file size, format, hex validation, defaults).
- [ ] **E2E tests.** TC-083 (color wheel control), TC-084 (live preview).
- [ ] **Integration tests.** TC-077 (persistence), TC-078 (S3 upload).

## Deliverables
- Backend branding entity + CRUD
- S3 logo upload infrastructure
- Frontend branding configuration page with color wheel + live preview
- Test files

## Notes
- **Can start immediately** — no dependency on Track A or Track S.
- Unblocks: Task-010 (PDF export needs branding for styled output).
