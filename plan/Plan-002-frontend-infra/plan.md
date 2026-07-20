---
id: Plan-002
title: "Race Day Wave Schedule — Frontend & Infrastructure"
type: Plan
status: active
relationships:
  - target: ix://switchback/race-day-wave-schedule/FR-004
    type: references
  - target: ix://switchback/race-day-wave-schedule/FR-009
    type: references
  - target: ix://switchback/race-day-wave-schedule/FR-011
    type: references
---
# Implementation Plan: Frontend & Infrastructure

## Requirements Summary

### Frontend
- [ ] Race Day multi-step flow page (URL input → team select → schedule view)
- [ ] Team branding configuration page (name, logo, color wheel, live preview)
- [ ] PDF export download trigger
- [ ] Google Sheets export trigger

### Infrastructure
- [ ] S3 bucket for team logo uploads
- [ ] WAF rate limiting for RaceResult fetch endpoint
- [ ] Google API secrets in Secrets Manager
- [ ] Lambda environment variables and IAM permissions

## Status

Frontend pages built and building cleanly. CDK infrastructure in progress.
