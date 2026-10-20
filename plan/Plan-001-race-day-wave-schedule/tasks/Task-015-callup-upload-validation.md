---
id: Task-015
title: "FR-012 — Call-up list upload validation"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: ix://switchback/race-day-wave-schedule/FR-012
    type: references
  - target: ix://switchback/race-day-wave-schedule/IT-008
    type: verifies
---
# Task-015: FR-012 — Call-up list upload validation

## Scope
Implement Zod validation schema and Fastify route handler for the call-up list `.xlsx` upload. Accept a base64-encoded file plus optional `eventName`/`eventLocation` overrides, reject missing/empty `fileData`, and reject workbooks with no worksheets or no parseable categories with HTTP 422 and a descriptive error message.

## Subtasks
- [ ] **Zod schema.** Create `CallUpListUploadSchema` in `backend/src/domain/race-event.ts` validating `fileData` (non-empty string), optional `eventName`, optional `eventLocation`.
- [ ] **Route handler.** Create `POST /race-events/import/callup` in `backend/src/handlers/race-events/routes.ts` decoding `fileData` from base64 and invoking the call-up list service. Return validated import result on success, 422 on failure.
- [ ] **Workbook-level validation.** Ensure the parsing adapter (`callup-list-parser.ts`) rejects a workbook with zero worksheets and a workbook with zero parseable categories, each with a distinct error message.
- [ ] **Unit tests.** Cover missing `fileData`, empty `fileData`, no-worksheets workbook, and no-categories workbook.
- [ ] **Integration test.** Cover IT-008's malformed/empty workbook scenarios (IT-008-SC-09, IT-008-SC-10).

## Deliverables
- `backend/src/domain/race-event.ts` — `CallUpListUploadSchema` + types
- `backend/src/handlers/race-events/routes.ts` — `POST /race-events/import/callup` handler
- Test files covering upload validation success and failure paths

## Notes
- Follow existing validation pattern from `backend/src/lib/validation.ts`.
- Replaces the retired Task-001 (RaceResult URL validation) — there is no URL to validate anymore, only an uploaded file.
- Unblocks: Task-016 (category schedule parsing needs a validated, decoded workbook).
