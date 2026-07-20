---
id: Task-010
title: "FR-009 — PDF export"
type: Task
status: done
track: D
priority: P1
relationships:
  - target: ix://switchback/race-day-wave-schedule/Task-008
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/Task-009
    type: depends_on
  - target: ix://switchback/race-day-wave-schedule/FR-009
    type: references
  - target: ix://switchback/race-day-wave-schedule/TC-062
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-063
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-064
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-065
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-066
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-067
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-068
    type: verifies
  - target: ix://switchback/race-day-wave-schedule/TC-069
    type: verifies
---
# Task-010: FR-009 — PDF export

## Scope
Implement branded PDF generation from the enriched wave schedule. Apply team branding (logo, name, primary/tertiary colors) to a letter-size PDF layout with wave/category sections and per-athlete logistics columns. File download as `{teamName}_{eventDate}_schedule.pdf`.

## Subtasks
- [ ] **PDF generation library.** Select and integrate a PDF generation library (e.g., `@react-pdf/renderer` for frontend or `pdfkit`/`puppeteer` for backend).
- [ ] **PDF template.** Design the letter-size layout: header (logo + team name + event info), body (wave sections with category sub-tables), footer.
- [ ] **Color application.** Apply primaryColor to header/wave headers, tertiaryColor to category sub-headers and alternating rows.
- [ ] **Default styling.** Neutral gray styling when no branding is configured.
- [ ] **Download endpoint.** `GET /race-events/:eventId/export/pdf` returning the PDF binary with correct content-type and Content-Disposition filename.
- [ ] **E2E tests.** TC-062–TC-068 (download, header, body, colors, default styling, print format).
- [ ] **Unit test.** TC-069 (filename pattern).

## Deliverables
- PDF generation pipeline
- Branded template with color theming
- Download endpoint
- Test files

## Notes
- Blocked until both Task-008 (enriched schedule) and Task-009 (branding) are complete.
- Consider whether PDF is generated server-side (Lambda) or client-side (React). Lambda has cold-start implications; client-side avoids network round-trip for the PDF binary.
- Unblocks: Task-013 (E2E test includes PDF download).
